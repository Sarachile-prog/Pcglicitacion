"use client"

import { useParams } from "next/navigation"
import { MOCK_BIDS } from "@/app/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { extractAndSummarizeBidDetails, PostulationAdvisorOutput } from "@/ai/flows/extract-and-summarize-bid-details"
import { useState } from "react"
import { 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  FileText, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  Calendar,
  ClipboardList,
  Target,
  FileSpreadsheet
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function BidDetailPage() {
  const params = useParams()
  const bid = MOCK_BIDS.find(b => b.id === params.id)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<PostulationAdvisorOutput | null>(null)
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
      const result = await extractAndSummarizeBidDetails({ 
        bidDocumentText: bid.fullText,
        bidId: bid.id 
      })
      setAnalysis(result)
      toast({
        title: "Asesoría Generada",
        description: "El reporte estratégico y la guía de formularios están listos.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de Análisis",
        description: "No se pudo contactar al asesor inteligente.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Link href="/bids">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al explorador
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
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Institución</p>
                <p className="text-sm font-semibold text-foreground">{bid.entity}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-border">
              <Clock className="h-5 w-5 text-accent" />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Cierre Oficial</p>
                <p className="text-sm font-semibold text-foreground">{bid.deadline}</p>
              </div>
            </div>
          </div>
        </div>
        
        <Card className="w-full md:w-96 border-2 border-primary shadow-2xl bg-primary/5 overflow-hidden">
          <CardHeader className="bg-primary text-white p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Modo Asesor Experto
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 font-medium">IA especializada en Mercado Público.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Analizaremos las bases para detectar alertas de riesgo, cronogramas y preparar tus formularios.</p>
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12" 
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando Estrategia...</> : 'Activar Asesor de Postulación'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-accent shadow-sm">
                  <p className="text-xs font-bold text-accent uppercase mb-2">Recomendación Estratégica</p>
                  <p className="text-sm font-medium leading-relaxed italic">"{analysis.strategicAdvice}"</p>
                </div>
                <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5" onClick={() => setAnalysis(null)}>
                  Reiniciar Consultoría
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="description" className="space-y-6">
        <TabsList className="bg-muted p-1 gap-1 h-12">
          <TabsTrigger value="description" className="px-6">Descripción General</TabsTrigger>
          <TabsTrigger value="bases" className="px-6">Documentación Base</TabsTrigger>
          {analysis && (
            <>
              <TabsTrigger value="ai-advisor" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Target className="h-4 w-4 mr-2" /> Estrategia de Postulación
              </TabsTrigger>
              <TabsTrigger value="ai-forms" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Preparación de Formularios
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="description" className="animate-in fade-in duration-300">
          <Card>
            <CardContent className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-2xl font-bold text-primary">Detalle del Proyecto</h3>
                  <p className="text-lg text-foreground leading-relaxed">
                    {bid.description}
                  </p>
                </div>
                <div className="bg-muted/30 p-6 rounded-2xl border border-border">
                  <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" /> Aspectos Económicos
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Monto Referencial</p>
                      <p className="text-2xl font-black text-primary">
                        {new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Moneda</p>
                      <p className="text-sm font-semibold">{bid.currency}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bases" className="animate-in fade-in duration-300">
          <Card>
            <CardContent className="pt-8">
              <div className="bg-card p-8 rounded-2xl border-2 border-dashed border-border text-center space-y-4">
                <FileText className="h-12 w-12 text-primary mx-auto" />
                <h3 className="text-xl font-bold">Bases Administrativas y Técnicas Oficiales</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Este documento contiene los anexos obligatorios y las cláusulas legales que rigen el proceso.</p>
                <Button className="bg-primary hover:bg-primary/90">Descargar Bases (PDF)</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {analysis && (
          <>
            <TabsContent value="ai-advisor" className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Alertas Críticas */}
                  <Card className="border-red-100 bg-red-50/30">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" /> Alertas Críticas y Riesgos
                      </CardTitle>
                      <CardDescription>Puntos que podrían invalidar tu oferta o generar pérdidas.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {analysis.strategicAlerts.map((alert, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                          <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">!</div>
                          <p className="text-sm font-medium text-red-900">{alert}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Cronograma Inteligente */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-accent" /> Hoja de Ruta (Cronograma)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {analysis.timeline.map((item, i) => (
                          <div key={i} className="relative flex items-center justify-between p-4 bg-white border border-border rounded-xl ml-10 shadow-sm">
                            <div className={cn(
                              "absolute -left-10 h-3 w-3 rounded-full border-2 border-white",
                              item.criticality === 'alta' ? 'bg-red-500' : 'bg-primary'
                            )} />
                            <div>
                              <p className="font-bold text-sm text-primary">{item.event}</p>
                              <p className="text-xs text-muted-foreground">{item.date}</p>
                            </div>
                            <Badge variant={item.criticality === 'alta' ? 'destructive' : 'outline'} className="uppercase text-[10px]">
                              {item.criticality}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumen del Asesor */}
                <div className="space-y-6">
                  <Card className="bg-primary text-white border-none shadow-xl h-fit">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Target className="h-6 w-6 text-accent" /> Veredicto IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-primary-foreground/90 leading-relaxed font-medium">
                        {analysis.strategicAdvice}
                      </p>
                      <div className="pt-6 border-t border-white/10">
                        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Razonamiento del Asesor</p>
                        <p className="text-sm text-primary-foreground/70 italic">"{analysis.reasoning}"</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai-forms" className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-full mb-4">
                  <h3 className="text-2xl font-bold text-primary">Guía de Preparación de Formularios</h3>
                  <p className="text-muted-foreground">Prepara estos datos antes de ingresar a Mercado Público para evitar errores de último minuto.</p>
                </div>
                {analysis.formChecklist.map((form, i) => (
                  <Card key={i} className="hover:border-accent transition-all group">
                    <CardHeader className="bg-muted/20 pb-4">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <ClipboardList className="h-5 w-5 text-accent" />
                      </div>
                      <CardTitle className="text-lg font-bold">{form.formName}</CardTitle>
                      <CardDescription className="text-xs font-medium leading-relaxed">{form.purpose}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-widest">Datos a Preparar:</p>
                      <ul className="space-y-2">
                        {form.dataRequired.map((data, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                            <span>{data}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
