import { IsString, IsNumber, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;
}
