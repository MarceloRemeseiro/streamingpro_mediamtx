"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { ProtocoloStream } from "@/types/streaming";
import { crearEntradaSchema, type CrearEntradaFormData } from "@/lib/validations";
import { entradasApi } from "@/lib/api";

interface CreateEntradaModalProps {
  onEntradaCreada: () => void;
  trigger?: React.ReactNode;
}

export function CreateEntradaModal({ onEntradaCreada, trigger }: CreateEntradaModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CrearEntradaFormData>({
    resolver: zodResolver(crearEntradaSchema),
    defaultValues: {
      nombre: "",
      protocolo: ProtocoloStream.RTMP,
      latenciaSRT: 200,
      incluirPassphrase: false,
    },
  });

  const protocoloSeleccionado = form.watch("protocolo");

  const onSubmit = async (data: CrearEntradaFormData) => {
    try {
      setIsLoading(true);
      
      // Limpiar campos según protocolo
      const datosLimpios: any = {
        nombre: data.nombre,
        protocolo: data.protocolo,
      };

      // Solo para SRT agregar campos específicos
      if (data.protocolo === ProtocoloStream.SRT) {
        if (data.latenciaSRT) {
          datosLimpios.latenciaSRT = data.latenciaSRT;
        }
        if (data.incluirPassphrase) {
          datosLimpios.incluirPassphrase = data.incluirPassphrase;
        }
      }

      await entradasApi.crear(datosLimpios);
      
      // Resetear formulario y cerrar modal
      form.reset();
      setOpen(false);
      onEntradaCreada();
      
    } catch (error) {
      console.error("Error al crear entrada:", error);
      // TODO: Mostrar notificación de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Entrada
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Entrada de Streaming</DialogTitle>
          <DialogDescription>
            Configura una nueva entrada para recibir streams. Los campos se generarán automáticamente.
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

            {/* Protocolo */}
            <FormField
              control={form.control}
              name="protocolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protocolo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un protocolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ProtocoloStream.RTMP}>
                        RTMP - Puerto 1935 (Stream Key automática)
                      </SelectItem>
                      <SelectItem value={ProtocoloStream.SRT}>
                        SRT - Puerto 8890 (Stream ID automático)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {protocoloSeleccionado === ProtocoloStream.RTMP
                      ? "RTMP usará el puerto 1935 y generará una Stream Key automáticamente."
                      : "SRT usará el puerto 8890 y generará un Stream ID automáticamente."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos específicos para SRT */}
            {protocoloSeleccionado === ProtocoloStream.SRT && (
              <>
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
                        Latencia del buffer SRT en milisegundos (80-2000ms). Valor por defecto: 200ms.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incluirPassphrase"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Incluir Passphrase de cifrado
                        </FormLabel>
                        <FormDescription>
                          Si se activa, se generará automáticamente una passphrase para cifrado AES.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </>
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
                {isLoading ? "Creando..." : "Crear Entrada"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 