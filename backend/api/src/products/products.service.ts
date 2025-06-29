import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Product, ProductCategory } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from 'src/orders/entities/order.entity';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';

interface ProductPerformanceRow {
  'Product ID': string;
  'Product Name': string;
  'Category': string;
  'Stock Quantity': number;
  'Price': number;
  'Units Sold': number;
  'Total Revenue': number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      stockQuantity: createProductDto.stock,
      discountedPrice: createProductDto.salePrice,
    });
    return await this.productRepository.save(product);
  }

  async findAll(
    queryDto: AdminProductQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      name,
      category,
      brand,
      isFeatured,
      isNewArrival,
      isOnSale,
      isBestSeller,
      isActive,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      minRating,
      maxRating,
      sortBy = 'createdAt',
      orderDirection = 'DESC',
    } = queryDto;

    const query = this.productRepository.createQueryBuilder('product');

    if (name) {
      query.andWhere('product.name ILIKE :name', { name: `%${name}%` });
    }
    if (category) {
      query.andWhere('product.category = :category', { category });
    }
    if (brand) {
      query.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }
    if (isFeatured !== undefined) {
      query.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }
    if (isNewArrival !== undefined) {
      query.andWhere('product.isNewArrival = :isNewArrival', { isNewArrival });
    }
    if (isOnSale !== undefined) {
      query.andWhere('product.isOnSale = :isOnSale', { isOnSale });
    }
    if (isBestSeller !== undefined) {
      query.andWhere('product.isBestSeller = :isBestSeller', { isBestSeller });
    }
    if (isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive });
    }
    if (minPrice !== undefined) {
      query.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      query.andWhere('product.price <= :maxPrice', { maxPrice });
    }
    if (minStock !== undefined) {
      query.andWhere('product.stockQuantity >= :minStock', { minStock });
    }
    if (maxStock !== undefined) {
      query.andWhere('product.stockQuantity <= :maxStock', { maxStock });
    }
    if (minRating !== undefined) {
      query.andWhere('product.rating >= :minRating', { minRating });
    }
    if (maxRating !== undefined) {
      query.andWhere('product.rating <= :maxRating', { maxRating });
    }

    query.orderBy(`product.${sortBy}`, orderDirection);

    if (limit > 0) {
      query.skip((page - 1) * limit).take(limit);
    }

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async getFeatured(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isFeatured: true },
      take: 10,
    });
  }

  async getNewArrivals(): Promise<Product[]> {
    return await this.productRepository.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async getBestSellers(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isBestSeller: true },
      take: 10,
    });
  }

  async getOnSale(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isOnSale: true },
      take: 10,
    });
  }

  async getByCategory(category: ProductCategory): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {
      category: category
    };
    return await this.productRepository.find({ where });
  }

  async getProductAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(endDate);
    }

    // Best-selling products
    const bestSellers = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('orderItem.productId', 'productId')
      .addSelect('SUM(orderItem.quantity)', 'totalQuantity')
      .addSelect('SUM(orderItem.total)', 'totalRevenue')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('orderItem.order', 'order')
      .addSelect(['product.name', 'product.images'])
      .where(where.createdAt ? 'order.createdAt BETWEEN :startDate AND :endDate' : '1=1', { startDate, endDate })
      .groupBy('orderItem.productId, product.name, product.images')
      .orderBy('"totalQuantity"', 'DESC')
      .limit(10)
      .getRawMany();

    // Most profitable products
    const mostProfitable = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('orderItem.productId', 'productId')
      .addSelect('SUM(orderItem.total)', 'totalRevenue')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('orderItem.order', 'order')
      .addSelect(['product.name', 'product.images'])
      .where(where.createdAt ? 'order.createdAt BETWEEN :startDate AND :endDate' : '1=1', { startDate, endDate })
      .groupBy('orderItem.productId, product.name, product.images')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(10)
      .getRawMany();

    const lowStock = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stockQuantity < :stock', { stock: 10 })
      .orderBy('product.stockQuantity', 'ASC')
      .limit(10)
      .getMany();

    const outOfStock = await this.productRepository.count({ where: { stockQuantity: 0 } });
    const totalProducts = await this.productRepository.count();

    return {
      bestSellers,
      mostProfitable,
      lowStock,
      outOfStock,
      totalProducts,
      startDate,
      endDate,
    };
  }

  async updateStock(id: string, stockQuantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.stockQuantity = stockQuantity;
    return await this.productRepository.save(product);
  }

  async generateProductPerformanceReport(): Promise<ProductPerformanceRow[]> {
    const products = await this.productRepository.find();
    const report: ProductPerformanceRow[] = [];

    for (const product of products) {
      const salesData = await this.orderItemRepository
        .createQueryBuilder('orderItem')
        .select('SUM(orderItem.quantity)', 'unitsSold')
        .addSelect('SUM(orderItem.total)', 'totalRevenue')
        .where('orderItem.productId = :productId', { productId: product.id })
        .getRawOne();

      report.push({
        'Product ID': product.id,
        'Product Name': product.name,
        'Category': product.category,
        'Stock Quantity': product.stockQuantity,
        'Price': product.price,
        'Units Sold': parseInt(salesData.unitsSold, 10) || 0,
        'Total Revenue': parseFloat(salesData.totalRevenue) || 0,
      });
    }

    return report;
  }

  async getProductTotalSale(productId: string) {
    const result = await this.orderItemRepository
      .createQueryBuilder('orderItem')
      .select('SUM(orderItem.quantity)', 'unitsSold')
      .addSelect('SUM(orderItem.total)', 'totalRevenue')
      .where('orderItem.productId = :productId', { productId })
      .getRawOne();

    return {
      productId,
      unitsSold: parseInt(result.unitsSold, 10) || 0,
      totalRevenue: parseFloat(result.totalRevenue) || 0,
    };
  }
} 