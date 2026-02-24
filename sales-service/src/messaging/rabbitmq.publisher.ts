/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { rabbitConfig } from '../config/rabbitmq.config';

@Injectable()
export class RabbitPublisher implements OnModuleInit, OnModuleDestroy {
  connect() {
    throw new Error('Method not implemented.');
  }
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  async onModuleInit() {
    await this.startConnectionLoop();
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
  private async startConnectionLoop() {
    const url = rabbitConfig.url;

    while (!this.channel) {
      try {
        console.log('Sales connecting to RabbitMQ...');

        const conn = await amqp.connect(url);
        const channel = await conn.createChannel();

        await channel.assertExchange(rabbitConfig.exchange, 'topic', {
          durable: true,
        });

        this.connection = conn;
        this.channel = channel;

        console.log('Sales RabbitMQ connected');
      } catch (err) {
        console.log('RabbitMQ not ready — retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  publish(event: string, payload: any) {
    if (!this.channel) {
      console.warn('⚠ RabbitMQ not connected — event skipped');
      return;
    }

    this.channel.publish(
      rabbitConfig.exchange,
      event,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }
}
