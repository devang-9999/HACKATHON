/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  onModuleInit() {
    void this.start();
  }

  private async start() {
    while (true) {
      try {
        const events = await this.outbox.getUnprocessedEvents();

        for (const event of events) {
          await this.rabbitmq.publish(event.eventType, {
            eventId: event.eventId,
            eventType: event.eventType,
            payload: event.payload,
          });

          await this.outbox.markProcessed(event.id);
        }
      } catch (err) {
        console.error('Outbox processor error', err);
      }

      await this.sleep(3000);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
