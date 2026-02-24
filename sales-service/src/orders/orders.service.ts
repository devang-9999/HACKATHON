import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../config/datasource';
import { OutboxEvent } from '../outbox/outbox.entity';
import { InboxEvent } from '../inbox/inbox.entity';
import { OrdersGateway } from '../websocket/orders.gateway';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';
import { v4 as uuid } from 'uuid';
import { OrderEvent } from 'src/types/order-event.type';

@Injectable()
export class OrdersService {
  constructor(private gateway: OrdersGateway) {}

  private orderRepo = AppDataSource.getRepository(Order);
  private inboxRepo = AppDataSource.getRepository(InboxEvent);

  async createOrder(customerId: string, totalAmount: number) {
    return AppDataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        customerId,
        totalAmount,
        status: OrderStatus.CREATED,
      });

      await manager.save(order);

      await manager.save(OutboxEvent, {
        id: uuid(),
        type: 'order.created',
        payload: {
          orderId: order.id,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
        },
      });

      this.gateway.orderCreated(order);

      return order;
    });
  }

  async getOrder(orderId: string) {
    return this.orderRepo.findOneBy({ id: orderId });
  }

  async getAllOrders() {
    return this.orderRepo.find();
  }

  async handleOrderBilled(event: OrderEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.BILLED);
    });
  }

  async handlePaymentFailed(event: OrderEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.FAILED);
    });
  }

  async handleShippingCreated(event: OrderEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.SHIPPING);
    });
  }

  async handleOrderCompleted(event: OrderEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.COMPLETED);
    });
  }

  async handleOrderRefunded(event: OrderEvent) {
    await this.processEvent(event.eventId, async () => {
      await this.updateStatus(event.orderId, OrderStatus.REFUNDED);
    });
  }

  private async processEvent(eventId: string, handler: () => Promise<void>) {
    const exists = await this.inboxRepo.findOneBy({ eventId });
    if (exists) return;

    await AppDataSource.transaction(async (manager) => {
      await handler();

      await manager.save(InboxEvent, { eventId });
    });
  }

  private async updateStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) return;

    if (!this.isValidTransition(order.status, newStatus)) {
      console.log(`Invalid transition ${order.status} -> ${newStatus}`);
      return;
    }

    order.status = newStatus;
    await this.orderRepo.save(order);

    this.gateway.orderCreated(order);
  }

  private isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      CREATED: [OrderStatus.BILLED, OrderStatus.FAILED],
      BILLED: [OrderStatus.SHIPPING, OrderStatus.REFUNDED],
      SHIPPING: [OrderStatus.COMPLETED],
      COMPLETED: [],
      FAILED: [],
      REFUNDED: [],
    };

    return transitions[current].includes(next);
  }

  async resetDatabase() {
    await AppDataSource.query('TRUNCATE orders CASCADE');
    await AppDataSource.query('TRUNCATE outbox_events CASCADE');
    await AppDataSource.query('TRUNCATE inbox_events CASCADE');

    return { message: 'Database cleared' };
  }
}
