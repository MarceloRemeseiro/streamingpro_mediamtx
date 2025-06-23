import { ProtocoloStream } from '../../prisma/generated/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CrearEntradaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(ProtocoloStream)
  protocolo: ProtocoloStream;

  @IsInt()
  @Min(80)
  @Max(2000)
  @IsOptional()
  latenciaSRT?: number;

  @IsBoolean()
  @IsOptional()
  incluirPassphrase?: boolean; // Solo para SRT
} 