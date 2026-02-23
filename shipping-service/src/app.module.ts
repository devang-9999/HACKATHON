import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShippingModule } from './shipping/shipping.module';

// messaging entities (global DB tables)
import { InboxEntity } from './messaging/inbox/inbox.entity';
import { OutboxEntity } from './messaging/outbox/outbox.entity';

// shipping entities
import { ShipmentEntity } from './shipping/entities/shipment.entity';
import { ShipmentItemEntity } from './shipping/entities/shipment-item.entity';
import { InventoryEntity } from './shipping/entities/inventory.entity';
import { ProcessedOrderEntity } from './shipping/entities/processed-order.entity';

@Module({
  imports: [
    // --------------------------------------------------
    // ENV CONFIGURATION
    // --------------------------------------------------
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // --------------------------------------------------
    // DATABASE CONNECTION (POSTGRESQL)
    // --------------------------------------------------
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),

        // register all entities here
        entities: [
          ShipmentEntity,
          ShipmentItemEntity,
          InventoryEntity,
          ProcessedOrderEntity,
          InboxEntity,
          OutboxEntity,
        ],

        synchronize: true, // dev only (disable in production)
        logging: false,
      }),
    }),

    // --------------------------------------------------
    // DOMAIN MODULES
    // --------------------------------------------------
    ShippingModule,
  ],
})
export class AppModule {}
