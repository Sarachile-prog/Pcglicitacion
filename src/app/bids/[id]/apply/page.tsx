"use client"

import { useParams, useRouter } from "next/navigation"
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { useState } from "react"
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
  History
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
          <Badge variant="outline" className="text-primary border-primary/20">Modo: Auditoría de Supervivencia</Badge>
          <Badge className="bg-primary text-white font-mono">{bid.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PANEL DE CONTROL IZQUIERDO: CRONOGRAMA DE SUPERVIVENCIA */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-red-200 shadow-lg overflow-hidden">
            <CardHeader className="bg-red-500 text-white py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Cronograma Crítico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {analysis?.timeline ? (
                analysis.timeline.map((item: any, i: number) => (
                  <div key={i} className={cn(
                    "p-3 rounded-lg border-l-4 space-y-1 transition-all",
                    item.criticality === 'alta' ? "bg-red-50 border-red-500" : "bg-muted/30 border-muted"
                  )}>
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">{item.event}</p>
                      {item.criticality === 'alta' && <Badge className="bg-red-500 h-2 w-2 p-0 rounded-full animate-pulse" />}
                    </div>
                    <p className="text-sm font-bold text-primary">{item.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">Realiza el Análisis IA en la ficha para ver los hitos.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary text-white border-none">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" /> Check de Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis?.formChecklist?.map((form: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs opacity-90 hover:opacity-100 transition-opacity">
                   <div className="h-4 w-4 rounded bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                     <span className="text-[10px]">{i+1}</span>
                   </div>
                   <span>{form.formName}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ÁREA DE TRABAJO CENTRAL */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="border-2 border-primary/10 shadow-xl">
            <CardHeader className="bg-muted/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Borrador de Propuesta
                </CardTitle>
                <Badge variant="outline" className="bg-white">Revisión de Formato</Badge>
              </div>
              <CardDescription>Pega aquí tu oferta técnica o económica para detectar errores de forma o sumas.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Textarea 
                placeholder="Pega el contenido de tus anexos o borrador de oferta..."
                className="min-h-[500px] font-mono text-sm leading-relaxed border-none focus-visible:ring-0 bg-muted/5 p-4 rounded-xl"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
              />
              <Button 
                className="w-full h-16 bg-accent hover:bg-accent/90 text-white font-black text-xl gap-3 shadow-2xl transition-all hover:scale-[1.01]"
                onClick={handleAudit}
                disabled={isAuditing || !proposalText}
              >
                {isAuditing ? <Loader2 className="animate-spin h-6 w-6" /> : <BrainCircuit className="h-7 w-7" />}
                {isAuditing ? "Analizando Rigurosidad..." : "Ejecutar Auditoría Final IA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* PANEL DE RESULTADOS DERECHO */}
        <div className="lg:col-span-3 space-y-6">
           {auditResult ? (
             <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <Card className={cn(
                  "border-t-8 shadow-lg",
                  auditResult.isReady ? "border-t-emerald-500" : "border-t-red-500"
                )}>
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-24 h-24">
                        <circle className="text-muted-foreground/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                        <circle 
                          className={auditResult.isReady ? "text-emerald-500" : "text-red-500"} 
                          strokeWidth="8" 
                          strokeDasharray={251} 
                          strokeDashoffset={251 - (251 * auditResult.complianceScore) / 100} 
                          strokeLinecap="round" 
                          stroke="currentColor" 
                          fill="transparent" 
                          r="40" cx="48" cy="48" 
                        />
                      </svg>
                      <span className="absolute text-2xl font-black text-primary">{auditResult.complianceScore}%</span>
                    </div>
                    <h4 className="font-black text-lg uppercase italic text-primary">
                      {auditResult.isReady ? "Propuesta Sólida" : "Riesgo de Rechazo"}
                    </h4>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase text-orange-700 flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Hallazgos Críticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {auditResult.riskWarnings.map((risk, i) => (
                      <div key={i} className="flex gap-2 p-3 bg-white rounded-lg border border-orange-200 text-xs shadow-sm">
                        <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                        <p className="font-medium text-orange-900">{risk}</p>
                      </div>
                    ))}
                    {auditResult.missingElements.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground">FALTANTES:</p>
                        <div className="flex flex-wrap gap-1">
                          {auditResult.missingElements.map((m, i) => (
                            <Badge key={i} variant="outline" className="bg-white text-[9px]">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                      <History className="h-3 w-3" /> Sugerencia Final
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs italic text-muted-foreground leading-relaxed">
                    "{auditResult.improvementSuggestions}"
                  </CardContent>
                </Card>
             </div>
           ) : (
             <Card className="bg-muted/20 border-dashed border-2">
               <CardContent className="py-20 text-center space-y-4">
                 <Target className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                 <p className="text-xs text-muted-foreground">Pega tu borrador y ejecuta la auditoría para ver el análisis de riesgo detallado.</p>
               </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  )
}
