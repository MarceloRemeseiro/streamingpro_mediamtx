// =============================================================================
// SETUP DE TESTS - TEMPORALMENTE DESHABILITADO
// =============================================================================
// NOTA: Este archivo usa Prisma pero el proyecto migró a TypeORM
// TODO: Migrar estos tests para usar TypeORM
// =============================================================================

/*
import { PrismaClient } from '../src/prisma/generated/client';

// Configurar la URL correcta para testing (puerto 5433)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user_streaming:password_streaming@localhost:5433/streamingpro_test_db?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Conectar a la base de datos de testing
  await prisma.$connect();
});

beforeEach(async () => {
  // Limpiar datos antes de cada test en orden correcto (por dependencias)
  await prisma.salidaStream.deleteMany();
  await prisma.entradaStream.deleteMany();
  await prisma.registroAuditoria.deleteMany();
  await prisma.usuario.deleteMany();
});

afterAll(async () => {
  // Desconectar después de todos los tests
  await prisma.$disconnect();
});

export { prisma };
*/

// Placeholder temporalmente hasta migrar a TypeORM
export const setupTests = () => {
  console.log('Tests setup - usando TypeORM');
}; 