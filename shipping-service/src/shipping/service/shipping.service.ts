/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { ShipmentEntity } from '../entities/shipment.entity';
import { InventoryService } from './inventory.service';
import { ProcessedOrderEntity } from '../entities/processed-order.entity';
import { ShipmentLifecycleService } from './shipment-lifecycle';

@Injectable()
export class ShippingService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly shipmentLifecycle: ShipmentLifecycleService,
    private readonly dataSource: DataSource,

    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,

    @InjectRepository(ProcessedOrderEntity)
    private processedOrderRepo: Repository<ProcessedOrderEntity>,
  ) {}

  // =====================================================
  // ORDER EVENTS HANDLING (CALLED BY CONSUMERS)
  // =====================================================

  async handleOrderCreated(order: any) {
    let record = await this.processedOrderRepo.findOne({
      where: { orderId: order.orderId },
    });

    if (!record) {
      record = this.processedOrderRepo.create({
        orderId: order.orderId,
        items: order.items,
        orderPlacedReceived: true,
        orderBilledReceived: false,
      });
    } else {
      record.orderPlacedReceived = true;
      record.items = order.items;
    }

    await this.processedOrderRepo.save(record);

    await this.tryCreateShipment(order.orderId);
  }

  async handleOrderBilled(order: any) {
    let record = await this.processedOrderRepo.findOne({
      where: { orderId: order.orderId },
    });

    if (!record) {
      record = this.processedOrderRepo.create({
        orderId: order.orderId,
        items: [],
        orderPlacedReceived: false,
        orderBilledReceived: true,
      });
    } else {
      record.orderBilledReceived = true;
    }

    await this.processedOrderRepo.save(record);

    await this.tryCreateShipment(order.orderId);
  }

  // =====================================================
  // CORE SHIPPING CREATION LOGIC
  // =====================================================

  private async tryCreateShipment(orderId: string) {
    const record = await this.processedOrderRepo.findOne({
      where: { orderId },
    });

    if (!record) return;

    // must receive BOTH events
    if (!record.orderPlacedReceived || !record.orderBilledReceived) return;

    // shipment already exists?
    const existing = await this.shipmentRepo.findOne({
      where: { orderId },
    });
    if (existing) return;

    // transactional creation
    await this.dataSource.transaction(async (manager) => {
      // reserve inventory
      await this.inventoryService.reserveStock(record.items, manager);

      // create shipment
      const shipment = this.shipmentLifecycle.createShipmentEntity(
        orderId,
        record.items,
      );

      await manager.save(shipment);

      // TODO write outbox shipping.created
    });
  }

  // =====================================================
  // QUERY METHODS
  // =====================================================

  async getShipmentByOrderId(orderId: string) {
    const shipment = await this.shipmentRepo.findOne({
      where: { orderId },
      relations: ['items'],
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    return shipment;
  }

  // =====================================================
  // INVENTORY SEEDING
  // =====================================================

  async seedInventory(items: any[]) {
    return this.inventoryService.seedInventory(items);
  }

  // =====================================================
  // STATUS UPDATE (DELIVERY)
  // =====================================================

  async updateShipmentStatus(orderId: string, status: string) {
    return this.shipmentLifecycle.updateStatus(orderId, status);
  }
}
