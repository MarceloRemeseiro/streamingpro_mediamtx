'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSocket } from '@/components/socket-provider';

export function Header() {
  const socket = useSocket();

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              StreamingPro
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/entradas">Entradas</Link>
            </Button>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${socket ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {socket ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
} 