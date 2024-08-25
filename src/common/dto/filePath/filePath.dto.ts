import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilePathDTO {
  @ApiProperty({
    description: 'List of other source file paths',
    example: [
      '/path/imum_backend-task_data_pack/backend-task/apo-lt-data.csv',
      '/path/imum_backend-task_data_pack/backend-task/azt-lt-data.csv',
      '/path/imum_backend-task_data_pack/backend-task/bnu-lt-data.csv',
      '/path/imum_backend-task_data_pack/backend-task/cma-lt-data.csv',
      '/path/imum_backend-task_data_pack/backend-task/gin-lt-data.csv',
      '/path/imum_backend-task_data_pack/backend-task/ntn-lt-data.csv',
    ],
  })
  @IsNotEmpty()
  @IsArray()
  otherSources: string[];

  @ApiProperty({
    description: 'Path to the file where the match source is located',
    example: '/path/imum_backend-task_data_pack/backend-task/matches.csv',
  })
  @IsNotEmpty()
  @IsString()
  matchSource: string;
}
