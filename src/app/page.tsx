'use client';

import {useCollection, useMemoFirebase, useFirestore, useUser, useDoc} from '@/firebase';
import {collection, query, orderBy, limit, doc} from 'firebase/firestore';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
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
  BarChart3,
  Users,
  BrainCircuit,
  FileCheck,
  RefreshCw,
  MessageCircle,
  Globe,
  LogIn
} from 'lucide-react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import Image from 'next/image';
import {PlaceHolderImages} from '@/lib/placeholder-images';

const WHATSAPP_URL = "https://wa.me/56941245316?text=Hola,%20vi%20la%20landing%20page%20de%20PCG%20Licitación%20y%20quiero%20más%20información%20sobre%20el%20plan%20empresas.";

export default function HomePage() {
  const db = useFirestore();
  const {user} = useUser();

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const {data: profile} = useDoc(profileRef);
  const isDemo = user && (!profile || !profile.companyId);

  const bidsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'bids'), orderBy('scrapedAt', 'desc'), limit(6));
  }, [db]);

  const {data: bids, isLoading: isBidsLoading} = useCollection(bidsQuery);

  const totalAmount = bids?.reduce((acc, bid) => acc + (Number(bid.amount) || 0), 0) || 0;

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-landing');
  const aiImage = PlaceHolderImages.find(img => img.id === 'ai-analysis');

  // Ruta condicional para exploración: login si es anónimo, bids si está autenticado
  const explorationPath = user ? "/bids" : "/login";

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* NAVIGATION BAR - BRAND IDENTITY */}
      <header className="sticky top-0 z-[100] w-full bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter text-primary italic leading-none">PCG</span>
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] leading-tight">LICITACIÓN</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href={explorationPath} className="text-sm font-black uppercase italic text-muted-foreground hover:text-primary transition-colors">Explorar Mercado</Link>
            <Link href="#servicios" className="text-sm font-black uppercase italic text-muted-foreground hover:text-primary transition-colors">Servicios</Link>
            <a href={WHATSAPP_URL} target="_blank" className="text-sm font-black uppercase italic text-muted-foreground hover:text-primary transition-colors">Contacto</a>
          </nav>

          <div className="flex items-center gap-4">
            {!user ? (
              <Link href="/login">
                <Button variant="ghost" className="font-black uppercase italic text-primary hover:bg-primary/5 gap-2">
                  <LogIn className="h-4 w-4" /> Acceso
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard">
                <Button className="bg-primary hover:bg-primary/90 font-black uppercase italic px-6 rounded-xl">
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 space-y-24">
        {/* HERO SECTION - HIGH IMPACT */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-primary text-white p-8 md:p-16 lg:p-24 shadow-2xl">
          <div className="absolute inset-0 opacity-25">
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

          <div className="relative z-10 max-w-4xl space-y-8">
            <Badge className="bg-accent text-white px-5 py-1.5 text-xs font-black uppercase tracking-[0.2em] animate-pulse rounded-full">
              Ecosistema de Inteligencia SaaS
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic uppercase">
              Gana más <br />
              <span className="text-accent">Licitaciones</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-medium leading-relaxed max-w-2xl italic">
              Transformamos los datos de Mercado Público en decisiones estratégicas. Automatiza tu postulación con IA y colabora con tu equipo en tiempo real.
            </p>
            <div className="flex flex-wrap gap-5 pt-4">
              <Link href={explorationPath}>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-10 h-16 text-xl font-black gap-3 shadow-[0_10px_40px_rgba(38,166,154,0.4)] group uppercase italic rounded-2xl"
                >
                  Explorar Mercado <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              {!user ? (
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 px-10 h-16 text-xl font-black uppercase italic rounded-2xl"
                  >
                    Acceso Corporativo
                  </Button>
                </Link>
              ) : isDemo ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 px-10 h-16 text-xl font-black uppercase italic rounded-2xl gap-2"
                >
                  <a href={WHATSAPP_URL} target="_blank">
                    <MessageCircle className="h-5 w-5" /> Activar Empresa
                  </a>
                </Button>
              ) : (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 px-10 h-16 text-xl font-black uppercase italic rounded-2xl"
                  >
                    Ir al Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Floating Badges for Hero */}
          <div className="absolute top-10 right-10 hidden xl:flex flex-col gap-4 animate-bounce duration-[3000ms]">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Auto-Sync</p>
                <p className="text-sm font-bold">08:00 AM Active</p>
              </div>
            </div>
          </div>
        </section>

        {/* KEY STATS - TRUST BUILDER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 -mt-16 relative z-20 px-4">
          {[
            {
              icon: Briefcase,
              label: 'Oportunidades',
              value: bids?.length ? `${bids.length}+` : '1.000+',
              color: 'text-primary',
              bg: 'bg-white',
            },
            {
              icon: DollarSign,
              label: 'Monto Analizado',
              value: '850M+',
              color: 'text-accent',
              bg: 'bg-white',
            },
            {
              icon: BrainCircuit,
              label: 'Análisis IA/mes',
              value: '2.5k',
              color: 'text-indigo-600',
              bg: 'bg-white',
            },
            {
              icon: Users,
              label: 'Equipos SaaS',
              value: '45',
              color: 'text-orange-600',
              bg: 'bg-white',
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className={`${stat.bg} border-none shadow-2xl hover:scale-105 transition-transform duration-300 rounded-3xl`}
            >
              <CardContent className="p-8 flex items-center gap-6">
                <div className={`h-16 w-16 rounded-2xl ${stat.color} bg-current/10 flex items-center justify-center shrink-0`}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className={`text-4xl font-black ${stat.color} tracking-tighter italic`}>{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SERVICES GRID - THE CORE VALUE */}
        <section id="servicios" className="space-y-16 py-10">
          <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
            <Badge variant="outline" className="border-primary text-primary font-black uppercase tracking-widest px-4 py-1">
              Capacidades 2024
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-primary uppercase italic">
              Infraestructura para <br /> <span className="text-accent">Empresas Licitadoras</span>
            </h2>
            <p className="text-muted-foreground text-xl font-medium leading-relaxed italic">
              No somos solo un buscador. Somos el cerebro estratégico de tu departamento de estudios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                title: 'Asesoría IA Estratégica',
                desc: 'Analiza bases técnicas y administrativas automáticamente. Detecta multas ocultas, garantías y requisitos de experiencia en segundos.',
                icon: Sparkles,
                feature: 'Multimodal Gemini Flash',
                color: 'bg-accent',
              },
              {
                title: 'Dashboard de Equipo',
                desc: 'Modelo SaaS Multitenancy. Comparte licitaciones, asigna estados de gestión y centraliza la documentación con tus colegas.',
                icon: Users,
                feature: 'Plan 1,5 UF / 2 Users',
                color: 'bg-primary',
              },
              {
                title: 'Auditoría de Anexos',
                desc: 'Sube tus PDFs y deja que la IA audite errores de cálculo, firmas faltantes o RUTs incorrectos antes de subir al portal.',
                icon: FileCheck,
                feature: 'Pre-evaluación Técnica',
                color: 'bg-indigo-600',
              },
              {
                title: 'Sincronización Automática',
                desc: 'Olvida la carga manual. El sistema importa todas las nuevas oportunidades cada mañana a las 08:00 AM automáticamente.',
                icon: RefreshCw,
                feature: 'SLA 99.9% Up-time',
                color: 'bg-orange-500',
              },
              {
                title: 'Análisis de Tendencias',
                desc: 'Visualiza dónde está invirtiendo el Estado. Descubre rubros con mayor crecimiento y prepárate antes que tu competencia.',
                icon: BarChart3,
                feature: 'Big Data Público',
                color: 'bg-emerald-600',
              },
              {
                title: 'Soporte Propuestas',
                desc: 'Acceso directo a consultoría senior para planes corporativos personalizados. Soporte vía WhatsApp 24/7 para el plan Enterprise.',
                icon: ShieldCheck,
                feature: 'Consultoría Senior',
                color: 'bg-rose-600',
              },
            ].map((service, i) => (
              <Card
                key={i}
                className="group border-2 border-primary/5 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden flex flex-col h-full"
              >
                <CardHeader className="p-8 pb-4">
                  <div
                    className={`h-14 w-14 rounded-2xl ${service.color} flex items-center justify-center mb-6 shadow-lg group-hover:rotate-12 transition-transform`}
                  >
                    <service.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest">
                      {service.feature}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black text-primary uppercase italic tracking-tight">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 flex-1">
                  <p className="text-muted-foreground leading-relaxed font-medium mb-6 italic">"{service.desc}"</p>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${service.color} w-0 group-hover:w-full transition-all duration-1000`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* RECENT BIDS - SOCIAL PROOF / DATA PROOF */}
        <section className="bg-white rounded-[3rem] p-12 md:p-20 shadow-xl border border-primary/5 space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-primary uppercase italic tracking-tighter flex items-center gap-4">
                <Zap className="h-8 w-8 text-accent animate-pulse" /> Radar de Oportunidades en Vivo
              </h3>
              <p className="text-muted-foreground font-medium italic">Datos reales sincronizados hoy desde la API oficial de Mercado Público.</p>
            </div>
            <Link href={explorationPath}>
              <Button variant="ghost" className="text-primary hover:text-accent font-black text-lg group h-14 uppercase italic gap-2">
                Ver Historial Completo <ChevronRight className="group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isBidsLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => <Card key={i} className="animate-pulse bg-muted/30 h-72 border-none rounded-[2rem]" />)
            ) : bids && bids.length > 0 ? (
              bids.map(bid => (
                <Link key={bid.id} href={user ? `/bids/${bid.id}` : "/login"} className="group">
                  <Card className="h-full border-2 border-transparent hover:border-accent/40 transition-all duration-300 overflow-hidden shadow-md hover:shadow-2xl rounded-[2rem] bg-muted/10">
                    <CardContent className="p-8 flex flex-col h-full space-y-6">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary uppercase">
                          ID: {bid.id}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-[10px] font-black uppercase text-emerald-600">Nuevo</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-black group-hover:text-accent transition-colors line-clamp-2 leading-tight uppercase italic flex-1">
                        {bid.title}
                      </h4>
                      <div className="space-y-3 pt-6 border-t border-primary/5">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold uppercase italic text-[10px]">
                          <Building2 className="h-4 w-4 text-accent" />
                          <span className="truncate">{bid.entity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-muted-foreground/40 tracking-widest">Referencial</span>
                            <span className="text-2xl font-black text-primary italic">
                              {bid.amount > 0
                                ? new Intl.NumberFormat('es-CL', {
                                    style: 'currency',
                                    currency: bid.currency || 'CLP',
                                    maximumFractionDigits: 0,
                                  }).format(bid.amount)
                                : 'Por Definir'}
                            </span>
                          </div>
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-md group-hover:bg-accent group-hover:text-white transition-all">
                            <ChevronRight className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-muted/10 rounded-[3rem] border-4 border-dashed space-y-6">
                <History className="h-16 w-16 text-primary/20 mx-auto" />
                <p className="text-xl text-primary font-black uppercase italic">Base de Datos en Espera</p>
                <Link href={explorationPath}>
                  <Button className="h-14 px-10 bg-primary font-black uppercase italic rounded-2xl">Activar Sincronización Manual</Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* CALL TO ACTION - CONVERSION */}
        <section className="bg-accent rounded-[4rem] p-12 md:p-24 text-center text-white space-y-10 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 opacity-10 -translate-y-1/2 translate-x-1/2 rotate-12 group-hover:rotate-45 transition-transform duration-[5000ms]">
            <Sparkles className="h-[40rem] w-[40rem]" />
          </div>

          <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-center gap-3 mb-8">
              <Badge className="bg-white text-accent font-black">PLAN CORPORATIVO</Badge>
              <Badge variant="outline" className="border-white text-white font-black">
                MULTIUSUARIO
              </Badge>
            </div>
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
              Digitaliza tu <br /> <span className="text-primary-foreground underline decoration-white/20">Equipo de Licitación</span>
            </h2>
            <p className="text-xl md:text-2xl text-accent-foreground/90 max-w-2xl mx-auto font-medium leading-relaxed italic">
              Desde 1,5 UF al mes. Colaboración total, auditorías IA ilimitadas y soporte estratégico senior.
            </p>
            <div className="pt-10 flex flex-wrap justify-center gap-6">
              {!user ? (
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-white text-accent hover:bg-gray-100 font-black h-20 px-16 text-2xl shadow-2xl uppercase italic rounded-3xl transform hover:scale-105 transition-all"
                  >
                    Activar Cuenta Empresa
                  </Button>
                </Link>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-accent hover:bg-gray-100 font-black h-20 px-16 text-2xl shadow-2xl uppercase italic rounded-3xl transform hover:scale-105 transition-all gap-3"
                >
                  <a href={WHATSAPP_URL} target="_blank">
                    <MessageCircle className="h-8 w-8" /> Activar Plan Empresas
                  </a>
                </Button>
              )}
            </div>
            <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-50 pt-8">
              Sin contratos a largo plazo • Cancela cuando quieras
            </p>
          </div>
        </section>

        {/* FINAL TRUST BAR */}
        <div className="flex flex-wrap justify-center items-center gap-16 py-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 px-8">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase italic">
            <ShieldCheck className="h-8 w-8 text-primary" /> Transparencia Ley 19.886
          </div>
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase italic">
            <Building2 className="h-8 w-8 text-primary" /> Mercado Público Partner
          </div>
          <div className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase italic">
            <BrainCircuit className="h-8 w-8 text-primary" /> Google Cloud AI
          </div>
        </div>
      </div>
    </div>
  );
}

function History({className}: {className?: string}) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
