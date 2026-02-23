/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../config/datasource';
import { OutboxEvent } from '../outbox/outbox.entity';
import { InboxEvent } from '../inbox/inbox.entity';
import { OrdersGateway } from '../websocket/orders.gateway';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(private gateway: OrdersGateway) {}

  private orderRepo = AppDataSource.getRepository(Order);
  private outboxRepo = AppDataSource.getRepository(OutboxEvent);
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
        type: 'order.created',
        payload: order,
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



  async handleOrderBilled(event: any) {
    await this.processEvent(event.id, async () => {
      await this.updateStatus(event.orderId, OrderStatus.BILLED);
    });
  }

  async handlePaymentFailed(event: any) {
    await this.processEvent(event.id, async () => {
      await this.updateStatus(event.orderId, OrderStatus.FAILED);
    });
  }

  async handleShippingCreated(event: any) {
    await this.processEvent(event.id, async () => {
      await this.updateStatus(event.orderId, OrderStatus.SHIPPING);
    });
  }

  async handleOrderCompleted(event: any) {
    await this.processEvent(event.id, async () => {
      await this.updateStatus(event.orderId, OrderStatus.COMPLETED);
    });
  }

  async handleOrderRefunded(event: any) {
    await this.processEvent(event.id, async () => {
      await this.updateStatus(event.orderId, OrderStatus.REFUNDED);
    });
  }



  private async processEvent(eventId: string, handler: () => Promise<void>) {
    const exists = await this.inboxRepo.findOneBy({ eventId });
    if (exists) return; // already processed

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

    this.gateway.orderCreated(order); // notify change
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
