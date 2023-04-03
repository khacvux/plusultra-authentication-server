import { IsNotEmpty, IsNumber } from 'class-validator';

export class IsUserIdDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
