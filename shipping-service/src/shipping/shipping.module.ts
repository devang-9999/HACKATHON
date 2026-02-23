import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShippingController } from './controller/shipping.controller';

import { ShippingService } from './service/shipping.service';
import { InventoryService } from './service/inventory.service';

import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { InventoryEntity } from './entities/inventory.entity';
import { ProcessedOrderEntity } from './entities/processed-order.entity';

import { OrderCreatedConsumer } from './consumers/order-created.consumer';
import { OrderBilledConsumer } from './consumers/order-billed.consumer';
import { DeliveryUpdateConsumer } from './consumers/delivery-update.consumer';

import { ShippingPublisher } from './publishers/shipping.publisher';

import { RabbitMQModule } from '../messaging/rabbitmq/rabbitmq.module';
import { InboxModule } from '../messaging/inbox/inbox.module';
import { OutboxModule } from '../messaging/outbox/outbox.module';
import { ShipmentLifecycleService } from './service/shipment-lifecycle';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentItemEntity,
      InventoryEntity,
      ProcessedOrderEntity,
    ]),

    // messaging infrastructure
    RabbitMQModule,
    InboxModule,
    OutboxModule,
  ],

  controllers: [ShippingController],

  providers: [
    // domain services
    ShippingService,
    InventoryService,
    ShipmentLifecycleService,

    // messaging publisher
    ShippingPublisher,

    OrderCreatedConsumer,
    OrderBilledConsumer,
    DeliveryUpdateConsumer,
  ],

  exports: [ShippingService],
})
export class ShippingModule {}
