
import type { Metadata } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayout } from '@/components/layout/client-layout';

/**
 * PCG LICITACIÓN - Ecosistema de Inteligencia 2026
 * Forzando re-construcción global para resolver estado de publicación.
 */

export const metadata: Metadata = {
  title: 'PCGLICITACIÓN - Inteligencia de Mercado Público',
  description: 'Portal inteligente de licitaciones y asesoría estratégica con IA para Mercado Público Chile.',
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
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
