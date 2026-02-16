
"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser } from "@/firebase"
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe, ShieldCheck, Zap, Mail, Lock, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isAnonLoading, setIsAnonLoading] = useState(false)

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/dashboard")
    }
  }, [user, isUserLoading, router])

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsEmailLoading(true)
    
    // Iniciamos sesión capturando posibles errores de credenciales
    signInWithEmailAndPassword(auth, email, password)
      .catch((error: any) => {
        let message = "Credenciales incorrectas o usuario no registrado."
        
        // Mapeo de errores comunes de Firebase Auth
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          message = "Correo o contraseña incorrectos. Por favor, verifica tus datos."
        } else if (error.code === 'auth/too-many-requests') {
          message = "Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente."
        }
        
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: message
        })
        setIsEmailLoading(false)
      })
  }

  const handleAnonLogin = () => {
    setIsAnonLoading(true)
    signInAnonymously(auth)
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "Error de acceso demo",
          description: "No se pudo iniciar el modo demo. Intenta nuevamente en unos segundos."
        })
        setIsAnonLoading(false)
      })
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-in fade-in duration-500 p-4">
      <Card className="w-full max-w-md border-2 border-primary/10 shadow-2xl overflow-hidden">
        <CardHeader className="text-center space-y-4 bg-primary/5 pb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform -rotate-3 mt-4">
            <Globe className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase italic">PCGLICITACIÓN</CardTitle>
            <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Plataforma de Inteligencia de Mercado</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1">Correo Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@empresa.cl" 
                  className="pl-10 h-12 bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest ml-1">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 font-black uppercase italic text-lg shadow-xl" 
              disabled={isEmailLoading || isUserLoading || isAnonLoading}
            >
              {isEmailLoading ? <Loader2 className="animate-spin" /> : "Entrar al Sistema"}
            </Button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-bold italic tracking-tighter">O accede como prospecto</span>
            </div>
          </div>

          <Button 
            variant="outline"
            className="w-full h-12 text-md font-bold border-accent text-accent hover:bg-accent/5 gap-2 uppercase italic shadow-sm" 
            onClick={handleAnonLogin}
            disabled={isUserLoading || isEmailLoading || isAnonLoading}
          >
            {isAnonLoading ? <Loader2 className="animate-spin" /> : <><Zap className="h-4 w-4" /> Acceso Rápido (Modo Demo)</>}
          </Button>

          <div className="p-4 bg-muted/30 rounded-xl border border-border text-[10px] space-y-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="font-bold text-muted-foreground italic leading-tight">
                El acceso está protegido por encriptación. Si eres un administrador corporativo y has olvidado tu contraseña, por favor contacta a soporte técnico de PCG.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
