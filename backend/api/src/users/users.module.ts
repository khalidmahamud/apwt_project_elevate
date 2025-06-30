import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity';
import { Roles } from './entities/roles.entity';
import { Address } from './entities/address.entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Roles, Address, Order])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
