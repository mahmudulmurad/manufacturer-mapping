import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class FilePathDTO {
  @IsNotEmpty()
  @IsArray()
  otherSources: string[];

  @IsNotEmpty()
  @IsString()
  matchSource: string;
}
