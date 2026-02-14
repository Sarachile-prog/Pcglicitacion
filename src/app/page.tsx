
import { MOCK_BIDS, CATEGORIES } from "@/app/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Search,
  Building2,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const totalAmount = MOCK_BIDS.reduce((acc, bid) => {
    // Basic normalization for display purposes
    return acc + (bid.currency === 'CLP' ? bid.amount / 950 : bid.amount)
  }, 0)

  const activeBids = MOCK_BIDS.filter(b => b.status === 'Abierta').length

  return (
    <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary">Vista General</h2>
        <p className="text-muted-foreground">Panel de control de licitaciones y oportunidades estratégicas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Licitaciones</CardTitle>
            <Briefcase className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{MOCK_BIDS.length}</div>
            <p className="text-xs text-muted-foreground mt-1">+12% desde el mes pasado</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-accent group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Acumulado (USD)</CardTitle>
            <DollarSign className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">~{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Licitaciones activas hoy</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-orange-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cierran Pronto</CardTitle>
            <Clock className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBids}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 7 días</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-teal-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eficiencia</CardTitle>
            <TrendingUp className="h-5 w-5 text-teal-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground mt-1">Tasa de adjudicación estimada</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Licitaciones Recientes
            </h3>
            <Link href="/bids">
              <Button variant="ghost" className="text-accent hover:text-accent/80 font-semibold gap-1">
                Ver Todas <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {MOCK_BIDS.slice(0, 3).map((bid) => (
              <Card key={bid.id} className="overflow-hidden group cursor-pointer hover:border-accent transition-colors">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{bid.category}</Badge>
                      <Badge variant={bid.status === 'Abierta' ? 'default' : 'secondary'} className={bid.status === 'Abierta' ? 'bg-accent text-white' : ''}>
                        {bid.status}
                      </Badge>
                    </div>
                    <h4 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-1">{bid.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {bid.entity}</span>
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Cierra: {bid.deadline}</span>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-6 flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-border min-w-[180px]">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Monto Referencial</span>
                    <span className="text-lg font-black text-primary">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: bid.currency }).format(bid.amount)}
                    </span>
                    <Link href={`/bids/${bid.id}`} className="mt-3 w-full">
                      <Button size="sm" className="w-full bg-primary group-hover:bg-accent transition-colors">Analizar</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
            <Search className="h-5 w-5" />
            Explorar Rubros
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <Button key={category} variant="outline" className="rounded-full hover:border-accent hover:text-accent">
                    {category}
                  </Button>
                ))}
              </div>
              <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h5 className="font-bold text-primary mb-2">Consejo IA</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hemos detectado un incremento del 25% en licitaciones de <span className="text-accent font-bold">Tecnología</span> para el sector público este trimestre. Recomendamos revisar certificaciones de seguridad.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
