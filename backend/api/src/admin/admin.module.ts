import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/users/entities/users.entity';
import { Roles } from 'src/users/entities/roles.entity';
import { AdminUserController } from './controllers/admin-user.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminProductsController } from './controllers/admin-products.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { UsersModule } from 'src/users/users.module';
import { AdminChatbotController } from './controllers/admin-chatbot.controller';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { ChatbotService } from './services/chatbot.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Address } from '../users/entities/address.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, Roles, Product, Order, OrderItem, Address]),
    ProductsModule,
    OrdersModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [
    AdminUserController,
    AdminProductsController,
    AdminOrdersController,
    AdminChatbotController,
  ],
  providers: [
    UsersService,
    ProductsService,
    OrdersService,
    ChatbotService,
  ],
  exports: [UsersService, ProductsService, OrdersService, ChatbotService],
})
export class AdminModule {}
