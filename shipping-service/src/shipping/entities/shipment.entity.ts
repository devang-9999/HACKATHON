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
