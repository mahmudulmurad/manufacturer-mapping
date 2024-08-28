import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['name'])
export class ManufacturerEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  title: string;

  @Column()
  relatedManufacturers: string;

  @Column({ nullable: true })
  relationType: string;

  @Column()
  investigationRequired: boolean;
}
