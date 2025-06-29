import { IsArray, IsUUID } from 'class-validator';

export class ReordenarSalidasDto {
  @IsArray()
  @IsUUID('4', { each: true })
  salidaIds: string[];
} 