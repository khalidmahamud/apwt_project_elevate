import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, LessThan } from 'typeorm';
import { Users } from './entities/users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserQueryDto } from './dto/user-query.dto';
import { Roles } from './entities/roles.entity';
import { Role } from './enums/roles.enum';
import { subDays, endOfDay, startOfDay, addDays } from 'date-fns';
import { Order } from 'src/orders/entities/order.entity';
import { AdminUpdateUserDto } from './dto/admin-user.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';

export interface CustomerReportRow {
  'Customer ID': string;
  'First Name': string;
  'Last Name': string;
  'Email': string;
  'Total Orders': number;
  'Total Spent': number;
  'Joined On': Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // Create a new user
  async create(createUserDto: CreateUserDto): Promise<Users> {
    const { email, phone } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or Phone number already in use.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const defaultRole = await this.rolesRepository.findOne({ where: { name: Role.CUSTOMER } });
    if (!defaultRole) {
      throw new Error('Default role not found');
    }

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      profileImage: createUserDto.profileImage || 'profile.jpg',
      roles: [defaultRole],
    });

    return this.usersRepository.save(newUser);
  }

  // Get a list of users
  async getAllUsers(userQueryDto: UserQueryDto): Promise<Users[]> {
    const {
      search,
      page = 1,
      limit = 10,
      order_by = 'id',
      order_direction = 'ASC',
    } = userQueryDto;

    const whereCondition = search
      ? [
          { email: Like(`%${search}%`) },
          { phone: Like(`%${search}%`) },
          { firstName: Like(`%${search}%`) },
          { lastName: Like(`%${search}%`) },
        ]
      : undefined;

    const [users, total] = await this.usersRepository.findAndCount({
      where: whereCondition,
      order: {
        [order_by]: order_direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (total === 0) {
      throw new NotFoundException('No users found.');
    }

    return users;
  }

  // Get user by ID
  async findOne(id: string): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  // Update user
  async update(id: string, updateDto: AdminUpdateUserDto): Promise<Users> {
    const user = await this.findOne(id);
    Object.assign(user, updateDto);

    if (updateDto.role) {
      const roleEntity = await this.rolesRepository.findOne({
        where: { name: updateDto.role },
      });
      if (!roleEntity) {
        throw new BadRequestException(`Role ${updateDto.role} not found`);
      }
      user.roles = [roleEntity];
    }

    return this.usersRepository.save(user);
  }

  // Update profile image
  async updateProfileImage(id: string, profileImage: string): Promise<Users> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(
        `Cannot update image: User with ID ${id} not found.`,
      );
    }

    user.profileImage = profileImage;

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update profile image.');
    }
  }

  // Change user password
  async changePassword(id: string, password: string): Promise<Users> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(
        `Cannot change password: User with ID ${id} not found.`,
      );
    }

    user.password = await bcrypt.hash(password, 10);

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Failed to change password.');
    }
  }

  async findAll(queryDto: AdminUserQueryDto): Promise<{ items: Users[]; meta: any }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.orders', 'orders');

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('roles.name = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (sortBy === 'spendings') {
      queryBuilder.addSelect('COALESCE(SUM(orders.totalAmount), 0)', 'totalSpent')
        .groupBy('user.id')
        .orderBy('totalSpent', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      const validSortFields = ['createdAt', 'lastLoginAt', 'firstName', 'lastName', 'email'];
      const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      queryBuilder.orderBy(`user.${finalSortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }
    
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserAnalytics() {
    // 1. Date setup
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, 6)); // Last 7 days
    const prevStartDate = startOfDay(subDays(startDate, 7));
    const prevEndDate = endOfDay(subDays(startDate, 1));

    // 2. Total user stats
    const totalUsers = await this.usersRepository.count();
    const prevTotalUsers = await this.usersRepository.count({ where: { createdAt: LessThan(startDate) } });
    const totalUsersChangePercent = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : (totalUsers > 0 ? 100 : 0);

    // 3. New user trend (for Total Visitors chart)
    const getDailyNewUsers = (from: Date, to: Date) => {
        return this.usersRepository.createQueryBuilder('user')
            .select(`DATE_TRUNC('day', "createdAt") as date, COUNT(id) as count`)
            .where(`"createdAt" BETWEEN :from AND :to`, { from, to })
            .groupBy('date')
            .getRawMany();
    };

    const newUsersTrendRaw = await getDailyNewUsers(startDate, endDate);
    const totalUsersTrend = this.fillTrend(newUsersTrendRaw, startDate, endDate, 'count');

    // 4. Conversion Rate stats
    const totalPurchasingUsers = await this.orderRepository.createQueryBuilder("order")
        .select('COUNT(DISTINCT "userId")')
        .getRawOne()
        .then(result => parseInt(result.count, 10) || 0);
    
    const conversionRate = totalUsers > 0 ? (totalPurchasingUsers / totalUsers) * 100 : 0;
    
    // 5. Conversion rate change and trend
    const getDailyActiveCustomers = (from: Date, to: Date) => {
        return this.orderRepository.createQueryBuilder('order')
            .select(`DATE_TRUNC('day', "createdAt") as date, COUNT(DISTINCT "userId") as count`)
            .where(`"createdAt" BETWEEN :from AND :to`, { from, to })
            .groupBy('date')
            .getRawMany();
    }
    const activeCustomersCurrentPeriodRaw = await getDailyActiveCustomers(startDate, endDate);
    
    const activeCustomersCurrentPeriod = await this.orderRepository.createQueryBuilder("order").select('COUNT(DISTINCT "userId")').where({ createdAt: Between(startDate, endDate) }).getRawOne().then(r => parseInt(r.count, 10) || 0);
    const activeCustomersPrevPeriod = await this.orderRepository.createQueryBuilder("order").select('COUNT(DISTINCT "userId")').where({ createdAt: Between(prevStartDate, prevEndDate) }).getRawOne().then(r => parseInt(r.count, 10) || 0);
    
    const conversionRateChangePercent = activeCustomersPrevPeriod > 0 ? ((activeCustomersCurrentPeriod - activeCustomersPrevPeriod) / activeCustomersPrevPeriod) * 100 : (activeCustomersCurrentPeriod > 0 ? 100 : 0);
    const conversionRateTrend = this.fillTrend(activeCustomersCurrentPeriodRaw, startDate, endDate, 'count');

    return {
        totalUsers,
        totalUsersChangePercent,
        totalUsersTrend,
        conversionRate,
        conversionRateChangePercent,
        conversionRateTrend,
    };
  }

  private fillTrend(trendArr: any[], from: Date, to: Date, key: string): number[] {
    const trendMap = new Map(
      trendArr.map(item => [startOfDay(item.date).toISOString(), parseInt(item[key], 10) || 0])
    );
    const filledTrend: number[] = [];
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
        const dateKey = d.toISOString();
        filledTrend.push(trendMap.get(dateKey) || 0);
    }
    return filledTrend;
  }

  async generateCustomerReport(): Promise<CustomerReportRow[]> {
    const users = await this.usersRepository.find({
      relations: ['orders'],
    });

    const reportData: CustomerReportRow[] = users.map(user => {
      const totalOrders = user.orders.length;
      const totalSpent = user.orders.reduce((sum, order) => sum + order.totalAmount, 0);

      return {
        'Customer ID': user.id,
        'First Name': user.firstName,
        'Last Name': user.lastName || '',
        'Email': user.email,
        'Total Orders': totalOrders,
        'Total Spent': totalSpent,
        'Joined On': user.createdAt,
      };
    });

    return reportData;
  }

  async setStatus(id: string, isActive: boolean): Promise<Users> {
    await this.usersRepository.update(id, { isActive });
    return this.findOne(id);
  }

  async updateUserRole(id: string, role: Role): Promise<Users> {
    const user = await this.findOne(id);
    const roleEntity = await this.rolesRepository.findOne({
      where: { name: role },
    });
    if (!roleEntity) {
      throw new BadRequestException(`Role ${role} not found`);
    }
    user.roles = [roleEntity];
    return this.usersRepository.save(user);
  }
}
