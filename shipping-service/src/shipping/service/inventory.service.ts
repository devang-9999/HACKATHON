/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InventoryEntity } from '../entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
  ) {}

  // ------------------------------------------------
  // Reserve stock (WITH LOCKING)
  // ------------------------------------------------
  async reserveStock(items: any[], manager: EntityManager) {
    for (const item of items) {
      const inventory = await manager.findOne(InventoryEntity, {
        where: { productId: item.productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory)
        throw new BadRequestException(`Product ${item.productId} not found`);

      if (inventory.quantityAvailable < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}`,
        );
      }

      inventory.quantityAvailable -= item.quantity;
      await manager.save(inventory);
    }
  }

  // ------------------------------------------------
  // Seed inventory
  // ------------------------------------------------
  async seedInventory(items: any[]) {
    for (const item of items) {
      let inventory = await this.inventoryRepo.findOne({
        where: { productId: item.productId },
      });

      if (!inventory) {
        inventory = this.inventoryRepo.create(item);
      } else {
        inventory.quantityAvailable = item.quantity;
      }

      await this.inventoryRepo.save(inventory);
    }

    return { message: 'Inventory seeded' };
  }
}
