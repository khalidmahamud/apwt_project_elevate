import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  In,
  LessThan,
} from 'typeorm';
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
import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import { UsersService } from '../users/users.service';

interface SalesReportRow {
  'Order ID': string;
  'Order Date': string;
  'Customer Name': string;
  'Customer Email': string;
  'Order Status': string;
  'Product Name': string;
  Quantity: number;
  'Price Per Item': number;
  'Line Item Total': number;
  'Order Total': number;
}

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
    private readonly usersService: UsersService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    // Check stock availability for all products first
    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      if (product.stockQuantity < item.quantity) {
        throw new NotFoundException(
          `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
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
      transactionId: '',
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
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
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
        transactionId: '',
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
    sortOrder: 'ASC' | 'DESC' = 'DESC',
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
          },
        },
        user: {
          id: true,
          email: true,
        },
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

  async updateBulkStatus(
    orderIds: string[],
    status: OrderStatus,
    adminNotes?: string,
  ) {
    const orders = await this.orderRepository.find({
      where: { id: In(orderIds) },
    });

    if (orders.length !== orderIds.length) {
      throw new NotFoundException('Some orders not found');
    }

    const updatedOrders = orders.map((order) => {
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

  async generateSalesReport(): Promise<string> {
    const orders = await this.orderRepository.find({
      relations: ['items', 'items.product', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (orders.length === 0) {
      return '';
    }

    const reportData: SalesReportRow[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        reportData.push({
          'Order ID': order.id,
          'Order Date': format(
            new Date(order.createdAt),
            'yyyy-MM-dd HH:mm:ss',
          ),
          'Customer Name':
            `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
          'Customer Email': order.user.email,
          'Order Status': order.status,
          'Product Name': item.product.name,
          Quantity: item.quantity,
          'Price Per Item': item.price,
          'Line Item Total': item.total,
          'Order Total': order.totalAmount,
        });
      }
    }

    return Papa.unparse(reportData);
  }

  async generateMasterReport(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Elevate';
    workbook.created = new Date();

    // 1. Sales Report Sheet
    const salesSheet = workbook.addWorksheet('Sales Report');
    const salesData = await this.getSalesReportData();
    if (salesData.length > 0) {
      salesSheet.columns = Object.keys(salesData[0]).map((key) => ({
        header: key,
        key,
        width: 20,
      }));
      salesSheet.addRows(salesData);
    }

    // 2. Customer Summary Sheet
    const customerSheet = workbook.addWorksheet('Customer Summary');
    const customerData = await this.usersService.generateCustomerReport();
    if (customerData.length > 0) {
      customerSheet.columns = Object.keys(customerData[0]).map((key) => ({
        header: key,
        key,
        width: 25,
      }));
      customerSheet.addRows(customerData);
    }

    // 3. Product Performance Sheet
    const productSheet = workbook.addWorksheet('Product Performance');
    const productData =
      await this.productsService.generateProductPerformanceReport();
    if (productData.length > 0) {
      productSheet.columns = Object.keys(productData[0]).map((key) => ({
        header: key,
        key,
        width: 20,
      }));
      productSheet.addRows(productData);
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private async getSalesReportData() {
    const orders = await this.orderRepository.find({
      relations: ['items', 'items.product', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });

    const reportData: SalesReportRow[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        reportData.push({
          'Order ID': order.id,
          'Order Date': format(
            new Date(order.createdAt),
            'yyyy-MM-dd HH:mm:ss',
          ),
          'Customer Name':
            `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
          'Customer Email': order.user?.email,
          'Order Status': order.status,
          'Product Name': item.product.name,
          Quantity: item.quantity,
          'Price Per Item': item.price,
          'Line Item Total': item.total,
          'Order Total': order.totalAmount,
        });
      }
    }
    return reportData;
  }

  // Analytics methods
  async getOrderAnalytics(startDate?: Date, endDate?: Date) {
    // 1. Set date ranges
    let end: Date, start: Date, prevStart: Date, prevEnd: Date;

    if (!startDate && !endDate) {
      // All time - no date filtering
      const [currentOrders, prevOrders] = await Promise.all([
        this.orderRepository.find(),
        this.orderRepository.find({
          where: { createdAt: LessThan(subDays(new Date(), 7)) },
        }),
      ]);

      const totalOrders = currentOrders.length;
      const totalRevenue = currentOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );
      const prevTotalOrders = prevOrders.length;
      const prevTotalRevenue = prevOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );

      const ordersChangePercent =
        prevTotalOrders > 0
          ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100
          : 0;
      const revenueChangePercent =
        prevTotalRevenue > 0
          ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
          : 0;

      // For all time, we'll use the last 7 days for trends
      end = endOfDay(new Date());
      start = startOfDay(subDays(end, 6));

      const getDailyTrends = async (from: Date, to: Date) => {
        return this.orderRepository
          .createQueryBuilder('order')
          .select(
            `DATE_TRUNC('day', "createdAt") as date, COUNT(id) as orders, SUM("totalAmount") as revenue`,
          )
          .where(`"createdAt" BETWEEN :from AND :to`, { from, to })
          .groupBy('date')
          .getRawMany();
      };

      const currentTrendRaw = await getDailyTrends(start, end);
      const ordersTrend = this.fillTrend(currentTrendRaw, start, end, 'orders');
      const revenueTrend = this.fillTrend(
        currentTrendRaw,
        start,
        end,
        'revenue',
      );

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const prevAvgOrderValue =
        prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
      const avgOrderValueChange =
        prevAvgOrderValue > 0
          ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100
          : 0;
      const avgOrderValueTrend = revenueTrend.map((rev, i) =>
        ordersTrend[i] > 0 ? rev / ordersTrend[i] : 0,
      );

      return {
        totalOrders,
        totalRevenue,
        ordersChangePercent,
        revenueChangePercent,
        ordersTrend,
        revenueTrend,
        avgOrderValue,
        avgOrderValueChange,
        avgOrderValueTrend,
      };
    } else {
      // Date range specified
      end = endDate ? endOfDay(endDate) : endOfDay(new Date());
      start = startDate ? startOfDay(startDate) : startOfDay(subDays(end, 6));
      prevStart = subDays(
        start,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1,
      );
      prevEnd = subDays(
        end,
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1,
      );

      const whereCurrent = { createdAt: Between(start, end) };
      const wherePrevious = { createdAt: Between(prevStart, prevEnd) };

      // 2. Fetch data
      const [currentOrders, prevOrders] = await Promise.all([
        this.orderRepository.find({ where: whereCurrent }),
        this.orderRepository.find({ where: wherePrevious }),
      ]);

      // 3. Calculate metrics
      const totalOrders = currentOrders.length;
      const totalRevenue = currentOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );
      const prevTotalOrders = prevOrders.length;
      const prevTotalRevenue = prevOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );

      const ordersChangePercent =
        prevTotalOrders > 0
          ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100
          : 0;
      const revenueChangePercent =
        prevTotalRevenue > 0
          ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
          : 0;

      // 4. Generate trends
      const getDailyTrends = async (from: Date, to: Date) => {
        return this.orderRepository
          .createQueryBuilder('order')
          .select(
            `DATE_TRUNC('day', "createdAt") as date, COUNT(id) as orders, SUM("totalAmount") as revenue`,
          )
          .where(`"createdAt" BETWEEN :from AND :to`, { from, to })
          .groupBy('date')
          .getRawMany();
      };

      const currentTrendRaw = await getDailyTrends(start, end);
      const ordersTrend = this.fillTrend(currentTrendRaw, start, end, 'orders');
      const revenueTrend = this.fillTrend(
        currentTrendRaw,
        start,
        end,
        'revenue',
      );

      // 5. Calculate Average Order Value
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const prevAvgOrderValue =
        prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
      const avgOrderValueChange =
        prevAvgOrderValue > 0
          ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100
          : 0;

      // Create AOV trend by dividing daily revenue by daily orders
      const avgOrderValueTrend = revenueTrend.map((rev, i) =>
        ordersTrend[i] > 0 ? rev / ordersTrend[i] : 0,
      );

      return {
        totalOrders,
        totalRevenue,
        ordersChangePercent,
        revenueChangePercent,
        ordersTrend,
        revenueTrend,
        avgOrderValue,
        avgOrderValueChange,
        avgOrderValueTrend,
      };
    }
  }

  private fillTrend(
    trendArr: any[],
    from: Date,
    to: Date,
    key: string,
  ): number[] {
    const trendMap = new Map(
      trendArr.map((item) => [
        startOfDay(item.date).toISOString(),
        parseFloat(item[key]) || 0,
      ]),
    );
    const filledTrend: number[] = [];
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
      const dateKey = d.toISOString();
      filledTrend.push(trendMap.get(dateKey) || 0);
    }
    return filledTrend;
  }

  async getSalesTrends(
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month' = 'day',
  ) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select(`DATE_TRUNC('${interval}', order.createdAt) as date`)
      .addSelect('COUNT(*) as orderCount')
      .addSelect('SUM(order.totalAmount) as totalRevenue')
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', {
        startDate,
        endDate,
      })
      .groupBy('date')
      .orderBy('date', 'ASC');

    return query.getRawMany();
  }

  async getRevenueAnalytics(
    startDate?: Date,
    endDate?: Date,
    interval: 'day' | 'week' | 'month' = 'day',
  ) {
    const end = endDate ? endOfDay(endDate) : endOfDay(new Date());
    const start = startDate
      ? startOfDay(startDate)
      : startOfDay(subDays(end, 6));

    const query = this.orderRepository
      .createQueryBuilder('order')
      .select([
        `DATE_TRUNC('${interval}', order.createdAt) as period`,
        'SUM(order.totalAmount) as revenue',
        'COUNT(order.id) as orderCount',
        'AVG(order.totalAmount) as averageOrderValue',
      ])
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', {
        startDate: start,
        endDate: end,
      })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
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
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const results = await query.getRawMany();

    return results.map((result) => ({
      id: result.user_id,
      email: result.user_email,
      orderCount: parseInt(result.ordercount, 10) || 0,
      totalSpent: parseFloat(result.totalspent) || 0,
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
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('date, product.category')
      .orderBy('date', 'ASC')
      .getRawMany();

    const categories = [...new Set(revenueData.map((item) => item.category))];
    const breakdown = {};

    revenueData.forEach((item) => {
      const dateStr = format(item.date, 'MM-dd');
      if (!breakdown[dateStr]) {
        breakdown[dateStr] = { date: dateStr };
        categories.forEach((cat) => (breakdown[dateStr][cat] = 0));
      }
      breakdown[dateStr][item.category] = parseFloat(item.dailyrevenue);
    });

    return {
      categories,
      data: Object.values(breakdown),
    };
  }
}
