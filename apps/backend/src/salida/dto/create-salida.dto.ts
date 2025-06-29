import { ProtocoloSalida } from '../../entities/enums';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  ValidateIf,
  Matches,
} from 'class-validator';

export class CreateSalidaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEnum(ProtocoloSalida)
  protocolo: ProtocoloSalida;

  @IsString()
  @IsNotEmpty()
  entradaId: string;

  @IsBoolean()
  @IsOptional()
  habilitada?: boolean;

  // URL destino (requerida para RTMP y SRT, opcional para HLS)
  // Acepta URLs de streaming: rtmp://, rtmps://, srt://
  @ValidateIf((o) => o.protocolo === ProtocoloSalida.RTMP || o.protocolo === ProtocoloSalida.RTMPS || o.protocolo === ProtocoloSalida.SRT)
  @IsString()
  @IsNotEmpty()
  @Matches(/^(rtmps?|srt):\/\/[^\s/$.?#].[^\s]*$/i, {
    message: 'urlDestino debe ser una URL válida de streaming (rtmp://, rtmps:// o srt://)',
  })
  urlDestino?: string;

  // Campos específicos de RTMP/RTMPS
  @ValidateIf((o) => o.protocolo === ProtocoloSalida.RTMP || o.protocolo === ProtocoloSalida.RTMPS)
  @IsString()
  @IsOptional()
  claveStreamRTMP?: string;

  // Campos específicos de SRT
  @ValidateIf((o) => o.protocolo === ProtocoloSalida.SRT)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  puertoSRT?: number;

  @ValidateIf((o) => o.protocolo === ProtocoloSalida.SRT)
  @IsString()
  @IsOptional()
  passphraseSRT?: string;

  @ValidateIf((o) => o.protocolo === ProtocoloSalida.SRT)
  @IsInt()
  @Min(80)
  @Max(2000)
  @IsOptional()
  latenciaSRT?: number;

  @ValidateIf((o) => o.protocolo === ProtocoloSalida.SRT)
  @IsString()
  @IsOptional()
  streamIdSRT?: string;

  // Campos específicos de HLS
  @ValidateIf((o) => o.protocolo === ProtocoloSalida.HLS)
  @IsInt()
  @Min(2)
  @Max(10)
  @IsOptional()
  segmentDuration?: number;

  @ValidateIf((o) => o.protocolo === ProtocoloSalida.HLS)
  @IsInt()
  @Min(3)
  @Max(10)
  @IsOptional()
  playlistLength?: number;
}
