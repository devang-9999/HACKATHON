/* eslint-disable @typescript-eslint/no-unused-vars */
import { connect, Channel, ChannelModel } from 'amqplib';
import { rabbitmqConfig } from 'src/config/rabbitmq.config';

export class RabbitMQPublisher {
  private connection?: ChannelModel;
  private channel?: Channel;

  async connect(): Promise<void> {
    if (this.connection && this.channel) return;

    const url = rabbitmqConfig.url;

    while (true) {
      try {
        this.connection = await connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
          durable: true,
        });

        console.log('Billing RabbitMQ Publisher connected');
        break;
      } catch (err) {
        console.log('Billing waiting for RabbitMQ... retry in 5s');
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }

  publish(routingKey: string, payload: unknown): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const message = Buffer.from(JSON.stringify(payload));

    this.channel.publish(rabbitmqConfig.exchange, routingKey, message, {
      persistent: true,
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
