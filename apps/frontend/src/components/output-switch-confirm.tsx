"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface OutputSwitchConfirmProps {
  isEnabled: boolean;
  outputName: string;
  onConfirm: (enabled: boolean) => void;
}

export function OutputSwitchConfirm({ 
  isEnabled, 
  outputName, 
  onConfirm
}: OutputSwitchConfirmProps) {
  const [open, setOpen] = useState(false);
  const [pendingState, setPendingState] = useState<boolean | null>(null);

  const handleSwitchChange = (checked: boolean) => {
    // Si se está activando, no necesita confirmación
    if (checked) {
      onConfirm(checked);
      return;
    }

    // Si se está desactivando, mostrar confirmación
    setPendingState(checked);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (pendingState !== null) {
      onConfirm(pendingState);
    }
    setOpen(false);
    setPendingState(null);
  };

  const handleCancel = () => {
    setOpen(false);
    setPendingState(null);
  };

  return (
    <>
      <Switch 
        checked={isEnabled}
        onCheckedChange={handleSwitchChange}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-left">Desactivar Output</DialogTitle>
                <DialogDescription className="text-left">
                  ¿Estás seguro de que quieres desactivar este output?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Output:</span>
                  <span className="text-muted-foreground">{outputName}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Al desactivar este output, se detendrá inmediatamente el envío 
                de datos a este destino. Puedes reactivarlo en cualquier momento.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
            >
              Desactivar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 