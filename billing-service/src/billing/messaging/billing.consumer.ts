/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */

import { connect, Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { rabbitmqConfig } from '../../config/rabbitmq.config';
import { BillingService } from '../billing.service';

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
        console.log(' Billing consumer connecting to RabbitMQ...');

        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
          durable: true,
        });

        const q = await this.channel.assertQueue(
          rabbitmqConfig.queues.billing,
          { durable: true },
        );

        await this.channel.bindQueue(
          q.queue,
          rabbitmqConfig.exchange,
          rabbitmqConfig.routingKeys.orderCreated,
        );

        await this.channel.bindQueue(
          q.queue,
          rabbitmqConfig.exchange,
          'order.refund.requested',
        );

        await this.channel.prefetch(25);

        console.log('Billing consumer started');

        await this.channel.consume(
          q.queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg || !this.channel) return;

            try {
              const content = JSON.parse(msg.content.toString());
              const routingKey = msg.fields.routingKey;

              await this.billingService.processEvent(routingKey, content);

              this.channel.ack(msg);
            } catch (err) {
              console.error('Billing event failed', err);
              this.channel.nack(msg, false, false);
            }
          },
        );
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
