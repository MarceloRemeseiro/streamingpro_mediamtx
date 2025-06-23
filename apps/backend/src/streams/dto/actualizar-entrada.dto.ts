import { PartialType } from '@nestjs/mapped-types';
import { CrearEntradaDto } from './crear-entrada.dto';
import { IsOptional, IsString } from 'class-validator';

export class ActualizarEntradaDto extends PartialType(CrearEntradaDto) {
  @IsOptional()
  @IsString()
  claveStream?: string;
} 