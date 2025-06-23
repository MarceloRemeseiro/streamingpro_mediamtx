"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { ProtocoloStream, type EntradaStream } from "@/types/streaming";
import { editarEntradaSchema, type EditarEntradaFormData } from "@/lib/validations";
import { entradasApi } from "@/lib/api";

interface EditEntradaModalProps {
  entrada: EntradaStream;
  onEntradaActualizada: () => void;
  trigger?: React.ReactNode;
}

export function EditEntradaModal({ entrada, onEntradaActualizada, trigger }: EditEntradaModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditarEntradaFormData>({
    resolver: zodResolver(editarEntradaSchema),
    defaultValues: {
      nombre: "",
      latenciaSRT: 200,
    },
  });

  // Resetear valores cuando cambie la entrada
  useEffect(() => {
    form.reset({
      nombre: entrada.nombre,
      latenciaSRT: entrada.latenciaSRT || 200,
    });
  }, [entrada, form]);

  const onSubmit = async (data: EditarEntradaFormData) => {
    try {
      setIsLoading(true);
      
      const datosActualizacion: any = {
        nombre: data.nombre,
      };

      // Solo para SRT agregar latencia si cambió
      if (entrada.protocolo === ProtocoloStream.SRT && data.latenciaSRT) {
        datosActualizacion.latenciaSRT = data.latenciaSRT;
      }

      await entradasApi.actualizar(entrada.id, datosActualizacion);
      
      setOpen(false);
      onEntradaActualizada();
      
    } catch (error) {
      console.error("Error al actualizar entrada:", error);
      // TODO: Mostrar notificación de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Entrada de Streaming</DialogTitle>
          <DialogDescription>
            Modifica la configuración de la entrada "{entrada.nombre}".
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Entrada</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej: Stream Principal, Conferencia 2025..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Un nombre descriptivo para identificar esta entrada.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Información del protocolo - Solo lectura */}
            <div className="space-y-2">
              <FormLabel>Protocolo</FormLabel>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{entrada.protocolo}</span>
                  <span className="text-sm text-muted-foreground">
                    {entrada.protocolo === ProtocoloStream.RTMP ? "Puerto 1935" : "Puerto 6000"}
                  </span>
                </div>
                {entrada.protocolo === ProtocoloStream.RTMP && entrada.streamKey && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Stream Key: </span>
                    <code className="text-xs bg-background px-1 py-0.5 rounded">
                      {entrada.streamKey}
                    </code>
                  </div>
                )}
                {entrada.protocolo === ProtocoloStream.SRT && entrada.streamId && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Stream ID: </span>
                    <code className="text-xs bg-background px-1 py-0.5 rounded">
                      {entrada.streamId}
                    </code>
                  </div>
                )}
                {entrada.protocolo === ProtocoloStream.SRT && entrada.passphraseSRT && (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">Passphrase: </span>
                    <code className="text-xs bg-background px-1 py-0.5 rounded">
                      {entrada.passphraseSRT}
                    </code>
                  </div>
                )}
              </div>
              <FormDescription>
                El protocolo y sus configuraciones no pueden modificarse después de crear la entrada.
              </FormDescription>
            </div>

            {/* Latencia SRT - Solo para SRT */}
            {entrada.protocolo === ProtocoloStream.SRT && (
              <FormField
                control={form.control}
                name="latenciaSRT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latencia SRT (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="200"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Latencia del buffer SRT en milisegundos (80-2000ms).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 