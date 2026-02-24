/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppDataSource } from '../config/datasource';
import { OutboxEvent } from './outbox.entity';
import { RabbitPublisher } from '../messaging/rabbitmq.publisher';

@Injectable()
export class OutboxProcessor implements OnModuleInit {
  constructor(private publisher: RabbitPublisher) {}

  onModuleInit() {
    setInterval(() => this.process(), 3000);
  }

  async process() {
    const repo = AppDataSource.getRepository(OutboxEvent);

    const events = await repo.find({
      where: { processed: false },
      take: 20,
    });

    for (const event of events) {
      this.publisher.publish(event.type, {
        eventId: event.id,
        payload: event.payload,
      });

      event.processed = true;
      await repo.save(event);
    }
  }
}
