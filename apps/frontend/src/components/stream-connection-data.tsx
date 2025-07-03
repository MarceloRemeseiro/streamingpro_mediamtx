"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Settings, Copy } from 'lucide-react';
import { EntradaStream, ProtocoloStream } from '@/types/streaming';

interface StreamConnectionDataProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  entrada: EntradaStream;
  connectionUrl: string;
  onCopyToClipboard: (text: string, label?: string) => void;
  getCleanStreamId: (streamId: string) => string;
}

export function StreamConnectionData({ 
  isExpanded, 
  onToggle, 
  entrada, 
  connectionUrl, 
  onCopyToClipboard,
  getCleanStreamId
}: StreamConnectionDataProps) {
  // Obtener configuración del servidor desde variables de entorno
  const serverHost = process.env.NEXT_PUBLIC_MEDIAMTX_HOST || 'localhost';
  const srtPort = process.env.NEXT_PUBLIC_SRT_PORT || '8890';
  const rtmpPort = process.env.NEXT_PUBLIC_RTMP_PORT || '1935';
  
  const srtBaseUrl = `srt://${serverHost}:${srtPort}`;
  const rtmpBaseUrl = `rtmp://${serverHost}:${rtmpPort}`;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-10">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            <span className="font-medium text-sm">Datos de Conexión</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2">
        <div className="space-y-3">
          {/* Datos para SRT */}
          {entrada.protocolo === ProtocoloStream.SRT && (
            <>
              {/* URL Base */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">URL</span>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {srtBaseUrl}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => onCopyToClipboard(srtBaseUrl, 'URL SRT')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Puerto y Latencia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Puerto</span>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm font-mono">{entrada.puertoSRT}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Latencia</span>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm font-mono">{entrada.latenciaSRT || 200}ms</span>
                  </div>
                </div>
              </div>

              {/* Stream ID */}
              {entrada.streamId && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Stream ID</span>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono break-all">
                      publish:{getCleanStreamId(entrada.streamId)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => onCopyToClipboard(`publish:${getCleanStreamId(entrada.streamId!)}`, 'Stream ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Passphrase si existe */}
              {entrada.passphraseSRT && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Passphrase</span>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono break-all">{entrada.passphraseSRT}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => onCopyToClipboard(entrada.passphraseSRT!, 'Passphrase')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* URL Completa */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">URL Completa</span>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {connectionUrl}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => onCopyToClipboard(connectionUrl, 'URL completa SRT')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Datos para RTMP */}
          {entrada.protocolo === ProtocoloStream.RTMP && (
            <>
              {/* URL Base */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">URL</span>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {rtmpBaseUrl}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => onCopyToClipboard(rtmpBaseUrl, 'URL RTMP')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Puerto */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Puerto</span>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm font-mono">{rtmpPort}</span>
                </div>
              </div>

              {/* Stream Key */}
              {entrada.streamKey && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Stream Key</span>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono break-all">
                      {entrada.streamKey}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => onCopyToClipboard(entrada.streamKey!, 'Stream Key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* URL Completa */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">URL Completa</span>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {connectionUrl}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => onCopyToClipboard(connectionUrl, 'URL completa RTMP')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
} 