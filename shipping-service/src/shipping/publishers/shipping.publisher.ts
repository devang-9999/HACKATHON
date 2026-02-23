import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../messaging/outbox/outbox.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ShippingPublisher {
  constructor(private readonly outbox: OutboxService) {}

  // ------------------------------------------------
  // SHIPPING CREATED
  // ------------------------------------------------
  async publishShippingCreated(data: {
    orderId: string;
    trackingNumber: string;
  }) {
    await this.outbox.saveEvent({
      eventId: uuid(),
      eventType: 'shipping.created',
      payload: data,
    });
  }

  // ------------------------------------------------
  // SHIPPING FAILED
  // ------------------------------------------------
  async publishShippingFailed(data: { orderId: string; reason: string }) {
    await this.outbox.saveEvent({
      eventId: uuid(),
      eventType: 'shipping.failed',
      payload: data,
    });
  }

  // ------------------------------------------------
  // ORDER COMPLETED
  // ------------------------------------------------
  async publishOrderCompleted(data: { orderId: string }) {
    await this.outbox.saveEvent({
      eventId: uuid(),
      eventType: 'order.completed',
      payload: data,
    });
  }
}
