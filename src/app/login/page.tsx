
"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  createUserWithEmailAndPassword 
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe, ShieldCheck, Zap, Mail, Lock, Loader2, UserPlus, ArrowRight } from "lucide-react"
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
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnonLoading, setIsAnonLoading] = useState(false)

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push("/dashboard")
    }
  }, [user, isUserLoading, router])

  const ensureUserProfile = async (uid: string, userEmail: string | null) => {
    if (!db) return
    try {
      const userRef = doc(db, "users", uid)
      await setDoc(userRef, {
        uid,
        email: userEmail,
        role: userEmail === 'control@pcgoperacion.com' ? 'SuperAdmin' : 'User',
        lastLoginAt: serverTimestamp(),
        isAnonymous: !userEmail,
        createdAt: serverTimestamp(),
        termsAccepted: false // Forzará el modal de términos al entrar
      }, { merge: true })
    } catch (e) {
      console.error("Error al crear perfil:", e)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsLoading(true)
    
    try {
      if (isLoginMode) {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        await ensureUserProfile(cred.user.uid, cred.user.email)
        toast({ title: "Bienvenido", description: "Acceso concedido al ecosistema PCG." })
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await ensureUserProfile(cred.user.uid, cred.user.email)
        toast({ title: "Cuenta Creada", description: "Ahora puedes solicitar tu vinculación corporativa." })
      }
    } catch (error: any) {
      let message = "Hubo un problema con la autenticación."
      if (error.code === 'auth/email-already-in-use') message = "Este correo ya está registrado."
      if (error.code === 'auth/wrong-password') message = "Contraseña incorrecta."
      if (error.code === 'auth/user-not-found') message = "Usuario no registrado."
      
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnonLogin = async () => {
    setIsAnonLoading(true)
    try {
      const cred = await signInAnonymously(auth)
      await ensureUserProfile(cred.user.uid, null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error demo",
        description: "No se pudo iniciar el modo rápido."
      })
    } finally {
      setIsAnonLoading(false)
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
            <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase italic">PCGLICITACIÓN</CardTitle>
            <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Inteligencia SaaS de Mercado Público</CardDescription>
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
            <Button 
              type="submit" 
              className="w-full h-14 font-black uppercase italic text-lg shadow-xl gap-2 rounded-2xl" 
              disabled={isLoading || isUserLoading || isAnonLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : isLoginMode ? "Entrar al Sistema" : "Crear Mi Cuenta"}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-bold italic tracking-tighter">O explora sin compromiso</span>
            </div>
          </div>

          <Button 
            variant="outline"
            className="w-full h-12 text-md font-bold border-accent text-accent hover:bg-accent/5 gap-2 uppercase italic shadow-sm rounded-xl" 
            onClick={handleAnonLogin}
            disabled={isUserLoading || isLoading || isAnonLoading}
          >
            {isAnonLoading ? <Loader2 className="animate-spin" /> : <><Zap className="h-4 w-4" /> Acceso Rápido (Modo Demo)</>}
          </Button>

          <div className="p-4 bg-muted/30 rounded-2xl border border-dashed text-[10px] space-y-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="font-bold text-muted-foreground italic leading-tight">
                PCGLICITACIÓN utiliza encriptación de grado bancario. Las cuentas corporativas vinculadas disfrutan de auditorías IA ilimitadas y soporte técnico prioritario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
