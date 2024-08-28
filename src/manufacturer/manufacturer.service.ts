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
        manufacturerEntity.relationType = this.manufacturerRelationshipAlgo(
          uniqueManufacturers,
          dto.title,
        );
        manufacturerEntity.investigationRequired =
          this.manufacturersInvestigationAlgo(uniqueManufacturers, dto.title);

        const savedEntity =
          await this.manufacturerRepository.save(manufacturerEntity);
        savedManufacturers.push(savedEntity);
      }
    }

    return savedManufacturers;
  }

  //Task - 3.2
  async assignManufacturerByTitle(dto: CommonDTO): Promise<ManufacturerEntity> {
    const { title } = dto;
    const productExist = await this.manufacturerRepository.findOne({
      where: { relatedManufacturers: title },
    });

    if (!productExist) {
      const parsedTitle = title.split(' ');
      const productId =
        parsedTitle?.length > 1
          ? `${parsedTitle[0]}_${parsedTitle[1]}`
          : parsedTitle[0];
      const manufacturerEntity = new ManufacturerEntity();
      manufacturerEntity.name = productId;
      manufacturerEntity.title = title;
      manufacturerEntity.relatedManufacturers = parsedTitle[0];
      manufacturerEntity.relationType = 'parent';
      manufacturerEntity.investigationRequired = true;

      return await this.manufacturerRepository.save(manufacturerEntity);
    }
  }

  async manualInvestigationItemList(): Promise<ManufacturerEntity[]> {
    const list = await this.manufacturerRepository.find({
      where: { investigationRequired: true },
    });
    return list;
  }

  //Task- 3.1.1
  private manufacturerRelationshipAlgo(
    manufacturers: string[],
    title: string,
  ): string {
    // only one manufacturer, the function labels it as "parent." if found in title
    // When there are two manufacturers, it cleans and normalizes their names by removing non-English letters
    // and converting them to lowercase. If the cleaned names are identical, the function returns "parent."
    // If one name is a substring of the other,it returns "child/parent" or "parent/child" depending one the smaller one;
    // otherwise, the first and senond one will be check if any of them are substring of title then
    //which one is substring ,it will be parent and other will be child
    // and If both are found as substrings in the title, the larger one is the parent

    // with more than two manufacturers, the function classifies them as "siblings."

    if (!manufacturers || manufacturers.length === 0) return '';

    const normalizedManufacturers = manufacturers.map((m) =>
      this.removeNonEnglishLetters(m).toLowerCase(),
    );

    const [firstManufacturer, secondManufacturer] = normalizedManufacturers;

    const data = this.manufacturersInvestigationAlgo(manufacturers, title);

    switch (manufacturers.length) {
      case 1:
        return data ? 'unknown' : 'parent';
      case 2:
        if (!data && firstManufacturer === secondManufacturer) return 'parent';

        const firstIsSubstring = this.isSubstring(
          firstManufacturer,
          secondManufacturer,
        );
        const secondIsSubstring = this.isSubstring(
          secondManufacturer,
          firstManufacturer,
        );

        if (!firstIsSubstring && !secondIsSubstring) {
          const titleLower = this.removeNonEnglishLetters(title).toLowerCase();
          const firstInTitle = this.isSubstring(titleLower, firstManufacturer);
          const secondInTitle = this.isSubstring(
            titleLower,
            secondManufacturer,
          );

          if (firstInTitle && secondInTitle) {
            return firstManufacturer.length > secondManufacturer.length
              ? 'parent/child'
              : 'child/parent';
          } else if (firstInTitle) {
            return 'parent/child';
          } else if (secondInTitle) {
            return 'child/parent';
          } else {
            return 'sibling';
          }
        }

        return firstIsSubstring ? 'child/parent' : 'parent/child';
      default:
        return 'sibling';
    }
  }

  //Task-3.4
  private manufacturersInvestigationAlgo(
    manufacturers: string[],
    title: string,
  ): boolean {
    //if any of manufacturers are not found in product title
    //then they need to investigate manually and setting the field true

    const lowerCaseTitle = this.removeNonEnglishLetters(title).toLowerCase();

    return !manufacturers.some((manufacturer) =>
      lowerCaseTitle.includes(
        this.removeNonEnglishLetters(manufacturer).toLowerCase(),
      ),
    );
  }

  private removeNonEnglishLetters(str: string) {
    // regular expression to keep only english letters (a-z, A-Z)
    return str.replace(/[^a-zA-Z]/g, '');
  }

  private isSubstring(strOne: string, strTwo: string): boolean {
    return strOne.includes(strTwo);
  }
}
