import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingConsumer } from './messaging/billing.consumer';

import { Account } from './entities/account.entity';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Payment, Refund])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule implements OnModuleInit {
  constructor(private readonly billingService: BillingService) {}

  async onModuleInit() {
    const consumer = new BillingConsumer(this.billingService);
    await consumer.start();
  }
}
