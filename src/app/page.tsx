
'use client';

import {useCollection, useMemoFirebase, useFirestore, useUser, useDoc} from '@/firebase';
import {collection, query, orderBy, limit, doc} from 'firebase/firestore';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {
  Briefcase,
  DollarSign,
  ChevronRight,
  Building2,
  Loader2,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
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

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-landing');

  const explorationPath = user ? "/bids" : "/login";

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
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
              Ecosistema 2026
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic uppercase">
              Gana más <br />
              <span className="text-accent">Licitaciones</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-medium leading-relaxed max-w-2xl italic">
              Transformamos los datos de Mercado Público en decisiones estratégicas con IA.
            </p>
            <div className="flex flex-wrap gap-5 pt-4">
              <Link href={explorationPath}>
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-white px-10 h-16 text-xl font-black gap-3 shadow-xl uppercase italic rounded-2xl"
                >
                  Explorar Mercado <ArrowRight />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[
            { title: 'Asesoría IA', desc: 'Analiza bases automáticamente.', icon: Sparkles, color: 'bg-accent' },
            { title: 'Gestión Equipo', desc: 'Colaboración en tiempo real.', icon: Building2, color: 'bg-primary' },
            { title: 'Auditoría PDF', desc: 'Detecta errores antes de ofertar.', icon: FileCheck, color: 'bg-indigo-600' },
          ].map((service, i) => (
            <Card key={i} className="border-2 border-primary/5 shadow-xl rounded-[2rem]">
              <CardHeader className="p-8">
                <div className={`h-14 w-14 rounded-2xl ${service.color} flex items-center justify-center mb-6 text-white`}><service.icon /></div>
                <CardTitle className="text-2xl font-black text-primary uppercase italic">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0"><p className="text-muted-foreground italic">"{service.desc}"</p></CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-12">
          <div className="flex justify-between items-end">
            <h3 className="text-4xl font-black text-primary uppercase italic tracking-tighter">Radar en Vivo</h3>
            <Link href={explorationPath}><Button variant="ghost" className="font-black italic">Ver Todo <ChevronRight /></Button></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isBidsLoading ? (
              <div className="col-span-full text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></div>
            ) : bids?.map(bid => (
              <Link key={bid.id} href={user ? `/bids/${bid.id}` : "/login"}>
                <Card className="hover:shadow-2xl transition-all rounded-[2rem] bg-muted/10">
                  <CardContent className="p-8 space-y-6">
                    <Badge variant="outline" className="text-[10px] font-black uppercase">ID: {bid.id}</Badge>
                    <h4 className="text-xl font-black uppercase italic line-clamp-2">{bid.title}</h4>
                    <div className="pt-6 border-t border-primary/5 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase opacity-60 truncate max-w-[150px]">{bid.entity}</p>
                      <ChevronRight className="text-accent" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
