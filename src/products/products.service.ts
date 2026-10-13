import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    product.isActive = false; // Soft delete
    await this.productsRepository.save(product);
  }

  // Método para reducir stock (usado por ventas)
  async reduceStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    if (product.stock < quantity) {
      throw new NotFoundException(`Stock insuficiente para ${product.name}`);
    }
    product.stock -= quantity;
    return this.productsRepository.save(product);
  }

  // Método para aumentar stock
  async increaseStock(id: number, quantity: number): Promise<Product> {
    const product = await this.findOne(id);
    product.stock += quantity;
    return this.productsRepository.save(product);
  }

  // Productos con stock bajo
  async findLowStock(): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.stock <= product.minStock')
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getMany();
  }
}