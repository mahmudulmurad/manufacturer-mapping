import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ManufacturerEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  relatedManufacturers: string;

  @Column({ nullable: true })
  relationType: string;
}
