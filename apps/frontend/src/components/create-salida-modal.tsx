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

import { ProtocoloSalida } from "@/types/streaming";
import { crearSalidaSchema, type CrearSalidaFormData } from "@/lib/validations";
import { salidasApi } from "@/lib/api";

interface CreateSalidaModalProps {
  entradaId: string;
  onSalidaCreada: () => void;
  trigger?: React.ReactNode;
}

export function CreateSalidaModal({ entradaId, onSalidaCreada, trigger }: CreateSalidaModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CrearSalidaFormData>({
    resolver: zodResolver(crearSalidaSchema),
    defaultValues: {
      nombre: "",
      protocolo: ProtocoloSalida.RTMP,
      entradaId,
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

  const protocoloSeleccionado = form.watch("protocolo");

  const onSubmit = async (data: CrearSalidaFormData) => {
    try {
      setIsLoading(true);
      
      // Limpiar campos según protocolo
      const datosLimpios: any = {
        nombre: data.nombre,
        protocolo: data.protocolo,
        entradaId: data.entradaId,
        urlDestino: data.urlDestino,
      };

      // Agregar campos específicos por protocolo
      if (data.protocolo === ProtocoloSalida.RTMP) {
        datosLimpios.claveStreamRTMP = data.claveStreamRTMP;
      } else if (data.protocolo === ProtocoloSalida.SRT) {
        datosLimpios.puertoSRT = data.puertoSRT;
        datosLimpios.latenciaSRT = data.latenciaSRT;
        if (data.passphraseSRT) datosLimpios.passphraseSRT = data.passphraseSRT;
        if (data.streamIdSRT) datosLimpios.streamIdSRT = data.streamIdSRT;
      } else if (data.protocolo === ProtocoloSalida.HLS) {
        datosLimpios.segmentDuration = data.segmentDuration;
        datosLimpios.playlistLength = data.playlistLength;
      }

      await salidasApi.crear(datosLimpios);
      
      // Resetear formulario y cerrar modal
      form.reset();
      setOpen(false);
      onSalidaCreada();
      
    } catch (error) {
      console.error("Error al crear salida:", error);
      // TODO: Mostrar notificación de error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Output
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Output Personalizado</DialogTitle>
          <DialogDescription>
            Configura un nuevo output para redistribuir el stream a otros destinos.
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
                      <SelectItem value={ProtocoloSalida.RTMP}>
                        RTMP - Para plataformas de streaming
                      </SelectItem>
                      <SelectItem value={ProtocoloSalida.SRT}>
                        SRT - Para transmisión profesional
                      </SelectItem>
                      <SelectItem value={ProtocoloSalida.HLS}>
                        HLS - Para streaming web
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Protocolo del destino donde se enviará el stream.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        protocoloSeleccionado === ProtocoloSalida.RTMP
                          ? "rtmp://live.youtube.com/live2/"
                          : protocoloSeleccionado === ProtocoloSalida.SRT
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
            {protocoloSeleccionado === ProtocoloSalida.RTMP && (
              <FormField
                control={form.control}
                name="claveStreamRTMP"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream Key *</FormLabel>
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
            {protocoloSeleccionado === ProtocoloSalida.SRT && (
              <>
                <FormField
                  control={form.control}
                  name="puertoSRT"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puerto SRT *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="9999"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Puerto UDP del servidor SRT de destino (1024-65535).
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
                      <FormLabel>Stream ID (Opcional)</FormLabel>
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
                      <FormLabel>Passphrase (Opcional)</FormLabel>
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
            {protocoloSeleccionado === ProtocoloSalida.HLS && (
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
                {isLoading ? "Creando..." : "Crear Output"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 