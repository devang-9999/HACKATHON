/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost';

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.prefetch(25);

    console.log('RabbitMQ connected');
  }

  // ------------------------------------------------
  // publish event
  // ------------------------------------------------
  async publish(queue: string, message: any) {
    await this.channel.assertQueue(queue, { durable: true });

    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }

  // ------------------------------------------------
  // subscribe to queue
  // ------------------------------------------------
  async subscribe(
    queue: string,
    handler: (msg: any, rawMsg: any) => Promise<void>,
  ) {
    await this.channel.assertQueue(queue, { durable: true });

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      const content = JSON.parse(msg.content.toString());

      await handler(content, msg);
    });
  }

  ack(msg: amqp.ConsumeMessage) {
    this.channel.ack(msg);
  }

  nack(msg: amqp.ConsumeMessage) {
    this.channel.nack(msg);
  }
}
