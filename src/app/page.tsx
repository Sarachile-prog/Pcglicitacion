
"use client"

import { useCollection, useMemoFirebase, useFirestore, useUser } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Search,
  Building2,
  Calendar,
  Loader2,
  Bookmark,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function HomePage() {
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "bids"),
      orderBy("scrapedAt", "desc"),
      limit(6)
    )
  }, [db])

  const { data: bids, isLoading: isBidsLoading } = useCollection(bidsQuery)

  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0
  
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-landing')

  return (
    <div className="space-y-20 pb-20 animate-in fade-in duration-1000">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-primary text-white p-8 md:p-16 lg:p-24 shadow-2xl">
        <div className="absolute inset-0 opacity-20">
          {heroImage && (
            <Image 
              src={heroImage.imageUrl} 
              alt="PCG Licitación Hero" 
              fill 
              className="object-cover"
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-3xl space-y-8">
          <Badge className="bg-accent text-white px-4 py-1 text-sm font-bold uppercase tracking-widest animate-pulse">
            Inteligencia Artificial para Mercado Público
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic">
            DOMINA CADA <br />
            <span className="text-accent">LICITACIÓN</span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/80 font-medium leading-relaxed max-w-2xl">
            La plataforma definitiva de inteligencia de mercado. Automatiza tu postulación, analiza riesgos con IA y descubre leads estratégicos antes que tu competencia.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/bids">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white px-8 h-14 text-lg font-bold gap-2 shadow-xl group">
                Explorar Oportunidades <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            {!user && (
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 h-14 text-lg font-bold">
                  Acceso Gratuito
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Licitaciones</p>
              <h3 className="text-3xl font-black text-primary">{bids?.length || 0}+</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-accent/5 flex items-center justify-center shrink-0">
              <DollarSign className="h-7 w-7 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Monto Base</p>
              <h3 className="text-3xl font-black text-primary">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <Clock className="h-7 w-7 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Alertas Hoy</p>
              <h3 className="text-3xl font-black text-orange-600">12</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-all group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
              <Sparkles className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Ahorro Tiempo</p>
              <h3 className="text-3xl font-black text-teal-600">85%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FEATURES SECTION */}
      <section className="space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl font-black tracking-tight text-primary uppercase italic">Inteligencia sin Precedentes</h2>
          <p className="text-muted-foreground text-lg">
            Combinamos datos en tiempo real de ChileCompra con modelos avanzados de IA para darte la ventaja injusta que necesitas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Asesor IA Estratégico",
              desc: "Analiza bases de licitación en segundos. Detecta riesgos, prepara checklists y recibe consejos para ganar.",
              icon: Sparkles,
              color: "bg-accent",
            },
            {
              title: "Seguimiento Inteligente",
              desc: "Crea tu cartera de licitaciones y recibe alertas cuando cambien de estado o se publiquen aclaraciones.",
              icon: Target,
              color: "bg-primary",
            },
            {
              title: "Outreach & Leads",
              desc: "Identifica empresas que están ganando en tu rubro y genera oportunidades de subcontratación.",
              icon: BarChart3,
              color: "bg-orange-500",
            }
          ].map((feature, i) => (
            <Card key={i} className="border-none shadow-xl hover:-translate-y-2 transition-transform duration-300">
              <CardHeader>
                <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* RECENT BIDS PREVIEW */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-primary uppercase italic tracking-wider flex items-center gap-3">
            <Zap className="h-6 w-6 text-accent" /> Últimas Oportunidades Sincronizadas
          </h3>
          <Link href="/bids">
            <Button variant="ghost" className="text-accent hover:text-accent/80 font-bold group">
              Ver Todo el Mercado <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isBidsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted h-64 border-none" />
            ))
          ) : bids && bids.length > 0 ? (
            bids.map((bid) => (
              <Link key={bid.id} href={`/bids/${bid.id}`} className="group">
                <Card className="h-full border-2 border-transparent hover:border-accent transition-all duration-300 overflow-hidden shadow-md hover:shadow-2xl">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">ID: {bid.id}</Badge>
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase">{bid.status}</Badge>
                    </div>
                    <h4 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-2 mb-4 flex-1">
                      {bid.title}
                    </h4>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Building2 className="h-4 w-4 text-accent" />
                        <span className="truncate">{bid.entity}</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Referencial</span>
                        <span className="text-lg font-black text-primary">
                          {bid.amount > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency || 'CLP', maximumFractionDigits: 0 }).format(bid.amount) : 'Por Definir'}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-accent group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
              <p className="text-muted-foreground italic">No hay licitaciones sincronizadas. Sincroniza una fecha en la sección de Licitaciones.</p>
              <Link href="/bids">
                <Button className="mt-4 bg-primary">Ir a Sincronizar</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-accent rounded-3xl p-12 text-center text-white space-y-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 opacity-10 -translate-y-1/2 translate-x-1/2">
           <Sparkles className="h-96 w-96" />
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">¿Listo para el siguiente nivel?</h2>
          <p className="text-xl text-accent-foreground/90 max-w-2xl mx-auto font-medium">
            Únete a las empresas que ya están transformando su proceso de postulación con inteligencia estratégica.
          </p>
          <div className="pt-6 flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-white text-accent hover:bg-gray-100 font-black h-14 px-10 text-lg shadow-xl uppercase italic">
                Empezar Ahora
              </Button>
            </Link>
            <Link href="/state-info">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-bold h-14 px-10 text-lg">
                Más Información
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <ShieldCheck className="h-6 w-6 text-primary" /> LEY 19.886
        </div>
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <Building2 className="h-6 w-6 text-primary" /> MERCADO PÚBLICO
        </div>
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <Target className="h-6 w-6 text-primary" /> TRANSPARENCIA
        </div>
      </div>
    </div>
  )
}
