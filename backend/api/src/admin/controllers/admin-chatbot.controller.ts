import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatbotService } from '../services/chatbot.service';
import { AnalyticsData } from '../services/chatbot.types';
import { AnalyticsHelperService } from '../services/analytics-helper.service';

@ApiTags('H. Admin - Chatbot')
@ApiBearerAuth()
@Controller('admin/chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly analyticsHelper: AnalyticsHelperService,
  ) {}

  @Post('query')
  @ApiOperation({ summary: 'Send a query to the AI chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Chatbot response retrieved successfully',
    schema: {
      example: {
        response:
          'Today you have 15 orders totaling $2,450. 8 are pending, 5 shipped, 2 delivered.',
        type: 'analytics',
        data: [
          {
            type: 'orders',
            title: "Today's Orders",
            value: 15,
            change: 12,
          },
          {
            type: 'revenue',
            title: "Today's Revenue",
            value: '$2,450',
            change: 8.5,
          },
        ],
      },
    },
  })
  async processQuery(
    @Body('message') message: string,
    @Body('contextProductName') contextProductName?: string,
  ): Promise<{ response: string; type: string; data?: AnalyticsData[] }> {
    return this.chatbotService.processQuery(message, contextProductName);
  }

  @Get('debug/products')
  @ApiOperation({ summary: 'Debug endpoint to check product data across time ranges' })
  async debugProducts() {
    const now = new Date();
    
    // Test different time ranges
    const timeRanges = {
      today: {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        label: 'today'
      },
      thisWeek: {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
        end: now,
        label: 'this week'
      },
      lastWeek: {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 1),
        label: 'last week'
      },
      thisMonth: {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
        label: 'this month'
      },
      allTime: {
        start: new Date(0),
        end: now,
        label: 'all time'
      }
    };

    const results = {};
    
    for (const [key, timeRange] of Object.entries(timeRanges)) {
      try {
        const products = await this.analyticsHelper.getBestSellingProductsForTimeRange(timeRange);
        results[key] = {
          timeRange: {
            start: timeRange.start.toISOString(),
            end: timeRange.end.toISOString(),
            label: timeRange.label
          },
          products: products,
          count: products.length
        };
      } catch (error) {
        results[key] = {
          error: error.message,
          timeRange: {
            start: timeRange.start.toISOString(),
            end: timeRange.end.toISOString(),
            label: timeRange.label
          }
        };
      }
    }

    return {
      message: 'Debug data for best selling products across time ranges',
      currentTime: now.toISOString(),
      results
    };
  }

  @Get('debug/data')
  @ApiOperation({ summary: 'Debug endpoint to check actual order data in database' })
  async debugData() {
    return this.analyticsHelper.debugOrderData();
  }
}
