/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../../messaging/rabbitmq/rabbitmq.service';
import { InboxService } from '../../messaging/inbox/inbox.service';
import { ShipmentLifecycleService } from '../service/shipment-lifecycle';

@Injectable()
export class DeliveryUpdateConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly inbox: InboxService,
    private readonly lifecycle: ShipmentLifecycleService,
  ) {}

  async onModuleInit() {
    await this.rabbitmq.subscribe(
      'delivery.completed',
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

      await this.lifecycle.updateStatus(payload.orderId, 'DELIVERED');

      await this.inbox.markProcessed(eventId, 'delivery.completed');

      this.rabbitmq.ack(rawMsg);
    } catch (err) {
      console.error('delivery update failed', err);
      this.rabbitmq.nack(rawMsg);
    }
  }
}
