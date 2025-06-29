import { useCallback } from 'react';
import toast from 'react-hot-toast';

export const useCopyToClipboard = () => {
  const copyToClipboard = useCallback(async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Mostrar toast de éxito con icono
      toast.success(
        `${label || 'Texto'} copiado al portapapeles`,
        {
          icon: '✅',
          duration: 2000,
        }
      );
      
      return true;
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      
      // Fallback para navegadores que no soportan clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success(
            `${label || 'Texto'} copiado al portapapeles`,
            {
              icon: '✅',
              duration: 2000,
            }
          );
          return true;
        } else {
          throw new Error('Fallback copy failed');
        }
      } catch (fallbackError) {
        toast.error(
          'No se pudo copiar al portapapeles',
          {
            icon: '❌',
            duration: 3000,
          }
        );
        return false;
      }
    }
  }, []);

  return { copyToClipboard };
}; 