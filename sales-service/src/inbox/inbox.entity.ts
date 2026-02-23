import { Entity, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('inbox_events')
export class InboxEvent {
  @PrimaryColumn()
  eventId: string;

  @CreateDateColumn()
  receivedAt: Date;
}
