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
      transports: ['websocket'],
    });

    setSocket(newSocket);
    console.log('✅ Socket.IO: Conexión inicializada.');

    return () => {
      newSocket.disconnect();
      console.log('❌ Socket.IO: Conexión cerrada.');
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}; 