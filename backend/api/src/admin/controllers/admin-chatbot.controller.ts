import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/enums/roles.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from '../services/chatbot.service';
import { AnalyticsData } from '../services/chatbot.types';

@ApiTags('H. Admin - Chatbot')
@ApiBearerAuth()
@Controller('admin/chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('query')
  @ApiOperation({ summary: 'Send a query to the AI chatbot' })
  @ApiResponse({ 
    status: 200, 
    description: 'Chatbot response retrieved successfully',
    schema: {
      example: {
        response: "Today you have 15 orders totaling $2,450. 8 are pending, 5 shipped, 2 delivered.",
        type: "analytics",
        data: [
          {
            type: "orders",
            title: "Today's Orders",
            value: 15,
            change: 12
          },
          {
            type: "revenue",
            title: "Today's Revenue",
            value: "$2,450",
            change: 8.5
          }
        ]
      }
    }
  })
  async processQuery(@Body('message') message: string, @Body('contextProductName') contextProductName?: string): Promise<{ response: string; type: string; data?: AnalyticsData[] }> {
    return this.chatbotService.processQuery(message, contextProductName);
  }
} 