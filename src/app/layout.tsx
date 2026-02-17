
"use client"

import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { Globe, User, LogOut, LogIn, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { TermsAcceptanceModal } from '@/components/terms-acceptance-modal';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const isSuperAdmin = user?.email === 'control@pcgoperacion.com' || profile?.role === 'SuperAdmin'
  const isDemo = user && !profile?.companyId && !isSuperAdmin;
  const hasRequested = profile?.planRequested === true;

  const handleRequestPlan = async () => {
    if (!profileRef) return
    setIsRequesting(true)
    try {
      await updateDoc(profileRef, { planRequested: true })
      toast({ 
        title: "Solicitud Enviada", 
        description: "Un ejecutivo revisará tu perfil para la activación del plan corporativo." 
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsRequesting(false)
    }
  }

  // Determinamos si es la página de inicio o login para aplicar un layout sin sidebar
  const isPublicPage = pathname === '/' || pathname === '/login';

  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          {children}
          <WhatsAppButton />
          <TermsAcceptanceModal />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-xl">
          <SidebarHeader className="p-4 flex items-center gap-3 border-b border-sidebar-border bg-sidebar">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg transform rotate-3">
                <Globe className="h-6 w-6 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-lg tracking-tight text-sidebar-foreground">PCG</span>
                <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-widest">LICITACIÓN</span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-4 bg-sidebar">
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar group-data-[collapsible=icon]:hidden">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{user.email || 'Usuario Demo'}</span>
                    <span className="text-[10px] text-sidebar-foreground/60 uppercase font-bold tracking-tighter">Acceso Activo</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-sidebar-foreground/70 hover:text-white"
                  onClick={() => signOut(auth)}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Salir
                </Button>
              </div>
            ) : (
              <Link href="/login" className="w-full">
                <Button className="w-full bg-accent hover:bg-accent/90 gap-2 font-bold">
                  <LogIn className="h-4 w-4" /> Iniciar Sesión
                </Button>
              </Link>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-6 shadow-sm">
            <SidebarTrigger className="h-10 w-10 hover:bg-muted" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-sm uppercase font-bold tracking-tighter">Live</span>
                PCGLICITACIÓN
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {isDemo && (
                hasRequested ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 font-black uppercase text-[10px] italic py-1.5 px-3 hidden md:flex">
                    <CheckCircle2 className="h-3 w-3" /> Solicitud en Proceso
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleRequestPlan}
                    disabled={isRequesting}
                    className="bg-accent hover:bg-accent/90 text-white font-black uppercase text-[10px] italic gap-2 h-9 px-4 shadow-lg animate-pulse"
                  >
                    {isRequesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Activar Plan
                  </Button>
                )
              )}
              {user && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-destructive gap-2 font-black uppercase text-[10px] italic hidden sm:flex"
                  onClick={() => signOut(auth)}
                >
                  <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
                </Button>
              )}
              {!user && !isUserLoading && (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="hidden sm:flex border-accent text-accent hover:bg-accent/10 font-bold">
                    Acceso Clientes
                  </Button>
                </Link>
              )}
              <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold text-[10px] uppercase italic">
                Nueva Alerta
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-10 space-y-10 max-w-7xl mx-auto w-full">
            {children}
            <WhatsAppButton />
            <TermsAcceptanceModal />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <title>PCGLICITACIÓN - Inteligencia de Mercado Público</title>
        <meta name="description" content="Portal inteligente de licitaciones y asesoría estratégica con IA para Mercado Público Chile." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
