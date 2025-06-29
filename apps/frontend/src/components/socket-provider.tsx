"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketProviderProps {
  children: React.ReactNode;
}

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Eventos de conexión
    newSocket.on('connect', () => {
      console.log('✅ Socket.IO: Conectado exitosamente al servidor');
      console.log('📡 Socket ID:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO: Desconectado -', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Socket.IO: Error de conexión -', error.message);
    });

    // Eventos de estado que emite el backend
    newSocket.on('stream-update', (data) => {
      console.log('📡 Evento stream-update recibido:', data);
    });

    newSocket.on('entrada-update', (data) => {
      console.log('📡 Evento entrada-update recibido:', data);
    });

    newSocket.on('output-update', (data) => {
      console.log('📡 Evento output-update recibido:', data);
    });

    setSocket(newSocket);
    console.log('🔄 Socket.IO: Inicializando conexión...');

    return () => {
      newSocket.disconnect();
      console.log('❌ Socket.IO: Conexión cerrada.');
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}; 