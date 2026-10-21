import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale, PaymentMethod } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ProductsService } from '../products/products.service';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemsRepository: Repository<SaleItem>,
    private productsService: ProductsService,
    private clientsService: ClientsService,
  ) {}

  async create(createSaleDto: CreateSaleDto, userId: number): Promise<Sale> {
    const items: SaleItem[] = [];
    let totalAmount = 0;

    // Procesar cada item
    for (const itemDto of createSaleDto.items) {
      const product = await this.productsService.findOne(itemDto.productId);

      if (product.stock < itemDto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
        );
      }

      const totalPrice = Number(product.price) * itemDto.quantity;
      totalAmount += totalPrice;

      const saleItem = this.saleItemsRepository.create({
        productId: product.id,
        productName: product.name,
        quantity: itemDto.quantity,
        unitPrice: product.price,
        totalPrice: totalPrice,
      });

      items.push(saleItem);

      // Reducir stock
      await this.productsService.reduceStock(product.id, itemDto.quantity);
    }

    // Calcular total con descuento
    const discountAmount = createSaleDto.discountAmount || 0;
    const finalTotal = totalAmount - discountAmount;

    // Generar número de factura
    const invoiceNumber = await this.generateInvoiceNumber();

    // Crear venta
    const sale = this.salesRepository.create({
      invoiceNumber,
      userId,
      totalAmount: finalTotal,
      discountAmount,
      paymentMethod: createSaleDto.paymentMethod || PaymentMethod.CASH,
      items,
    });

    const savedSale = await this.salesRepository.save(sale);

    const clientId = (createSaleDto as CreateSaleDto & { clientId?: number }).clientId;
    if (clientId) {
      await this.clientsService.addPoints(clientId, finalTotal);
    }

    const result = await this.salesRepository.findOne({
      where: { id: savedSale.id },
      relations: { items: true, client: true },
    });

    if (!result) {
      throw new NotFoundException(`Venta con ID ${savedSale.id} no encontrada`);
    }

    return result;
  }

  

  async findAll(): Promise<Sale[]> {
    return this.salesRepository.find({
      relations: { items: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: { items: true, user: true },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return sale;
  }

  // Ventas de hoy
  async findToday(): Promise<Sale[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.salesRepository.find({
      where: { createdAt: Between(today, tomorrow) },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Estadísticas para el dashboard
  async getStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await this.salesRepository.find({
      where: { createdAt: Between(today, tomorrow) },
    });

    const totalSales = todaySales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    return {
      todayCount: todaySales.length,
      todayRevenue: totalSales,
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.salesRepository.count();
    return `FACT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
}