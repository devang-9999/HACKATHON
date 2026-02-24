import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common';
import { ShippingService } from '../service/shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('shipments/:orderId')
  async getShipment(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrderId(orderId);
  }

  @Post('inventory/seed')
  async seedInventory(
    @Body()
    items: {
      productId: string;
      quantity: number;
    }[],
  ) {
    return this.shippingService.seedInventory(items);
  }

  @Patch('shipments/:orderId/status')
  async updateShipmentStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.shippingService.updateShipmentStatus(orderId, body.status);
  }
}
