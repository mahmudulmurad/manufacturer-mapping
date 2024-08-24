import { IsNotEmpty, IsString } from 'class-validator';

export class CommonDTO {
  @IsNotEmpty()
  @IsString()
  title: string;
}
