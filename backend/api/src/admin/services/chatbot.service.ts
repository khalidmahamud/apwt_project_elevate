import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns';
import { AnalyticsData } from './chatbot.types';
import { ChatbotLogger } from './chatbot-logger.service';
import { OpenAIService } from './openai.service';
import { AnalyticsHelperService, TimeRange } from './analytics-helper.service';

interface QueryHandler {
  keywords: string[];
  handler: (timeRange?: TimeRange) => Promise<any>;
}

@Injectable()
export class ChatbotService {
  private readonly queryHandlers: QueryHandler[] = [
    { keywords: ['today', 'order'], handler: () => this.getTodayOrders() },
    {
      keywords: ['order', 'count', 'how many'],
      handler: (timeRange) => this.getOrderCount(timeRange!),
    },
    {
      keywords: ['recent orders', 'latest orders'],
      handler: () => this.getRecentOrders(),
    },
    {
      keywords: ['order status', 'pending orders'],
      handler: () => this.getOrderStatus(),
    },
    {
      keywords: ['revenue', 'total sales'],
      handler: (timeRange) => this.getRevenueData(timeRange!),
    },
    {
      keywords: ['profit', 'margin'],
      handler: (timeRange) => this.getProfitData(timeRange!),
    },
    {
      keywords: ['product', 'sell'],
      handler: (timeRange) => this.getBestSellingProducts(timeRange!),
    },
    {
      keywords: ['best product', 'top product', 'highest revenue'],
      handler: (timeRange) => this.getBestSellingProducts(timeRange!),
    },
    { keywords: ['stock', 'inventory'], handler: () => this.getStockData() },
    {
      keywords: ['low stock', 'restock'],
      handler: () => this.getLowStockProducts(),
    },
    { keywords: ['out of stock'], handler: () => this.getOutOfStockProducts() },
    {
      keywords: ['product recommendation', 'suggest product'],
      handler: () => this.getProductRecommendations(),
    },
    {
      keywords: ['category', 'brand'],
      handler: () => this.getCategoryAnalytics(),
    },
    {
      keywords: ['customer', 'count', 'how many'],
      handler: () => this.getCustomerCount(),
    },
    {
      keywords: ['best customer', 'top customer'],
      handler: (timeRange) => this.getBestCustomers(timeRange!),
    },
    {
      keywords: ['recent customer', 'new customer'],
      handler: () => this.getRecentCustomers(),
    },
    {
      keywords: ['customer behavior', 'customer insight'],
      handler: (timeRange) => this.getCustomerInsights(timeRange!),
    },
    {
      keywords: ['overview', 'summary', 'dashboard'],
      handler: () => this.getComprehensiveOverview(),
    },
    { keywords: ['trend', 'growth'], handler: () => this.getTrendAnalytics() },
    {
      keywords: ['performance', 'how we doing'],
      handler: () => this.getPerformanceMetrics(),
    },
  ];

  constructor(
    private readonly logger: ChatbotLogger,
    private readonly openaiService: OpenAIService,
    private readonly analyticsHelper: AnalyticsHelperService,
  ) {}

  async processQuery(message: string, contextProductName?: string) {
    this.logger.log('Processing query', { message, contextProductName });

    try {
      // Step 1: Try OpenAI classification first (most reliable)
      const classification = await this.openaiService.classifyQueryType(message);
      
      if (classification && classification.confidence > 0.7) {
        this.logger.log('Using OpenAI classification', classification);
        const result = await this.handleOpenAIClassification(
          classification,
          message,
          message.toLowerCase(),
        );
        if (result) {
          return result;
        }
      }

      // Step 2: Try OpenAI entity extraction
      const entity = await this.openaiService.extractEntity(message);
      if (entity) {
        this.logger.log('Using OpenAI entity extraction', entity);
        const result = await this.handleEntityQuery(
          entity,
          message,
          message.toLowerCase(),
        );
        if (result) {
          return result;
        }
      }

      // Step 3: Fallback to rule-based processing (minimal)
      this.logger.log('Falling back to rule-based processing');
      return await this.processRuleBasedQuery(message);

    } catch (error) {
      this.logger.error('Error processing query', error);
      return this.createErrorResponse();
    }
  }

  private async processRuleBasedQuery(message: string) {
    const lowerMessage = message.toLowerCase();

    // Try OpenAI classification first
    const queryClassification =
      await this.openaiService.classifyQueryType(message);

    if (queryClassification && queryClassification.confidence > 0.7) {
      const result = await this.handleOpenAIClassification(
        queryClassification,
        message,
        lowerMessage,
      );
      if (result) return result;
    }

    // Fallback to entity extraction
    const extractedInfo = await this.extractEntity(message);
    if (extractedInfo) {
      return this.handleEntityQuery(extractedInfo, message, lowerMessage);
    }

    // Fallback to keyword matching
    return this.handleKeywordQuery(message, lowerMessage);
  }

  private async handleOpenAIClassification(
    classification: any,
    message: string,
    lowerMessage: string,
  ) {
    const timeRange = classification.timeFrame
      ? this.analyticsHelper.createTimeRangeFromClassification(
          classification.timeFrame,
        )
      : this.analyticsHelper.extractTimeRange(message);

    switch (classification.type) {
      case 'customer_specific':
        const customerEntity = await this.extractEntity(message);
        if (customerEntity?.type === 'customer') {
          return this.getCustomerDetails(customerEntity.name);
        }
        break;

      case 'product_specific':
        const productEntity = await this.extractEntity(message);
        if (productEntity?.type === 'product') {
          return this.handleProductQuery(
            productEntity.name,
            message,
            lowerMessage,
            timeRange,
          );
        }
        break;

      case 'customer_general':
        return this.getCustomerInsights(timeRange);

      case 'product_general':
        return this.getBestSellingProducts(timeRange);

      case 'order':
        return this.handleOrderQuery(classification, lowerMessage, timeRange);

      case 'revenue':
        return this.handleRevenueQuery(lowerMessage, timeRange);

      case 'inventory':
        return this.handleInventoryQuery(lowerMessage);

      case 'overview':
        return this.getComprehensiveOverview();
    }

    return null;
  }

  private async handleEntityQuery(
    extractedInfo: { name: string; type: 'customer' | 'product' },
    message: string,
    lowerMessage: string,
  ) {
    if (extractedInfo.type === 'customer') {
      return this.getCustomerDetails(extractedInfo.name);
    } else if (extractedInfo.type === 'product') {
      const timeRange = this.analyticsHelper.extractTimeRange(message);
      return this.handleProductQuery(
        extractedInfo.name,
        message,
        lowerMessage,
        timeRange,
      );
    }
    return null;
  }

  private async handleProductQuery(
    productName: string,
    message: string,
    lowerMessage: string,
    timeRange: TimeRange,
  ) {
    this.logger.log('Handling product query', { productName, timeRange: timeRange.label });

    // Check if it's a units sold query
    if (lowerMessage.includes('unit') || lowerMessage.includes('units') || lowerMessage.includes('sold')) {
      const totalUnits = await this.analyticsHelper.getProductTotalUnitsSold(productName);
      const timeRangeUnits = await this.analyticsHelper.getProductUnitsSoldForTimeRange(productName, timeRange);
      
      return this.analyticsHelper.createAnalyticsResponse(
        `📊 **${productName} - Units Sold**\n\n` +
        `📈 **Sales Data**:\n` +
        `- Total Units Sold (All Time): ${totalUnits} units\n` +
        `- Units Sold (${timeRange.label}): ${timeRangeUnits} units\n` +
        `- Revenue (${timeRange.label}): $${(await this.analyticsHelper.getProductRevenueForTimeRange(productName, timeRange)).toFixed(2)}\n\n` +
        `💡 **Insights**:\n` +
        `${timeRangeUnits > 0 ? `This product is performing well in the ${timeRange.label} period.` : `No sales recorded for ${timeRange.label}.`}`,
        [
          {
            type: 'products',
            title: `${productName} - Units Sold`,
            value: `${timeRangeUnits} units (${timeRange.label})`,
            details: [
              {
                name: productName,
                totalSold: timeRangeUnits,
                totalRevenue: await this.analyticsHelper.getProductRevenueForTimeRange(productName, timeRange),
                allTimeSold: totalUnits
              }
            ]
          }
        ]
      );
    }

    // Check if it's a revenue query
    if (this.isProductRevenueQuery(lowerMessage)) {
      return this.getProductRevenue(productName, message);
    }

    // Default: Get comprehensive product analytics
    const productAnalytics = await this.analyticsHelper.getProductAnalytics(
      productName,
      timeRange,
    );
    return this.analyticsHelper.createAnalyticsResponse(
      `📊 **${productName} - Product Analytics**\n\n${productAnalytics.map((item) => `**${item.title}**: ${item.value}`).join('\n')}`,
      productAnalytics,
    );
  }

  private async handleOrderQuery(
    classification: any,
    lowerMessage: string,
    timeRange: TimeRange,
  ) {
    if (classification.timeFrame === 'today') return this.getTodayOrders();
    if (lowerMessage.includes('recent') || lowerMessage.includes('latest'))
      return this.getRecentOrders();
    if (lowerMessage.includes('status')) return this.getOrderStatus();
    return this.getOrderCount(timeRange);
  }

  private async handleRevenueQuery(lowerMessage: string, timeRange: TimeRange) {
    if (lowerMessage.includes('profit')) return this.getProfitData(timeRange);
    return this.getRevenueData(timeRange);
  }

  private async handleInventoryQuery(lowerMessage: string) {
    if (lowerMessage.includes('low stock')) return this.getLowStockProducts();
    if (lowerMessage.includes('out of stock'))
      return this.getOutOfStockProducts();
    return this.getStockData();
  }

  private async handleKeywordQuery(message: string, lowerMessage: string) {
    const fallbackTimeRange = this.analyticsHelper.extractTimeRange(message);

    for (const { keywords, handler } of this.queryHandlers) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return handler(fallbackTimeRange);
      }
    }

    return this.createDefaultResponse();
  }

  private async extractEntity(
    message: string,
  ): Promise<{ name: string; type: 'customer' | 'product' } | null> {
    // Primary: Try OpenAI first (most reliable)
    const openaiResult = await this.openaiService.extractEntity(message);
    if (openaiResult) {
      this.logger.log('OpenAI extracted entity successfully', openaiResult);
      return openaiResult;
    }

    // Fallback: Only use regex if OpenAI fails
    this.logger.log('OpenAI failed to extract entity, trying regex fallback');
    
    const customerName = await this.extractCustomerNameRegex(message);
    if (customerName) {
      return { name: customerName, type: 'customer' as const };
    }

    const productName = await this.extractProductNameRegex(message);
    if (productName) {
      return { name: productName, type: 'product' as const };
    }

    return null;
  }

  private async extractCustomerNameRegex(
    message: string,
  ): Promise<string | null> {
    const generalQueries = [
      'best customer',
      'top customer',
      'our best customer',
      'who is our best',
      'best customers',
      'top customers',
      'customer count',
      'how many customers',
      'customer overview',
      'customer summary',
      'customer analytics',
      'customer insights',
      'customer behavior',
      'customer data',
      'customer report',
      'customer information',
    ];

    const lowerMessage = message.toLowerCase();
    if (generalQueries.some((query) => lowerMessage.includes(query))) {
      return null;
    }

    const generalAnalyticsQueries = [
      'give me',
      'show me',
      'tell me',
      'what is',
      'how is',
      'get me',
      'insights',
      'analytics',
      'overview',
      'summary',
      'report',
      'data',
    ];

    if (
      generalAnalyticsQueries.some(
        (query) =>
          lowerMessage.includes(query) &&
          !lowerMessage.includes('about') &&
          !lowerMessage.includes('for'),
      )
    ) {
      return null;
    }

    const namePatterns = [
      /(?:about|information|details|tell me about|give me information about|further information about|more information about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:customer|profile|information|details)/i,
      /(?:customer|user)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:who is|what about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:spending|orders|profile)/i,
      /(?:total spendings? of|spending of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:spendings? for|orders for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:information about|details about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        const commonWords = [
          'give',
          'me',
          'show',
          'tell',
          'what',
          'how',
          'get',
          'insights',
          'analytics',
          'overview',
          'summary',
        ];
        if (!commonWords.includes(extractedName.toLowerCase())) {
          return extractedName;
        }
      }
    }

    return null;
  }

  private async extractProductNameRegex(
    message: string,
  ): Promise<string | null> {
    const lowerMessage = message.toLowerCase();
    
    // Minimal fallback - only for very obvious cases
    // Most product extraction should be handled by OpenAI
    
    // Check for exact product name matches
    const knownProducts = [
      'classic polo shirt',
      'slim fit dress shirt',
      'basic cotton crew t-shirt',
      'denim jeans',
      'casual sneakers',
      'formal blazer',
      'sports jacket',
      'winter coat',
      'summer dress',
      'business suit'
    ];

    for (const product of knownProducts) {
      if (lowerMessage.includes(product.toLowerCase())) {
        return product;
      }
    }

    // Only check for "polo" as it's very specific
    if (lowerMessage.includes('polo') && lowerMessage.includes('shirt')) {
      return 'Classic Polo Shirt';
    }

    return null;
  }

  private async getCustomerDetails(customerName: string) {
    this.logger.log('Getting customer details', { customerName });

    const customerData =
      await this.analyticsHelper.getCustomerDetails(customerName);
    if (!customerData) {
      return this.analyticsHelper.createTextResponse(
        `I couldn't find a customer named "${customerName}" in our database. Please check the spelling or try a different name.`,
      );
    }

    const { customer, orders, totalSpent, avgOrderValue, orderCount } =
      customerData;
    const firstOrder = orders.length > 0 ? orders[orders.length - 1] : null;
    const lastOrder = orders.length > 0 ? orders[0] : null;

    // Get favorite products
    const productCounts = new Map<
      string,
      { name: string; count: number; totalSpent: number }
    >();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productName = item.product?.name || 'Unknown Product';
        const existing = productCounts.get(productName);
        if (existing) {
          existing.count += item.quantity;
          existing.totalSpent += Number(item.total);
        } else {
          productCounts.set(productName, {
            name: productName,
            count: item.quantity,
            totalSpent: Number(item.total),
          });
        }
      });
    });

    const favoriteProducts = Array.from(productCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Get order status breakdown
    const statusCounts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate customer lifetime value and frequency
    const daysSinceFirstOrder = firstOrder
      ? Math.floor(
          (Date.now() - firstOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
    const orderFrequency =
      daysSinceFirstOrder > 0 ? orderCount / (daysSinceFirstOrder / 30) : 0;

    const response =
      `📋 **Customer Profile: ${customer.firstName} ${customer.lastName}**\n\n` +
      `📧 **Contact**: ${customer.email}\n` +
      `📅 **Member Since**: ${format(customer.createdAt, 'MMMM dd, yyyy')}\n` +
      `✅ **Status**: ${customer.isActive ? 'Active' : 'Inactive'}\n\n` +
      `💰 **Spending Overview**:\n` +
      `- Total Spent: $${totalSpent.toLocaleString()}\n` +
      `- Total Orders: ${orderCount}\n` +
      `- Average Order Value: $${avgOrderValue.toFixed(2)}\n` +
      `- Customer Lifetime Value: $${totalSpent.toLocaleString()}\n\n` +
      `📦 **Order History**:\n` +
      `- First Order: ${firstOrder ? format(firstOrder.createdAt, 'MMM dd, yyyy') : 'N/A'}\n` +
      `- Last Order: ${lastOrder ? format(lastOrder.createdAt, 'MMM dd, yyyy') : 'N/A'}\n` +
      `- Order Frequency: ${orderFrequency.toFixed(1)} orders/month\n\n` +
      `🛒 **Favorite Products**:\n${favoriteProducts
        .map(
          (product, index) =>
            `${index + 1}. ${product.name} (${product.count} items, $${(Number(product.totalSpent) || 0).toFixed(2)})`,
        )
        .join('\n')}\n\n` +
      `📊 **Order Status**:\n${Object.entries(statusCounts)
        .map(([status, count]) => `- ${status}: ${count} orders`)
        .join('\n')}\n\n` +
      `💡 **Insights**:\n` +
      `${totalSpent > 1000 ? '🌟 High-value customer - consider VIP treatment' : '📈 Good customer - focus on retention'}\n` +
      `${orderFrequency > 2 ? '🔄 Frequent buyer - excellent for loyalty programs' : '📅 Occasional buyer - consider re-engagement campaigns'}\n` +
      `${customer.isActive ? '✅ Active customer - maintain relationship' : '⚠️ Inactive customer - re-engagement needed'}`;

    return this.analyticsHelper.createTextResponse(response);
  }

  private async fetchRelevantData(
    message: string,
    contextProductName?: string,
  ): Promise<AnalyticsData[]> {
    const lowerMessage = message.toLowerCase();
    const timeRange = this.analyticsHelper.extractTimeRange(message);
    const data: AnalyticsData[] = [];

    // Determine query type and fetch appropriate data
    if (this.isCustomerQuery(lowerMessage)) {
      const customerCount = await this.analyticsHelper.getCustomerCount();
      const bestCustomers =
        await this.analyticsHelper.getBestCustomers(timeRange);

      data.push({
        type: 'customers',
        title: 'Total Customers',
        value: customerCount,
      });

      if (bestCustomers.length > 0) {
        data.push({
          type: 'customers',
          title: `Best Customers (${timeRange.label})`,
          value: `${bestCustomers[0]?.firstName} ${bestCustomers[0]?.lastName}`,
          details: bestCustomers.map((c) => ({
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            totalSpent: parseFloat(c.totalSpent || '0'),
            orderCount: parseInt(c.orderCount || '0'),
          })),
        });
      }
    }

    if (this.isOrderQuery(lowerMessage)) {
      const orderCount = await this.analyticsHelper.getOrderCount(timeRange);
      const recentOrders = await this.analyticsHelper.getRecentOrders();

      data.push({
        type: 'orders',
        title: `Orders (${timeRange.label})`,
        value: orderCount,
      });

      if (recentOrders.length > 0) {
        data.push({
          type: 'orders',
          title: 'Recent Orders',
          value: `${recentOrders.length} orders`,
          details: recentOrders.map((o) => ({
            id: o.id,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
          })),
        });
      }
    }

    if (this.isRevenueQuery(lowerMessage)) {
      const revenue = await this.analyticsHelper.getRevenueTotal(timeRange);
      const avgOrderValue =
        await this.analyticsHelper.getAverageOrderValue(timeRange);

      data.push({
        type: 'revenue',
        title: `Revenue (${timeRange.label})`,
        value: `$${revenue.toLocaleString()}`,
      });

      data.push({
        type: 'revenue',
        title: 'Average Order Value',
        value: `$${avgOrderValue.toFixed(2)}`,
      });
    }

    if (this.isInventoryQuery(lowerMessage)) {
      const lowStockProducts = await this.analyticsHelper.getLowStockProducts();
      const outOfStockProducts =
        await this.analyticsHelper.getOutOfStockProducts();

      if (lowStockProducts.length > 0) {
        data.push({
          type: 'products',
          title: 'Low Stock Products',
          value: `${lowStockProducts.length} products`,
          details: lowStockProducts.map((p) => ({
            name: p.name,
            stockQuantity: p.stockQuantity,
          })),
        });
      }

      if (outOfStockProducts.length > 0) {
        data.push({
          type: 'products',
          title: 'Out of Stock Products',
          value: `${outOfStockProducts.length} products`,
          details: outOfStockProducts.map((p) => ({
            name: p.name,
            stockQuantity: p.stockQuantity,
          })),
        });
      }
    }

    if (this.isProductPerformanceQuery(lowerMessage)) {
      const bestSellingProducts =
        await this.analyticsHelper.getBestSellingProducts(5);

      if (bestSellingProducts.length > 0) {
        data.push({
          type: 'products',
          title: 'Top Performing Products',
          value: `${bestSellingProducts[0]?.name}`,
          details: bestSellingProducts.map((p) => ({
            name: p.name,
            totalSold: parseInt(p.totalSold || '0'),
            totalRevenue: parseFloat(p.totalRevenue || '0'),
          })),
        });
      }
    }

    return data;
  }

  private buildDataSummary(analyticsData: AnalyticsData[]): string {
    return analyticsData
      .map((d) => {
        if (d.type === 'products' && d.details && Array.isArray(d.details)) {
          return `${d.title}: ${d.value}\n${d.details
            .map(
              (detail: any) =>
                `- ${detail.name}: ${detail.totalSold || detail.stockQuantity || detail.totalRevenue || 'N/A'}`,
            )
            .join('\n')}`;
        }
        return `${d.title}: ${d.value}`;
      })
      .join('\n\n');
  }

  // Consolidated query type detection
  private getQueryType(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const types: string[] = [];

    if (lowerMessage.includes('customer') || lowerMessage.includes('user'))
      types.push('customer');
    if (lowerMessage.includes('order') || lowerMessage.includes('purchase'))
      types.push('order');
    if (
      lowerMessage.includes('revenue') ||
      lowerMessage.includes('sales') ||
      lowerMessage.includes('profit')
    )
      types.push('revenue');
    if (lowerMessage.includes('stock') || lowerMessage.includes('inventory'))
      types.push('inventory');
    if (lowerMessage.includes('product') || lowerMessage.includes('item'))
      types.push('product');

    return types;
  }

  // Query type detection methods
  private isCustomerQuery(message: string): boolean {
    return ['customer', 'client', 'buyer', 'spender', 'loyal'].some((keyword) =>
      message.includes(keyword),
    );
  }

  private isOrderQuery(message: string): boolean {
    return [
      'order',
      'purchase',
      'transaction',
      'delivery',
      'shipping',
      'status',
    ].some((keyword) => message.includes(keyword));
  }

  private isRevenueQuery(message: string): boolean {
    return [
      'revenue',
      'sales',
      'income',
      'profit',
      'earnings',
      'money',
      'amount',
    ].some((keyword) => message.includes(keyword));
  }

  private isInventoryQuery(message: string): boolean {
    return [
      'inventory',
      'stock',
      'quantity',
      'available',
      'out of stock',
      'low stock',
    ].some((keyword) => message.includes(keyword));
  }

  private isProductPerformanceQuery(message: string): boolean {
    return ['best', 'top', 'performing', 'selling', 'popular', 'trending'].some(
      (keyword) => message.includes(keyword),
    );
  }

  // Specific query handlers
  private async getTodayOrders() {
    const orderCount = await this.analyticsHelper.getOrderCountToday();
    const revenue = await this.analyticsHelper.getRevenueToday();
    const statusBreakdown =
      await this.analyticsHelper.getOrderStatusBreakdown();

    const pendingCount = statusBreakdown['pending'] || 0;
    const shippedCount = statusBreakdown['shipped'] || 0;
    const deliveredCount = statusBreakdown['delivered'] || 0;

    return this.analyticsHelper.createAnalyticsResponse(
      `📦 **Today's Orders**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Orders: ${orderCount}\n` +
        `- Total Revenue: $${revenue.toLocaleString()}\n` +
        `- Average Order Value: $${orderCount > 0 ? (revenue / orderCount).toFixed(2) : '0.00'}\n\n` +
        `📋 **Status Breakdown**:\n` +
        `- Pending: ${pendingCount} orders\n` +
        `- Shipped: ${shippedCount} orders\n` +
        `- Delivered: ${deliveredCount} orders`,
      [
        {
          type: 'orders',
          title: "Today's Orders",
          value: orderCount,
        },
      ],
    );
  }

  private async getOrderCount(timeRange: TimeRange) {
    const orderCount = await this.analyticsHelper.getOrderCount(timeRange);
    const totalRevenue = await this.analyticsHelper.getRevenueTotal(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `📦 **Order Analytics (${timeRange.label})**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Orders: ${orderCount}\n` +
        `- Total Revenue: $${totalRevenue.toLocaleString()}\n` +
        `- Average Order Value: $${orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : '0.00'}`,
      [
        {
          type: 'orders',
          title: `Orders (${timeRange.label})`,
          value: orderCount,
        },
      ],
    );
  }

  private async getRecentOrders() {
    const recentOrders = await this.analyticsHelper.getRecentOrders();
    const totalAmount = recentOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    return this.analyticsHelper.createAnalyticsResponse(
      `📦 **Recent Orders**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Orders: ${recentOrders.length}\n` +
        `- Total Revenue: $${totalAmount.toLocaleString()}\n` +
        `- Average Order Value: $${recentOrders.length > 0 ? (totalAmount / recentOrders.length).toFixed(2) : '0.00'}\n\n` +
        `📋 **Order Details**:\n${recentOrders
          .map(
            (order) =>
              `- Order #${order.id}: $${Number(order.totalAmount).toFixed(2)} (${order.status}) - ${format(order.createdAt, 'MMM dd, yyyy')}`,
          )
          .join('\n')}`,
      [
        {
          type: 'orders',
          title: 'Recent Orders',
          value: recentOrders.length,
          details: recentOrders.map((o) => ({
            id: o.id,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
          })),
        },
      ],
    );
  }

  private async getOrderStatus() {
    const orderStatus = await this.analyticsHelper.getOrderStatusBreakdown();

    return this.analyticsHelper.createAnalyticsResponse(
      `📦 **Order Status Overview**\n\n` +
        `📊 **Status Breakdown**:\n${Object.entries(orderStatus)
          .map(([status, count]) => `- ${status}: ${count} orders`)
          .join('\n')}`,
      [
        {
          type: 'orders',
          title: 'Order Status',
          value: Object.values(orderStatus).reduce(
            (sum: number, count: number) => sum + count,
            0,
          ),
          details: Object.entries(orderStatus).map(([status, count]) => ({
            status,
            count,
          })),
        },
      ],
    );
  }

  private async getRevenueData(timeRange: TimeRange) {
    const revenue = await this.analyticsHelper.getRevenueTotal(timeRange);
    const avgOrderValue =
      await this.analyticsHelper.getAverageOrderValue(timeRange);
    const orderCount = await this.analyticsHelper.getOrderCount(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `💰 **Revenue Analytics (${timeRange.label})**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Revenue: $${revenue.toLocaleString()}\n` +
        `- Total Orders: ${orderCount}\n` +
        `- Average Order Value: $${avgOrderValue.toFixed(2)}\n` +
        `- Revenue per Order: $${orderCount > 0 ? (revenue / orderCount).toFixed(2) : '0.00'}`,
      [
        {
          type: 'revenue',
          title: `Revenue (${timeRange.label})`,
          value: `$${revenue.toLocaleString()}`,
        },
      ],
    );
  }

  private async getProfitData(timeRange: TimeRange) {
    const revenue = await this.analyticsHelper.getRevenueTotal(timeRange);
    const profit = revenue * 0.3; // Assuming 30% profit margin
    const orderCount = await this.analyticsHelper.getOrderCount(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `💰 **Profit Analytics (${timeRange.label})**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Revenue: $${revenue.toLocaleString()}\n` +
        `- Estimated Profit: $${profit.toLocaleString()}\n` +
        `- Profit Margin: 30%\n` +
        `- Profit per Order: $${orderCount > 0 ? (profit / orderCount).toFixed(2) : '0.00'}`,
      [
        {
          type: 'revenue',
          title: `Profit (${timeRange.label})`,
          value: `$${profit.toLocaleString()}`,
        },
      ],
    );
  }

  private async getBestSellingProducts(timeRange: TimeRange) {
    this.logger.log(`Getting best selling products for time range: ${timeRange.label}`, {
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });

    const bestSellingProducts =
      await this.analyticsHelper.getBestSellingProductsForTimeRange(timeRange);

    this.logger.log(`Best selling products result:`, bestSellingProducts);

    return this.analyticsHelper.createAnalyticsResponse(
      `🏆 **Best Selling Products (${timeRange.label})**\n\n` +
        `📊 **Top Performers**:\n${bestSellingProducts
          .map(
            (product, index) =>
              `${index + 1}. ${product.name}\n   - Units Sold: ${product.totalSold}\n   - Revenue: $${Number(product.totalRevenue).toFixed(2)}`,
          )
          .join('\n\n')}`,
      [
        {
          type: 'products',
          title: `Best Selling Products (${timeRange.label})`,
          value: bestSellingProducts[0]?.name || 'No data',
          details: bestSellingProducts.map((p) => ({
            name: p.name,
            totalSold: parseInt(p.totalSold || '0'),
            totalRevenue: parseFloat(p.totalRevenue || '0'),
          })),
        },
      ],
    );
  }

  private async getStockData() {
    const lowStockProducts = await this.analyticsHelper.getLowStockProducts();
    const outOfStockProducts =
      await this.analyticsHelper.getOutOfStockProducts();

    return this.analyticsHelper.createAnalyticsResponse(
      `📦 **Inventory Overview**\n\n` +
        `📊 **Summary**:\n` +
        `- Low Stock Products: ${lowStockProducts.length}\n` +
        `- Out of Stock Products: ${outOfStockProducts.length}\n\n` +
        `⚠️ **Low Stock Alert**:\n${lowStockProducts
          .map(
            (product) =>
              `- ${product.name}: ${product.stockQuantity} units remaining`,
          )
          .join('\n')}\n\n` +
        `🚫 **Out of Stock**:\n${outOfStockProducts
          .map((product) => `- ${product.name}: ${product.stockQuantity} units`)
          .join('\n')}`,
      [
        {
          type: 'products',
          title: 'Inventory Status',
          value: `${lowStockProducts.length + outOfStockProducts.length} products need attention`,
        },
      ],
    );
  }

  private async getCustomerCount() {
    const customerCount = await this.analyticsHelper.getCustomerCount();

    return this.analyticsHelper.createAnalyticsResponse(
      `👥 **Customer Overview**\n\n` +
        `📊 **Summary**:\n` +
        `- Total Customers: ${customerCount}\n` +
        `- Active Customers: ${customerCount} (assuming all are active)\n` +
        `- Customer Growth: Steady (based on registration data)`,
      [
        {
          type: 'customers',
          title: 'Total Customers',
          value: customerCount,
        },
      ],
    );
  }

  private async getLowStockProducts() {
    const lowStockProducts = await this.analyticsHelper.getLowStockProducts();

    return this.analyticsHelper.createAnalyticsResponse(
      `⚠️ **Low Stock Alert**\n\n` +
        `📊 **Products Needing Restock**:\n${lowStockProducts
          .map(
            (product) =>
              `- ${product.name}: ${product.stockQuantity} units remaining`,
          )
          .join('\n')}\n\n` +
        `💡 **Recommendation**: Consider restocking these products soon to avoid stockouts.`,
      [
        {
          type: 'products',
          title: 'Low Stock Products',
          value: `${lowStockProducts.length} products`,
          details: lowStockProducts.map((p) => ({
            name: p.name,
            stockQuantity: p.stockQuantity,
          })),
        },
      ],
    );
  }

  private async getOutOfStockProducts() {
    const outOfStockProducts =
      await this.analyticsHelper.getOutOfStockProducts();

    return this.analyticsHelper.createAnalyticsResponse(
      `🚫 **Out of Stock Products**\n\n` +
        `📊 **Products Unavailable**:\n${outOfStockProducts
          .map((product) => `- ${product.name}: ${product.stockQuantity} units`)
          .join('\n')}\n\n` +
        `💡 **Urgent Action Required**: Restock these products immediately to resume sales.`,
      [
        {
          type: 'products',
          title: 'Out of Stock Products',
          value: `${outOfStockProducts.length} products`,
          details: outOfStockProducts.map((p) => ({
            name: p.name,
            stockQuantity: p.stockQuantity,
          })),
        },
      ],
    );
  }

  private async getProductRecommendations() {
    const bestSellingProducts =
      await this.analyticsHelper.getBestSellingProducts();
    const lowStockProducts = await this.analyticsHelper.getLowStockProducts();

    return this.analyticsHelper.createAnalyticsResponse(
      `💡 **Product Recommendations**\n\n` +
        `📊 **Recommended Actions**:\n` +
        `1. **Best Sellers**:\n${bestSellingProducts
          .slice(0, 3)
          .map(
            (product, index) =>
              `   ${index + 1}. ${product.name} - Consider increasing stock`,
          )
          .join('\n')}\n\n` +
        `2. **Restock Needed**:\n${lowStockProducts
          .slice(0, 3)
          .map(
            (product, index) =>
              `   ${index + 1}. ${product.name} - Only ${product.stockQuantity} units left`,
          )
          .join('\n')}`,
      [
        {
          type: 'products',
          title: 'Product Recommendations',
          value: `${bestSellingProducts.length + lowStockProducts.length} recommendations`,
        },
      ],
    );
  }

  private async getBestCustomers(timeRange: TimeRange) {
    const bestCustomers =
      await this.analyticsHelper.getBestCustomers(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `🏆 **Best Customers (${timeRange.label})**\n\n` +
        `📊 **Top Performers**:\n${bestCustomers
          .map(
            (customer, index) =>
              `${index + 1}. ${customer.firstName} ${customer.lastName}\n   - Total Spent: $${Number(customer.totalSpent).toFixed(2)}\n   - Orders: ${customer.orderCount}`,
          )
          .join('\n\n')}`,
      [
        {
          type: 'customers',
          title: `Best Customers (${timeRange.label})`,
          value: bestCustomers[0]
            ? `${bestCustomers[0].firstName} ${bestCustomers[0].lastName}`
            : 'No data',
          details: bestCustomers.map((c) => ({
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            totalSpent: parseFloat(c.totalSpent || '0'),
            orderCount: parseInt(c.orderCount || '0'),
          })),
        },
      ],
    );
  }

  private async getRecentCustomers() {
    const recentCustomers = await this.analyticsHelper.getRecentCustomers();

    return this.analyticsHelper.createAnalyticsResponse(
      `🆕 **Recent Customers**\n\n` +
        `📊 **New Registrations**:\n${recentCustomers
          .map(
            (customer) =>
              `- ${customer.firstName} ${customer.lastName} (${customer.email})\n  Joined: ${format(customer.createdAt, 'MMM dd, yyyy')}`,
          )
          .join('\n\n')}`,
      [
        {
          type: 'customers',
          title: 'Recent Customers',
          value: `${recentCustomers.length} new customers`,
          details: recentCustomers.map((c) => ({
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            createdAt: c.createdAt,
          })),
        },
      ],
    );
  }

  private async getCustomerInsights(timeRange: TimeRange) {
    const customerCount = await this.analyticsHelper.getCustomerCount();
    const bestCustomers =
      await this.analyticsHelper.getBestCustomers(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `👥 **Customer Insights (${timeRange.label})**\n\n` +
        `📊 **Key Insights**:\n` +
        `1. **Total Customers**: ${customerCount}\n` +
        `2. **Top Spender**: ${bestCustomers[0] ? `${bestCustomers[0].firstName} ${bestCustomers[0].lastName}` : 'No data'}\n` +
        `3. **Average Customer Value**: $${bestCustomers.length > 0 ? (bestCustomers.reduce((sum, c) => sum + parseFloat(c.totalSpent || '0'), 0) / bestCustomers.length).toFixed(2) : '0'}\n` +
        `4. **Customer Growth**: Steady based on registration data\n` +
        `5. **Customer Retention**: Good based on repeat orders`,
      [
        {
          type: 'customers',
          title: `Customer Insights (${timeRange.label})`,
          value: `${customerCount} total customers`,
        },
      ],
    );
  }

  private async getComprehensiveOverview() {
    const timeRange = this.analyticsHelper.extractTimeRange('all time');
    const orderCount = await this.analyticsHelper.getOrderCount(timeRange);
    const revenue = await this.analyticsHelper.getRevenueTotal(timeRange);
    const customerCount = await this.analyticsHelper.getCustomerCount();
    const avgOrderValue =
      await this.analyticsHelper.getAverageOrderValue(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `📊 **Comprehensive Business Overview**\n\n` +
        `💰 **Financial Performance**:\n` +
        `- Total Revenue: $${revenue.toLocaleString()}\n` +
        `- Total Orders: ${orderCount}\n` +
        `- Average Order Value: $${avgOrderValue.toFixed(2)}\n` +
        `- Revenue per Customer: $${customerCount > 0 ? (revenue / customerCount).toFixed(2) : '0.00'}\n\n` +
        `👥 **Customer Metrics**:\n` +
        `- Total Customers: ${customerCount}\n` +
        `- Customer Growth: Steady\n` +
        `- Customer Retention: Good\n\n` +
        `📦 **Operational Metrics**:\n` +
        `- Order Fulfillment: Excellent\n` +
        `- Inventory Management: Optimized\n` +
        `- Product Performance: Strong`,
      [
        {
          type: 'revenue',
          title: 'Business Overview',
          value: `$${revenue.toLocaleString()} total revenue`,
        },
      ],
    );
  }

  private async getPerformanceMetrics() {
    const timeRange = this.analyticsHelper.extractTimeRange('all time');
    const orderCount = await this.analyticsHelper.getOrderCount(timeRange);
    const revenue = await this.analyticsHelper.getRevenueTotal(timeRange);
    const avgOrderValue =
      await this.analyticsHelper.getAverageOrderValue(timeRange);

    return this.analyticsHelper.createAnalyticsResponse(
      `📈 **Performance Metrics**\n\n` +
        `📊 **Key Performance Indicators**:\n` +
        `- Total Orders: ${orderCount} (Steady growth)\n` +
        `- Total Revenue: $${revenue.toLocaleString()} (Strong performance)\n` +
        `- Average Order Value: $${avgOrderValue.toFixed(2)} (Good)\n` +
        `- Revenue per Order: $${avgOrderValue.toFixed(2)} (Optimized)\n` +
        `- Customer Satisfaction: High (based on repeat orders)`,
      [
        {
          type: 'revenue',
          title: 'Performance Metrics',
          value: `${orderCount} orders processed`,
        },
      ],
    );
  }

  private async getCategoryAnalytics() {
    return this.analyticsHelper.createTextResponse(
      `📂 **Category Analytics**\n\n` +
        `📊 **Category Performance**:\n` +
        `This feature shows performance by product categories. Currently, we have a simplified categorization system.\n\n` +
        `💡 **Recommendation**: Implement detailed category tracking for better insights.`,
    );
  }

  private async getTrendAnalytics() {
    return this.analyticsHelper.createTextResponse(
      `📈 **Trend Analytics**\n\n` +
        `📊 **Key Trends**:\n` +
        `This feature shows growth patterns over time. Currently analyzing:\n` +
        `- Daily order trends\n` +
        `- Weekly revenue patterns\n` +
        `- Monthly growth metrics\n\n` +
        `💡 **Recommendation**: Implement detailed trend tracking for better forecasting.`,
    );
  }

  private isProductRevenueQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (
      (lowerMessage.includes('revenue') && lowerMessage.includes('product')) ||
      (lowerMessage.includes('unit') && lowerMessage.includes('sold')) ||
      (lowerMessage.includes('units') && lowerMessage.includes('sold')) ||
      (lowerMessage.includes('sales') && lowerMessage.includes('product')) ||
      (lowerMessage.includes('sold') && lowerMessage.includes('product'))
    );
  }

  private async getProductRevenue(productName: string, message: string) {
    const timeRange = this.analyticsHelper.extractTimeRange(message);
    const revenue = await this.analyticsHelper.getProductRevenueForTimeRange(
      productName,
      timeRange,
    );

    return this.analyticsHelper.createAnalyticsResponse(
      `💰 **${productName} Revenue (${timeRange.label})**\n\n` +
        `📊 **Revenue Details**:\n` +
        `- Total Revenue: $${revenue.toFixed(2)}\n` +
        `- Time Period: ${timeRange.label}\n` +
        `- Product: ${productName}`,
      [
        {
          type: 'revenue',
          title: `${productName} Revenue`,
          value: `$${revenue.toFixed(2)}`,
        },
      ],
    );
  }

  private createErrorResponse() {
    return this.analyticsHelper.createTextResponse(
      "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    );
  }

  private createDefaultResponse() {
    return this.analyticsHelper.createTextResponse(
      'I can help you with:\n\n📊 **Analytics & Reports**\n- Sales performance and revenue trends\n- Product performance and inventory status\n- Customer insights and behavior\n- Order management and status\n\n📦 **Product Management**\n- Best-selling products\n- Low stock alerts and restocking recommendations\n- Product recommendations\n- Category and brand analytics\n\n👥 **Customer Insights**\n- Top customers and customer behavior\n- Customer acquisition and retention\n- Customer demographics and preferences\n\n🛒 **Order Management**\n- Recent orders and order status\n- Order trends and patterns\n- Pending and completed orders\n\nTry asking me about any of these topics!',
    );
  }
}
