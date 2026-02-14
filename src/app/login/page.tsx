
"use client"

import { useAuth, useUser } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Globe, ShieldCheck, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/")
    }
  }, [user, isUserLoading, router])

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-in fade-in duration-500">
      <Card className="w-full max-w-md border-2 border-primary/10 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform -rotate-3">
            <Globe className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-primary">PCGLICITACIÓN</CardTitle>
            <CardDescription className="text-muted-foreground font-medium">Plataforma Inteligente de Inteligencia de Mercado</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-lg border border-border text-sm space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-accent mt-0.5" />
              <p><span className="font-bold">Acceso Protegido:</span> Los datos de empresas y leads requieren autenticación para cumplir con normativas de privacidad.</p>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 gap-2" 
            onClick={() => initiateAnonymousSignIn(auth)}
            disabled={isUserLoading}
          >
            {isUserLoading ? "Conectando..." : <><Zap className="h-5 w-5 text-accent" /> Acceso Rápido (Modo Demo)</>}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Aviso Administrativo</p>
            <p className="text-xs text-muted-foreground">
              Para obtener privilegios de administrador total y ver leads reales, su UID debe ser registrado manualmente en la colección de roles.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
