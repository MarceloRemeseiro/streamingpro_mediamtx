import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ProtocoloStream, ProtocoloSalida } from '../src/prisma/generated/client';
import { prisma } from './setup-tests';

describe('Streams Controller (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/streams/entradas (POST)', () => {
    it('debería crear una entrada RTMP válida', () => {
      return request(app.getHttpServer())
        .post('/streams/entradas')
        .send({
          nombre: 'Test RTMP Stream',
          protocolo: ProtocoloStream.RTMP,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.nombre).toBe('Test RTMP Stream');
          expect(res.body.protocolo).toBe('RTMP');
          expect(res.body.claveStream).toBeDefined();
          expect(res.body.claveStream).toHaveLength(32); // 16 bytes en hex
        });
    });

    it('debería crear una entrada SRT válida', () => {
      return request(app.getHttpServer())
        .post('/streams/entradas')
        .send({
          nombre: 'Test SRT Stream',
          protocolo: ProtocoloStream.SRT,
          puertoSRT: 9999,
          latenciaSRT: 200,
          passphraseSRT: 'test-password',
          streamId: 'stream-123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.nombre).toBe('Test SRT Stream');
          expect(res.body.protocolo).toBe('SRT');
          expect(res.body.puertoSRT).toBe(9999);
          expect(res.body.latenciaSRT).toBe(200);
          expect(res.body.passphraseSRT).toBe('test-password');
          expect(res.body.streamId).toBe('stream-123');
          expect(res.body.claveStream).toBeNull();
        });
    });

    it('debería fallar con protocolo inválido', () => {
      return request(app.getHttpServer())
        .post('/streams/entradas')
        .send({
          nombre: 'Test Invalid',
          protocolo: 'HTTP',
        })
        .expect(400);
    });

    it('debería fallar sin nombre', () => {
      return request(app.getHttpServer())
        .post('/streams/entradas')
        .send({
          protocolo: ProtocoloStream.RTMP,
        })
        .expect(400);
    });

    it('debería fallar SRT sin puerto', () => {
      return request(app.getHttpServer())
        .post('/streams/entradas')
        .send({
          nombre: 'Test SRT Sin Puerto',
          protocolo: ProtocoloStream.SRT,
          latenciaSRT: 200,
        })
        .expect(400);
    });
  });

  describe('/streams/entradas (GET)', () => {
    beforeEach(async () => {
      // Crear datos de prueba
      await prisma.entradaStream.createMany({
        data: [
          {
            nombre: 'Entrada 1',
            protocolo: ProtocoloStream.RTMP,
            claveStream: 'test-key-1',
          },
          {
            nombre: 'Entrada 2',
            protocolo: ProtocoloStream.SRT,
            puertoSRT: 9998,
            latenciaSRT: 150,
          },
        ],
      });
    });

    it('debería listar todas las entradas', () => {
      return request(app.getHttpServer())
        .get('/streams/entradas')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('nombre');
          expect(res.body[0]).toHaveProperty('protocolo');
        });
    });
  });

  describe('/streams/salidas (POST)', () => {
    let entradaId: string;

    beforeEach(async () => {
      // Crear una entrada para las pruebas de salidas
      const entrada = await prisma.entradaStream.create({
        data: {
          nombre: 'Entrada para Salidas Test',
          protocolo: ProtocoloStream.RTMP,
          claveStream: 'test-key',
        },
      });
      entradaId = entrada.id;
    });

    it('debería crear una salida RTMP válida', () => {
      return request(app.getHttpServer())
        .post('/streams/salidas')
        .send({
          nombre: 'YouTube Output',
          protocolo: ProtocoloSalida.RTMP,
          entradaId,
          urlDestino: 'rtmp://a.rtmp.youtube.com/live2/',
          claveStreamRTMP: 'youtube-key-123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.nombre).toBe('YouTube Output');
          expect(res.body.protocolo).toBe('RTMP');
          expect(res.body.entradaId).toBe(entradaId);
          expect(res.body.urlDestino).toBe('rtmp://a.rtmp.youtube.com/live2/');
          expect(res.body.claveStreamRTMP).toBe('youtube-key-123');
          expect(res.body.habilitada).toBe(true);
        });
    });

    it('debería crear una salida SRT válida', () => {
      return request(app.getHttpServer())
        .post('/streams/salidas')
        .send({
          nombre: 'SRT Output',
          protocolo: ProtocoloSalida.SRT,
          entradaId,
          urlDestino: 'srt://192.168.1.100:9999',
          latenciaSRT: 300,
          passphraseSRT: 'srt-secret',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.protocolo).toBe('SRT');
          expect(res.body.urlDestino).toBe('srt://192.168.1.100:9999');
          expect(res.body.latenciaSRT).toBe(300);
          expect(res.body.passphraseSRT).toBe('srt-secret');
        });
    });

    it('debería crear una salida HLS válida', () => {
      return request(app.getHttpServer())
        .post('/streams/salidas')
        .send({
          nombre: 'HLS Output',
          protocolo: ProtocoloSalida.HLS,
          entradaId,
          segmentDuration: 6,
          playlistLength: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.protocolo).toBe('HLS');
          expect(res.body.segmentDuration).toBe(6);
          expect(res.body.playlistLength).toBe(5);
          expect(res.body.urlDestino).toBeNull();
        });
    });

    it('debería fallar con entrada inexistente', () => {
      return request(app.getHttpServer())
        .post('/streams/salidas')
        .send({
          nombre: 'Test Fail',
          protocolo: ProtocoloSalida.RTMP,
          entradaId: 'id-inexistente',
          urlDestino: 'rtmp://test.com',
        })
        .expect(404);
    });

    it('debería fallar con URL inválida para RTMP', () => {
      return request(app.getHttpServer())
        .post('/streams/salidas')
        .send({
          nombre: 'Test Invalid URL',
          protocolo: ProtocoloSalida.RTMP,
          entradaId,
          urlDestino: 'http://invalid-protocol.com',
        })
        .expect(400);
    });
  });

  describe('/streams/entradas/:entradaId/salidas (GET)', () => {
    let entradaId: string;

    beforeEach(async () => {
      // Crear entrada y salidas para la prueba
      const entrada = await prisma.entradaStream.create({
        data: {
          nombre: 'Entrada con Salidas',
          protocolo: ProtocoloStream.RTMP,
          claveStream: 'test-key',
        },
      });
      entradaId = entrada.id;

      await prisma.salidaStream.createMany({
        data: [
          {
            nombre: 'Salida 1',
            protocolo: ProtocoloSalida.RTMP,
            entradaId,
            urlDestino: 'rtmp://test1.com',
          },
          {
            nombre: 'Salida 2',
            protocolo: ProtocoloSalida.HLS,
            entradaId,
          },
        ],
      });
    });

    it('debería obtener todas las salidas de una entrada', () => {
      return request(app.getHttpServer())
        .get(`/streams/entradas/${entradaId}/salidas`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
          expect(res.body[0]).toHaveProperty('entrada');
          expect(res.body[0].entradaId).toBe(entradaId);
        });
    });
  });

  describe('Actualización y eliminación', () => {
    let entradaId: string;
    let salidaId: string;

    beforeEach(async () => {
      const entrada = await prisma.entradaStream.create({
        data: {
          nombre: 'Entrada para Update/Delete',
          protocolo: ProtocoloStream.RTMP,
          claveStream: 'test-key',
        },
      });
      entradaId = entrada.id;

      const salida = await prisma.salidaStream.create({
        data: {
          nombre: 'Salida para Update/Delete',
          protocolo: ProtocoloSalida.RTMP,
          entradaId,
          urlDestino: 'rtmp://test.com',
        },
      });
      salidaId = salida.id;
    });

    it('debería actualizar una entrada', () => {
      return request(app.getHttpServer())
        .put(`/streams/entradas/${entradaId}`)
        .send({
          nombre: 'Entrada Actualizada',
          latenciaSRT: 250,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.nombre).toBe('Entrada Actualizada');
          expect(res.body.latenciaSRT).toBe(250);
        });
    });

    it('debería actualizar una salida', () => {
      return request(app.getHttpServer())
        .put(`/streams/salidas/${salidaId}`)
        .send({
          nombre: 'Salida Actualizada',
          habilitada: false,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.nombre).toBe('Salida Actualizada');
          expect(res.body.habilitada).toBe(false);
        });
    });

    it('debería eliminar una salida', () => {
      return request(app.getHttpServer())
        .delete(`/streams/salidas/${salidaId}`)
        .expect(200);
    });

    it('debería eliminar una entrada (y sus salidas en cascada)', () => {
      return request(app.getHttpServer())
        .delete(`/streams/entradas/${entradaId}`)
        .expect(200);
    });
  });
}); 