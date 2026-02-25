/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, Channel, ChannelModel } from 'amqplib';
import { rabbitmqConfig } from '../../config/rabbitmq.config';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  async connect(): Promise<void> {
    if (this.connection && this.channel) return;

    const url = rabbitmqConfig.url;

    while (!this.channel) {
      try {
        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
          durable: true,
        });

        console.log('Billing RabbitMQ Publisher connected ✅');
      } catch (err) {
        console.log('Billing waiting for RabbitMQ... retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  async publish(routingKey: string, payload: unknown): Promise<boolean> {
    if (!this.channel) {
      await this.connect(); // auto connect if not ready
    }

    if (!this.channel) {
      console.warn('RabbitMQ still not connected');
      return false;
    }

    return this.channel.publish(
      rabbitmqConfig.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
