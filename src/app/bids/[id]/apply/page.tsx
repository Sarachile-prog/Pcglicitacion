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
  ArrowRight
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
      toast({
        title: "Auditoría Completada",
        description: result.isReady ? "Tu propuesta se ve sólida." : "Hay puntos críticos que corregir.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en Auditoría",
        description: error.message,
      })
    } finally {
      setIsAuditing(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>

  if (!bid) return <div className="text-center py-24">Licitación no encontrada.</div>

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver al detalle
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/20">Preparando Oferta</Badge>
          <Badge className="bg-emerald-500 text-white uppercase font-bold text-[10px]">{bid.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: ÁREA DE TRABAJO */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-primary/10 shadow-sm">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Borrador de Propuesta
              </CardTitle>
              <CardDescription>Pega aquí el texto de tu propuesta técnica/económica o anexos preparados.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Textarea 
                placeholder="Escribe o pega aquí tu propuesta para que la IA la audite..."
                className="min-h-[400px] font-sans text-sm leading-relaxed"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
              />
              <Button 
                className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-black text-lg gap-2 shadow-lg"
                onClick={handleAudit}
                disabled={isAuditing || !proposalText}
              >
                {isAuditing ? <Loader2 className="animate-spin" /> : <BrainCircuit className="h-6 w-6" />}
                {isAuditing ? "Auditando Propuesta..." : "Solicitar Auditoría IA Final"}
              </Button>
            </CardContent>
          </Card>

          {auditResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <Card className={cn(
                "border-2",
                auditResult.isReady ? "border-emerald-200 bg-emerald-50/20" : "border-red-200 bg-red-50/20"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {auditResult.isReady ? <CheckCircle2 className="text-emerald-600" /> : <AlertCircle className="text-red-600" />}
                    Veredicto de Auditoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Cumplimiento Estimado</span>
                      <span>{auditResult.complianceScore}%</span>
                    </div>
                    <Progress value={auditResult.complianceScore} className={cn(
                      "h-3",
                      auditResult.complianceScore > 80 ? "bg-emerald-100" : "bg-red-100"
                    )} />
                  </div>
                  <div className="p-4 bg-white rounded-lg border shadow-sm italic text-sm">
                    "{auditResult.improvementSuggestions}"
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="text-orange-600 h-5 w-5" /> Hallazgos Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-orange-700">Faltantes Detectados</p>
                    <div className="flex flex-wrap gap-2">
                      {auditResult.missingElements.map((item, i) => (
                        <Badge key={i} variant="outline" className="bg-white text-orange-800 border-orange-200">{item}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-orange-700">Advertencias de Riesgo</p>
                    {auditResult.riskWarnings.map((risk, i) => (
                      <div key={i} className="text-xs flex items-start gap-2 bg-white p-2 rounded border border-orange-100">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {risk}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: REFERENCIA ESTRATÉGICA */}
        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" /> Guía de Referencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-accent tracking-widest">Objetivo de la Obra</p>
                <p className="text-sm font-medium leading-relaxed">{bid.title}</p>
              </div>
              
              {bid.aiAnalysis && (
                <>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-accent tracking-widest">Documentación a Validar</p>
                    <div className="space-y-2">
                      {(bid.aiAnalysis as any).formChecklist.map((form: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white/10 rounded-lg border border-white/10">
                          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                          <span className="text-xs font-semibold">{form.formName}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-accent text-primary rounded-xl">
                    <p className="text-[10px] font-black uppercase mb-1">Recordatorio Estratégico</p>
                    <p className="text-xs font-bold italic">"{(bid.aiAnalysis as any).strategicAdvice}"</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 bg-muted/30">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Soporte Normativo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed">
              Recuerda que esta auditoría es una herramienta de asistencia basada en IA. Siempre valida los requisitos finales directamente en las Bases Administrativas oficiales descargadas desde el portal.
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full gap-2 text-primary border-primary" asChild>
             <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer">
               Ver Bases en Mercado Público <ArrowRight className="h-4 w-4" />
             </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
