/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { ShipmentItemEntity } from './shipment-item.entity';

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderId: string;

  @Column()
  status: string; // SHIPPED | DELIVERED | FAILED

  @Column()
  trackingNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ShipmentItemEntity, (item) => item.shipment, {
    cascade: true,
    eager: true,
  })
  items: ShipmentItemEntity[];
}
