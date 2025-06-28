"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { HLSPlayer } from './hls-player';

interface StreamVideoSectionProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  hlsUrl: string | null;
  isActive: boolean;
}

export function StreamVideoSection({ 
  isExpanded, 
  onToggle, 
  hlsUrl, 
  isActive 
}: StreamVideoSectionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-10">
          <div className="flex items-center gap-3">
                          <Play className="h-4 w-4" />
              <span className="font-medium text-sm">Video</span>
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-2 pt-2">
        {hlsUrl && isActive ? (
          <div className="rounded-lg overflow-hidden">
            <HLSPlayer 
              src={hlsUrl}
              autoPlay={false}
              muted={true}
            />
          </div>
        ) : (
          <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
            <div className="text-gray-400 text-center">
              {isActive ? (
                <div className="space-y-2">
                  <div className="text-4xl">⏳</div>
                  <p className="text-lg font-medium">Procesando video...</p>
                  <p className="text-sm opacity-75">El stream está activo, el video aparecerá automáticamente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📡</div>
                  <p className="text-lg font-medium">Sin señal</p>
                  <p className="text-sm opacity-75">Inicia tu stream para ver el video aquí</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
} 