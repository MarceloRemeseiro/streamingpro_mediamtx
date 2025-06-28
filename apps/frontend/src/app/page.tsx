import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight mb-4 sm:text-5xl">
          Bienvenido a StreamingPro
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Gestiona y distribuye tus streams de vídeo SRT y RTMP de forma sencilla y eficiente.
        </p>
        <Link href="/entradas">
          <Button size="lg" className="gap-2">
            <span>Ir a Entradas</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
