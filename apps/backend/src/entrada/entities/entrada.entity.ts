import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProtocoloStream } from '../../entities/enums';
import { SalidaStream } from '../../salida/entities/salida.entity';

@Entity('EntradaStream')
export class EntradaStream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  nombre: string;

  @Column({
    type: 'enum',
    enum: ProtocoloStream,
  })
  protocolo: ProtocoloStream;

  @Column({ type: 'int', nullable: true })
  puertoSRT?: number;

  @Column({ type: 'int', nullable: true, default: 200 })
  latenciaSRT?: number;

  @Column({ type: 'varchar', nullable: true })
  passphraseSRT?: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  streamId?: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  streamKey?: string;

  @Column({ type: 'varchar' })
  url: string;

  @OneToMany(() => SalidaStream, (salida) => salida.entrada, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  salidas: SalidaStream[];
}
