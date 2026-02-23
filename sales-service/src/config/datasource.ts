import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OutboxEvent } from 'src/outbox/outbox.entity';
import { InboxEvent } from 'src/inbox/inbox.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Order, OutboxEvent, InboxEvent],
  synchronize: true,
});
