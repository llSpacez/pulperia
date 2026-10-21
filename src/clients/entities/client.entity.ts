import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  phone: string; // Usaremos el teléfono para identificarlos

  @Column({ default: 0 })
  points: number; // 👈 Aquí se guardan los puntos

  @Column({ default: 0 })
  totalPurchases: number;

  @Column({ default: false })
  isFrequent: boolean; // Para saber si es cliente al por mayor

  @CreateDateColumn()
  createdAt: Date;
}