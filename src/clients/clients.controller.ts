import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() data: { name: string; phone: string }) {
    return this.clientsService.create(data);
  }

  @Get(':phone')
  findByPhone(@Param('phone') phone: string) {
    return this.clientsService.findByPhone(phone);
  }
}