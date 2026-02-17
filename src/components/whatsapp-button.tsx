'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const WHATSAPP_URL = "https://wa.me/56941245316?text=Hola,%20vi%20la%20landing%20page%20de%20PCG%20Licitación%20y%20quiero%20más%20información%20sobre%20el%20plan%20empresas.";

/**
 * Botón de WhatsApp exclusivo para la Landing Page (Prospectos).
 */
export function WhatsAppButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500"
          >
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-[#25D366] hover:bg-[#20ba5a] shadow-[0_10px_40px_rgba(37,211,102,0.4)] p-0 flex items-center justify-center border-none transition-transform hover:scale-110 active:scale-95 group"
            >
              <MessageCircle className="h-8 w-8 text-white" />
              <span className="absolute -top-2 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-white text-emerald-600 font-black uppercase italic text-[10px] border-2 border-emerald-500 mb-4">
          ¿Dudas? Habla con un consultor
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}