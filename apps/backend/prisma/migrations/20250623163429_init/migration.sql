-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'TECNICO', 'VISOR');

-- CreateEnum
CREATE TYPE "ProtocoloStream" AS ENUM ('RTMP', 'SRT');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'TECNICO',
    "secreto2FA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaStream" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "protocolo" "ProtocoloStream" NOT NULL,
    "claveStream" TEXT,
    "puertoSRT" INTEGER,
    "latenciaSRT" INTEGER DEFAULT 120,
    "passphraseSRT" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntradaStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalidaStream" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "entradaId" TEXT NOT NULL,
    "urlDestino" TEXT NOT NULL,
    "claveStream" TEXT,
    "passphraseSRT" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalidaStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" JSONB,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EntradaStream_claveStream_key" ON "EntradaStream"("claveStream");

-- CreateIndex
CREATE UNIQUE INDEX "EntradaStream_puertoSRT_key" ON "EntradaStream"("puertoSRT");

-- AddForeignKey
ALTER TABLE "SalidaStream" ADD CONSTRAINT "SalidaStream_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "EntradaStream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
