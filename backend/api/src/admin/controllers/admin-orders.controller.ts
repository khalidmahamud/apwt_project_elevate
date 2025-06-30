import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Response } from 'express';

@ApiTags('G. Admin - Orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders (admin view)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.ordersService.findAll(
      page,
      limit,
      status,
      startDate,
      endDate,
      userId,
      sortBy,
      sortOrder,
    );
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get detailed revenue analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
  })
  getRevenueAnalytics(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('interval') interval: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.ordersService.getRevenueAnalytics(startDate, endDate, interval);
  }

  @Get('analytics/customer')
  @ApiOperation({ summary: 'Get customer order analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getCustomerAnalytics(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.ordersService.getCustomerAnalytics(startDate, endDate);
  }

  @Get('analytics/summary')
  @ApiOperation({
    summary: 'Get order analytics summary (admin)',
    description: 'Retrieves summary statistics about all orders for admin.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: Date,
    description: 'Start date for analytics period',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: Date,
    description: 'End date for analytics period',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics summary retrieved successfully',
    schema: {
      example: {
        totalOrders: 100,
        totalRevenue: 9999.99,
        averageOrderValue: 99.99,
        shippedOrders: 25,
        pendingOrders: 20,
        ordersByStatus: { PENDING: 20, SHIPPED: 25 },
        popularProducts: [{ productId: '...', totalquantity: '13' }],
        startDate: '2024-06-14T18:00:00.000Z',
        endDate: '2024-06-21T17:59:59.999Z',
      },
    },
  })
  getAnalyticsSummary(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.ordersService.getOrderAnalytics(startDate, endDate);
  }

  @Get('analytics/revenue-breakdown')
  @ApiOperation({ summary: 'Get revenue breakdown by category over time' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look back (default: 7)',
  })
  async getRevenueBreakdown(@Query('days') days?: number) {
    return this.ordersService.getRevenueBreakdown(days);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.ordersService.updateStatus(id, status, adminNotes);
  }

  @Patch('bulk-status')
  @ApiOperation({ summary: 'Update multiple orders status (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Orders status updated successfully',
  })
  updateBulkStatus(
    @Body('orderIds') orderIds: string[],
    @Body('status') status: OrderStatus,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.ordersService.updateBulkStatus(orderIds, status, adminNotes);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order by ID (admin only)' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('report/download')
  @ApiOperation({ summary: 'Download a master report as XLSX' })
  async downloadMasterReport(@Res() res: Response) {
    const buffer = await this.ordersService.generateMasterReport();
    const filename = `master-report-${new Date().toISOString()}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=${filename}`,
    });
    res.send(buffer);
  }
}
