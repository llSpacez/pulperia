import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Body() createSaleDto: CreateSaleDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.salesService.create(createSaleDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get('today')
  findToday() {
    return this.salesService.findToday();
  }

  @Get('stats')
  getStats() {
    return this.salesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }
}