import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Toaster } from '@/components/ui/toaster';
import { Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Licitaciones Globales',
  description: 'Portal inteligente de monitoreo y análisis de licitaciones estatales',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-xl">
                <SidebarHeader className="p-4 flex items-center gap-3 border-b border-sidebar-border bg-sidebar">
                  <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg transform rotate-3">
                    <Globe className="h-6 w-6 text-sidebar-primary-foreground" />
                  </div>
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Licitaciones</span>
                    <span className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-widest">Globales</span>
                  </div>
                </SidebarHeader>
                <SidebarContent className="p-4 bg-sidebar">
                  <SidebarNav />
                </SidebarContent>
                <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                      <User className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Admin Panel</span>
                      <span className="text-xs text-sidebar-foreground/60">Premium Access</span>
                    </div>
                  </div>
                </SidebarFooter>
              </Sidebar>

              <SidebarInset className="flex flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-6 shadow-sm">
                  <SidebarTrigger className="h-10 w-10 hover:bg-muted" />
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                      <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-sm uppercase font-bold tracking-tighter">Live</span>
                      Monitoreo en Tiempo Real
                    </h1>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" className="hidden sm:flex border-accent text-accent hover:bg-accent/10">
                      Sincronizar Datos
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Nueva Alerta
                    </Button>
                  </div>
                </header>
                <main className="flex-1 p-6 lg:p-10 space-y-10 max-w-7xl mx-auto w-full">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
