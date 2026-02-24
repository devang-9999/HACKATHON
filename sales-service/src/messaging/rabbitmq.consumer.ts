/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { Channel, ConsumeMessage } from 'amqplib';
import { rabbitConfig } from '../config/rabbitmq.config';
import { OrdersService } from '../orders/orders.service';
import { OrderEvent } from '../types/order-event.type';

@Injectable()
export class OrdersConsumer implements OnModuleInit {
  private channel!: Channel;

  constructor(private readonly ordersService: OrdersService) {}

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    while (!this.channel) {
      try {
        console.log(' Sales consumer connecting to RabbitMQ...');

        const conn = await amqp.connect(rabbitConfig.url);
        this.channel = await conn.createChannel();

        await this.channel.assertExchange(rabbitConfig.exchange, 'topic', {
          durable: true,
        });

        const queue = await this.channel.assertQueue('sales-service-queue', {
          durable: true,
        });

        await this.channel.bindQueue(
          queue.queue,
          rabbitConfig.exchange,
          'order.billed',
        );
        await this.channel.bindQueue(
          queue.queue,
          rabbitConfig.exchange,
          'payment.failed',
        );
        await this.channel.bindQueue(
          queue.queue,
          rabbitConfig.exchange,
          'shipping.created',
        );
        await this.channel.bindQueue(
          queue.queue,
          rabbitConfig.exchange,
          'order.completed',
        );
        await this.channel.bindQueue(
          queue.queue,
          rabbitConfig.exchange,
          'order.refunded',
        );

        await this.channel.prefetch(25);

        await this.channel.consume(
          queue.queue,
          (msg) => this.handleMessage(msg),
          { noAck: false },
        );

        console.log('Sales consumer connected');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;

    let data: OrderEvent;

    try {
      data = JSON.parse(msg.content.toString());
    } catch (err) {
      console.error('Invalid message JSON', err);
      this.channel.ack(msg);
      return;
    }

    try {
      switch (routingKey) {
        case 'order.billed':
          await this.ordersService.handleOrderBilled(data);
          break;
        case 'payment.failed':
          await this.ordersService.handlePaymentFailed(data);
          break;
        case 'shipping.created':
          await this.ordersService.handleShippingCreated(data);
          break;
        case 'order.completed':
          await this.ordersService.handleOrderCompleted(data);
          break;
        case 'order.refunded':
          await this.ordersService.handleOrderRefunded(data);
          break;
      }

      this.channel.ack(msg);
    } catch (err) {
      console.error('EVENT PROCESSING FAILED', err);
    }
  }
}
