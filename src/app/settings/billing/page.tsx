
"use client"

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  Building2, 
  MessageCircle,
  Copy,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid)
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const companyRef = useMemoFirebase(() => {
    if (!db || !profile?.companyId) return null
    return doc(db, "companies", profile.companyId)
  }, [db, profile])

  const { data: company, isLoading: isCompanyLoading } = useDoc(companyRef)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copiado", description: `${label} copiado al portapapeles.` })
  }

  if (isCompanyLoading) return <div className="py-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Building2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black text-primary uppercase italic">Sin Perfil Corporativo</h2>
        <p className="text-muted-foreground font-medium italic">
          Esta sección es exclusiva para empresas vinculadas. Si eres un usuario demo, contacta a soporte para activar tu plan.
        </p>
        <Button className="bg-primary font-black uppercase italic h-12 px-8">Contactar Soporte</Button>
      </div>
    )
  }

  const isActive = company.subscriptionStatus === 'Active'

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary uppercase italic tracking-tighter">Suscripción y Pagos</h2>
          <p className="text-muted-foreground font-medium italic">Gestiona el acceso de tu equipo y descarga tus facturas.</p>
        </div>
        <Badge className={cn("px-4 py-1 text-[10px] font-black uppercase italic", isActive ? "bg-emerald-500" : "bg-red-500")}>
          ESTADO: {isActive ? 'SUSCRIPCIÓN ACTIVA' : 'ACCIÓN REQUERIDA'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
            <CardHeader className="bg-primary text-white p-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Plan Actual</p>
                  <CardTitle className="text-4xl font-black italic uppercase tracking-tighter">Plan {company.plan || 'Standard'}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black italic">1,5 UF <span className="text-sm opacity-60">/mes</span></p>
                  <p className="text-[9px] font-bold uppercase opacity-70">Incluye 2 usuarios</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/30 rounded-2xl border space-y-1">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    <Calendar className="h-3 w-3" /> Próximo Vencimiento
                  </div>
                  <p className="text-lg font-black text-primary">
                    {company.subscriptionExpiresAt ? new Date(company.subscriptionExpiresAt).toLocaleDateString() : 'Pendiente de activación'}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl border space-y-1">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    <ShieldCheck className="h-3 w-3" /> Seguridad de Pago
                  </div>
                  <p className="text-xs font-bold text-muted-foreground italic leading-tight">
                    Tus servicios se renuevan automáticamente tras confirmar la transferencia.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t space-y-4">
                <h4 className="font-black text-primary uppercase italic text-sm">Funcionalidades Desbloqueadas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Análisis de Licitaciones Ilimitado",
                    "Carpeta Digital de Equipo",
                    "Auditoría Multimodal de PDFs",
                    "Soporte Estratégico 24/7",
                    "Exportación de Reportes",
                    "Historial Global de Mercado"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> {feat}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-accent/20 bg-accent/5 rounded-3xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-black text-primary uppercase italic tracking-tighter flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent" /> Instrucciones de Pago (Chile)
              </CardTitle>
              <CardDescription className="font-medium italic">Realiza tu transferencia para activar o renovar tu servicio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border shadow-inner space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Banco", value: "Banco de Chile" },
                    { label: "Tipo de Cuenta", value: "Cuenta Corriente" },
                    { label: "Número de Cuenta", value: "77-88990-11" },
                    { label: "Nombre", value: "PCG Licitación SpA" },
                    { label: "RUT", value: "77.665.443-K" },
                    { label: "Email", value: "pagos@pcglicitacion.cl" }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1 group">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{item.label}</p>
                      <div className="flex justify-between items-center bg-muted/20 px-3 py-2 rounded-lg border border-transparent group-hover:border-accent/30 transition-all">
                        <span className="text-sm font-bold text-primary">{item.value}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(item.value, item.label)}>
                          <Copy className="h-3 w-3 text-accent" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-blue-900/70 italic leading-relaxed">
                  Una vez realizada la transferencia, envía el comprobante a <b>pagos@pcglicitacion.cl</b> o vía WhatsApp para la activación inmediata de tu equipo.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">Ayuda Directa</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-bold text-muted-foreground italic leading-relaxed">
                  ¿Necesitas una factura personalizada o añadir más de 2 usuarios a tu equipo?
                </p>
                <Button asChild className="w-full h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black uppercase italic shadow-lg gap-2">
                  <a href="https://wa.me/56941245316?text=Hola,%20necesito%20ayuda%20con%20la%20facturación%20de%20mi%20empresa." target="_blank">
                    <MessageCircle className="h-4 w-4" /> Hablar con Ejecutivo
                  </a>
                </Button>
              </div>
              
              <div className="pt-6 border-t space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Historial de Facturas</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl text-[10px] font-bold italic opacity-50">
                    <span>MARZO 2024</span>
                    <Badge variant="outline" className="text-[8px]">PROCESANDO</Badge>
                  </div>
                  <p className="text-[9px] text-center text-muted-foreground italic">No hay facturas pagadas registradas aún.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-accent text-white border-none shadow-2xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard className="h-20 w-20" />
            </div>
            <CardContent className="p-6 space-y-4">
              <h4 className="font-black italic uppercase tracking-tighter text-lg">Próximamente: Webpay</h4>
              <p className="text-xs font-medium opacity-80 leading-relaxed italic">
                Estamos integrando pagos automáticos con Transbank para que puedas renovar tu suscripción con tarjeta de crédito/débito instantáneamente.
              </p>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-3/4 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
