import * as dotenv from 'dotenv';

dotenv.config();

export const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',

  exchange: process.env.RABBITMQ_EXCHANGE || 'order_events',

  queues: {
    billing: 'billing_queue',
  },

  routingKeys: {
    orderCreated: 'order.created',
    orderBilled: 'order.billed',
    paymentFailed: 'payment.failed',
    orderRefunded: 'order.refunded',
  },
};
