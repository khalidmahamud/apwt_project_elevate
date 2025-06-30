import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';
import { UpdateStockDto } from '../../products/dto/update-stock.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { AdminProductQueryDto } from 'src/products/dto/admin-product-query.dto';

@ApiTags('F. Admin - Products')
@ApiBearerAuth()
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  findAll(@Query() queryDto: AdminProductQueryDto) {
    return this.productsService.findAll(queryDto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Creates a new product. (Admin only)',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a product',
    description: 'Updates an existing product. (Admin only)',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Deletes an existing product. (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/toggle-featured')
  @ApiOperation({
    summary: 'Toggle featured status',
    description: 'Toggles whether a product is featured or not',
  })
  @ApiResponse({
    status: 200,
    description: 'Featured status toggled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleFeatured(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return this.productsService.update(id, { isFeatured: !product.isFeatured });
  }

  @Patch(':id/toggle-new-arrival')
  @ApiOperation({
    summary: 'Toggle new arrival status',
    description: 'Toggles whether a product is marked as new arrival',
  })
  @ApiResponse({
    status: 200,
    description: 'New arrival status toggled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleNewArrival(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return this.productsService.update(id, {
      isNewArrival: !product.isNewArrival,
    });
  }

  @Patch(':id/toggle-best-seller')
  @ApiOperation({
    summary: 'Toggle best seller status',
    description: 'Toggles whether a product is marked as best seller',
  })
  @ApiResponse({
    status: 200,
    description: 'Best seller status toggled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleBestSeller(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return this.productsService.update(id, {
      isBestSeller: !product.isBestSeller,
    });
  }

  @Patch(':id/toggle-on-sale')
  @ApiOperation({
    summary: 'Toggle on sale status',
    description: 'Toggles whether a product is on sale',
  })
  @ApiResponse({
    status: 200,
    description: 'On sale status toggled successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleOnSale(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return this.productsService.update(id, { isOnSale: !product.isOnSale });
  }

  @Patch(':id/update-stock')
  @ApiOperation({
    summary: 'Update product stock',
    description:
      'Updates the stock quantity of a product. Stock cannot be negative.',
  })
  @ApiBody({ type: UpdateStockDto })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid stock quantity' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Param('id') id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(id, updateStockDto.stockQuantity);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get product performance analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getProductAnalytics(
    @Query('days') days?: number,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    if (days) {
      const now = new Date();
      endDate = endOfDay(now);
      startDate = startOfDay(subDays(now, days - 1));
    }
    return this.productsService.getProductAnalytics(startDate, endDate);
  }

  @Get(':id/total-sale')
  @ApiOperation({
    summary: 'Get total sale (units sold and revenue) for a product',
  })
  async getProductTotalSale(@Param('id') id: string) {
    return this.productsService.getProductTotalSale(id);
  }
}
