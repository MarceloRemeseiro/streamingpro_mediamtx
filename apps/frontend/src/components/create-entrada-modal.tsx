"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { CrearEntradaDto, ProtocoloStream } from '@/types/streaming';
import { entradasApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  protocolo: z.nativeEnum(ProtocoloStream),
});

interface CreateEntradaModalProps {
  onEntradaCreada: () => void;
  trigger: React.ReactNode;
}

export function CreateEntradaModal({ onEntradaCreada, trigger }: CreateEntradaModalProps) {
  const [open, setOpen] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      protocolo: ProtocoloStream.SRT,
    },
  });
  
  const nombre = form.watch('nombre');

  useEffect(() => {
    if (nombre.length < 3) {
      form.clearErrors('nombre');
      return;
    }

    setIsCheckingName(true);
    const handler = setTimeout(async () => {
      try {
        const { disponible } = await entradasApi.validarNombre(nombre);
        if (!disponible) {
          form.setError('nombre', {
            type: 'manual',
            message: 'Este nombre ya está en uso.',
          });
        } else {
          form.clearErrors('nombre');
        }
      } catch (error) {
        console.error("Error al validar nombre:", error);
        form.setError('nombre', {
          type: 'manual',
          message: 'No se pudo validar el nombre.',
        });
      } finally {
        setIsCheckingName(false);
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
      setIsCheckingName(false);
    };
  }, [nombre, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const data: CrearEntradaDto = {
        nombre: values.nombre,
        protocolo: values.protocolo,
      };
      await entradasApi.crear(data);
      toast.success('Entrada creada exitosamente.');
      onEntradaCreada();
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Error al crear la entrada:', error);
      if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`);
      } else {
        toast.error('No se pudo crear la entrada.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nueva Entrada de Stream</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Entrada</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input placeholder="Ej: Mi Stream Principal" {...field} />
                    </FormControl>
                    {isCheckingName && (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <SelectItem value={ProtocoloStream.SRT}>SRT (Caller)</SelectItem>
                      <SelectItem value={ProtocoloStream.RTMP}>RTMP (Push)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || isCheckingName || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Entrada
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 