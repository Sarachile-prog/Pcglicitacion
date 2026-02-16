
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';

/**
 * REEMPLAZO: Ahora redirige al sistema de tickets interno.
 */
export function WhatsAppButton() {
  const { user } = useUser();
  const db = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading } = useDoc(profileRef);

  if (!user) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/support"
            className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-500"
          >
            <Button
              size="lg"
              className="rounded-full h-16 w-16 bg-primary hover:bg-primary/90 shadow-[0_10px_40px_rgba(26,35,126,0.4)] p-0 flex items-center justify-center border-none transition-transform hover:scale-110 active:scale-95 group"
            >
              <MessageSquareText className="h-8 w-8 text-white" />
              <span className="absolute -top-2 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-accent"></span>
              </span>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-white text-primary font-black uppercase italic text-[10px] border-2 border-accent mb-4">
          Centro de Soporte Técnico
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
