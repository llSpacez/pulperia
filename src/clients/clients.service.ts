import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async create(data: { name: string; phone: string }): Promise<Client> {
    const existing = await this.clientsRepository.findOne({ where: { phone: data.phone } });
    if (existing) return existing; // Si ya existe, lo devolvemos

    const client = this.clientsRepository.create(data);
    return this.clientsRepository.save(client);
  }

  async findByPhone(phone: string): Promise<Client | null> {
    return this.clientsRepository.findOne({ where: { phone } });
  }

  async addPoints(clientId: number, purchaseAmount: number): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    // 🎁 REGLA DE NEGOCIO: 1 punto por cada C$100 de compra
    const pointsEarned = Math.floor(purchaseAmount / 100);
    
    client.points += pointsEarned;
    client.totalPurchases += 1;
    
    // Si tiene más de 5 compras, es cliente frecuente
    if (client.totalPurchases >= 5) client.isFrequent = true;

    return this.clientsRepository.save(client);
  }
}