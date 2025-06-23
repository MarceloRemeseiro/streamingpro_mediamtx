import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearSalidaDto } from './crear-salida.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class ActualizarSalidaDto extends PartialType(
  OmitType(CrearSalidaDto, ['entradaId'] as const)
) {
  @IsBoolean()
  @IsOptional()
  habilitada?: boolean;
} 