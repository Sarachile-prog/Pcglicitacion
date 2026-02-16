
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Scale, ShieldAlert, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function TermsAcceptanceModal() {
  const { user } = useUser();
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile, isLoading } = useDoc(profileRef);

  useEffect(() => {
    // Si el usuario está logueado pero no ha aceptado los términos en su perfil
    if (user && !isLoading && profile && profile.termsAccepted !== true) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [user, profile, isLoading]);

  const handleAccept = async () => {
    if (!profileRef || !accepted) return;
    setIsSaving(true);
    try {
      await updateDoc(profileRef, {
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error al aceptar términos:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl border-2 border-primary/20 shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform -rotate-3 mb-2">
            <Scale className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-center text-primary">
            Compromiso de Uso Responsable
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-muted-foreground italic text-lg leading-tight">
            Para continuar, debes revisar y aceptar el marco legal de PCGLICITACIÓN.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-black uppercase text-xs tracking-widest">
              <ShieldAlert className="h-4 w-4" /> Cláusula de IA Crítica
            </div>
            <p className="text-sm font-bold text-red-900/80 leading-relaxed italic">
              "La IA puede generar errores u omisiones. El Usuario tiene la <b>obligación legal</b> de realizar una revisión humana final. PCGLICITACIÓN no se responsabiliza por descalificaciones o fallos derivados del uso de esta tecnología."
            </p>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-xl border-2">
            <Checkbox 
              id="terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className="mt-1 border-primary h-5 w-5"
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="terms" 
                className="text-sm font-black uppercase italic text-primary cursor-pointer leading-tight"
              >
                Acepto los Términos y Condiciones, especialmente la Cláusula Segunda sobre el uso de IA y supervisión humana.
              </Label>
              <Link 
                href="/terms" 
                target="_blank" 
                className="text-[10px] font-black text-accent uppercase flex items-center gap-1 hover:underline"
              >
                Ver documento legal completo <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            className="w-full h-14 text-xl font-black uppercase italic bg-primary hover:bg-primary/90 shadow-xl"
            disabled={!accepted || isSaving}
            onClick={handleAccept}
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : 'Entendido y Acepto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
