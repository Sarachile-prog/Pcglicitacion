'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Componente que muestra un botón flotante de WhatsApp
 * SOLO si el usuario está en modo Demo (sin companyId vinculado).
 */
export function WhatsAppButton() {
  const { user } = useUser();
  const db = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading } = useDoc(profileRef);

  // Un usuario es "Demo" si está autenticado pero no tiene perfil o no tiene companyId
  const isDemo = user && !isLoading && (!profile || !profile.companyId);

  if (!isDemo) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="https://wa.me/56941245316?text=Hola,%20estoy%20probando%20la%20plataforma%20PCG%20Licitación%20y%20me%20gustaría%20solicitar%20una%20propuesta%20para%20mi%20empresa."
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500"
          >
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-[#25D366] hover:bg-[#20ba5a] shadow-[0_10px_40px_rgba(37,211,102,0.4)] p-0 flex items-center justify-center border-none transition-transform hover:scale-110 active:scale-95 group"
            >
              <MessageCircle className="h-9 w-9 text-white fill-current" />
              <span className="absolute -top-2 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
            </Button>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-white text-primary font-black uppercase italic text-[10px] border-2 border-accent mb-4">
          Solicitar Propuesta Corporativa
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
