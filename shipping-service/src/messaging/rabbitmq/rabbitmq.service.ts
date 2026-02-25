/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect, Channel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection!: Awaited<ReturnType<typeof connect>>;
  private channel!: Channel;

  private exchange = process.env.RABBITMQ_EXCHANGE!;
  private url = process.env.RABBITMQ_URL!;
  private queue = process.env.SHIPPING_QUEUE || 'shipping-service-queue';

  async onModuleInit() {
    await this.ensureConnection();
  }

  private async ensureConnection() {
    if (this.channel) return;

    while (!this.channel) {
      try {
        console.log('Shipping connecting to RabbitMQ...');

        this.connection = await connect(this.url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(this.exchange, 'topic', {
          durable: true,
        });

        await this.channel.prefetch(25);

        console.log('RabbitMQ connected (shipping)');
      } catch (err) {
        console.log('RabbitMQ retry in 5s...');
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  async publish(routingKey: string, message: any): Promise<boolean> {
    try {
      await this.ensureConnection();

      const ok = this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      return ok;
    } catch (err) {
      console.error('RabbitMQ publish failed', err);
      return false;
    }
  }
  async subscribe(
    routingKey: string,
    handler: (msg: any, rawMsg: ConsumeMessage) => Promise<void>,
  ) {
    await this.ensureConnection();

    const q = await this.channel.assertQueue(this.queue, {
      durable: true,
    });

    await this.channel.bindQueue(q.queue, this.exchange, routingKey);

    await this.channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content, msg);
      } catch (err) {
        console.error('Consumer handler error', err);
        this.channel.nack(msg, false, true);
      }
    });

    console.log(`Subscribed to ${routingKey}`);
  }
  ack(msg: ConsumeMessage) {
    this.channel.ack(msg);
  }

  nack(msg: ConsumeMessage) {
    this.channel.nack(msg, false, true);
  }
}
