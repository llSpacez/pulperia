import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('recommendations')
  getRecommendations(): Promise<any[]> {
    return this.aiService.getRecommendations();
  }

  @Get('analysis')
  getBusinessAnalysis(): Promise<any> {
    return this.aiService.getBusinessAnalysis();
  }

  @Get('predict/:productId')
  predictDemand(@Param('productId') productId: string): Promise<any> {
    return this.aiService.predictDemand(+productId);
  }
}