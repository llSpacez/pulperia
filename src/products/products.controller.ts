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
import { existsSync, mkdirSync } from 'fs';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==================== POST /products ====================
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // ==================== GET /products ====================
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // ==================== GET /products/low-stock ====================
  // ⚠️ IMPORTANTE: Esta ruta debe ir ANTES de GET /:id
  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  // ==================== POST /products/upload ====================
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const isProduction = process.env.NODE_ENV === 'production';
          const dest = isProduction
            ? '/app/uploads/products'
            : './uploads/products';

          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
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

  // ==================== GET /products/:id ====================
  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log(`🔍 GET /products/${id}`);
    return this.productsService.findOne(+id);
  }

  // ==================== PATCH /products/:id ====================
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    console.log(`📝 PATCH /products/${id}`);
    console.log(`📦 Body: ${JSON.stringify(updateProductDto)}`);
    return this.productsService.update(+id, updateProductDto);
  }

  // ==================== DELETE /products/:id ====================
  @Delete(':id')
  remove(@Param('id') id: string) {
    console.log(`🗑️ DELETE /products/${id}`);
    return this.productsService.remove(+id);
  }
}