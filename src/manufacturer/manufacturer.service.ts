import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManufacturerEntity } from '../common/entities';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { CommonDTO, FilePathDTO } from 'src/common/dto';

@Injectable()
export class ManufacturerService {
  constructor(
    @InjectRepository(ManufacturerEntity)
    private manufacturerRepository: Repository<ManufacturerEntity>,
  ) {}

  async parseCSVAndMapManufacturers(
    dto: FilePathDTO,
  ): Promise<ManufacturerEntity[]> {
    const { otherSources, matchSource } = dto;
    const productMap = new Map<string, { title: string; data: string[] }>();

    for (const file of otherSources) {
      await this.processCSV(file, productMap);
    }

    await this.processMatchFile(matchSource, productMap);
    return await this.saveManufacturers(productMap);
  }

  private async processCSV(
    file: string,
    productMap: Map<string, { title: string; data: string[] }>,
  ) {
    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(file)
        .pipe(csv())
        .on('data', (row) => {
          const header = Object.keys(row)[0];
          const data = row[header];

          // Split the header and data strings into arrays
          const headers = header.split(';');

          const values = data.split(';');

          // A dictionary of the parsed values
          const mainHeader = ['title', 'manufacturer', 'source', 'source_id'];
          const productData = headers.reduce((acc, key, index) => {
            if (mainHeader?.includes(key)) {
              acc[key] = values[index];
            }

            return acc;
          }, {});

          // Extract m_source, m_source_id, and manufacturer
          const productId = `${productData['source']}_${productData['source_id']}`;
          const manufacturer = productData['manufacturer'];

          if (manufacturer && !productMap.has(productId)) {
            productMap.set(productId, {
              title: productData['title'],
              data: [],
            });
          }
          if (manufacturer) {
            productMap.get(productId).data.push(manufacturer);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private async processMatchFile(
    matchFile: string,
    productMap: Map<string, { title: string; data: string[] }>,
  ) {
    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(matchFile)
        .pipe(csv())
        .on('data', (row) => {
          const header = Object.keys(row)[0];
          const data = row[header];

          // Split the header and data strings into arrays
          const headers = header.split(';');
          const values = data.split(';');

          // A dictionary of the parsed values
          const matchData = headers.reduce((acc, key, index) => {
            acc[key] = values[index];
            return acc;
          }, {});

          // Extract the necessary fields
          const mainProductId = `${matchData['m_source']}_${matchData['m_source_id']}`;
          const competitorProductId = `${matchData['c_source']}_${matchData['c_source_id']}`;

          if (productMap.has(competitorProductId)) {
            const competitorManufacturers = productMap.get(competitorProductId);
            if (productMap.has(mainProductId)) {
              const mainManufacturers = productMap.get(mainProductId);
              competitorManufacturers.data.forEach((manufacturer) => {
                if (!mainManufacturers.data.includes(manufacturer)) {
                  mainManufacturers.data.push(manufacturer);
                }
              });
            } else {
              productMap.set(mainProductId, competitorManufacturers);
            }
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private async saveManufacturers(
    productMap: Map<string, { title: string; data: string[] }>,
  ): Promise<ManufacturerEntity[]> {
    const savedManufacturers: ManufacturerEntity[] = [];

    for (const [productId, dto] of productMap.entries()) {
      const uniqueManufacturers = Array.from(new Set(dto.data));
      const relatedManufacturers = uniqueManufacturers.join(',');

      const existingProduct = await this.manufacturerRepository.findOne({
        where: { name: productId },
      });

      if (!existingProduct) {
        const manufacturerEntity = new ManufacturerEntity();
        manufacturerEntity.name = productId;
        manufacturerEntity.title = dto.title;
        manufacturerEntity.relatedManufacturers = relatedManufacturers;
        manufacturerEntity.relationType = '';

        const savedEntity =
          await this.manufacturerRepository.save(manufacturerEntity);
        savedManufacturers.push(savedEntity);
      }
    }

    return savedManufacturers;
  }

  async assignManufacturerByTitle(dto: CommonDTO): Promise<string> {
    const { title } = dto;
    const manufacturers = await this.manufacturerRepository.find();
    for (const manufacturer of manufacturers) {
      if (
        manufacturer.relatedManufacturers
          .split(',')
          .some((m) => title.includes(m))
      ) {
        return manufacturer.name;
      }
    }
    return 'Unknown Manufacturer';
  }

  async validateManufacturerMapping(): Promise<string[]> {
    const invalidMappings: string[] = [];
    const manufacturers = await this.manufacturerRepository.find();
    for (const manufacturer of manufacturers) {
      if (this.isInvalidManufacturer(manufacturer.name)) {
        invalidMappings.push(manufacturer.name);
      }
    }
    return invalidMappings;
  }

  private isInvalidManufacturer(name: string): boolean {
    const commonWords = ['Health', 'Pharma', 'Inc', 'Ltd'];
    return commonWords.includes(name);
  }
}
