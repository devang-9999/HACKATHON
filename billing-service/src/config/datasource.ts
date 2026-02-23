import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// import entities manually
import { Account } from '../billing/entities/account.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Refund } from '../billing/entities/refund.entity';
import { OutboxEvent } from 'src/billing/outbox/outbox.entity';
import { InboxEvent } from 'src/billing/inbox/inbox.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'billing_db',

  // 👇 REQUIRED in pure TypeORM
  entities: [Account, Payment, Refund, OutboxEvent, InboxEvent],

  synchronize: true,
  logging: true,
});
