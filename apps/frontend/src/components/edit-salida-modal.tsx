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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { ProtocoloSalida, type SalidaStream } from "@/types/streaming";
import { editarSalidaSchema, type EditarSalidaFormData } from "@/lib/validations";
import { salidasApi } from "@/lib/api";

interface EditSalidaModalProps {
  salida: SalidaStream;
  onSalidaActualizada: () => void;
  trigger?: React.ReactNode;
}

export function EditSalidaModal({ salida, onSalidaActualizada, trigger }: EditSalidaModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditarSalidaFormData>({
    resolver: zodResolver(editarSalidaSchema),
    defaultValues: {
      nombre: "",
      urlDestino: "",
      claveStreamRTMP: "",
      puertoSRT: 9999,
      latenciaSRT: 200,
      passphraseSRT: "",
      streamIdSRT: "",
      segmentDuration: 6,
      playlistLength: 5,
    },
  });

  // Resetear valores cuando cambie la salida
  useEffect(() => {
    form.reset({
      nombre: salida.nombre,
      urlDestino: salida.urlDestino || "",
      claveStreamRTMP: salida.claveStreamRTMP || "",
      puertoSRT: salida.puertoSRT || 9999,
      latenciaSRT: salida.latenciaSRT || 200,
      passphraseSRT: salida.passphraseSRT || "",
      streamIdSRT: salida.streamIdSRT || "",
      segmentDuration: salida.segmentDuration || 6,
      playlistLength: salida.playlistLength || 5,
    });
  }, [salida, form]);

  const onSubmit = async (data: EditarSalidaFormData) => {
    try {
      setIsLoading(true);
      
      // Limpiar campos según protocolo
      const datosLimpios: any = {
        nombre: data.nombre,
        urlDestino: data.urlDestino,
        habilitada: salida.habilitada, // Mantener el estado actual
      };

      // Agregar campos específicos por protocolo (usar el protocolo de la salida existente)
      if (salida.protocolo === ProtocoloSalida.RTMP) {
        datosLimpios.claveStreamRTMP = data.claveStreamRTMP;
      } else if (salida.protocolo === ProtocoloSalida.SRT) {
        datosLimpios.puertoSRT = data.puertoSRT;
        datosLimpios.latenciaSRT = data.latenciaSRT;
        if (data.passphraseSRT) datosLimpios.passphraseSRT = data.passphraseSRT;
        if (data.streamIdSRT) datosLimpios.streamIdSRT = data.streamIdSRT;
      } else if (salida.protocolo === ProtocoloSalida.HLS) {
        datosLimpios.segmentDuration = data.segmentDuration;
        datosLimpios.playlistLength = data.playlistLength;
      }

      await salidasApi.actualizar(salida.id, datosLimpios);
      
      setOpen(false);
      onSalidaActualizada();
      
    } catch (error) {
      console.error("Error al actualizar salida:", error);
      // TODO: Mostrar notificación de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Output</DialogTitle>
          <DialogDescription>
            Modifica la configuración del output "{salida.nombre}".
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
                  <FormLabel>Nombre del Output</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej: YouTube Live, Twitch, CDN Principal..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Un nombre descriptivo para identificar este destino.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Protocolo - Solo lectura */}
            <div className="space-y-2">
              <FormLabel>Protocolo</FormLabel>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{salida.protocolo}</span>
                  <span className="text-sm text-muted-foreground">
                    No se puede modificar después de crear
                  </span>
                </div>
              </div>
              <FormDescription>
                El protocolo no puede modificarse después de crear el output.
              </FormDescription>
            </div>

            {/* URL Destino */}
            <FormField
              control={form.control}
              name="urlDestino"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Destino</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        salida.protocolo === ProtocoloSalida.RTMP
                          ? "rtmp://live.youtube.com/live2/"
                          : salida.protocolo === ProtocoloSalida.SRT
                          ? "srt://destino.ejemplo.com:9999"
                          : "http://cdn.ejemplo.com/hls/"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL del servidor de destino donde se enviará el stream.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos específicos para RTMP */}
            {salida.protocolo === ProtocoloSalida.RTMP && (
              <FormField
                control={form.control}
                name="claveStreamRTMP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Clave proporcionada por la plataforma"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Clave única proporcionada por YouTube, Twitch, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Campos específicos para SRT */}
            {salida.protocolo === ProtocoloSalida.SRT && (
              <>
                <FormField
                  control={form.control}
                  name="puertoSRT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puerto SRT</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="9999"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Puerto UDP del servidor SRT de destino (1-65535).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="streamIdSRT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="stream-id-destino"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador único para el stream SRT de destino.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passphraseSRT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passphrase</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Clave de cifrado AES..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Clave para cifrado AES-128/256 del destino.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Campos específicos para HLS */}
            {salida.protocolo === ProtocoloSalida.HLS && (
              <>
                <FormField
                  control={form.control}
                  name="segmentDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración del Segmento (segundos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="6"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Duración de cada segmento HLS (2-10 segundos).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="playlistLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Segmentos en Playlist</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Cantidad de segmentos en la playlist HLS (3-10).
                      </FormDescription>
                      <FormMessage />
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
                {isLoading ? "Actualizando..." : "Actualizar Output"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 