import { ProtocoloStream } from '../../entities/enums';
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

export class CreateEntradaDto {
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

  @IsInt()
  @Min(1024)
  @Max(65535)
  @IsOptional()
  puertoSRT?: number;

  @IsString()
  @IsOptional()
  passphraseSRT?: string;

  @IsBoolean()
  @IsOptional()
  incluirPassphrase?: boolean; // Solo para SRT
}
