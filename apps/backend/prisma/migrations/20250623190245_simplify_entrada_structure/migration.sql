/*
  Warnings:

  - Made the column `url` on table `EntradaStream` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "EntradaStream_puertoSRT_key";

-- Generar URLs por defecto para registros existentes
UPDATE "EntradaStream" 
SET "url" = CASE 
  WHEN "protocolo" = 'RTMP' THEN 'rtmp://localhost:1935/live/' || COALESCE("streamKey", 'temp-key')
  WHEN "protocolo" = 'SRT' THEN 'srt://localhost:6000?streamid=' || COALESCE("streamId", 'temp-id')
  ELSE 'unknown://localhost'
END
WHERE "url" IS NULL;

-- Actualizar puerto SRT a 6000 para entradas SRT existentes
UPDATE "EntradaStream" 
SET "puertoSRT" = 6000 
WHERE "protocolo" = 'SRT' AND "puertoSRT" IS NULL;

-- AlterTable
ALTER TABLE "EntradaStream" ALTER COLUMN "latenciaSRT" SET DEFAULT 200,
ALTER COLUMN "url" SET NOT NULL;
