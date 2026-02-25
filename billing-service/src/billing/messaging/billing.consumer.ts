/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
// billing/messaging/billing.consumer.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../../config/rabbitmq.config';
import { BillingService } from '../billing.service';

@Injectable()
export class BillingConsumer {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly billingService: BillingService) {}

  async start(): Promise<void> {
    if (this.connection && this.channel) return;
    await this.connectWithRetry();
  }

  private async connectWithRetry() {
    const url = rabbitmqConfig.url;

    while (!this.channel) {
      try {
        console.log('Billing consumer connecting to RabbitMQ...');
        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
          durable: true,
        });

        const q = await this.channel.assertQueue(
          rabbitmqConfig.queues.billing,
          { durable: true },
        );

        // Bind all billing-related events
        await this.channel.bindQueue(
          q.queue,
          rabbitmqConfig.exchange,
          'order.created',
        );
        await this.channel.bindQueue(
          q.queue,
          rabbitmqConfig.exchange,
          'order.refund.requested',
        );

        await this.channel.prefetch(25);

        await this.channel.consume(
          q.queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg || !this.channel) return;

            try {
              const message = JSON.parse(msg.content.toString());
              const routingKey = msg.fields.routingKey;

              await this.billingService.processEvent(routingKey, message);

              this.channel.ack(msg);
            } catch (err) {
              console.error('Billing event failed', err);
              this.channel.nack(msg, false, true);
            }
          },
        );

        console.log('Billing consumer started ');
      } catch (err) {
        console.log('RabbitMQ not ready for billing — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
