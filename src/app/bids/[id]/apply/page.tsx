
"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  ChevronLeft, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Target, 
  FileText,
  BrainCircuit,
  Zap,
  ArrowRight,
  Calendar,
  AlertTriangle,
  History,
  Clock
} from "lucide-react"
import Link from "next/link"
import { auditBidProposal, AuditOutput } from "@/ai/flows/audit-bid-proposal"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function BidApplyPage() {
  const params = useParams()
  const bidId = params.id as string
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [proposalText, setProposalText] = useState("")
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditOutput | null>(null)

  const bidRef = useMemoFirebase(() => {
    if (!db || !bidId) return null
    return doc(db, "bids", bidId)
  }, [db, bidId])

  const { data: bid, isLoading } = useDoc(bidRef)

  const handleAudit = async () => {
    if (!proposalText || !bid?.aiAnalysis) {
      toast({
        variant: "destructive",
        title: "Faltan datos",
        description: "Pega tu propuesta y asegúrate de que la licitación tenga análisis previo.",
      })
      return
    }

    setIsAuditing(true)
    try {
      const result = await auditBidProposal({
        bidId,
        proposalText,
        strategicContext: bid.aiAnalysis
      })
      setAuditResult(result)
      if (!result.isReady) {
        toast({
          variant: "destructive",
          title: "¡Alerta de Auditoría!",
          description: "Se detectaron riesgos de descalificación.",
        })
      } else {
        toast({
          title: "Auditoría Completada",
          description: "Tu propuesta parece cumplir con los requisitos básicos.",
        })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error en Auditoría", description: error.message })
    } finally {
      setIsAuditing(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
  if (!bid) return <div className="text-center py-24">Licitación no encontrada.</div>

  const analysis = bid.aiAnalysis as any;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground group">
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Volver al detalle
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/20 uppercase font-black">Modo: Auditoría de Supervivencia</Badge>
          <Badge className="bg-primary text-white font-mono">{bid.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL DE CONTROL IZQUIERDO: CRONOGRAMA DE SUPERVIVENCIA */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-red-600 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Clock className="h-12 w-12 text-red-600" />
            </div>
            <CardHeader className="bg-red-600 text-white py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 animate-bounce" /> Hitos Ineludibles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {analysis?.timeline ? (
                analysis.timeline.map((item: any, i: number) => (
                  <div key={i} className={cn(
                    "p-4 rounded-xl border-2 space-y-2 transition-all relative overflow-hidden",
                    item.criticality === 'alta' 
                      ? "bg-red-50 border-red-500 shadow-inner" 
                      : "bg-muted/30 border-muted"
                  )}>
                    {item.criticality === 'alta' && (
                       <div className="absolute top-0 right-0 h-full w-1 bg-red-500" />
                    )}
                    <div className="flex justify-between items-start">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        item.criticality === 'alta' ? "text-red-700" : "text-muted-foreground"
                      )}>{item.event}</p>
                      {item.criticality === 'alta' && <Badge className="bg-red-600 text-[8px] h-4">CRÍTICO</Badge>}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-black text-primary">{item.date}</p>
                    </div>
                    {item.criticality === 'alta' && (
                       <p className="text-[9px] text-red-600 font-bold italic leading-tight">
                         ¡El incumplimiento de este hito significa la descalificación inmediata!
                       </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">Realiza el Análisis IA en la ficha para ver los hitos.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" /> Check de Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis?.formChecklist?.map((form: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-default">
                   <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center shrink-0 mt-0.5 border border-accent/30">
                     <span className="text-[10px] font-black text-accent">{i+1}</span>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-xs font-bold leading-tight">{form.formName}</p>
                      <p className="text-[9px] opacity-60 line-clamp-1">{form.purpose}</p>
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ÁREA DE TRABAJO CENTRAL */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/50 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Borrador de Propuesta
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-white text-[10px] font-bold">Rigor IA 2.5</Badge>
                  <Badge className="bg-accent text-white text-[10px] font-bold">Auditoría Activa</Badge>
                </div>
              </div>
              <CardDescription className="pt-2">Pega el contenido de tus documentos para detectar errores de forma, RUTs inválidos o sumas incorrectas.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-0">
              <Textarea 
                placeholder="Pega aquí el contenido de tus anexos o borrador de oferta..."
                className="min-h-[600px] font-mono text-sm leading-relaxed border-none focus-visible:ring-0 bg-transparent p-8 resize-none"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
              />
              <div className="p-6 bg-muted/30 border-t">
                <Button 
                  className="w-full h-16 bg-accent hover:bg-accent/90 text-white font-black text-xl gap-3 shadow-2xl transition-all hover:scale-[1.01] hover:shadow-accent/20"
                  onClick={handleAudit}
                  disabled={isAuditing || !proposalText}
                >
                  {isAuditing ? <Loader2 className="animate-spin h-6 w-6" /> : <BrainCircuit className="h-7 w-7" />}
                  {isAuditing ? "Analizando Rigurosidad..." : "Ejecutar Auditoría Final IA"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PANEL DE RESULTADOS DERECHO */}
        <div className="lg:col-span-3 space-y-6">
           {auditResult ? (
             <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <Card className={cn(
                  "border-t-8 shadow-2xl overflow-hidden",
                  auditResult.isReady ? "border-t-emerald-500" : "border-t-red-600"
                )}>
                  <CardContent className="pt-8 text-center space-y-4">
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32">
                        <circle className="text-muted-foreground/10" strokeWidth="12" stroke="currentColor" fill="transparent" r="50" cx="64" cy="64" />
                        <circle 
                          className={auditResult.isReady ? "text-emerald-500" : "text-red-600"} 
                          strokeWidth="12" 
                          strokeDasharray={314} 
                          strokeDashoffset={314 - (314 * auditResult.complianceScore) / 100} 
                          strokeLinecap="round" 
                          stroke="currentColor" 
                          fill="transparent" 
                          r="50" cx="64" cy="64" 
                        />
                      </svg>
                      <span className="absolute text-3xl font-black text-primary">{auditResult.complianceScore}%</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-xl uppercase italic text-primary">
                        {auditResult.isReady ? "Oferta Sólida" : "Propuesta Vulnerable"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        Nivel de cumplimiento detectado
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200 border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase text-orange-700 flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Hallazgos Críticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    {auditResult.riskWarnings.map((risk, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-white rounded-xl border border-orange-200 text-xs shadow-sm group hover:border-orange-400 transition-colors">
                        <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                        <p className="font-bold text-orange-900 leading-tight">{risk}</p>
                      </div>
                    ))}
                    {auditResult.missingElements.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Elementos Faltantes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {auditResult.missingElements.map((m, i) => (
                            <Badge key={i} variant="outline" className="bg-white border-orange-200 text-orange-800 text-[9px] font-bold py-1">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                      <History className="h-3 w-3" /> Veredicto del Auditor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs font-medium text-primary/80 leading-relaxed bg-white/50 p-4 m-2 rounded-lg italic">
                    "{auditResult.improvementSuggestions}"
                  </CardContent>
                </Card>
             </div>
           ) : (
             <Card className="bg-muted/20 border-dashed border-2 h-full min-h-[400px]">
               <CardContent className="flex flex-col items-center justify-center h-full text-center space-y-6 px-6">
                 <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-lg transform rotate-6">
                   <Target className="h-10 w-10 text-muted-foreground/30" />
                 </div>
                 <div className="space-y-2">
                   <h5 className="font-black text-primary uppercase italic text-lg tracking-tighter">Esperando Borrador</h5>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Pega tus documentos y ejecuta la auditoría para confrontar tu oferta contra los hitos de supervivencia.
                   </p>
                 </div>
               </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  )
}
