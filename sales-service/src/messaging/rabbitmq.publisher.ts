/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { rabbitConfig } from '../config/rabbitmq.config';

@Injectable()
export class RabbitPublisher implements OnModuleInit {
  private channel: amqp.Channel;

  async onModuleInit() {
    const conn = await amqp.connect(rabbitConfig.url);
    this.channel = await conn.createChannel();
    await this.channel.assertExchange(rabbitConfig.exchange, 'topic', {
      durable: true,
    });
  }

  async publish(event: string, payload: any) {
    await this.channel.publish(
      rabbitConfig.exchange,
      event,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }
}
