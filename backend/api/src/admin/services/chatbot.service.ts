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
      // First, try to use OpenAI API if available
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
                return `Top products: ${d.details.map((p: any, i: number) => `${i+1}. ${p.name} (${p.totalSold || 0} sold)`).join(', ')}`;
              } else {
                // Specific product analytics
                return `${d.title}: ${d.value}`;
              }
            }
            if (d.type === 'customers' && d.details && Array.isArray(d.details)) {
              // List top customers
              if (d.title.includes('Best Customers')) {
                return `Top customers: ${d.details.map((c: any, i: number) => `${i+1}. ${c.name} ($${c.totalSpent?.toLocaleString() || 0} spent, ${c.orderCount || 0} orders)`).join(', ')}`;
              } else {
                // Specific customer analytics
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
              
              IMPORTANT: Only mention products that are listed in the data above. Never invent product names like "Luxury Smart Watch", "Premium Handbag", etc. Use ONLY the exact product names from the data provided.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
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
      'performance', 'metrics', 'statistics', 'best', 'performing', 'top'
    ];
    
    return dataKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  private async processRuleBasedQuery(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Orders queries
    if (lowerMessage.includes('today') && lowerMessage.includes('order')) {
      return this.getTodayOrders();
    }
    
    if (lowerMessage.includes('order') && (lowerMessage.includes('count') || lowerMessage.includes('how many'))) {
      return this.getOrderCount();
    }

    // Revenue queries
    if (lowerMessage.includes('revenue') || lowerMessage.includes('total sales')) {
      return this.getRevenueData();
    }

    // Product queries
    if (lowerMessage.includes('product') && lowerMessage.includes('sell')) {
      return this.getBestSellingProducts();
    }

    if (lowerMessage.includes('stock') || lowerMessage.includes('inventory')) {
      return this.getStockData();
    }

    // Customer queries
    if (lowerMessage.includes('customer') && (lowerMessage.includes('count') || lowerMessage.includes('how many'))) {
      return this.getCustomerCount();
    }

    // Default response
    return {
      response: "I can help you with questions about orders, revenue, products, customers, and inventory. Try asking something like 'Show me today's orders' or 'What's our total revenue?'",
      type: 'text'
    };
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
          type: 'orders',
          title: "Today's Orders",
          value: todayOrders
        },
        {
          type: 'revenue',
          title: "Today's Revenue",
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
          type: 'orders',
          title: 'Total Orders',
          value: totalOrders
        },
        {
          type: 'orders',
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
          type: 'revenue',
          title: 'Total Revenue',
          value: `$${parseFloat(totalRevenue?.total || '0').toLocaleString()}`
        },
        {
          type: 'revenue',
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
    
    return {
      response: `Your best selling product is ${topProduct?.name || 'N/A'} with ${topProduct?.totalSold || 0} units sold and $${parseFloat(topProduct?.totalRevenue || '0').toLocaleString()} in revenue.`,
      type: 'analytics',
      data: bestSellers.map(product => ({
        type: 'products',
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
          type: 'products',
          title: 'Low Stock Products',
          value: lowStockProducts
        },
        {
          type: 'products',
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
          type: 'customers',
          title: 'Total Customers',
          value: totalCustomers
        },
        {
          type: 'customers',
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
    for (const product of products) {
      const name = product.name.toLowerCase();
      if (lowerMessage.includes(name)) {
        // Exact or substring match
        return product.name;
      }
      // Fuzzy: count how many words from the product name appear in the message
      const nameWords = name.split(/\s+/);
      let matchCount = 0;
      for (const word of nameWords) {
        if (lowerMessage.includes(word)) matchCount++;
      }
      const score = matchCount / nameWords.length;
      if (score > bestMatch.score && score > 0.5) {
        bestMatch = { name: product.name, score };
      }
    }
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
      type: 'products',
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
      type: 'products',
      title: `${productName} - ${timeRange.label.charAt(0).toUpperCase() + timeRange.label.slice(1)}`,
      value: `${parseInt(timeRangeSales?.totalSold || '0')} units sold`,
      details: [{
        name: productName,
        totalSold: parseInt(timeRangeSales?.totalSold || '0'),
        totalRevenue: parseFloat(timeRangeSales?.totalRevenue || '0')
      }]
    });

    data.push({
      type: 'products',
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
        type: 'customers',
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
      type: 'customers',
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
      type: 'orders',
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
        type: 'orders',
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
      type: 'revenue',
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
      type: 'revenue',
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
        type: 'products',
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
        type: 'products',
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
        type: 'products',
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
      type: 'orders',
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
      type: 'revenue',
      title: `Revenue (${timeRange.label})`,
      value: `$${parseFloat(revenue?.total || '0').toLocaleString()}`,
      change: 0
    });

    // Customers
    const totalCustomers = await this.userRepository.count();
    data.push({
      type: 'customers',
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
        type: 'products',
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
        type: 'products',
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
        type: 'products',
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
      type: 'revenue',
      title: `Revenue Trend (${timeRange.label})`,
      value: `$${currentRevenue.toLocaleString()}`,
      change: Math.round(change * 100) / 100
    });

    return data;
  }
} 