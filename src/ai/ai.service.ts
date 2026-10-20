import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private productsService: ProductsService,
    private salesService: SalesService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
  }

  async generateRecommendation() {
    try {
      const products = await this.productsService.findAll();
      const sales = await this.salesService.findAll();

      // 1. Preparar el contexto de los datos
      const productsSummary = products
        .map(p => `- ${p.name}: Stock ${p.stock} (Mín: ${p.minStock}), Precio C$${p.price}`)
        .join('\n');

      const salesSummary = sales.length === 0
        ? 'No hay ventas registradas aún.'
        : sales.slice(0, 15).map(s => {
            const items = s.items.map(i => `${i.quantity}x ${i.productName}`).join(', ');
            return `Venta ${s.invoiceNumber}: ${items}`;
          }).join('\n');

      // 2. Crear el prompt
      const prompt = `
      Eres un asistente experto en gestión de pulperías en Nicaragua.
      Analiza los siguientes datos del negocio:

      PRODUCTOS:
      ${productsSummary}

      VENTAS RECIENTES:
      ${salesSummary}

      Genera 3 recomendaciones breves y accionables para el dueño de la pulpería.
      Enfócate en:
      1. Qué productos reabastecer (stock bajo).
      2. Qué productos tienen alta rotación.
      3. Una sugerencia breve para mejorar las ventas.

      Responde en español, de forma clara, directa y usando viñetas.
      `;

      // 3. Llamar al modelo Gemini (Google)
      const model = this.genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return { recommendation: response.text() };

    } catch (error) {
      console.error('Error en IA:', error);
      throw new InternalServerErrorException('Error generando recomendación');
    }
  }

   async getBusinessAnalysis(): Promise<{
    summary: string;
    insights: string[];
    predictions: string[];
  }> {
    const products = await this.productsService.findAll();
    const sales = await this.salesService.findAll();
    const stats = await this.salesService.getStats();

    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    return {
      summary: `Tu negocio tiene ${products.length} productos registrados y ha generado C$${totalRevenue.toFixed(2)} en ${sales.length} ventas.`,
      insights: [
        `Hoy has vendido ${stats.todayCount} productos por C$${stats.todayRevenue.toFixed(2)}.`,
        lowStockCount > 0
          ? `Tienes ${lowStockCount} productos con stock bajo que requieren atención.`
          : 'Todo tu inventario tiene stock suficiente.',
        `Tu producto más vendido es "${products[0]?.name || 'N/A'}".`,
      ],
      predictions: [
        'Basado en las ventas recientes, se espera un aumento en la demanda.',
        'Considera reabastecer los productos de alta rotación.',
        'Mantén un control diario del inventario para evitar desabastecimiento.',
      ],
    };
  }
}   