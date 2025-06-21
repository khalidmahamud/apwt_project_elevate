import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('G. Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get user analytics summary (admin)', description: 'Retrieves summary statistics about users.' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully.' })
  async getUserAnalytics() {
    return this.usersService.getUserAnalytics();
  }
} 