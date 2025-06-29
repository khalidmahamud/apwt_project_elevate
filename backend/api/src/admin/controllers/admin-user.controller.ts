// admin-user.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { UsersService, CustomerReportRow } from 'src/users/users.service';
import { AdminUpdateUserDto } from '../../users/dto/admin-user.dto';
import { AdminUserQueryDto } from '../../users/dto/admin-user-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/users/enums/roles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as Papa from 'papaparse';

/**
 * Controller handling admin user management operations.
 */
@ApiTags('E. Admin - User Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUserController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves all users with optional filtering and pagination.
   * @param query - Query parameters for filtering and pagination
   * @returns Promise<PaginatedResponse<Users>> - Users and pagination metadata
   */
  @Get()
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async findAll(@Query() queryDto: AdminUserQueryDto) {
    return this.usersService.findAll(queryDto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User analytics retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async getUserAnalytics() {
    return this.usersService.getUserAnalytics();
  }

  @Get('customer-report')
  @ApiOperation({ summary: 'Generate customer report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer report generated successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async generateCustomerReport() {
    return this.usersService.generateCustomerReport();
  }

  @Get('customer-report/download')
  @ApiOperation({ summary: 'Download customer report as CSV' })
  async downloadCustomerReport(@Res() res: Response) {
    const customerData = await this.usersService.generateCustomerReport();
    const csv = Papa.unparse(customerData);
    const filename = `customer-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=${filename}`,
    });
    res.send(csv);
  }

  /**
   * Retrieves a user by ID.
   * @param id - User ID
   * @returns Promise<Users> - The found user
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Updates a user's information.
   * @param id - User ID
   * @param updateUserDto - Data for updating the user
   * @returns Promise<Users> - The updated user
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: AdminUpdateUserDto,
  ) {
    return this.usersService.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Set user active status' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isActive: {
          type: 'boolean',
          description: 'Set to true to activate the user, false to deactivate',
          example: true,
        },
      },
      required: ['isActive'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.setStatus(id, isActive);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: Object.values(Role),
          description: 'New role for the user',
          example: 'ADMIN',
        },
      },
      required: ['role'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User role updated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: Role,
  ) {
    return this.usersService.updateUserRole(id, role);
  }

  @Patch(':id/profile-image')
  @ApiOperation({ summary: 'Update user profile image' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profileImage: {
          type: 'string',
          description: 'URL or base64 string of the profile image',
          example: 'https://example.com/profile.jpg',
        },
      },
      required: ['profileImage'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile image updated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async updateProfileImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('profileImage') profileImage: string,
  ) {
    return this.usersService.updateProfileImage(id, profileImage);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        password: {
          type: 'string',
          description: 'New password for the user',
          example: 'newpassword123',
        },
      },
      required: ['password'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('password') password: string,
  ) {
    return this.usersService.changePassword(id, password);
  }
}