import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { Users } from '../../users/entities/users.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { AnalyticsData } from './chatbot.types';

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

@Injectable()
export class AnalyticsHelperService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  // Time range utilities
  createTimeRangeFromClassification(
    timeFrame:
      | 'today'
      | 'yesterday'
      | 'this_week'
      | 'last_week'
      | 'this_month'
      | 'last_month'
      | 'all_time',
  ): TimeRange {
    const now = new Date();

    switch (timeFrame) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
          label: 'today',
        };

      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
          label: 'yesterday',
        };

      case 'this_week':
        const startOfWeek = startOfDay(subDays(now, now.getDay()));
        return {
          start: startOfWeek,
          end: endOfDay(now),
          label: 'this week',
        };

      case 'last_week':
        const thisWeekStart = startOfDay(subDays(now, now.getDay()));
        const lastWeekStart = startOfDay(subDays(thisWeekStart, 7));
        const lastWeekEnd = endOfDay(subDays(thisWeekStart, 1));
        return {
          start: lastWeekStart,
          end: lastWeekEnd,
          label: 'last week',
        };

      case 'this_month':
        const startOfMonth = startOfDay(
          new Date(now.getFullYear(), now.getMonth(), 1),
        );
        return {
          start: startOfMonth,
          end: endOfDay(now),
          label: 'this month',
        };

      case 'last_month':
        const lastMonthStart = startOfDay(
          new Date(now.getFullYear(), now.getMonth() - 1, 1),
        );
        const lastMonthEnd = endOfDay(
          new Date(now.getFullYear(), now.getMonth(), 0),
        );
        return {
          start: lastMonthStart,
          end: lastMonthEnd,
          label: 'last month',
        };

      case 'all_time':
      default:
        return {
          start: new Date(0),
          end: endOfDay(now),
          label: 'all time',
        };
    }
  }

  extractTimeRange(message: string): TimeRange {
    const lowerMessage = message.toLowerCase();
    const now = new Date();

    if (lowerMessage.includes('today')) {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'today',
      };
    }

    if (lowerMessage.includes('yesterday')) {
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        label: 'yesterday',
      };
    }

    if (lowerMessage.includes('this week')) {
      const startOfWeek = startOfDay(subDays(now, now.getDay()));
      return {
        start: startOfWeek,
        end: endOfDay(now),
        label: 'this week',
      };
    }

    if (lowerMessage.includes('last week')) {
      const thisWeekStart = startOfDay(subDays(now, now.getDay()));
      const lastWeekStart = startOfDay(subDays(thisWeekStart, 7));
      const lastWeekEnd = endOfDay(subDays(thisWeekStart, 1));
      return {
        start: lastWeekStart,
        end: lastWeekEnd,
        label: 'last week',
      };
    }

    if (lowerMessage.includes('this month')) {
      const startOfMonth = startOfDay(
        new Date(now.getFullYear(), now.getMonth(), 1),
      );
      return {
        start: startOfMonth,
        end: endOfDay(now),
        label: 'this month',
      };
    }

    if (lowerMessage.includes('last month')) {
      const lastMonthStart = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
      );
      const lastMonthEnd = endOfDay(
        new Date(now.getFullYear(), now.getMonth(), 0),
      );
      return {
        start: lastMonthStart,
        end: lastMonthEnd,
        label: 'last month',
      };
    }

    // Default to all time
    return {
      start: new Date(0),
      end: endOfDay(now),
      label: 'all time',
    };
  }

  // Order analytics
  async getOrderCount(timeRange: TimeRange): Promise<number> {
    return this.orderRepository.count({
      where: { createdAt: Between(timeRange.start, timeRange.end) },
    });
  }

  async getOrderCountToday(): Promise<number> {
    return this.orderRepository.count({
      where: { createdAt: MoreThanOrEqual(startOfDay(new Date())) },
    });
  }

  async getRecentOrders(limit: number = 5) {
    return this.orderRepository.find({
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getOrderStatusBreakdown() {
    const orders = await this.orderRepository.find();
    return orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  // Revenue analytics
  async getRevenueTotal(timeRange: TimeRange): Promise<number> {
    const orders = await this.orderRepository.find({
      where: { createdAt: Between(timeRange.start, timeRange.end) },
    });
    return orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  }

  async getRevenueToday(): Promise<number> {
    const orders = await this.orderRepository.find({
      where: { createdAt: MoreThanOrEqual(startOfDay(new Date())) },
    });
    return orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  }

  async getAverageOrderValue(timeRange: TimeRange): Promise<number> {
    const [orders, totalRevenue] = await Promise.all([
      this.getOrderCount(timeRange),
      this.getRevenueTotal(timeRange),
    ]);
    return orders > 0 ? totalRevenue / orders : 0;
  }

  // Product analytics
  async getBestSellingProducts(limit: number = 5) {
    return this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.name', 'name')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .groupBy('product.id, product.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getBestSellingProductsForTimeRange(
    timeRange: TimeRange,
    limit: number = 5,
  ) {
    return this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('product.name', 'name')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      })
      .groupBy('product.id, product.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getLowStockProducts(threshold: number = 10) {
    return this.productRepository.find({
      where: { stockQuantity: Between(1, threshold) },
      order: { stockQuantity: 'ASC' },
    });
  }

  async getOutOfStockProducts() {
    return this.productRepository.find({
      where: { stockQuantity: 0 },
    });
  }

  async getProductAnalytics(
    productName: string,
    timeRange: TimeRange,
  ): Promise<AnalyticsData[]> {
    const data: AnalyticsData[] = [];
    const product = await this.productRepository.findOne({
      where: { name: productName },
    });

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
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      })
      .getRawOne();

    data.push({
      type: 'products',
      title: `${productName} - Total Sales`,
      value: `${parseInt(totalSales?.totalSold || '0')} units sold`,
      details: [
        {
          name: productName,
          totalSold: parseInt(totalSales?.totalSold || '0'),
          totalRevenue: parseFloat(totalSales?.totalRevenue || '0'),
          currentStock: product.stockQuantity,
        },
      ],
    });

    data.push({
      type: 'products',
      title: `${productName} - ${timeRange.label.charAt(0).toUpperCase() + timeRange.label.slice(1)}`,
      value: `${parseInt(timeRangeSales?.totalSold || '0')} units sold`,
      details: [
        {
          name: productName,
          totalSold: parseInt(timeRangeSales?.totalSold || '0'),
          totalRevenue: parseFloat(timeRangeSales?.totalRevenue || '0'),
        },
      ],
    });

    data.push({
      type: 'products',
      title: `${productName} - Current Stock`,
      value: `${product.stockQuantity} units available`,
      details: [
        {
          name: productName,
          stock: product.stockQuantity,
        },
      ],
    });

    return data;
  }

  // Customer analytics
  async getCustomerCount(): Promise<number> {
    return this.userRepository.count();
  }

  async getBestCustomers(timeRange: TimeRange, limit: number = 5) {
    return this.orderRepository
      .createQueryBuilder('order')
      .select('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('SUM(order.totalAmount)', 'totalSpent')
      .addSelect('COUNT(order.id)', 'orderCount')
      .innerJoin('order.user', 'user')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      })
      .groupBy('user.id, user.firstName, user.lastName, user.email')
      .orderBy('SUM(order.totalAmount)', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getRecentCustomers(limit: number = 5) {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getCustomerDetails(customerName: string) {
    const customer = await this.userRepository.findOne({
      where: [
        {
          firstName: customerName.split(' ')[0],
          lastName: customerName.split(' ')[1] || '',
        },
        { firstName: customerName },
        { lastName: customerName },
      ],
    });

    if (!customer) return null;

    const orders = await this.orderRepository.find({
      where: { userId: customer.id },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );
    const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;

    return {
      customer,
      orders,
      totalSpent,
      avgOrderValue,
      orderCount: orders.length,
    };
  }

  // Response builder
  createResponse(
    content: string,
    type: 'text' | 'analytics',
    data?: AnalyticsData[],
  ) {
    return { response: content, type, data };
  }

  createAnalyticsResponse(content: string, data: AnalyticsData[]) {
    return this.createResponse(content, 'analytics', data);
  }

  createTextResponse(content: string) {
    return this.createResponse(content, 'text');
  }

  async getProductRevenueToday(productName: string): Promise<number> {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const result = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('product.name = :productName', { productName })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: startOfToday,
        end: endOfToday,
      })
      .getRawOne();

    return parseFloat(result?.totalRevenue || '0');
  }

  async getProductRevenueForTimeRange(
    productName: string,
    timeRange: TimeRange,
  ): Promise<number> {
    const result = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity * orderItem.price)', 'totalRevenue')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('product.name = :productName', { productName })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      })
      .getRawOne();

    return parseFloat(result?.totalRevenue || '0');
  }

  // Debug method to check database data
  async debugOrderData() {
    const orders = await this.orderRepository.find({
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      take: 10
    });

    const orderItems = await this.orderItemRepository.find({
      relations: ['product', 'order'],
      take: 20
    });

    return {
      orders: orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        }))
      })),
      orderItems: orderItems.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        orderCreatedAt: item.order.createdAt
      }))
    };
  }

  async getProductUnitsSoldForTimeRange(
    productName: string,
    timeRange: TimeRange,
  ): Promise<number> {
    const result = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'totalSold')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('orderItem.order', 'order')
      .where('product.name = :productName', { productName })
      .andWhere('order.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      })
      .getRawOne();

    return parseInt(result?.totalSold || '0');
  }

  async getProductTotalUnitsSold(productName: string): Promise<number> {
    const result = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'totalSold')
      .innerJoin('orderItem.product', 'product')
      .where('product.name = :productName', { productName })
      .getRawOne();

    return parseInt(result?.totalSold || '0');
  }
}
