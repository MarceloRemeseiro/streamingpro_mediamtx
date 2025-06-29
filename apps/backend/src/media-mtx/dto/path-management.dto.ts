import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

/**
 * DTOs para la gestión de paths en MediaMTX
 */

export class CreatePathDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  sourceOnDemand?: boolean;

  @IsOptional()
  @IsString()
  srtReadPassphrase?: string;

  @IsOptional()
  @IsString()
  srtPublishPassphrase?: string;

  @IsOptional()
  @IsString()
  rtmpReadPass?: string;

  @IsOptional()
  @IsString()
  rtmpPublishPass?: string;

  @IsOptional()
  @IsBoolean()
  record?: boolean;

  @IsOptional()
  @IsString()
  runOnReady?: string;
}

export class UpdatePathDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsBoolean()
  sourceOnDemand?: boolean;

  @IsOptional()
  @IsString()
  runOnReady?: string;

  @IsOptional()
  @IsBoolean()
  record?: boolean;
}

export class PathStatusDto {
  name: string;
  ready: boolean;
  bytesReceived: number;
  bytesSent: number;
  activeReaders: number;
  tracks: string[];
}

export class ConnectionKickDto {
  @IsString()
  connectionId: string;
}

export interface StreamUrlsDto {
  rtmp: {
    publish: string;
    play: string;
  };
  srt: {
    publish: string;
    play: string;
  };
  rtsp: {
    publish: string;
    play: string;
  };
  hls: {
    play: string;
  };
}

export interface MediaMTXStatusDto {
  connected: boolean;
  message: string;
  timestamp: string;
  version?: string;
} 