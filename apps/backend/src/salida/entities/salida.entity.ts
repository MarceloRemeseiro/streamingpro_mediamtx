import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProtocoloSalida, EstadoOutput } from '../../entities/enums';
import { EntradaStream } from '../../entrada/entities/entrada.entity';

@Entity('SalidaStream')
export class SalidaStream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  nombre: string;

  @Column({ type: 'boolean', default: false })
  habilitada: boolean;

  @Column({ type: 'uuid' })
  entradaId: string;

  @Column({ type: 'varchar', nullable: true })
  urlDestino?: string;

  @Column({ type: 'varchar', nullable: true })
  passphraseSRT?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  claveStreamRTMP?: string;

  @Column({ type: 'int', nullable: true, default: 120 })
  latenciaSRT?: number;

  @Column({ type: 'int', nullable: true, default: 5 })
  playlistLength?: number;

  @Column({
    type: 'enum',
    enum: ProtocoloSalida,
  })
  protocolo: ProtocoloSalida;

  @Column({ type: 'int', nullable: true })
  puertoSRT?: number;

  @Column({ type: 'int', nullable: true, default: 6 })
  segmentDuration?: number;

  @Column({ type: 'varchar', nullable: true })
  streamIdSRT?: string;

  @Column({ type: 'int', nullable: true })
  procesoFantasmaPid: number | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({
    type: 'enum',
    enum: EstadoOutput,
    nullable: true,
  })
  estado?: EstadoOutput;

  @ManyToOne(() => EntradaStream, (entrada) => entrada.salidas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'entradaId' })
  entrada: EntradaStream;

  // Campos que no son de BD, se llenan en el servicio
  streamKey?: string;
  streamId?: string;
}
