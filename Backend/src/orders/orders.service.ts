import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './enums/order-status.enum';
import { Product } from '../products/entities/product.entity';
import { Users } from '../users/entities/users.entity';
import { Address } from '../users/entities/address.entity';
import { ProductsService } from '../products/products.service';
import { subDays, endOfDay, startOfDay, addDays, format } from 'date-fns';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    // Check stock availability for all products first
    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      if (product.stockQuantity < item.quantity) {
        throw new NotFoundException(
          `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
        );
      }
    }

    // Create initial order
    const order = new Order();
    order.userId = userId;
    order.status = OrderStatus.PENDING;
    order.notes = createOrderDto.notes ?? null;
    order.paymentDetails = {
      method: createOrderDto.paymentMethod,
      status: 'PENDING',
      amount: 0,
      transactionId: ''
    };
    order.totalAmount = 0; // Initial amount, will be updated after calculating items

    const savedOrder = await this.orderRepository.save(order);

    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      // Update stock quantity
      product.stockQuantity -= item.quantity;
      await this.productRepository.save(product);

      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        total: product.price * item.quantity,
      });

      totalAmount += orderItem.total;
      orderItems.push(orderItem);
    }

    await this.orderItemRepository.save(orderItems);
    
    // Update order with final amount
    savedOrder.totalAmount = totalAmount;
    
    // Update payment details with final amount
    if (!savedOrder.paymentDetails) {
      savedOrder.paymentDetails = {
        method: createOrderDto.paymentMethod,
        status: 'PENDING',
        amount: totalAmount,
        transactionId: ''
      };
    } else {
      savedOrder.paymentDetails.amount = totalAmount;
    }
    
    return this.orderRepository.save(savedOrder);
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    sortBy = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(endDate);
    }

    const orderOptions: { [key: string]: 'ASC' | 'DESC' } = {};
    if (sortBy && ['createdAt', 'totalAmount', 'status'].includes(sortBy)) {
      orderOptions[sortBy] = sortOrder;
    } else {
      orderOptions['createdAt'] = 'DESC';
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items', 'items.product', 'user'],
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        items: {
          id: true,
          quantity: true,
          price: true,
          product: {
            id: true,
            name: true,
            images: true,
          }
        },
        user: {
          id: true,
          email: true,
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      order: orderOptions,
    });

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);

    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;
    }

    if (updateOrderDto.notes) {
      order.notes = updateOrderDto.notes;
    }

    if (updateOrderDto.refundAmount) {
      order.refundAmount = updateOrderDto.refundAmount;
      order.status = OrderStatus.REFUNDED;
    }

    return this.orderRepository.save(order);
  }

  async updateStatus(id: string, status: OrderStatus, adminNotes?: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    order.status = status;
    if (adminNotes) {
      order.notes = order.notes 
        ? `${order.notes}\n[Admin Note]: ${adminNotes}`
        : `[Admin Note]: ${adminNotes}`;
    }

    return this.orderRepository.save(order);
  }

  async updateBulkStatus(orderIds: string[], status: OrderStatus, adminNotes?: string) {
    const orders = await this.orderRepository.find({
      where: { id: In(orderIds) },
    });

    if (orders.length !== orderIds.length) {
      throw new NotFoundException('Some orders not found');
    }

    const updatedOrders = orders.map(order => {
      order.status = status;
      if (adminNotes) {
        order.notes = order.notes 
          ? `${order.notes}\n[Admin Note]: ${adminNotes}`
          : `[Admin Note]: ${adminNotes}`;
      }
      return order;
    });

    return this.orderRepository.save(updatedOrders);
  }

  // Analytics methods
  async getOrderAnalytics(startDate?: Date, endDate?: Date) {
    // Set default dates if not provided
    const now = new Date();
    if (!endDate) endDate = endOfDay(now);
    if (!startDate) startDate = startOfDay(subDays(now, 6));

    // Calculate previous period  
    const days = 6;
    const prevStartDate = startOfDay(subDays(startDate, days + 1));
    const prevEndDate = endOfDay(subDays(startDate, 1));

    // Helper to get daily trends - Fixed for PostgreSQL
    const getDailyTrends = async (from: Date, to: Date) => {
      const query = this.orderRepository
        .createQueryBuilder('order')
        .select([
          `DATE(order.createdAt) as date`,
          'COUNT(order.id) as orderCount',
          'SUM(order.totalAmount) as totalRevenue'
        ])
        .where('order.createdAt >= :from AND order.createdAt <= :to', { from, to })
        .groupBy('DATE(order.createdAt)')
        .orderBy('date', 'ASC');
      
      const result = await query.getRawMany();
      // console.log('Raw trend data:', result); // Debug log
      return result;
    };

    // Get trends for current and previous periods
    const [trend, prevTrend] = await Promise.all([
      getDailyTrends(startDate, endDate),
      getDailyTrends(prevStartDate, prevEndDate)
    ]);

    // console.log('Current trend:', trend);
    // console.log('Previous trend:', prevTrend);
    // console.log('Date range:', { startDate, endDate });

    // Fixed fillTrend function
    const fillTrend = (trendArr: any[], from: Date, to: Date, key: string): number[] => {
      const result: number[] = [];
      const current = new Date(from);
      
      while (current <= to) {
        // Format date as YYYY-MM-DD to match database format
        const dateStr = current.toISOString().split('T')[0];
        
        // Find matching trend data
        const found = trendArr.find(t => {
          // Handle different possible date formats from database
          let trendDateStr: string;
          if (typeof t.date === 'string') {
            trendDateStr = t.date.split(' ')[0]; // Remove time part if present
          } else if (t.date instanceof Date) {
            trendDateStr = t.date.toISOString().split('T')[0];
          } else {
            trendDateStr = '';
          }
          return trendDateStr === dateStr;
        });
        
        const value = found ? Number(found[key]) || 0 : 0;
        result.push(value);
        
        // Move to next day
        current.setDate(current.getDate() + 1);
      }
      
      return result;
    };

    const ordersTrend = fillTrend(trend, startDate, endDate, 'ordercount'); // Note: PostgreSQL returns lowercase
    const revenueTrend = fillTrend(trend, startDate, endDate, 'totalrevenue'); // Note: PostgreSQL returns lowercase
    
    const prevOrdersTotal = prevTrend.reduce((sum, t) => sum + Number(t.ordercount || 0), 0);
    const prevRevenueTotal = prevTrend.reduce((sum, t) => sum + Number(t.totalrevenue || 0), 0);

    // Main period orders
    const orders = await this.orderRepository.find({
      where: { createdAt: Between(startDate, endDate) },
      relations: ['items'],
    });
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : null;

    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    
    const shippedOrders = ordersByStatus['SHIPPED'] || 0;
    const pendingOrders = ordersByStatus['PENDING'] || 0;

    // Percentage change
    const ordersChangePercent = prevOrdersTotal === 0 ? null : ((totalOrders - prevOrdersTotal) / prevOrdersTotal) * 100;
    const revenueChangePercent = prevRevenueTotal === 0 ? null : ((totalRevenue - prevRevenueTotal) / prevRevenueTotal) * 100;

    // Popular products - Fixed query
    const orderItems = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'order')
      .select([
        'orderItem.productId as productId',
        'SUM(orderItem.quantity) as totalQuantity'
      ])
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', { startDate, endDate })
      .groupBy('orderItem.productId')
      .orderBy('totalQuantity', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalOrders,
      ordersChangePercent,
      ordersTrend,
      totalRevenue,
      revenueChangePercent,
      revenueTrend,
      averageOrderValue,
      shippedOrders,
      pendingOrders,
      ordersByStatus,
      popularProducts: orderItems,
      startDate,
      endDate,
    };
  }

  async getSalesTrends(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month' = 'day') {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select(`DATE_TRUNC('${interval}', order.createdAt) as date`)
      .addSelect('COUNT(*) as orderCount')
      .addSelect('SUM(order.totalAmount) as totalRevenue')
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', { startDate, endDate })
      .groupBy('date')
      .orderBy('date', 'ASC');

    return query.getRawMany();
  }

  async getRevenueAnalytics(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month' = 'day') {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select([
        `DATE_TRUNC('${interval}', order.createdAt) as period`,
        'SUM(order.totalAmount) as revenue',
        'COUNT(order.id) as orderCount',
        'AVG(order.totalAmount) as averageOrderValue'
      ])
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', { startDate, endDate })
      .andWhere('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .groupBy('period')
      .orderBy('period', 'ASC');

    return query.getRawMany();
  }

  async getCustomerAnalytics(startDate?: Date, endDate?: Date) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'COUNT(order.id) as ordercount',
        'COALESCE(SUM(order.totalAmount), 0) as totalspent',
      ])
      .innerJoin('user.orders', 'order')
      .groupBy('user.id')
      .orderBy('totalspent', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const results = await query.getRawMany();

    return results.map(result => ({
      id: result.user_id,
      email: result.user_email,
      orderCount: parseInt(result.ordercount, 10) || 0,
      totalSpent: parseFloat(result.totalspent) || 0,
    }));
  }

  async getProductAnalytics(startDate?: Date, endDate?: Date) {
    const query = this.productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.price',
        'product.images',
        'product.stockQuantity',
        'product.rating',
        'COALESCE(SUM(orderItem.quantity), 0) as totalquantity',
        'COALESCE(SUM(orderItem.total), 0) as totalrevenue',
        'COUNT(DISTINCT order.id) as ordercount'
      ])
      .innerJoin('product.orderItems', 'orderItem')
      .innerJoin('orderItem.order', 'order')
      .groupBy('product.id')
      .orderBy('totalrevenue', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      query.where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const results = await query.getRawMany();

    return results.map(result => ({
      id: result.product_id,
      name: result.product_name,
      price: parseFloat(result.product_price),
      image: result.product_images && result.product_images.length > 0 ? result.product_images[0] : null,
      currentStock: result.product_stockQuantity,
      rating: parseFloat(result.product_rating),
      totalQuantitySold: parseInt(result.totalquantity, 10),
      totalRevenue: parseFloat(result.totalrevenue),
      orderCount: parseInt(result.ordercount, 10),
      averageOrderValue: result.ordercount > 0
        ? parseFloat(result.totalrevenue) / parseInt(result.ordercount, 10)
        : 0
    }));
  }

  async getRevenueBreakdown(days: number = 7) {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));

    const revenueData = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select([
        `DATE_TRUNC('day', "order"."createdAt") AS date`,
        'product.category AS category',
        'SUM(orderItem.total) AS dailyRevenue',
      ])
      .innerJoin('orderItem.order', 'order')
      .innerJoin('orderItem.product', 'product')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('date, product.category')
      .orderBy('date', 'ASC')
      .getRawMany();

    const categories = [...new Set(revenueData.map(item => item.category))];
    const breakdown = {};

    revenueData.forEach(item => {
      const dateStr = format(item.date, 'MM-dd');
      if (!breakdown[dateStr]) {
        breakdown[dateStr] = { date: dateStr };
        categories.forEach(cat => (breakdown[dateStr][cat] = 0));
      }
      breakdown[dateStr][item.category] = parseFloat(item.dailyrevenue);
    });

    return {
        categories,
        data: Object.values(breakdown),
    };
  }
} 