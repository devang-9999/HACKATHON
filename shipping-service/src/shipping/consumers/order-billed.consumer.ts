/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../../messaging/rabbitmq/rabbitmq.service';
import { InboxService } from '../../messaging/inbox/inbox.service';
import { ShippingService } from '../service/shipping.service';

@Injectable()
export class OrderBilledConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly inbox: InboxService,
    private readonly shippingService: ShippingService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      'order.billed',
      this.handleMessage.bind(this),
    );
  }

  private async handleMessage(message: any, rawMsg: any) {
    const { eventId, payload } = message;

    try {
      const alreadyProcessed = await this.inbox.isProcessed(eventId);
      if (alreadyProcessed) {
        this.rabbitmq.ack(rawMsg);
        return;
      }

      await this.shippingService.handleOrderBilled(payload);

      await this.inbox.markProcessed(eventId, 'order.billed');

      this.rabbitmq.ack(rawMsg);
    } catch (err) {
      console.error('order.billed failed', err);
      this.rabbitmq.nack(rawMsg);
    }
  }
}
