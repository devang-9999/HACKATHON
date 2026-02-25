import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { OrderBilledConsumer } from 'src/shipping/consumers/order-billed.consumer';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const consumer = app.get(OrderBilledConsumer);
  await consumer.start();
}

run();