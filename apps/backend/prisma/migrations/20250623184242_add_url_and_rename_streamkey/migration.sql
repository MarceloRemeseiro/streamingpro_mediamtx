/*
  Warnings:

  - You are about to drop the column `claveStream` on the `EntradaStream` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[streamKey]` on the table `EntradaStream` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "EntradaStream_claveStream_key";

-- AlterTable
ALTER TABLE "EntradaStream" DROP COLUMN "claveStream",
ADD COLUMN     "streamKey" TEXT,
ADD COLUMN     "url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EntradaStream_streamKey_key" ON "EntradaStream"("streamKey");
