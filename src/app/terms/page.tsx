
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Scale, ShieldAlert, Gavel, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex items-center gap-2 text-primary font-black uppercase italic tracking-tighter">
          <Scale className="h-5 w-5 text-accent" /> PCGLICITACIÓN LEGAL
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-primary text-white p-10 space-y-4">
          <CardTitle className="text-4xl font-black italic uppercase tracking-tighter">Términos y Condiciones de Uso</CardTitle>
          <p className="text-primary-foreground/80 font-medium italic">Última actualización: Marzo 2024</p>
        </CardHeader>
        <CardContent className="p-10 prose prose-slate max-w-none space-y-10 text-muted-foreground leading-relaxed font-medium italic">
          
          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" /> CLÁUSULA PRIMERA: NATURALEZA Y OBJETO DEL SERVICIO
            </h3>
            <p>
              PCGLICITACIÓN (en adelante, "la Plataforma") es una solución de software bajo la modalidad SaaS (Software as a Service) de propiedad de Paulo César Gutiérrez. El objeto es proveer herramientas de Inteligencia Estratégica para el análisis, gestión y auditoría de procesos de compra pública en el portal Mercado Público (ChileCompra).
            </p>
            <p>
              La Plataforma no es un organismo gubernamental, no representa a la Dirección de Compras y Contratación Pública y no garantiza la adjudicación de contratos. Es una herramienta de asistencia tecnológica para la toma de decisiones.
            </p>
          </section>

          <section className="space-y-4 p-6 bg-red-50 rounded-2xl border-2 border-red-100">
            <h3 className="text-xl font-black text-red-700 uppercase italic flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> CLÁUSULA SEGUNDA: DESCARGO DE RESPONSABILIDAD POR INTELIGENCIA ARTIFICIAL (IA)
            </h3>
            <p className="text-red-900/80">
              Dada la naturaleza experimental y estadística de los modelos de lenguaje (LLM), como Gemini 2.5 Flash, el Usuario acepta que:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-red-900/70 font-bold">
              <li><strong>No Infalibilidad</strong>: La IA puede generar errores, omisiones o interpretaciones incorrectas ("alucinaciones") de las bases administrativas y técnicas.</li>
              <li><strong>Deber de Supervisión Humana</strong>: El Usuario tiene la obligación legal de realizar una revisión humana final de cualquier análisis generado por la Plataforma. PCGLICITACIÓN no sustituye el criterio de un abogado, analista de estudios o experto técnico.</li>
              <li><strong>Exclusiones de Responsabilidad</strong>: PCGLICITACIÓN no será responsable por quedar "Fuera de Bases", errores en cálculos de multas, información incorrecta en la detección de RUTs o cualquier daño derivado de una licitación no adjudicada.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic">CLÁUSULA TERCERA: MODELO DE SUSCRIPCIÓN, PRECIOS Y PAGOS</h3>
            <p>El servicio se factura mensualmente bajo el esquema:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Plan Base: 1,5 UF (incluye hasta 2 licencias de usuario).</li>
              <li>Usuarios Adicionales: 0,5 UF por cada licencia extra.</li>
              <li>Unidad de Medida: UF, pagaderas en Pesos Chilenos (CLP).</li>
            </ul>
            <p>El atraso superior a 5 días en el pago facultará a la suspensión del motor de IA sin previo aviso.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic">CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL Y USO DE DATOS</h3>
            <p>Todo el código fuente y algoritmos de IA son propiedad exclusiva de PCGLICITACIÓN. Los documentos subidos (PDF) son propiedad del Usuario. El Usuario autoriza el uso de metadatos anonimizados para la mejora de los algoritmos del sistema.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic">CLÁUSULA QUINTA: INTEGRACIÓN CON MERCADO PÚBLICO</h3>
            <p>PCGLICITACIÓN no responde por interrupciones en el servicio de Mercado Público o cambios en la estructura de su API que impidan la sincronización de datos.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic">CLÁUSULA SEXTA: POLÍTICA DE "MODO DEMO"</h3>
            <p>El acceso Demo es limitado a 3 análisis. PCGLICITACIÓN se reserva el derecho de contactar al usuario vía WhatsApp para prospección comercial.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic">CLÁUSULA SÉPTIMA: PRIVACIDAD (LEY 19.628)</h3>
            <p>Cumplimos con la Ley de Protección de la Vida Privada. Los datos se alojan en servidores seguros con encriptación en tránsito.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-black text-primary uppercase italic flex items-center gap-2">
              <Gavel className="h-5 w-5 text-accent" /> CLÁUSULA NOVENA: TÉRMINO Y JURISDICCIÓN
            </h3>
            <p>Este contrato se rige por las leyes de la República de Chile. Cualquier controversia será sometida a los Tribunales Ordinarios de Justicia de Santiago.</p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
