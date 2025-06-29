import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Users } from '../../users/entities/users.entity';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('D. Public - Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new order',
    description: 'Creates a new order with the specified items and payment details.'
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Order created successfully'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data'
  })
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: Users) {
    return this.ordersService.create(createOrderDto, user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get current user orders',
    description: 'Retrieves a paginated list of orders for the current user with optional filtering.'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number,
    description: 'Page number for pagination (default: 1)'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of items per page (default: 10)'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: OrderStatus,
    description: 'Filter orders by status'
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    type: Date,
    description: 'Filter orders created after this date'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    type: Date,
    description: 'Filter orders created before this date'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of orders retrieved successfully'
  })
  findAll(
    @CurrentUser() user: Users,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.ordersService.findAll(page, limit, status, startDate, endDate, user.id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get order by ID',
    description: 'Retrieves detailed information about a specific order. Users can only access their own orders.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Order found successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Order not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Cannot access another user\'s order'
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: Users) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this order');
    }
    return order;
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update order',
    description: 'Updates the status or notes of an existing order. Users can only update their own orders.'
  })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Order updated successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Order not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Cannot update another user\'s order'
  })
  async update(
    @Param('id') id: string, 
    @Body() updateOrderDto: UpdateOrderDto, 
    @CurrentUser() user: Users
  ) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to update this order');
    }
    return this.ordersService.update(id, updateOrderDto);
  }
} 