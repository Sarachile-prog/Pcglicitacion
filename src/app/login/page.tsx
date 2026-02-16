
"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth"
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe, ShieldCheck, Mail, Lock, Loader2, Building2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const auth = useAuth()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user && !isUserLoading && !isLoading) {
      router.push("/dashboard")
    }
  }, [user, isUserLoading, router, isLoading])

  const ensureUserProfile = async (uid: string, userEmail: string | null, requestedCompany?: string) => {
    if (!db) return
    try {
      const userRef = doc(db, "users", uid)
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid,
          email: userEmail,
          requestedCompanyName: requestedCompany || "",
          role: userEmail === 'control@pcgoperacion.com' ? 'SuperAdmin' : 'User',
          lastLoginAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          termsAccepted: false,
          demoUsageCount: 0,
          planRequested: false,
          status: 'Active'
        })
      } else {
        await setDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true })
      }
      return true
    } catch (e) {
      console.error("Error al gestionar perfil:", e)
      return false
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    if (!isLoginMode && !companyName) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "Por favor indica el nombre de tu empresa." })
      return
    }
    
    setIsLoading(true)
    
    try {
      if (isLoginMode) {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        await ensureUserProfile(cred.user.uid, cred.user.email)
        toast({ title: "Bienvenido", description: "Acceso concedido al ecosistema PCG." })
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await ensureUserProfile(cred.user.uid, cred.user.email, companyName)
        toast({ title: "Cuenta Creada", description: "Tu perfil ha sido registrado. Ya puedes explorar el mercado." })
      }
      router.push("/dashboard")
    } catch (error: any) {
      let message = "Hubo un problema con la autenticación."
      if (error.code === 'auth/email-already-in-use') message = "Este correo ya está registrado."
      if (error.code === 'auth/invalid-credential') message = "Correo o contraseña incorrectos."
      
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-in fade-in duration-500 p-4">
      <Card className="w-full max-w-md border-2 border-primary/10 shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="text-center space-y-4 bg-primary/5 pb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg transform -rotate-3 mt-4">
            <Globe className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase italic leading-none">PCGLICITACIÓN</CardTitle>
            <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest pt-2">Inteligencia SaaS de Mercado Público</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="flex bg-muted p-1 rounded-xl mb-4">
            <Button 
              variant={isLoginMode ? "default" : "ghost"} 
              className={cn("flex-1 text-xs font-black uppercase italic", isLoginMode && "shadow-md")}
              onClick={() => setIsLoginMode(true)}
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant={!isLoginMode ? "default" : "ghost"} 
              className={cn("flex-1 text-xs font-black uppercase italic", !isLoginMode && "shadow-md")}
              onClick={() => setIsLoginMode(false)}
            >
              Registrarse
            </Button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@empresa.cl" 
                  className="pl-10 h-12 bg-white rounded-xl border-2 focus:border-primary transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isLoginMode && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Nombre de tu Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="company" 
                    placeholder="Ej: Alfa Ingeniería SpA" 
                    className="pl-10 h-12 bg-white rounded-xl border-2 focus:border-primary transition-all"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contraseña</Label>
                {isLoginMode && (
                  <button type="button" className="text-[9px] font-black text-primary hover:underline uppercase italic">¿Olvidaste tu clave?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 bg-white rounded-xl border-2 focus:border-primary transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="py-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase italic tracking-tighter">
                <ShieldCheck className="h-3.5 w-3.5" /> No se requiere tarjeta de crédito para probar
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 font-black uppercase italic text-lg shadow-xl gap-2 rounded-2xl" 
              disabled={isLoading || isUserLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : isLoginMode ? "Entrar al Sistema" : "Crear Mi Cuenta"}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>
          </form>

          <div className="p-4 bg-muted/30 rounded-2xl border border-dashed text-[10px] space-y-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="font-bold text-muted-foreground italic leading-tight">
                PCGLICITACIÓN utiliza seguridad de grado industrial. Al registrarte, obtienes 3 análisis estratégicos gratuitos para tu empresa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
