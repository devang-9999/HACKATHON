import { connect, Channel, ChannelModel } from 'amqplib';
import { rabbitmqConfig } from 'src/config/rabbitmq.config';

export class RabbitMQPublisher {
  private connection?: ChannelModel;
  private channel?: Channel;

  async connect(): Promise<void> {
    if (this.connection && this.channel) return;

    this.connection = await connect(rabbitmqConfig.url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(rabbitmqConfig.exchange, 'topic', {
      durable: true,
    });

    console.log('📤 RabbitMQ Publisher connected');
  }

  publish(routingKey: string, payload: unknown): void {
    if (!this.channel) {
      throw new Error('Channel not initialized');
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
