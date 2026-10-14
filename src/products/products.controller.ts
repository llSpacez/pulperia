import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { existsSync, mkdirSync } from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  // 👇 SUBIR IMAGEN
 @Post('upload')
@UseInterceptors(
  FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const dest = isProduction
          ? '/app/uploads/products'
          : './uploads/products';
        
        // 👇 Verificar y crear la carpeta antes de guardar
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
          console.log(`📁 Carpeta creada en runtime: ${dest}`);
        }
        
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `product-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new BadRequestException('Solo se permiten imágenes'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }),
)
uploadImage(@UploadedFile() file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('No se subió ningún archivo');
  }

  return {
    imageUrl: `/uploads/products/${file.filename}`,
    filename: file.filename,
  };
}
}