import { IsString } from 'class-validator';

export class UpdateShipmentStatusDto {
  @IsString()
  status: string;
}
