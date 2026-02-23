/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentEntity } from '../entities/shipment.entity';
import { ShipmentItemEntity } from '../entities/shipment-item.entity';

@Injectable()
export class ShipmentLifecycleService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
  ) {}

  // ------------------------------------------------
  // Create shipment entity
  // ------------------------------------------------
  createShipmentEntity(orderId: string, items: any[]) {
    const shipment = new ShipmentEntity();
    shipment.orderId = orderId;
    shipment.status = 'SHIPPED';
    shipment.trackingNumber = this.generateTrackingNumber();

    shipment.items = items.map((i) => {
      const item = new ShipmentItemEntity();
      item.productId = i.productId;
      item.quantity = i.quantity;
      return item;
    });

    return shipment;
  }

  // ------------------------------------------------
  // Update status
  // ------------------------------------------------
  async updateStatus(orderId: string, status: string) {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    shipment.status = status;
    await this.shipmentRepo.save(shipment);

    // TODO publish order.completed when DELIVERED

    return shipment;
  }

  // ------------------------------------------------
  // Tracking generator
  // ------------------------------------------------
  private generateTrackingNumber(): string {
    return 'TRK-' + Math.random().toString(36).substring(2, 12);
  }
}
