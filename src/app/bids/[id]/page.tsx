
"use client"

import { useParams } from "next/navigation"
import { MOCK_BIDS } from "@/app/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { extractAndSummarizeBidDetails, ExtractAndSummarizeBidDetailsOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { useState, use } from "react"
import { 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  FileText, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Info,
  ChevronLeft,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function BidDetailPage() {
  const params = useParams()
  const bid = MOCK_BIDS.find(b => b.id === params.id)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<ExtractAndSummarizeBidDetailsOutput | null>(null)
  const { toast } = useToast()

  if (!bid) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Licitación no encontrada</h2>
        <Link href="/bids">
          <Button variant="link">Volver al listado</Button>
        </Link>
      </div>
    )
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const result = await extractAndSummarizeBidDetails({ bidDocumentText: bid.fullText })
      setAnalysis(result)
      toast({
        title: "Análisis Completado",
        description: "La IA ha procesado el documento exitosamente.",
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error de Análisis",
        description: "No se pudo procesar el documento con IA.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link href="/bids">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al listado
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/20">{bid.category}</Badge>
            <Badge className="bg-accent text-white">{bid.status}</Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary leading-tight">{bid.title}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-muted-foreground bg-white p-3 rounded-lg shadow-sm border border-border">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Institución</p>
                <p className="text-sm font-semibold text-foreground">{bid.entity}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground bg-white p-3 rounded-lg shadow-sm border border-border">
              <MapPin className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Ubicación</p>
                <p className="text-sm font-semibold text-foreground">{bid.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground bg-white p-3 rounded-lg shadow-sm border border-border">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Fecha Límite</p>
                <p className="text-sm font-semibold text-foreground">{bid.deadline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground bg-white p-3 rounded-lg shadow-sm border border-border">
              <DollarSign className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Monto Estimado</p>
                <p className="text-sm font-semibold text-foreground">
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="w-full md:w-80 border-2 border-accent shadow-xl bg-accent/5 overflow-hidden">
          <CardHeader className="bg-accent text-white p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Análisis IA
            </CardTitle>
            <CardDescription className="text-accent-foreground/80">Extrae detalles clave instantáneamente.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Nuestro motor de IA resumirá requisitos, plazos y montos automáticamente.</p>
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold" 
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Iniciar Análisis IA'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-white rounded-md border border-accent/20">
                  <p className="text-xs font-bold text-accent uppercase mb-1">Puntos Críticos</p>
                  <ul className="text-sm space-y-1">
                    {analysis.keyRequirements.slice(0, 3).map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 mt-1 text-accent shrink-0" />
                        <span className="line-clamp-2">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10" onClick={() => setAnalysis(null)}>
                  Nuevo Análisis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="description" className="data-[state=active]:bg-white">Descripción del Proyecto</TabsTrigger>
          <TabsTrigger value="bases" className="data-[state=active]:bg-white">Bases de Licitación</TabsTrigger>
          {analysis && <TabsTrigger value="ai-report" className="data-[state=active]:bg-accent data-[state=active]:text-white">Reporte Inteligente</TabsTrigger>}
        </TabsList>

        <TabsContent value="description" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-primary mb-4">Resumen Ejecutivo</h3>
                <p className="text-lg text-foreground leading-relaxed italic border-l-4 border-accent pl-6 py-2 bg-accent/5">
                  {bid.description}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <Info className="h-4 w-4 text-accent" /> Requerimientos Generales
                  </h4>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 text-sm">
                    <li>Experiencia comprobable en proyectos de similar envergadura.</li>
                    <li>Capacidad financiera para respaldar boletas de garantía.</li>
                    <li>Cumplimiento con normativas vigentes del sector.</li>
                    <li>Plazo de ejecución según cronograma adjunto.</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" /> Criterios de Evaluación
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span>Oferta Técnica</span>
                        <span>60%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[60%]" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span>Oferta Económica</span>
                        <span>40%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent w-[40%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bases" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <Card>
            <CardContent className="pt-6">
              <div className="bg-muted/30 p-8 rounded-xl border-2 border-dashed border-border text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Bases Administrativas y Técnicas</h3>
                <p className="text-muted-foreground mb-6">El documento original contiene toda la normativa, plazos detallados y anexos para la postulación.</p>
                <Button className="bg-primary px-10">Descargar PDF Original (4.2 MB)</Button>
              </div>
              <div className="mt-8">
                <h4 className="font-bold text-lg mb-4">Texto Extraído del Sistema</h4>
                <div className="bg-card p-6 rounded-lg border text-sm font-mono text-muted-foreground leading-relaxed max-h-[400px] overflow-y-auto">
                  {bid.fullText}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {analysis && (
          <TabsContent value="ai-report" className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-2xl border-accent/20">
                <CardHeader className="bg-accent/10 border-b border-accent/10">
                  <CardTitle className="text-2xl flex items-center gap-3 text-primary">
                    <Sparkles className="h-6 w-6 text-accent" /> Resumen de Oportunidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <section>
                    <h4 className="text-lg font-bold text-primary mb-3">Descripción Sintetizada</h4>
                    <p className="text-foreground leading-relaxed text-lg">
                      {analysis.summary}
                    </p>
                  </section>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="bg-muted/30 p-5 rounded-xl border border-border">
                      <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-accent" /> Plazos Críticos
                      </h4>
                      <p className="text-sm font-semibold">{analysis.deadline}</p>
                    </section>
                    <section className="bg-muted/30 p-5 rounded-xl border border-border">
                      <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-accent" /> Análisis Monetario
                      </h4>
                      <p className="text-sm font-semibold">{analysis.monetaryAmount}</p>
                    </section>
                  </div>

                  <section>
                    <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-accent" /> Requerimientos Clave Extraídos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.keyRequirements.map((req, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-white rounded-lg border border-border shadow-sm group hover:border-accent transition-colors">
                          <div className="h-6 w-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                          <p className="text-sm text-foreground leading-snug">{req}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground border-none h-fit sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Info className="h-5 w-5 text-accent" /> Razonamiento IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-primary-foreground/80 leading-relaxed italic">
                    "{analysis.reasoning}"
                  </p>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Recomendación Estratégica</p>
                    <p className="text-sm">
                      Dada la importancia del plazo mencionado, se recomienda iniciar la recopilación de certificados técnicos inmediatamente.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
