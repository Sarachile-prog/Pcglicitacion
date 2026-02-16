'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { testAiConnection, listModels } from '@/ai/flows/extract-and-summarize-bid-details';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Terminal, List, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AiTestPage() {
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; response?: string; error?: string } | null>(null);
  const [models, setModels] = useState<any[]>([]);

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

  const handleListModels = async () => {
    setListing(true);
    try {
      const res = await listModels();
      if (res.success) {
        setModels(res.models);
      } else {
        alert("Error listando modelos: " + res.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setListing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-black text-primary uppercase italic">Diagnóstico de Inteligencia Artificial</h1>
        <p className="text-muted-foreground">Verifica la conexión con Google Gemini y descubre los modelos disponibles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-2 border-primary/10 shadow-xl overflow-hidden h-fit">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Prueba de Generación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {!result ? (
              <div className="text-center py-6">
                <Button 
                  onClick={handleTest} 
                  disabled={loading}
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {loading ? 'Consultando...' : 'Ejecutar Prueba'}
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
                        ? 'El modelo está respondiendo correctamente.' 
                        : 'Hubo un problema. Revisa la salida para ver el error técnico.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <Terminal className="h-3 w-3" /> Salida del Servidor
                  </div>
                  <pre className="p-4 bg-muted rounded-xl text-sm font-mono overflow-auto max-h-[200px] border whitespace-pre-wrap">
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

        <Card className="border-2 border-accent/10 shadow-xl overflow-hidden h-fit">
          <CardHeader className="bg-accent/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" /> Modelos Compatibles
            </CardTitle>
            <CardDescription>Lista los modelos que tu API Key tiene permitidos.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <Button 
              variant="outline"
              onClick={handleListModels} 
              disabled={listing}
              className="w-full h-12 border-accent text-accent font-bold"
            >
              {listing ? <Loader2 className="animate-spin mr-2" /> : <Database className="mr-2 h-4 w-4" />}
              {listing ? 'Obteniendo lista...' : 'Listar Modelos Disponibles'}
            </Button>

            {models.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
                {models.map((m, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1">
                    <div className="font-bold text-primary">{m.name}</div>
                    <div className="text-muted-foreground line-clamp-2">{m.description}</div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.supportedGenerationMethods.map((method: string) => (
                        <Badge key={method} variant="outline" className="text-[8px] px-1 py-0">{method}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
