'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { testAiConnection } from '@/ai/flows/extract-and-summarize-bid-details';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AiTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; response?: string; error?: string } | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await testAiConnection();
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-black text-primary uppercase italic">Diagnóstico de Inteligencia Artificial</h1>
        <p className="text-muted-foreground">Verifica la conexión con Google Gemini y el estado del servicio.</p>
      </div>

      <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Estado del Motor Genkit
          </CardTitle>
          <CardDescription>Esta prueba verifica si tu API Key es válida y si el modelo responde.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {!result ? (
            <div className="text-center py-6">
              <Button 
                onClick={handleTest} 
                disabled={loading}
                className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {loading ? 'Consultando...' : 'Ejecutar Prueba de Conexión'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className={`p-6 rounded-2xl flex items-start gap-4 ${result.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                {result.success ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-red-600 shrink-0" />
                )}
                <div className="space-y-1">
                  <h4 className={`font-bold text-lg ${result.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {result.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}
                  </h4>
                  <p className={`text-sm ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.success 
                      ? 'El modelo Gemini 1.5 Flash está respondiendo correctamente.' 
                      : 'Hubo un problema al intentar comunicarse con el servicio de IA.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <Terminal className="h-3 w-3" /> Salida del Servidor
                </div>
                <pre className="p-4 bg-muted rounded-xl text-sm font-mono overflow-auto max-h-[200px] border">
                  {result.success ? result.response : result.error}
                </pre>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
                Volver a Probar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-primary text-white border-none">
          <div className="text-[10px] font-bold uppercase mb-1 opacity-60">Modelo Activo</div>
          <div className="font-bold">Gemini 1.5 Flash</div>
        </Card>
        <Card className="p-4 bg-accent text-white border-none">
          <div className="text-[10px] font-bold uppercase mb-1 opacity-60">Región de Servicio</div>
          <div className="font-bold">Global (Google AI)</div>
        </Card>
      </div>
    </div>
  );
}
