import { Body, Controller, Get, Post } from '@nestjs/common';
import { ManufacturerService } from './manufacturer.service';
import { CommonDTO, FilePathDTO } from 'src/common/dto';
import { ManufacturerEntity } from 'src/common/entities';

@Controller('manufacturer')
export class ManufacturerController {
  constructor(private readonly manufacturerService: ManufacturerService) {}

  @Post('map')
  async mapManufacturers(
    @Body() dto: FilePathDTO,
  ): Promise<ManufacturerEntity[]> {
    return await this.manufacturerService.parseCSVAndMapManufacturers(dto);
  }

  @Post('assigned-manufacturer')
  async assignManufacturer(
    @Body() dto: CommonDTO,
  ): Promise<ManufacturerEntity> {
    return await this.manufacturerService.assignManufacturerByTitle(dto);
  }

  @Get('manual-investigation-items')
  async manualInvestigationItems(): Promise<ManufacturerEntity[]> {
    return await this.manufacturerService.manualInvestigationItemList();
  }
}
