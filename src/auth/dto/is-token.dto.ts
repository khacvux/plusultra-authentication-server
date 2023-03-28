import { IsNotEmpty, IsString } from 'class-validator';

export class IsTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
