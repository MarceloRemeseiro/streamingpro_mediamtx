import { ProtocoloStream } from '../../prisma/generated/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class CrearEntradaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(ProtocoloStream)
  protocolo: ProtocoloStream;

  @ValidateIf((o) => o.protocolo === ProtocoloStream.SRT)
  @IsInt()
  @Min(1024)
  @Max(65535)
  puertoSRT?: number;

  @IsInt()
  @Min(80)
  @Max(2000)
  @IsOptional()
  latenciaSRT?: number;

  @IsString()
  @IsOptional()
  passphraseSRT?: string;

  @IsString()
  @IsOptional()
  streamId?: string;
} 