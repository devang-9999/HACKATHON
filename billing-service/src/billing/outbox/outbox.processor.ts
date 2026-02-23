/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxEvent } from './outbox.entity';
import { RabbitMQPublisher } from 'src/billing/messaging/rabbitmq.publisher';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private publisher = new RabbitMQPublisher();

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.publisher.connect();

    // run every 5 seconds
    setInterval(() => {
      this.processOutbox();
    }, 5000);

    console.log('📦 Outbox processor started');
  }

  async processOutbox() {
    const repo = this.dataSource.getRepository(OutboxEvent);

    const events = await repo.find({
      where: { processed: false },
      take: 50,
    });

    for (const event of events) {
      try {
        await this.publisher.publish(event.eventType, event.payload);

        event.processed = true;
        await repo.save(event);

        console.log(`✅ Outbox event published ${event.id}`);
      } catch (err) {
        console.error('❌ Outbox publish failed', err);
      }
    }
  }
}
