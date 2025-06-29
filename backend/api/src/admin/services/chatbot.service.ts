import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, ILike } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { Users } from '../../users/entities/users.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { startOfDay, endOfDay, subDays, format, parseISO } from 'date-fns';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { AnalyticsData } from './chatbot.types';

@Injectable()
export class ChatbotService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly configService: ConfigService,
  ) {}

  async processQuery(message: string, contextProductName?: string) {
    console.log('Processing query:', message, 'Context product:', contextProductName);
    
    try {
      // First, check if this is a specific customer or product query
      const extractedInfo = await this.extractNameAndType(message);
      if (extractedInfo) {
        console.log('Specific name found, using rule-based processing');
        if (extractedInfo.type === 'customer') {
          return this.getCustomerDetails(extractedInfo.name);
        } else if (extractedInfo.type === 'product') {
          const productAnalytics = await this.getProductAnalytics(extractedInfo.name, { start: new Date(0), end: new Date(), label: 'all time' });
          return {
            response: `Here's detailed information about ${extractedInfo.name}:\n\n${productAnalytics.map(item => `**${item.title}**: ${item.value}`).join('\n')}`,
            type: 'analytics',
            data: productAnalytics
          };
        }
      }

      // Then, try to use OpenAI API if available
      console.log('Trying OpenAI API...');
      const openaiResponse = await this.tryOpenAIQuery(message, contextProductName);
      if (openaiResponse) {
        console.log('Using OpenAI response');
        return openaiResponse;
      }

      // Fallback to rule-based processing
      console.log('Falling back to rule-based processing');
      return this.processRuleBasedQuery(message);
    } catch (error) {
      console.error('Chatbot error:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        type: 'text'
      };
    }
  }

  private async tryOpenAIQuery(message: string, contextProductName?: string) {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    console.log('OpenAI API Key exists:', !!openaiApiKey);
    console.log('OpenAI API Key length:', openaiApiKey?.length);
    
    if (!openaiApiKey) {
      console.log('No OpenAI API key found, falling back to rule-based');
      return null; // Fall back to rule-based
    }

    try {
      // --- NEW: For analytics/product/inventory questions, fetch real data and include in prompt ---
      let analyticsData: AnalyticsData[] = [];
      let dataSummary = '';
      if (this.shouldFetchData(message)) {
        console.log('Should fetch data for message:', message);
        analyticsData = await this.fetchRelevantData(message, contextProductName);
        console.log('Fetched analytics data:', JSON.stringify(analyticsData, null, 2));
        if (analyticsData.length > 0) {
          // Build a summary string for OpenAI
          dataSummary = analyticsData.map(d => {
            if (d.type === 'products' && d.details && Array.isArray(d.details)) {
              // List top products or specific product details
              if (d.title.includes('Top Performing') || d.title.includes('Top Selling')) {
                return `Top products: ${d.details.map((p: any, i: number) => `${i+1}. ${p.name} (${p.totalSold || 0} sold, $${p.totalRevenue?.toLocaleString() || 0} revenue)`).join(', ')}`;
              } else if (d.title.includes('Low Stock')) {
                return `Low stock products: ${d.details.map((p: any, i: number) => `${i+1}. ${p.name} (${p.stockQuantity} in stock)`).join(', ')}`;
              } else if (d.title.includes('Out of Stock')) {
                return `Out of stock products: ${d.details.map((p: any, i: number) => `${i+1}. ${p.name}`).join(', ')}`;
              } else {
                // Specific product analytics
                return `${d.title}: ${d.value}`;
              }
            }
            if (d.type === 'customers' && d.details && Array.isArray(d.details)) {
              // List top customers
              if (d.title.includes('Best Customers')) {
                return `Top customers: ${d.details.map((c: any, i: number) => `${i+1}. ${c.name} ($${c.totalSpent?.toLocaleString() || 0} spent, ${c.orderCount || 0} orders)`).join(', ')}`;
              } else if (d.title.includes('Recent Customers')) {
                return `Recent customers: ${d.details.map((c: any, i: number) => `${i+1}. ${c.name} (joined ${c.createdAt})`).join(', ')}`;
              } else {
                // Specific customer analytics
                return `${d.title}: ${d.value}`;
              }
            }
            if (d.type === 'orders' && d.details && Array.isArray(d.details)) {
              // List recent orders
              if (d.title.includes('Recent Orders')) {
                return `Recent orders: ${d.details.map((o: any, i: number) => `${i+1}. Order #${o.id} ($${o.totalAmount?.toLocaleString() || 0}, ${o.status})`).join(', ')}`;
              } else {
                return `${d.title}: ${d.value}`;
              }
            }
            return `${d.title}: ${d.value}`;
          }).join('\n');
        }
      }
      console.log('Data summary for OpenAI:', dataSummary);
      // --- END NEW ---

      console.log('Attempting OpenAI API call...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for an e-commerce business. You can help with analytics queries about orders, products, customers, and revenue. 
              
              CRITICAL: When users ask about products, sales, or inventory, you MUST ONLY use the product names and stats provided below. DO NOT invent, imagine, or create any product names that are not in the provided data. If no data is provided, say "I don't have enough information" or "No data available".
              
              REAL DATA FROM DATABASE:
              ${dataSummary || 'No data available'}
              
              IMPORTANT: Only mention products that are listed in the data above. Never invent product names like "Luxury Smart Watch", "Premium Handbag", etc. Use ONLY the exact product names from the data provided.
              
              CAPABILITIES:
              - Product analytics: sales performance, stock levels, recommendations
              - Customer insights: top customers, customer behavior, demographics
              - Order management: order status, recent orders, order trends
              - Revenue analysis: sales trends, revenue growth, profit margins
              - Inventory management: stock alerts, restocking recommendations
              - Business insights: performance metrics, growth opportunities
              
              RESPONSE STYLE:
              - Be conversational and helpful
              - Provide actionable insights when possible
              - Suggest next steps or recommendations
              - Use the data to support your recommendations`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 800,
          temperature: 0.1,
        }),
      });

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response data:', data);
      
      const aiResponse = data.choices[0]?.message?.content;

      if (aiResponse) {
        console.log('AI Response received:', aiResponse);
        // Always return analytics data if available
        if (analyticsData.length > 0) {
          return {
            response: aiResponse,
            type: 'analytics',
            data: analyticsData
          };
        }
        return {
          response: aiResponse,
          type: 'text'
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
    }

    return null;
  }

  private shouldFetchData(message: string): boolean {
    const dataKeywords = [
      'orders', 'revenue', 'sales', 'products', 'customers', 'inventory',
      'stock', 'amount', 'total', 'count', 'number', 'how many',
      'today', 'yesterday', 'this week', 'this month', 'last month',
      'analytics', 'comprehensive', 'overview', 'how we are doing',
      'performance', 'metrics', 'statistics', 'best', 'performing', 'top',
      'recommend', 'suggest', 'insights', 'trends', 'growth', 'profit',
      'low stock', 'out of stock', 'restock', 'popular', 'trending',
      'customer behavior', 'order status', 'recent', 'latest', 'new',
      'category', 'brand', 'price', 'discount', 'promotion'
    ];
    
    return dataKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  private async processRuleBasedQuery(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // First, try to extract any name and determine if it's a customer or product
    const extractedInfo = await this.extractNameAndType(message);
    console.log('Extracted info:', extractedInfo);
    
    if (extractedInfo) {
      if (extractedInfo.type === 'customer') {
        console.log('Calling getCustomerDetails for:', extractedInfo.name);
        return this.getCustomerDetails(extractedInfo.name);
      } else if (extractedInfo.type === 'product') {
        console.log('Calling getProductAnalytics for:', extractedInfo.name);
        const productAnalytics = await this.getProductAnalytics(extractedInfo.name, { start: new Date(0), end: new Date(), label: 'all time' });
        return {
          response: `Here's detailed information about ${extractedInfo.name}:\n\n${productAnalytics.map(item => `**${item.title}**: ${item.value}`).join('\n')}`,
          type: 'analytics',
          data: productAnalytics
        };
      }
    }
    
    // Orders queries
    if (lowerMessage.includes('today') && lowerMessage.includes('order')) {
      return this.getTodayOrders();
    }
    
    if (lowerMessage.includes('order') && (lowerMessage.includes('count') || lowerMessage.includes('how many'))) {
      return this.getOrderCount();
    }

    if (lowerMessage.includes('recent orders') || lowerMessage.includes('latest orders')) {
      return this.getRecentOrders();
    }

    if (lowerMessage.includes('order status') || lowerMessage.includes('pending orders')) {
      return this.getOrderStatus();
    }

    // Revenue queries
    if (lowerMessage.includes('revenue') || lowerMessage.includes('total sales')) {
      return this.getRevenueData();
    }

    if (lowerMessage.includes('profit') || lowerMessage.includes('margin')) {
      return this.getProfitData();
    }

    // Product queries
    if (lowerMessage.includes('product') && lowerMessage.includes('sell')) {
      return this.getBestSellingProducts();
    }

    if (lowerMessage.includes('best product') || lowerMessage.includes('top product') || lowerMessage.includes('highest revenue')) {
      return this.getBestSellingProducts();
    }

    if (lowerMessage.includes('stock') || lowerMessage.includes('inventory')) {
      return this.getStockData();
    }

    if (lowerMessage.includes('low stock') || lowerMessage.includes('restock')) {
      return this.getLowStockProducts();
    }

    if (lowerMessage.includes('out of stock')) {
      return this.getOutOfStockProducts();
    }

    if (lowerMessage.includes('product recommendation') || lowerMessage.includes('suggest product')) {
      return this.getProductRecommendations();
    }

    if (lowerMessage.includes('category') || lowerMessage.includes('brand')) {
      return this.getCategoryAnalyticsSimple();
    }

    // Customer queries
    if (lowerMessage.includes('customer') && (lowerMessage.includes('count') || lowerMessage.includes('how many'))) {
      return this.getCustomerCount();
    }

    if (lowerMessage.includes('best customer') || lowerMessage.includes('top customer')) {
      return this.getBestCustomers();
    }

    if (lowerMessage.includes('recent customer') || lowerMessage.includes('new customer')) {
      return this.getRecentCustomers();
    }

    if (lowerMessage.includes('customer behavior') || lowerMessage.includes('customer insight')) {
      return this.getCustomerInsights();
    }

    // Comprehensive queries
    if (lowerMessage.includes('overview') || lowerMessage.includes('summary') || lowerMessage.includes('dashboard')) {
      return this.getComprehensiveOverview();
    }

    if (lowerMessage.includes('trend') || lowerMessage.includes('growth')) {
      return this.getTrendAnalyticsSimple();
    }

    if (lowerMessage.includes('performance') || lowerMessage.includes('how we doing')) {
      return this.getPerformanceMetrics();
    }

    // Default response
    return {
      response: "I can help you with:\n\n📊 **Analytics & Reports**\n- Sales performance and revenue trends\n- Product performance and inventory status\n- Customer insights and behavior\n- Order management and status\n\n📦 **Product Management**\n- Best-selling products\n- Low stock alerts and restocking recommendations\n- Product recommendations\n- Category and brand analytics\n\n👥 **Customer Insights**\n- Top customers and customer behavior\n- Customer acquisition and retention\n- Customer demographics and preferences\n\n🛒 **Order Management**\n- Recent orders and order status\n- Order trends and patterns\n- Pending and completed orders\n\nTry asking me about any of these topics!",
      type: 'text'
    };
  }

  private async extractCustomerName(message: string): Promise<string | null> {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const lowerMessage = message.toLowerCase();
    
    if (openaiApiKey) {
      try {
        console.log('Attempting OpenAI customer name extraction for:', message);
        // Use OpenAI to extract customer name
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are a customer name extraction assistant. Extract customer names from user queries.

RULES:
1. If user asks about a specific customer by name, return ONLY the full name
2. If no specific customer mentioned, return "null"
3. Handle variations: "Ayesha Khan", "Ayesha", "Ms. Khan", etc.
4. Be flexible with different query formats

Examples:
- "give me information about Ayesha Khan" → "Ayesha Khan"
- "tell me about John Smith" → "John Smith"
- "who is our top customer" → "null"
- "customer details for Sarah" → "Sarah"
- "what about Mike Johnson's orders" → "Mike Johnson"
- "give me total spendings of ayesha khan" → "Ayesha Khan"
- "further information about ayesha khan" → "Ayesha Khan"

Return only the name or "null".`
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 50,
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const extractedName = data.choices[0]?.message?.content?.trim();
          console.log('OpenAI extracted customer name:', extractedName);
          
          if (extractedName && extractedName.toLowerCase() !== 'null') {
            return extractedName;
          }
        } else {
          console.error('OpenAI API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error using OpenAI for customer name extraction:', error);
      }
    } else {
      console.log('No OpenAI API key available, using regex fallback');
    }

    // Fallback to regex patterns if OpenAI is not available or fails
    console.log('Using regex fallback for customer name extraction');
    
    // Don't extract customer names for general queries
    const generalCustomerQueries = [
      'best customer', 'top customer', 'our best customer', 'who is our best',
      'best customers', 'top customers', 'customer count', 'how many customers',
      'customer overview', 'customer summary', 'customer analytics'
    ];
    
    for (const query of generalCustomerQueries) {
      if (lowerMessage.includes(query)) {
        console.log('General customer query detected, not extracting specific customer name');
        return null;
      }
    }
    
    const namePatterns = [
      /(?:about|information|details|tell me about|give me information about|further information about|more information about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:customer|profile|information|details)/i,
      /(?:customer|user)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:who is|what about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:spending|orders|profile)/i,
      /(?:total spendings? of|spending of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:spendings? for|orders for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:information about|details about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        console.log('Regex fallback extracted customer name:', extractedName);
        return extractedName;
      }
    }

    console.log('No customer name extracted from message');
    return null;
  }

  private async getCustomerDetails(customerName: string) {
    try {
      console.log('Searching for customer:', customerName);
      
      // Find the customer by name
      const customer = await this.userRepository.findOne({
        where: [
          { firstName: ILike(`%${customerName.split(' ')[0]}%`), lastName: ILike(`%${customerName.split(' ')[1] || ''}%`) },
          { firstName: ILike(`%${customerName}%`) },
          { lastName: ILike(`%${customerName}%`) }
        ]
      });

      console.log('Customer found:', customer ? `${customer.firstName} ${customer.lastName}` : 'Not found');

      if (!customer) {
        return {
          response: `I couldn't find a customer named "${customerName}" in our database. Please check the spelling or try a different name.`,
          type: 'text'
        };
      }

      // Get customer's order history
      const orders = await this.orderRepository.find({
        where: { userId: customer.id },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' }
      });

      // Calculate customer metrics
      const totalSpent = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
      const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
      const firstOrder = orders.length > 0 ? orders[orders.length - 1] : null;
      const lastOrder = orders.length > 0 ? orders[0] : null;

      // Get favorite products
      const productCounts = new Map<string, { name: string; count: number; totalSpent: number }>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const productName = item.product?.name || 'Unknown Product';
          const existing = productCounts.get(productName);
          if (existing) {
            existing.count += item.quantity;
            existing.totalSpent += Number(item.total);
          } else {
            productCounts.set(productName, {
              name: productName,
              count: item.quantity,
              totalSpent: Number(item.total)
            });
          }
        });
      });

      const favoriteProducts = Array.from(productCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Get order status breakdown
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate customer lifetime value and frequency
      const daysSinceFirstOrder = firstOrder ? Math.floor((Date.now() - firstOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const orderFrequency = daysSinceFirstOrder > 0 ? orders.length / (daysSinceFirstOrder / 30) : 0; // orders per month

      const response = `📋 **Customer Profile: ${customer.firstName} ${customer.lastName}**\n\n` +
        `📧 **Contact**: ${customer.email}\n` +
        `📅 **Member Since**: ${format(customer.createdAt, 'MMMM dd, yyyy')}\n` +
        `✅ **Status**: ${customer.isActive ? 'Active' : 'Inactive'}\n\n` +
        `💰 **Spending Overview**:\n` +
        `- Total Spent: $${totalSpent.toLocaleString()}\n` +
        `- Total Orders: ${orders.length}\n` +
        `- Average Order Value: $${avgOrderValue.toFixed(2)}\n` +
        `- Customer Lifetime Value: $${totalSpent.toLocaleString()}\n\n` +
        `📦 **Order History**:\n` +
        `- First Order: ${firstOrder ? format(firstOrder.createdAt, 'MMM dd, yyyy') : 'N/A'}\n` +
        `- Last Order: ${lastOrder ? format(lastOrder.createdAt, 'MMM dd, yyyy') : 'N/A'}\n` +
        `- Order Frequency: ${orderFrequency.toFixed(1)} orders/month\n\n` +
        `🛒 **Favorite Products**:\n${favoriteProducts.map((product, index) => 
          `${index + 1}. ${product.name} (${product.count} items, $${(Number(product.totalSpent) || 0).toFixed(2)})`
        ).join('\n')}\n\n` +
        `📊 **Order Status**:\n${Object.entries(statusCounts).map(([status, count]) => 
          `- ${status}: ${count} orders`
        ).join('\n')}\n\n` +
        `💡 **Insights**:\n` +
        `${totalSpent > 1000 ? '🌟 High-value customer - consider VIP treatment' : '📈 Good customer - focus on retention'}\n` +
        `${orderFrequency > 2 ? '🔄 Frequent buyer - excellent for loyalty programs' : '📅 Occasional buyer - consider re-engagement campaigns'}\n` +
        `${customer.isActive ? '✅ Active customer - maintain relationship' : '⚠️ Inactive customer - re-engagement needed'}`;

      return {
        response,
        type: 'analytics',
        data: [
          {
            type: 'customers' as const,
            title: 'Customer Profile',
            value: `${customer.firstName} ${customer.lastName}`,
            details: {
              email: customer.email,
              totalSpent,
              orderCount: orders.length,
              avgOrderValue,
              favoriteProducts,
              statusCounts,
              memberSince: format(customer.createdAt, 'MMM dd, yyyy'),
              isActive: customer.isActive
            }
          }
        ]
      };

    } catch (error) {
      console.error('Error getting customer details:', error);
      return {
        response: `I encountered an error while retrieving information about "${customerName}". Please try again or contact support.`,
        type: 'text'
      };
    }
  }

  private async fetchRelevantData(message: string, contextProductName?: string): Promise<AnalyticsData[]> {
    const lowerMessage = message.toLowerCase();
    const data: AnalyticsData[] = [];

    try {
      // Use contextProductName if message is ambiguous
      let productName = await this.extractProductName(message);
      if (!productName && contextProductName && (lowerMessage.includes('this product') || lowerMessage.includes('it') || lowerMessage.includes('that product') || lowerMessage.includes('doing good'))) {
        productName = contextProductName;
      }
      console.log('Extracted product name:', productName);

      // Extract time range from message
      const timeRange = this.extractTimeRange(message);
      console.log('Extracted time range:', timeRange);

      // 1. SPECIFIC PRODUCT ANALYTICS
      if (productName) {
        const productAnalytics = await this.getProductAnalytics(productName, timeRange);
        data.push(...productAnalytics);
        return data;
      }

      // 2. CUSTOMER ANALYTICS
      if (this.isCustomerQuery(lowerMessage)) {
        const customerAnalytics = await this.getCustomerAnalytics(lowerMessage, timeRange);
        data.push(...customerAnalytics);
        return data;
      }

      // 3. ORDER ANALYTICS
      if (this.isOrderQuery(lowerMessage)) {
        const orderAnalytics = await this.getOrderAnalytics(lowerMessage, timeRange);
        data.push(...orderAnalytics);
        return data;
      }

      // 4. REVENUE ANALYTICS
      if (this.isRevenueQuery(lowerMessage)) {
        const revenueAnalytics = await this.getRevenueAnalytics(lowerMessage, timeRange);
        data.push(...revenueAnalytics);
        return data;
      }

      // 5. INVENTORY/STOCK ANALYTICS
      if (this.isInventoryQuery(lowerMessage)) {
        const inventoryAnalytics = await this.getInventoryAnalytics(lowerMessage);
        data.push(...inventoryAnalytics);
        return data;
      }

      // 6. PRODUCT PERFORMANCE ANALYTICS
      if (this.isProductPerformanceQuery(lowerMessage)) {
        const productPerformanceAnalytics = await this.getProductPerformanceAnalytics(lowerMessage, timeRange);
        data.push(...productPerformanceAnalytics);
        return data;
      }

      // 7. COMPREHENSIVE BUSINESS OVERVIEW
      if (this.isComprehensiveQuery(lowerMessage)) {
        const comprehensiveAnalytics = await this.getComprehensiveAnalytics(timeRange);
        data.push(...comprehensiveAnalytics);
        return data;
      }

      // 8. CATEGORY ANALYTICS
      if (this.isCategoryQuery(lowerMessage)) {
        const categoryAnalytics = await this.getCategoryAnalytics(lowerMessage, timeRange);
        data.push(...categoryAnalytics);
        return data;
      }

      // 9. TREND ANALYTICS
      if (this.isTrendQuery(lowerMessage)) {
        const trendAnalytics = await this.getTrendAnalytics(lowerMessage, timeRange);
        data.push(...trendAnalytics);
        return data;
      }

      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
      return data;
    }
  }

  // Time range extraction
  private extractTimeRange(message: string): { start: Date; end: Date; label: string } {
    const lowerMessage = message.toLowerCase();
    const now = new Date();
    
    if (lowerMessage.includes('today')) {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'today'
      };
    }
    
    if (lowerMessage.includes('yesterday')) {
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        label: 'yesterday'
      };
    }
    
    if (lowerMessage.includes('this week')) {
      const startOfWeek = startOfDay(subDays(now, now.getDay()));
      return {
        start: startOfWeek,
        end: endOfDay(now),
        label: 'this week'
      };
    }
    
    if (lowerMessage.includes('last week')) {
      const lastWeekStart = startOfDay(subDays(now, now.getDay() + 7));
      const lastWeekEnd = endOfDay(subDays(now, now.getDay() + 1));
      return {
        start: lastWeekStart,
        end: lastWeekEnd,
        label: 'last week'
      };
    }
    
    if (lowerMessage.includes('this month')) {
      const startOfMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return {
        start: startOfMonth,
        end: endOfDay(now),
        label: 'this month'
      };
    }
    
    if (lowerMessage.includes('last month')) {
      const lastMonthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastMonthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return {
        start: lastMonthStart,
        end: lastMonthEnd,
        label: 'last month'
      };
    }
    
    // Default to all time
    return {
      start: new Date(0),
      end: endOfDay(now),
      label: 'all time'
    };
  }

  // Query type detection methods
  private isCustomerQuery(message: string): boolean {
    return ['customer', 'client', 'buyer', 'spender', 'loyal'].some(keyword => message.includes(keyword));
  }

  private isOrderQuery(message: string): boolean {
    return ['order', 'purchase', 'transaction', 'delivery', 'shipping', 'status'].some(keyword => message.includes(keyword));
  }

  private isRevenueQuery(message: string): boolean {
    return ['revenue', 'sales', 'income', 'profit', 'earnings', 'money', 'amount'].some(keyword => message.includes(keyword));
  }

  private isInventoryQuery(message: string): boolean {
    return ['inventory', 'stock', 'quantity', 'available', 'out of stock', 'low stock'].some(keyword => message.includes(keyword));
  }

  private isProductPerformanceQuery(message: string): boolean {
    return ['best', 'top', 'performing', 'selling', 'popular', 'trending'].some(keyword => message.includes(keyword));
  }

  private isComprehensiveQuery(message: string): boolean {
    return ['comprehensive', 'overview', 'summary', 'all', 'everything', 'how we are doing', 'performance'].some(keyword => message.includes(keyword));
  }

  private isCategoryQuery(message: string): boolean {
    return ['category', 'type', 'electronics', 'clothing', 'shoes', 'accessories'].some(keyword => message.includes(keyword));
  }

  private isTrendQuery(message: string): boolean {
    return ['trend', 'growth', 'increase', 'decrease', 'change', 'comparison'].some(keyword => message.includes(keyword));
  }

  private async getTodayOrders() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todayOrders = await this.orderRepository.count({
      where: { createdAt: Between(todayStart, todayEnd) }
    });

    const todayRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .getRawOne();

    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .groupBy('order.status')
      .getRawMany();

    const statusText = statusCounts.map(s => `${s.count} ${s.status.toLowerCase()}`).join(', ');

    return {
      response: `Today you have ${todayOrders} orders totaling $${parseFloat(todayRevenue?.total || '0').toLocaleString()}. ${statusText}.`,
      type: 'analytics',
      data: [
        {
          type: 'orders' as const,
          title: 'Today Orders',
          value: todayOrders
        },
        {
          type: 'revenue' as const,
          title: 'Today Revenue',
          value: `$${parseFloat(todayRevenue?.total || '0').toLocaleString()}`
        }
      ]
    };
  }

  private async getOrderCount() {
    const totalOrders = await this.orderRepository.count();
    const pendingOrders = await this.orderRepository.count({
      where: { status: OrderStatus.PENDING }
    });

    return {
      response: `You have ${totalOrders} total orders, with ${pendingOrders} currently pending.`,
      type: 'analytics',
      data: [
        {
          type: 'orders' as const,
          title: 'Total Orders',
          value: totalOrders
        },
        {
          type: 'orders' as const,
          title: 'Pending Orders',
          value: pendingOrders
        }
      ]
    };
  }

  private async getRevenueData() {
    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .getRawOne();

    const thisMonthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const thisMonthRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt >= :start', { start: thisMonthStart })
      .getRawOne();

    return {
      response: `Your total revenue is $${parseFloat(totalRevenue?.total || '0').toLocaleString()}, with $${parseFloat(thisMonthRevenue?.total || '0').toLocaleString()} this month.`,
      type: 'analytics',
      data: [
        {
          type: 'revenue' as const,
          title: 'Total Revenue',
          value: `$${parseFloat(totalRevenue?.total || '0').toLocaleString()}`
        },
        {
          type: 'revenue' as const,
          title: 'This Month',
          value: `$${parseFloat(thisMonthRevenue?.total || '0').toLocaleString()}`
        }
      ]
    };
  }

  private async getBestSellingProducts() {
    const bestSellers = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.name', 'name')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.total)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .groupBy('product.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(5)
      .getRawMany();

    const topProduct = bestSellers[0];
    
    // Determine the best product based on revenue (not just units sold)
    const bestByRevenue = bestSellers.reduce((best, current) => {
      return parseFloat(current.totalRevenue) > parseFloat(best.totalRevenue) ? current : best;
    });
    
    const bestProductName = bestByRevenue.name;
    const bestProductRevenue = parseFloat(bestByRevenue.totalRevenue);
    const bestProductSold = bestByRevenue.totalSold;
    
    return {
      response: `Our best product is the **${bestProductName}**. It has generated the highest revenue with ${bestProductSold} units sold, totaling $${bestProductRevenue.toLocaleString()}. It's a popular choice among our customers.`,
      type: 'analytics',
      data: bestSellers.map(product => ({
        type: 'products' as const,
        title: product.name,
        value: `${product.totalSold} units`,
        details: { revenue: `$${parseFloat(product.totalRevenue).toLocaleString()}` }
      }))
    };
  }

  private async getStockData() {
    const lowStockProducts = await this.productRepository.count({
      where: { stockQuantity: LessThanOrEqual(10) }
    });

    const outOfStockProducts = await this.productRepository.count({
      where: { stockQuantity: 0 }
    });

    return {
      response: `You have ${lowStockProducts} products with low stock (≤10 units) and ${outOfStockProducts} products out of stock.`,
      type: 'analytics',
      data: [
        {
          type: 'products' as const,
          title: 'Low Stock Products',
          value: lowStockProducts
        },
        {
          type: 'products' as const,
          title: 'Out of Stock',
          value: outOfStockProducts
        }
      ]
    };
  }

  private async getCustomerCount() {
    const totalCustomers = await this.userRepository.count();
    
    const thisMonthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const newCustomersThisMonth = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(thisMonthStart) }
    });

    return {
      response: `You have ${totalCustomers} total customers, with ${newCustomersThisMonth} new customers this month.`,
      type: 'analytics',
      data: [
        {
          type: 'customers' as const,
          title: 'Total Customers',
          value: totalCustomers
        },
        {
          type: 'customers' as const,
          title: 'New This Month',
          value: newCustomersThisMonth
        }
      ]
    };
  }

  // Utility: Extract product name from message using fuzzy matching
  private async extractProductName(message: string): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    const products = await this.productRepository.find();
    let bestMatch: { name: string; score: number } = { name: '', score: 0 };
    
    console.log('Extracting product name from:', message);
    console.log('Available products:', products.map(p => p.name));
    
    // Don't extract product names for general queries
    const generalQueries = [
      'best product', 'top product', 'best selling', 'top selling',
      'what is our best', 'which product is best', 'best performing',
      'highest revenue', 'most sold', 'best seller'
    ];
    
    for (const query of generalQueries) {
      if (lowerMessage.includes(query)) {
        console.log('General query detected, not extracting specific product name');
        return null;
      }
    }
    
    for (const product of products) {
      const name = product.name.toLowerCase();
      
      // Check for exact match first
      if (lowerMessage.includes(name)) {
        console.log('Found exact match:', product.name);
        return product.name;
      }
      
      // Check for common typos and variations
      const nameWords = name.split(/\s+/);
      const messageWords = lowerMessage.split(/\s+/);
      
      // Count matching words (excluding common words like "product", "shirt", etc.)
      let matchCount = 0;
      let totalWords = nameWords.length;
      const commonWords = ['product', 'shirt', 'shoes', 'pants', 't-shirt', 'sneakers', 'loafers', 'hoodie', 'jeans'];
      
      for (const nameWord of nameWords) {
        // Skip common words that don't add value to matching
        if (commonWords.includes(nameWord)) {
          totalWords--;
          continue;
        }
        
        for (const messageWord of messageWords) {
          // Check for exact word match
          if (messageWord === nameWord) {
            matchCount++;
            break;
          }
          // Check for partial matches (e.g., "coton" matches "cotton")
          if (messageWord.includes(nameWord) || nameWord.includes(messageWord)) {
            matchCount++;
            break;
          }
        }
      }
      
      // Only calculate score if we have meaningful words to match
      if (totalWords > 0) {
        const score = matchCount / totalWords;
        console.log(`Product "${product.name}" score: ${score} (${matchCount}/${totalWords} words match)`);
        
        if (score > bestMatch.score && score > 0.5) { // Higher threshold for better accuracy
          bestMatch = { name: product.name, score };
        }
      }
    }
    
    console.log('Best match found:', bestMatch);
    return bestMatch.score > 0.5 ? bestMatch.name : null;
  }

  // Analytics methods for different query types
  private async getProductAnalytics(productName: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];
    const product = await this.productRepository.findOne({ where: { name: productName } });
    
    if (!product) return data;

    // Total sales for this product
    const totalSales = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .where('product.name = :productName', { productName })
      .getRawOne();

    // Sales for the specified time range
    const timeRangeSales = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('product.name = :productName', { productName })
      .andWhere('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .getRawOne();

    data.push({
      type: 'products' as const,
      title: `${productName} - Total Sales`,
      value: `${parseInt(totalSales?.totalSold || '0')} units sold`,
      details: [{
        name: productName,
        totalSold: parseInt(totalSales?.totalSold || '0'),
        totalRevenue: parseFloat(totalSales?.totalRevenue || '0'),
        currentStock: product.stockQuantity
      }]
    });

    data.push({
      type: 'products' as const,
      title: `${productName} - ${timeRange.label.charAt(0).toUpperCase() + timeRange.label.slice(1)}`,
      value: `${parseInt(timeRangeSales?.totalSold || '0')} units sold`,
      details: [{
        name: productName,
        totalSold: parseInt(timeRangeSales?.totalSold || '0'),
        totalRevenue: parseFloat(timeRangeSales?.totalRevenue || '0')
      }]
    });

    data.push({
      type: 'products' as const,
      title: `${productName} - Current Stock`,
      value: `${product.stockQuantity} units available`,
      details: [{
        name: productName,
        stock: product.stockQuantity
      }]
    });

    return data;
  }

  private async getCustomerAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Best customers by spending
    const bestCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .select('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('SUM(order.totalAmount)', 'totalSpent')
      .addSelect('COUNT(order.id)', 'orderCount')
      .innerJoin('order.user', 'user')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .groupBy('user.id, user.firstName, user.lastName, user.email')
      .orderBy('SUM(order.totalAmount)', 'DESC')
      .limit(5)
      .getRawMany();

    if (bestCustomers.length > 0) {
      data.push({
        type: 'customers' as const,
        title: `Best Customers by Spending (${timeRange.label})`,
        value: `${bestCustomers[0]?.firstName} ${bestCustomers[0]?.lastName}`,
        details: bestCustomers.map(c => ({
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          totalSpent: parseFloat(c.totalSpent || '0'),
          orderCount: parseInt(c.orderCount || '0')
        }))
      });
    }

    // Total customers
    const totalCustomers = await this.userRepository.count();
    data.push({
      type: 'customers' as const,
      title: 'Total Customers',
      value: totalCustomers,
      change: 0
    });

    return data;
  }

  private async getOrderAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Order count for time range
    const orderCount = await this.orderRepository.count({
      where: { createdAt: Between(timeRange.start, timeRange.end) }
    });

    data.push({
      type: 'orders' as const,
      title: `Orders (${timeRange.label})`,
      value: orderCount,
      change: 0
    });

    // Order status breakdown
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .groupBy('order.status')
      .getRawMany();

    if (statusCounts.length > 0) {
      data.push({
        type: 'orders' as const,
        title: 'Order Status Breakdown',
        value: statusCounts.map(s => `${s.count} ${s.status.toLowerCase()}`).join(', '),
        details: statusCounts
      });
    }

    return data;
  }

  private async getRevenueAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Revenue for time range
    const revenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .getRawOne();

    data.push({
      type: 'revenue' as const,
      title: `Revenue (${timeRange.label})`,
      value: `$${parseFloat(revenue?.total || '0').toLocaleString()}`,
      change: 0
    });

    // Total revenue
    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .getRawOne();

    data.push({
      type: 'revenue' as const,
      title: 'Total Revenue',
      value: `$${parseFloat(totalRevenue?.total || '0').toLocaleString()}`,
      change: 0
    });

    return data;
  }

  private async getInventoryAnalytics(message: string): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Low stock products
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stockQuantity <= 10')
      .orderBy('product.stockQuantity', 'ASC')
      .limit(5)
      .getMany();

    if (lowStockProducts.length > 0) {
      data.push({
        type: 'products' as const,
        title: 'Low Stock Alert',
        value: `${lowStockProducts.length} products`,
        details: lowStockProducts.map(p => ({ name: p.name, stock: p.stockQuantity }))
      });
    }

    // Out of stock products
    const outOfStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stockQuantity = 0')
      .getMany();

    if (outOfStockProducts.length > 0) {
      data.push({
        type: 'products' as const,
        title: 'Out of Stock',
        value: `${outOfStockProducts.length} products`,
        details: outOfStockProducts.map(p => ({ name: p.name, stock: p.stockQuantity }))
      });
    }

    return data;
  }

  private async getProductPerformanceAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Best selling products for time range
    const bestSellers = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.name', 'name')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .groupBy('product.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(5)
      .getRawMany();

    if (bestSellers.length > 0) {
      data.push({
        type: 'products' as const,
        title: `Top Performing Products (${timeRange.label})`,
        value: bestSellers[0]?.name || 'N/A',
        details: bestSellers
      });
    }

    return data;
  }

  private async getComprehensiveAnalytics(timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Orders
    const orderCount = await this.orderRepository.count({
      where: { createdAt: Between(timeRange.start, timeRange.end) }
    });
    data.push({
      type: 'orders' as const,
      title: `Orders (${timeRange.label})`,
      value: orderCount,
      change: 0
    });

    // Revenue
    const revenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .getRawOne();
    data.push({
      type: 'revenue' as const,
      title: `Revenue (${timeRange.label})`,
      value: `$${parseFloat(revenue?.total || '0').toLocaleString()}`,
      change: 0
    });

    // Customers
    const totalCustomers = await this.userRepository.count();
    data.push({
      type: 'customers' as const,
      title: 'Total Customers',
      value: totalCustomers,
      change: 0
    });

    // Best sellers
    const bestSellers = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.name', 'name')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .groupBy('product.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(5)
      .getRawMany();

    if (bestSellers.length > 0) {
      data.push({
        type: 'products' as const,
        title: `Top Selling Products (${timeRange.label})`,
        value: bestSellers[0]?.name || 'N/A',
        details: bestSellers
      });
    }

    // Low stock
    const lowStockProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stockQuantity <= 10')
      .orderBy('product.stockQuantity', 'ASC')
      .limit(5)
      .getMany();

    if (lowStockProducts.length > 0) {
      data.push({
        type: 'products' as const,
        title: 'Low Stock Alert',
        value: `${lowStockProducts.length} products`,
        details: lowStockProducts.map(p => ({ name: p.name, stock: p.stockQuantity }))
      });
    }

    return data;
  }

  private async getCategoryAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // Category performance
    const categoryPerformance = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.category', 'category')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .groupBy('product.category')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .getRawMany();

    if (categoryPerformance.length > 0) {
      data.push({
        type: 'products' as const,
        title: `Category Performance (${timeRange.label})`,
        value: categoryPerformance[0]?.category || 'N/A',
        details: categoryPerformance
      });
    }

    return data;
  }

  private async getTrendAnalytics(message: string, timeRange: { start: Date; end: Date; label: string }): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];

    // This is a simplified trend analysis - you could expand this with more sophisticated trend calculations
    const currentPeriodRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', { start: timeRange.start, end: timeRange.end })
      .getRawOne();

    // Previous period for comparison (simplified)
    const previousPeriodStart = new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime()));
    const previousPeriodRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.createdAt BETWEEN :start AND :end', { start: previousPeriodStart, end: timeRange.start })
      .getRawOne();

    const currentRevenue = parseFloat(currentPeriodRevenue?.total || '0');
    const previousRevenue = parseFloat(previousPeriodRevenue?.total || '0');
    const change = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    data.push({
      type: 'revenue' as const,
      title: `Revenue Trend (${timeRange.label})`,
      value: `$${currentRevenue.toLocaleString()}`,
      change: Math.round(change * 100) / 100
    });

    return data;
  }

  private async getRecentOrders() {
    const recentOrders = await this.orderRepository.find({
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' },
      take: 5
    });

    const orderDetails = recentOrders.map(order => ({
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: format(order.createdAt, 'MMM dd, yyyy'),
      customerName: order.user?.firstName + ' ' + order.user?.lastName,
      itemCount: order.items.length
    }));

    return {
      response: `Here are your 5 most recent orders:\n\n${orderDetails.map((order, index) => 
        `${index + 1}. Order #${order.id} - $${order.totalAmount.toLocaleString()} (${order.status})\n   Customer: ${order.customerName} | Items: ${order.itemCount} | Date: ${order.createdAt}`
      ).join('\n\n')}`,
      type: 'analytics',
      data: [{
        type: 'orders' as const,
        title: 'Recent Orders',
        value: `${recentOrders.length} orders`,
        details: orderDetails
      }]
    };
  }

  private async getOrderStatus() {
    const [pending, processing, shipped, delivered, cancelled] = await Promise.all([
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({ where: { status: OrderStatus.PROCESSING } }),
      this.orderRepository.count({ where: { status: OrderStatus.SHIPPED } }),
      this.orderRepository.count({ where: { status: OrderStatus.DELIVERED } }),
      this.orderRepository.count({ where: { status: OrderStatus.CANCELLED } })
    ]);

    const totalOrders = pending + processing + shipped + delivered + cancelled;

    return {
      response: `Here's the current order status breakdown:\n\n📦 **Pending**: ${pending} orders\n⚙️ **Processing**: ${processing} orders\n🚚 **Shipped**: ${shipped} orders\n✅ **Delivered**: ${delivered} orders\n❌ **Cancelled**: ${cancelled} orders\n\n**Total Orders**: ${totalOrders}`,
      type: 'analytics',
      data: [
        { type: 'orders' as const, title: 'Pending Orders', value: pending },
        { type: 'orders' as const, title: 'Processing Orders', value: processing },
        { type: 'orders' as const, title: 'Shipped Orders', value: shipped },
        { type: 'orders' as const, title: 'Delivered Orders', value: delivered },
        { type: 'orders' as const, title: 'Cancelled Orders', value: cancelled }
      ]
    };
  }

  private async getProfitData() {
    const today = new Date();
    const lastMonth = subDays(today, 30);
    
    const [currentMonthOrders, lastMonthOrders] = await Promise.all([
      this.orderRepository.find({
        where: { createdAt: MoreThanOrEqual(startOfDay(today)) },
        relations: ['items']
      }),
      this.orderRepository.find({
        where: { 
          createdAt: Between(startOfDay(lastMonth), endOfDay(subDays(today, 1)))
        },
        relations: ['items']
      })
    ]);

    const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Estimate profit (assuming 30% margin for demo)
    const currentProfit = currentRevenue * 0.3;
    const lastMonthProfit = lastMonthRevenue * 0.3;
    const profitChange = lastMonthRevenue > 0 ? ((currentProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0;

    return {
      response: `Here's your profit analysis:\n\n💰 **Current Month Profit**: $${currentProfit.toLocaleString()}\n📈 **Last Month Profit**: $${lastMonthProfit.toLocaleString()}\n📊 **Profit Change**: ${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(1)}%\n\n*Note: Profit is estimated at 30% margin for demonstration purposes.*`,
      type: 'analytics',
      data: [
        { type: 'revenue' as const, title: 'Current Month Profit', value: `$${currentProfit.toLocaleString()}`, change: profitChange },
        { type: 'revenue' as const, title: 'Last Month Profit', value: `$${lastMonthProfit.toLocaleString()}` }
      ]
    };
  }

  private async getLowStockProducts() {
    const lowStockProducts = await this.productRepository.find({
      where: { stockQuantity: Between(1, 10) },
      order: { stockQuantity: 'ASC' },
      take: 10
    });

    if (lowStockProducts.length === 0) {
      return {
        response: "Great news! You don't have any products with low stock levels.",
        type: 'text'
      };
    }

    return {
      response: `Here are products with low stock that need attention:\n\n${lowStockProducts.map((product, index) => 
        `${index + 1}. **${product.name}** - ${product.stockQuantity} units left\n   Price: $${product.price} | Category: ${product.category}`
      ).join('\n\n')}\n\n💡 **Recommendation**: Consider restocking these items soon to avoid stockouts.`,
      type: 'analytics',
      data: [{
        type: 'products' as const,
        title: 'Low Stock Products',
        value: `${lowStockProducts.length} products`,
        details: lowStockProducts.map(p => ({
          name: p.name,
          stockQuantity: p.stockQuantity,
          price: p.price,
          category: p.category
        }))
      }]
    };
  }

  private async getOutOfStockProducts() {
    const outOfStockProducts = await this.productRepository.find({
      where: { stockQuantity: 0 },
      order: { name: 'ASC' }
    });

    if (outOfStockProducts.length === 0) {
      return {
        response: "Excellent! You don't have any out-of-stock products.",
        type: 'text'
      };
    }

    return {
      response: `⚠️ **Out of Stock Products** (${outOfStockProducts.length} items):\n\n${outOfStockProducts.map((product, index) => 
        `${index + 1}. **${product.name}**\n   Price: $${product.price} | Category: ${product.category}`
      ).join('\n\n')}\n\n🚨 **Action Required**: These products need immediate restocking to resume sales.`,
      type: 'analytics',
      data: [{
        type: 'products' as const,
        title: 'Out of Stock Products',
        value: `${outOfStockProducts.length} products`,
        details: outOfStockProducts.map(p => ({
          name: p.name,
          price: p.price,
          category: p.category
        }))
      }]
    };
  }

  private async getProductRecommendations() {
    // Get best-selling products and suggest similar ones
    const bestSellers = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .select([
        'product.id',
        'product.name',
        'product.category',
        'product.price',
        'SUM(item.quantity) as totalSold'
      ])
      .groupBy('product.id')
      .orderBy('totalSold', 'DESC')
      .limit(5)
      .getRawMany();

    // Get products in same categories as best sellers
    const categories = [...new Set(bestSellers.map(item => item.product_category))];
    const recommendations = await this.productRepository.find({
      where: { category: categories[0] },
      order: { stockQuantity: 'DESC' },
      take: 3
    });

    return {
      response: `Based on your best-selling products, here are some recommendations:\n\n🏆 **Top Sellers**:\n${bestSellers.map((item, index) => 
        `${index + 1}. ${item.product_name} (${item.totalSold} sold)`
      ).join('\n')}\n\n💡 **Recommended Products** (similar to your top performers):\n${recommendations.map((product, index) => 
        `${index + 1}. **${product.name}** - $${product.price}\n   Category: ${product.category} | Stock: ${product.stockQuantity}`
      ).join('\n\n')}`,
      type: 'analytics',
      data: [
        {
          type: 'products' as const,
          title: 'Top Selling Products',
          value: `${bestSellers.length} products`,
          details: bestSellers.map(item => ({
            name: item.product_name,
            totalSold: item.totalSold,
            category: item.product_category
          }))
        },
        {
          type: 'products' as const,
          title: 'Recommended Products',
          value: `${recommendations.length} products`,
          details: recommendations.map(p => ({
            name: p.name,
            price: p.price,
            category: p.category,
            stockQuantity: p.stockQuantity
          }))
        }
      ]
    };
  }

  private async getBestCustomers() {
    const bestCustomers = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'SUM(order.totalAmount) as totalSpent',
        'COUNT(order.id) as orderCount'
      ])
      .groupBy('user.id')
      .orderBy('totalSpent', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      response: `Here are your top customers by total spending:\n\n${bestCustomers.map((customer, index) => 
        `${index + 1}. **${customer.user_firstName} ${customer.user_lastName}**\n   💰 Total Spent: $${parseFloat(customer.totalSpent).toLocaleString()}\n   📦 Orders: ${customer.orderCount}\n   📧 Email: ${customer.user_email}`
      ).join('\n\n')}\n\n💡 **Insight**: These customers represent your highest-value relationships. Consider personalized marketing campaigns.`,
      type: 'analytics',
      data: [{
        type: 'customers' as const,
        title: 'Best Customers',
        value: `${bestCustomers.length} customers`,
        details: bestCustomers.map(c => ({
          name: `${c.user_firstName} ${c.user_lastName}`,
          totalSpent: parseFloat(c.totalSpent),
          orderCount: parseInt(c.orderCount),
          email: c.user_email
        }))
      }]
    };
  }

  private async getRecentCustomers() {
    const recentCustomers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 5
    });

    return {
      response: `Here are your most recent customer registrations:\n\n${recentCustomers.map((customer, index) => 
        `${index + 1}. **${customer.firstName} ${customer.lastName}**\n   📧 Email: ${customer.email}\n   📅 Joined: ${format(customer.createdAt, 'MMM dd, yyyy')}\n   ✅ Active: ${customer.isActive ? 'Yes' : 'No'}`
      ).join('\n\n')}\n\n💡 **Insight**: Focus on converting these new customers into repeat buyers.`,
      type: 'analytics',
      data: [{
        type: 'customers' as const,
        title: 'Recent Customers',
        value: `${recentCustomers.length} customers`,
        details: recentCustomers.map(c => ({
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          createdAt: format(c.createdAt, 'MMM dd, yyyy'),
          isActive: c.isActive
        }))
      }]
    };
  }

  private async getCustomerInsights() {
    const [totalCustomers, activeCustomers, newThisMonth] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfDay(subDays(new Date(), 30))) }
      })
    ]);

    const customerOrders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .select([
        'user.id',
        'COUNT(order.id) as orderCount',
        'AVG(order.totalAmount) as avgOrderValue'
      ])
      .groupBy('user.id')
      .getRawMany();

    const avgOrdersPerCustomer = customerOrders.length > 0 
      ? customerOrders.reduce((sum, c) => sum + parseInt(c.orderCount), 0) / customerOrders.length 
      : 0;
    
    const avgOrderValue = customerOrders.length > 0
      ? customerOrders.reduce((sum, c) => sum + parseFloat(c.avgOrderValue), 0) / customerOrders.length
      : 0;

    return {
      response: `Here are your customer insights:\n\n👥 **Customer Overview**:\n- Total Customers: ${totalCustomers}\n- Active Customers: ${activeCustomers} (${((activeCustomers/totalCustomers)*100).toFixed(1)}%)\n- New This Month: ${newThisMonth}\n\n📊 **Customer Behavior**:\n- Average Orders per Customer: ${avgOrdersPerCustomer.toFixed(1)}\n- Average Order Value: $${avgOrderValue.toFixed(2)}\n\n💡 **Recommendations**:\n- Focus on customer retention strategies\n- Implement loyalty programs\n- Personalize marketing campaigns`,
      type: 'analytics',
      data: [
        { type: 'customers' as const, title: 'Total Customers', value: totalCustomers },
        { type: 'customers' as const, title: 'Active Customers', value: activeCustomers },
        { type: 'customers' as const, title: 'New This Month', value: newThisMonth },
        { type: 'customers' as const, title: 'Avg Orders/Customer', value: avgOrdersPerCustomer.toFixed(1) },
        { type: 'customers' as const, title: 'Avg Order Value', value: `$${avgOrderValue.toFixed(2)}` }
      ]
    };
  }

  private async getComprehensiveOverview() {
    const today = new Date();
    const lastMonth = subDays(today, 30);
    
    const [todayOrders, lastMonthOrders, totalProducts, lowStockCount, outOfStockCount, totalCustomers] = await Promise.all([
      this.orderRepository.count({ where: { createdAt: MoreThanOrEqual(startOfDay(today)) } }),
      this.orderRepository.count({ where: { createdAt: Between(startOfDay(lastMonth), endOfDay(subDays(today, 1))) } }),
      this.productRepository.count(),
      this.productRepository.count({ where: { stockQuantity: Between(1, 10) } }),
      this.productRepository.count({ where: { stockQuantity: 0 } }),
      this.userRepository.count()
    ]);

    const [todayRevenue, lastMonthRevenue] = await Promise.all([
      this.orderRepository.find({ where: { createdAt: MoreThanOrEqual(startOfDay(today)) } }),
      this.orderRepository.find({ where: { createdAt: Between(startOfDay(lastMonth), endOfDay(subDays(today, 1))) } })
    ]);

    const todayTotal = todayRevenue.reduce((sum, order) => sum + order.totalAmount, 0);
    const lastMonthTotal = lastMonthRevenue.reduce((sum, order) => sum + order.totalAmount, 0);
    const revenueChange = lastMonthTotal > 0 ? ((todayTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      response: `📊 **Business Overview**\n\n🛒 **Orders**:\n- Today: ${todayOrders} orders\n- Last Month: ${lastMonthOrders} orders\n\n💰 **Revenue**:\n- Today: $${todayTotal.toLocaleString()}\n- Last Month: $${lastMonthTotal.toLocaleString()}\n- Change: ${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%\n\n📦 **Inventory**:\n- Total Products: ${totalProducts}\n- Low Stock: ${lowStockCount} items\n- Out of Stock: ${outOfStockCount} items\n\n👥 **Customers**:\n- Total: ${totalCustomers} customers\n\n💡 **Key Insights**:\n- ${revenueChange >= 0 ? 'Revenue is growing' : 'Revenue needs attention'}\n- ${lowStockCount > 0 ? `${lowStockCount} products need restocking` : 'Inventory levels are good'}\n- ${outOfStockCount > 0 ? `${outOfStockCount} products are out of stock` : 'No out-of-stock items'}`,
      type: 'analytics',
      data: [
        { type: 'orders' as const, title: 'Today Orders', value: todayOrders },
        { type: 'orders' as const, title: 'Last Month Orders', value: lastMonthOrders },
        { type: 'revenue' as const, title: 'Today Revenue', value: `$${todayTotal.toLocaleString()}`, change: revenueChange },
        { type: 'revenue' as const, title: 'Last Month Revenue', value: `$${lastMonthTotal.toLocaleString()}` },
        { type: 'products' as const, title: 'Total Products', value: totalProducts },
        { type: 'products' as const, title: 'Low Stock Items', value: lowStockCount },
        { type: 'products' as const, title: 'Out of Stock Items', value: outOfStockCount },
        { type: 'customers' as const, title: 'Total Customers', value: totalCustomers }
      ]
    };
  }

  private async getPerformanceMetrics() {
    const today = new Date();
    const lastWeek = subDays(today, 7);
    const lastMonth = subDays(today, 30);
    
    const [weekOrders, monthOrders, weekRevenue, monthRevenue] = await Promise.all([
      this.orderRepository.count({ where: { createdAt: MoreThanOrEqual(startOfDay(lastWeek)) } }),
      this.orderRepository.count({ where: { createdAt: MoreThanOrEqual(startOfDay(lastMonth)) } }),
      this.orderRepository.find({ where: { createdAt: MoreThanOrEqual(startOfDay(lastWeek)) } }),
      this.orderRepository.find({ where: { createdAt: MoreThanOrEqual(startOfDay(lastMonth)) } })
    ]);

    const weekTotal = weekRevenue.reduce((sum, order) => sum + order.totalAmount, 0);
    const monthTotal = monthRevenue.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const avgOrderValue = monthOrders > 0 ? monthTotal / monthOrders : 0;
    const dailyAvgOrders = monthOrders / 30;

    return {
      response: `📈 **Performance Metrics**\n\n📊 **Order Performance**:\n- This Week: ${weekOrders} orders\n- This Month: ${monthOrders} orders\n- Daily Average: ${dailyAvgOrders.toFixed(1)} orders\n\n💰 **Revenue Performance**:\n- This Week: $${weekTotal.toLocaleString()}\n- This Month: $${monthTotal.toLocaleString()}\n- Average Order Value: $${avgOrderValue.toFixed(2)}\n\n🎯 **Key Metrics**:\n- Order Growth: ${monthOrders > 0 ? 'Tracking well' : 'Needs improvement'}\n- Revenue per Order: $${avgOrderValue.toFixed(2)}\n- Daily Order Rate: ${dailyAvgOrders.toFixed(1)} orders/day\n\n💡 **Recommendations**:\n- Focus on increasing average order value\n- Implement upselling strategies\n- Optimize order processing efficiency`,
      type: 'analytics',
      data: [
        { type: 'orders' as const, title: 'This Week Orders', value: weekOrders },
        { type: 'orders' as const, title: 'This Month Orders', value: monthOrders },
        { type: 'orders' as const, title: 'Daily Average Orders', value: dailyAvgOrders.toFixed(1) },
        { type: 'revenue' as const, title: 'This Week Revenue', value: `$${weekTotal.toLocaleString()}` },
        { type: 'revenue' as const, title: 'This Month Revenue', value: `$${monthTotal.toLocaleString()}` },
        { type: 'revenue' as const, title: 'Average Order Value', value: `$${avgOrderValue.toFixed(2)}` }
      ]
    };
  }

  private async getCategoryAnalyticsSimple() {
    const timeRange = { start: subDays(new Date(), 30), end: new Date(), label: 'last 30 days' };
    const analytics = await this.getCategoryAnalytics('category', timeRange);
    
    return {
      response: `Here's your category performance analysis:\n\n${analytics.map(item => 
        `📦 **${item.title}**: ${item.value}`
      ).join('\n')}\n\n💡 **Insight**: Focus on your top-performing categories and consider expanding their product lines.`,
      type: 'analytics',
      data: analytics
    };
  }

  private async getTrendAnalyticsSimple() {
    const timeRange = { start: subDays(new Date(), 30), end: new Date(), label: 'last 30 days' };
    const analytics = await this.getTrendAnalytics('trend', timeRange);
    
    return {
      response: `Here's your business trend analysis:\n\n${analytics.map(item => 
        `📈 **${item.title}**: ${item.value}${item.change !== undefined ? ` (${item.change >= 0 ? '+' : ''}${item.change}%)` : ''}`
      ).join('\n')}\n\n💡 **Insight**: Monitor these trends to make informed business decisions.`,
      type: 'analytics',
      data: analytics
    };
  }

  private async extractNameAndType(message: string): Promise<{ name: string; type: 'customer' | 'product' } | null> {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    console.log('=== Starting name and type extraction ===');
    console.log('Message:', message);
    console.log('OpenAI API key available:', !!openaiApiKey);
    
    if (openaiApiKey) {
      try {
        console.log('Attempting OpenAI name and type extraction for:', message);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a name and type extraction assistant. Your job is to:
1. Extract any specific name from the user's query
2. Determine if it's a customer name or product name
3. Return the result in JSON format

RULES:
- If the user asks about a specific person/customer, return {"name": "Full Name", "type": "customer"}
- If the user asks about a specific product/item, return {"name": "Product Name", "type": "product"}
- If no specific name is mentioned, return null
- Handle variations and be flexible with different query formats

EXAMPLES:
- "give me information about Ayesha Khan" → {"name": "Ayesha Khan", "type": "customer"}
- "tell me about Classic Fit Cotton T-Shirt" → {"name": "Classic Fit Cotton T-Shirt", "type": "product"}
- "more information about Nike Air Max" → {"name": "Nike Air Max", "type": "product"}
- "customer details for John Smith" → {"name": "John Smith", "type": "customer"}
- "who is our top customer" → null (no specific name)
- "what is our best product" → null (no specific name)

Return only valid JSON or null.`
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 100,
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const extractedText = data.choices[0]?.message?.content?.trim();
          console.log('OpenAI extracted text:', extractedText);
          
          if (extractedText && extractedText.toLowerCase() !== 'null') {
            try {
              const result = JSON.parse(extractedText);
              console.log('Parsed result:', result);
              if (result.name && result.type && (result.type === 'customer' || result.type === 'product')) {
                console.log('Successfully extracted:', result);
                return result;
              } else {
                console.log('Invalid result structure:', result);
              }
            } catch (parseError) {
              console.error('Error parsing OpenAI response:', parseError);
            }
          } else {
            console.log('OpenAI returned null or empty response');
          }
        } else {
          console.error('OpenAI API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error using OpenAI for name and type extraction:', error);
      }
    } else {
      console.log('No OpenAI API key available, using fallback methods');
    }

    // Fallback: try to extract customer name first, then product name
    console.log('Using fallback extraction methods');
    
    // Try customer extraction first
    const customerName = await this.extractCustomerName(message);
    if (customerName) {
      return { name: customerName, type: 'customer' as const };
    }
    
    // Try product extraction
    const productName = await this.extractProductName(message);
    if (productName) {
      return { name: productName, type: 'product' as const };
    }

    console.log('No name extracted from message');
    return null;
  }
} 