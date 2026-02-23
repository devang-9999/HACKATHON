/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';

import { Account } from './entities/account.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { InboxEvent } from './inbox/inbox.entity';
import { OutboxEvent } from './outbox/outbox.entity';

@Injectable()
export class BillingService {
  constructor(private readonly dataSource: DataSource) {}

  private async writeOutbox(
    manager: EntityManager,
    eventType: string,
    payload: any,
  ) {
    await manager.save(
      manager.create(OutboxEvent, {
        eventType,
        payload,
        processed: false,
      }),
    );
  }

  async processEvent(routingKey: string, payload: any): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const inboxRepo = manager.getRepository(InboxEvent);

      const exists = await inboxRepo.findOne({
        where: { eventId: payload.eventId },
      });

      if (exists) {
        console.log('⚠ Duplicate event ignored', payload.eventId);
        return;
      }

      if (routingKey === 'order.created') {
        await this.handleOrderCreatedTx(manager, payload);
      }

      if (routingKey === 'order.refund.requested') {
        await this.handleRefundRequestedTx(manager, payload);
      }

      await inboxRepo.save({
        eventId: payload.eventId,
        eventType: routingKey,
      });
    });
  }

  private async handleOrderCreatedTx(manager: EntityManager, event: any) {
    const { orderId, customerId, totalAmount } = event;

    let account = await manager.findOne(Account, {
      where: { customerId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      account = manager.create(Account, { customerId, balance: 0 });
      await manager.save(account);
    }

    if (Number(account.balance) < Number(totalAmount)) {
      await manager.save(
        manager.create(Payment, {
          orderId,
          customerId,
          accountId: account.id,
          amount: totalAmount,
          status: PaymentStatus.FAILED,
        }),
      );

      await this.writeOutbox(manager, 'payment.failed', {
        eventId: crypto.randomUUID(),
        orderId,
        customerId,
        amount: totalAmount,
      });

      console.log(' Payment failed');
      return;
    }

    account.balance -= Number(totalAmount);
    await manager.save(account);

    await manager.save(
      manager.create(Payment, {
        orderId,
        customerId,
        accountId: account.id,
        amount: totalAmount,
        status: PaymentStatus.SUCCESS,
      }),
    );

    await this.writeOutbox(manager, 'order.billed', {
      eventId: crypto.randomUUID(),
      orderId,
      customerId,
      amount: totalAmount,
    });

    console.log(' Payment successful');
  }

  private async handleRefundRequestedTx(manager: EntityManager, event: any) {
    const { orderId } = event;

    console.log('Refund requested for order:', orderId);

    const payment = await manager.findOne(Payment, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!payment) {
      throw new Error(` Payment not found for order ${orderId}`);
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      console.log('⚠ Payment already refunded:', orderId);
      return;
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error(
        `Payment not eligible for refund. Status = ${payment.status}`,
      );
    }

    const account = await manager.findOne(Account, {
      where: { id: payment.accountId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      throw new Error(`Account not found for payment ${payment.accountId}`);
    }

    const oldBalance = Number(account.balance);
    const refundAmount = Number(payment.amount);

    account.balance = oldBalance + refundAmount;

    await manager.save(account);

    console.log(` Balance updated: ${oldBalance} → ${account.balance}`);

    payment.status = PaymentStatus.REFUNDED;
    await manager.save(payment);

    await manager.save(
      manager.create(Refund, {
        orderId,
        paymentId: payment.id,
        customerId: payment.customerId,
        amount: payment.amount,
      }),
    );

    await this.writeOutbox(manager, 'order.refunded', {
      eventId: crypto.randomUUID(),
      orderId,
      customerId: payment.customerId,
      amount: payment.amount,
    });

    console.log('Refund completed successfully');
  }
}
