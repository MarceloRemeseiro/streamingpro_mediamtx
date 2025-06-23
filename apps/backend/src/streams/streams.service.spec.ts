import { Test, TestingModule } from '@nestjs/testing';
import { StreamsService } from './streams.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProtocoloStream, ProtocoloSalida } from '../prisma/generated/client';

describe('StreamsService', () => {
  let service: StreamsService;
  let prismaService: PrismaService;

  // Mocks
  const mockPrismaService = {
    entradaStream: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    salidaStream: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StreamsService>(StreamsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('crearEntrada', () => {
    it('debería crear una entrada RTMP con clave generada automáticamente', async () => {
      const mockEntrada = {
        id: 'test-id',
        nombre: 'Test RTMP',
        protocolo: ProtocoloStream.RTMP,
        claveStream: 'generated-key-123',
        puertoSRT: null,
        latenciaSRT: null,
        passphraseSRT: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockPrismaService.entradaStream.create.mockResolvedValue(mockEntrada);

      const result = await service.crearEntrada({
        nombre: 'Test RTMP',
        protocolo: ProtocoloStream.RTMP,
      });

      expect(result).toEqual(mockEntrada);
      expect(mockPrismaService.entradaStream.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Test RTMP',
          protocolo: ProtocoloStream.RTMP,
          claveStream: expect.any(String),
        },
      });
    });

    it('debería crear una entrada SRT sin clave de stream', async () => {
      const mockEntrada = {
        id: 'test-id',
        nombre: 'Test SRT',
        protocolo: ProtocoloStream.SRT,
        claveStream: null,
        puertoSRT: 9999,
        latenciaSRT: 200,
        passphraseSRT: 'test-pass',
        streamId: 'stream-123',
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockPrismaService.entradaStream.create.mockResolvedValue(mockEntrada);

      const result = await service.crearEntrada({
        nombre: 'Test SRT',
        protocolo: ProtocoloStream.SRT,
        puertoSRT: 9999,
        latenciaSRT: 200,
        passphraseSRT: 'test-pass',
        streamId: 'stream-123',
      });

      expect(result).toEqual(mockEntrada);
      expect(mockPrismaService.entradaStream.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Test SRT',
          protocolo: ProtocoloStream.SRT,
          puertoSRT: 9999,
          latenciaSRT: 200,
          passphraseSRT: 'test-pass',
          streamId: 'stream-123',
        },
      });
    });

    it('debería fallar si no se proporciona puerto para SRT', async () => {
      await expect(
        service.crearEntrada({
          nombre: 'Test SRT Sin Puerto',
          protocolo: ProtocoloStream.SRT,
          latenciaSRT: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería generar claves únicas para RTMP', async () => {
      const calls = [];
      mockPrismaService.entradaStream.create.mockImplementation((args) => {
        calls.push(args.data.claveStream);
        return Promise.resolve({ id: 'test', ...args.data });
      });

      await service.crearEntrada({ nombre: 'Test 1', protocolo: ProtocoloStream.RTMP });
      await service.crearEntrada({ nombre: 'Test 2', protocolo: ProtocoloStream.RTMP });

      expect(calls).toHaveLength(2);
      expect(calls[0]).not.toEqual(calls[1]);
      expect(calls[0]).toHaveLength(32); // 16 bytes en hex
      expect(calls[1]).toHaveLength(32);
    });
  });

  describe('obtenerEntradas', () => {
    it('debería devolver todas las entradas con sus salidas', async () => {
      const mockEntradas = [
        {
          id: '1',
          nombre: 'Entrada 1',
          protocolo: ProtocoloStream.RTMP,
          salidas: [{ id: 'salida-1', nombre: 'Salida 1' }],
        },
        {
          id: '2',
          nombre: 'Entrada 2',
          protocolo: ProtocoloStream.SRT,
          salidas: [],
        },
      ];

      mockPrismaService.entradaStream.findMany.mockResolvedValue(mockEntradas);

      const result = await service.obtenerEntradas();

      expect(result).toEqual(mockEntradas);
      expect(mockPrismaService.entradaStream.findMany).toHaveBeenCalledWith({
        include: { salidas: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('obtenerEntradaPorId', () => {
    it('debería devolver una entrada específica', async () => {
      const mockEntrada = {
        id: 'test-id',
        nombre: 'Test Entrada',
        protocolo: ProtocoloStream.RTMP,
      };

      mockPrismaService.entradaStream.findUnique.mockResolvedValue(mockEntrada);

      const result = await service.obtenerEntradaPorId('test-id');

      expect(result).toEqual(mockEntrada);
      expect(mockPrismaService.entradaStream.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: { salidas: true },
      });
    });

    it('debería lanzar NotFoundException si la entrada no existe', async () => {
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(null);

      await expect(service.obtenerEntradaPorId('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('crearSalida', () => {
    const mockEntrada = {
      id: 'entrada-id',
      nombre: 'Entrada Test',
      protocolo: ProtocoloStream.RTMP,
    };

    beforeEach(() => {
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(mockEntrada);
    });

    it('debería crear una salida RTMP válida', async () => {
      const mockSalida = {
        id: 'salida-id',
        nombre: 'YouTube Output',
        protocolo: ProtocoloSalida.RTMP,
        entradaId: 'entrada-id',
        urlDestino: 'rtmp://a.rtmp.youtube.com/live2/',
        claveStreamRTMP: 'youtube-key',
        habilitada: true,
      };

      mockPrismaService.salidaStream.create.mockResolvedValue(mockSalida);

      const result = await service.crearSalida({
        nombre: 'YouTube Output',
        protocolo: ProtocoloSalida.RTMP,
        entradaId: 'entrada-id',
        urlDestino: 'rtmp://a.rtmp.youtube.com/live2/',
        claveStreamRTMP: 'youtube-key',
      });

             expect(result).toEqual(mockSalida);
       expect(mockPrismaService.salidaStream.create).toHaveBeenCalledWith({
         data: {
           nombre: 'YouTube Output',
           protocolo: ProtocoloSalida.RTMP,
           entradaId: 'entrada-id',
           urlDestino: 'rtmp://a.rtmp.youtube.com/live2/',
           claveStreamRTMP: 'youtube-key',
         },
         include: { entrada: true },
       });
    });

    it('debería crear una salida SRT válida', async () => {
      const mockSalida = {
        id: 'salida-id',
        nombre: 'SRT Output',
        protocolo: ProtocoloSalida.SRT,
        entradaId: 'entrada-id',
        urlDestino: 'srt://192.168.1.100:9999',
        latenciaSRT: 300,
        passphraseSRT: 'srt-secret',
        habilitada: true,
      };

      mockPrismaService.salidaStream.create.mockResolvedValue(mockSalida);

      const result = await service.crearSalida({
        nombre: 'SRT Output',
        protocolo: ProtocoloSalida.SRT,
        entradaId: 'entrada-id',
        urlDestino: 'srt://192.168.1.100:9999',
        latenciaSRT: 300,
        passphraseSRT: 'srt-secret',
      });

      expect(result).toEqual(mockSalida);
    });

    it('debería crear una salida HLS válida', async () => {
      const mockSalida = {
        id: 'salida-id',
        nombre: 'HLS Output',
        protocolo: ProtocoloSalida.HLS,
        entradaId: 'entrada-id',
        segmentDuration: 6,
        playlistLength: 5,
        habilitada: true,
      };

      mockPrismaService.salidaStream.create.mockResolvedValue(mockSalida);

      const result = await service.crearSalida({
        nombre: 'HLS Output',
        protocolo: ProtocoloSalida.HLS,
        entradaId: 'entrada-id',
        segmentDuration: 6,
        playlistLength: 5,
      });

      expect(result).toEqual(mockSalida);
    });

    it('debería lanzar NotFoundException si la entrada no existe', async () => {
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(null);

      await expect(
        service.crearSalida({
          nombre: 'Test',
          protocolo: ProtocoloSalida.RTMP,
          entradaId: 'inexistente',
          urlDestino: 'rtmp://test.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizarEntrada', () => {
    it('debería actualizar una entrada existente', async () => {
      const mockEntradaExistente = {
        id: 'test-id',
        nombre: 'Entrada Original',
        protocolo: ProtocoloStream.RTMP,
      };

      const mockEntradaActualizada = {
        ...mockEntradaExistente,
        nombre: 'Entrada Actualizada',
        latenciaSRT: 250,
      };

      mockPrismaService.entradaStream.findUnique.mockResolvedValue(mockEntradaExistente);
      mockPrismaService.entradaStream.update.mockResolvedValue(mockEntradaActualizada);

      const result = await service.actualizarEntrada('test-id', {
        nombre: 'Entrada Actualizada',
        latenciaSRT: 250,
      });

      expect(result).toEqual(mockEntradaActualizada);
      expect(mockPrismaService.entradaStream.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          nombre: 'Entrada Actualizada',
          latenciaSRT: 250,
        },
        include: { salidas: true },
      });
    });

    it('debería lanzar NotFoundException si la entrada no existe', async () => {
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizarEntrada('inexistente', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminarEntrada', () => {
    it('debería eliminar una entrada existente', async () => {
      const mockEntrada = {
        id: 'test-id',
        nombre: 'Entrada a Eliminar',
      };

      mockPrismaService.entradaStream.findUnique.mockResolvedValue(mockEntrada);
      mockPrismaService.entradaStream.delete.mockResolvedValue(mockEntrada);

      const result = await service.eliminarEntrada('test-id');

      expect(result).toEqual(mockEntrada);
      expect(mockPrismaService.entradaStream.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('debería lanzar NotFoundException si la entrada no existe', async () => {
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(null);

      await expect(service.eliminarEntrada('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('obtenerSalidasPorEntrada', () => {
    it('debería devolver todas las salidas de una entrada', async () => {
      const mockEntrada = {
        id: 'entrada-id',
        nombre: 'Entrada Test',
        protocolo: ProtocoloStream.RTMP,
      };

      const mockSalidas = [
        {
          id: 'salida-1',
          nombre: 'Salida 1',
          protocolo: ProtocoloSalida.RTMP,
          entrada: { id: 'entrada-id', nombre: 'Entrada Test' },
        },
        {
          id: 'salida-2',
          nombre: 'Salida 2',
          protocolo: ProtocoloSalida.HLS,
          entrada: { id: 'entrada-id', nombre: 'Entrada Test' },
        },
      ];

      // Mock para obtenerEntradaPorId que se llama internamente
      mockPrismaService.entradaStream.findUnique.mockResolvedValue(mockEntrada);
      mockPrismaService.salidaStream.findMany.mockResolvedValue(mockSalidas);

      const result = await service.obtenerSalidasPorEntrada('entrada-id');

      expect(result).toEqual(mockSalidas);
      expect(mockPrismaService.salidaStream.findMany).toHaveBeenCalledWith({
        where: { entradaId: 'entrada-id' },
        include: { entrada: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('eliminarSalida', () => {
    it('debería eliminar una salida existente', async () => {
      const mockSalida = {
        id: 'salida-id',
        nombre: 'Salida a Eliminar',
      };

      mockPrismaService.salidaStream.findUnique.mockResolvedValue(mockSalida);
      mockPrismaService.salidaStream.delete.mockResolvedValue(mockSalida);

      const result = await service.eliminarSalida('salida-id');

      expect(result).toEqual(mockSalida);
      expect(mockPrismaService.salidaStream.delete).toHaveBeenCalledWith({
        where: { id: 'salida-id' },
      });
    });

    it('debería lanzar NotFoundException si la salida no existe', async () => {
      mockPrismaService.salidaStream.findUnique.mockResolvedValue(null);

      await expect(service.eliminarSalida('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
}); 