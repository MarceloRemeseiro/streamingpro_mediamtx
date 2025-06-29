import { IsArray, IsString, IsUUID } from 'class-validator';

export class ReordenarEntradasDto {
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true, message: 'Cada ID debe ser un UUID válido.' })
  ids: string[];
} 