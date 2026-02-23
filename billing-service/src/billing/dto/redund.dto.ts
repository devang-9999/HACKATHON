import { IsString, IsNumber, IsPositive } from 'class-validator';

export class RefundDto {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
