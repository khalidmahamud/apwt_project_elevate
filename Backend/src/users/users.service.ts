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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,

    @InjectRepository(Roles)
    private rolesRepository: Repository<Roles>,

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

    // Fetch the 'CUSTOMER' role by default
    const customerRole = await this.rolesRepository.findOne({
      where: { name: Role.CUSTOMER },
    });
    if (!customerRole) {
      throw new InternalServerErrorException('Customer role not found.');
    }

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      profileImage: createUserDto.profileImage || 'profile.jpg',
      roles: [customerRole], // Assign the default 'CUSTOMER' role
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create user.');
    }
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
  async getUserById(id: string): Promise<Users> {
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
  async update(id: string, updateUserDto: UpdateUserDto): Promise<Users> {
    const user = await this.getUserById(id);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
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

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Create a query builder to join with roles and filter out admins
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.name != :adminRole', { adminRole: Role.ADMIN })
      .skip(skip)
      .take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileImage: user.profileImage,
        roles: user.roles.map(role => ({
          id: role.id,
          name: role.name
        })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
    };
  }

  async getUserAnalytics() {
    // 1. Date setup
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, 6));
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
    const totalPurchasingUsersQuery = this.orderRepository.createQueryBuilder("order").select('COUNT(DISTINCT "userId")');
    const totalPurchasingUsers = await totalPurchasingUsersQuery.getRawOne().then(result => parseInt(result.count, 10) || 0);
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
        conversionRateTrend
    };
  }

  private fillTrend(trendArr: any[], from: Date, to: Date, key: string): number[] {
    const result: number[] = [];
    const numDays = Math.floor((endOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= numDays; i++) {
      const d = startOfDay(addDays(from, i));
      const dStr = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const found = trendArr.find(t => t.date && typeof t.date.toISOString === 'function' && t.date.toISOString().slice(0, 10) === dStr);
      const value = found && found[key] != null ? Number(found[key]) : 0;
      result.push(isNaN(value) ? 0 : value);
    }
    return result;
  }
}
