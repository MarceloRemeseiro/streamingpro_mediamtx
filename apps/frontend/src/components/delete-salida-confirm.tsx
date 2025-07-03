"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { type SalidaStream } from "@/types/streaming";

interface DeleteSalidaConfirmProps {
  salida: SalidaStream;
  onSalidaEliminada: () => void;
  trigger?: React.ReactNode;
}

export function DeleteSalidaConfirm({ salida, onSalidaEliminada, trigger }: DeleteSalidaConfirmProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEliminar = () => {
    setIsLoading(true);
    // Solo cerrar el modal y notificar - la eliminación real la maneja el callback
    setOpen(false);
    onSalidaEliminada();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Eliminar Output</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar el output &quot;{salida.nombre}&quot;?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente:
            </p>
            <ul className="text-sm text-muted-foreground ml-4 space-y-1">
              <li>• Configuración del output</li>
              <li>• Estadísticas asociadas</li>
              <li>• Historial de transmisión</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Output:</span>
              <span>{salida.nombre}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="font-medium">Protocolo:</span>
              <span>{salida.protocolo}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="font-medium">Destino:</span>
              <span className="truncate ml-2 max-w-[200px]">{salida.urlDestino}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleEliminar}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : "Eliminar Output"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 