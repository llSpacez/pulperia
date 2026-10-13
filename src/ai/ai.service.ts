import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';

interface AIRecommendation {
  type: 'STOCK_ALERT' | 'HIGH_ROTATION' | 'REORDER' | 'TREND';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  productId?: number;
  productName?: string;
  suggestedAction: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private productsService: ProductsService,
    private salesService: SalesService,
  ) {}

  /**
   * Genera recomendaciones basadas en análisis de datos
   * (Versión sin IA real, usando reglas heurísticas)
   */
  async getRecommendations(): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // 1. Productos con stock bajo
    const lowStockProducts = await this.productsService.findLowStock();
    for (const product of lowStockProducts) {
      recommendations.push({
        type: 'STOCK_ALERT',
        priority: product.stock === 0 ? 'HIGH' : 'MEDIUM',
        title: product.stock === 0 ? '¡Producto agotado!' : 'Stock bajo',
        message: `${product.name} tiene solo ${product.stock} unidades. Mínimo recomendado: ${product.minStock}.`,
        productId: product.id,
        productName: product.name,
        suggestedAction: `Reabastecer ${product.name}`,
      });
    }

    // 2. Productos más vendidos
    const sales = await this.salesService.findAll();
    const productSales: { [key: string]: { name: string; count: number } } = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, count: 0 };
        }
        productSales[item.productId].count += item.quantity;
      }
    }

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    for (const [productId, data] of topProducts) {
      recommendations.push({
        type: 'HIGH_ROTATION',
        priority: 'MEDIUM',
        title: 'Producto de alta rotación',
        message: `${data.name} se ha vendido ${data.count} veces. Asegura stock suficiente.`,
        productId: Number(productId),
        productName: data.name,
        suggestedAction: `Mantener stock alto de ${data.name}`,
      });
    }

    // 3. Análisis de tendencias
    const stats = await this.salesService.getStats();
    if (stats.todayCount > 0) {
      recommendations.push({
        type: 'TREND',
        priority: 'LOW',
        title: 'Tendencia del día',
        message: `Hoy has realizado ${stats.todayCount} ventas por un total de C$${stats.todayRevenue.toFixed(2)}.`,
        suggestedAction: 'Mantener el ritmo de ventas',
      });
    }

    return recommendations;
  }

  /**
   * Genera un análisis del negocio
   */
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

  /**
   * Predice la demanda de un producto
   */
  async predictDemand(productId: number): Promise<{
    productName: string;
    currentStock: number;
    estimatedDailySales: number;
    daysUntilStockout: number;
    recommendation: string;
  }> {
    const product = await this.productsService.findOne(productId);
    const sales = await this.salesService.findAll();

    // Calcular ventas de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalSold = 0;
    for (const sale of sales) {
      if (new Date(sale.createdAt) >= sevenDaysAgo) {
        for (const item of sale.items) {
          if (item.productId === productId) {
            totalSold += item.quantity;
          }
        }
      }
    }

    const dailyAverage = totalSold / 7;
    const daysUntilStockout = dailyAverage > 0
      ? Math.floor(product.stock / dailyAverage)
      : 999;

    let recommendation = '';
    if (daysUntilStockout <= 3) {
      recommendation = `¡URGENTE! Reabastecer ${product.name} inmediatamente.`;
    } else if (daysUntilStockout <= 7) {
      recommendation = `Considera reabastecer ${product.name} esta semana.`;
    } else {
      recommendation = `${product.name} tiene stock suficiente.`;
    }

    return {
      productName: product.name,
      currentStock: product.stock,
      estimatedDailySales: Math.round(dailyAverage * 100) / 100,
      daysUntilStockout,
      recommendation,
    };
  }
}