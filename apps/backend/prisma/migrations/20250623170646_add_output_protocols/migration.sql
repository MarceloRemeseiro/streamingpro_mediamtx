/*
  Warnings:

  - You are about to drop the column `claveStream` on the `SalidaStream` table. All the data in the column will be lost.
  - Added the required column `protocolo` to the `SalidaStream` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProtocoloSalida" AS ENUM ('RTMP', 'SRT', 'HLS');

-- AlterTable
ALTER TABLE "SalidaStream" DROP COLUMN "claveStream",
ADD COLUMN     "claveStreamRTMP" TEXT,
ADD COLUMN     "latenciaSRT" INTEGER DEFAULT 120,
ADD COLUMN     "playlistLength" INTEGER DEFAULT 5,
ADD COLUMN     "protocolo" "ProtocoloSalida" NOT NULL,
ADD COLUMN     "puertoSRT" INTEGER,
ADD COLUMN     "segmentDuration" INTEGER DEFAULT 6,
ALTER COLUMN "urlDestino" DROP NOT NULL;
