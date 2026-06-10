import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Bug, Flame, Clock, CheckCircle, TrendingUp, Activity as ActivityIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Activity = {
  id: number;
  type: string;
  target: string;
  status: string;
  severity: string;
  time: string;
};

type Stats = {
  score: number;
  vulnerabilities: { total: number; critical: number; high: number };
  firewalls: { active: number; status: string };
  lastScan: string;
  improvement: string;
  usersCount: number;
};



const severityColor: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-neon-red/20 text-neon-red border border-neon-red/30",
  warning: "bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30",
  info: "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30",
};

const trendData = [
  { time: "00:00", alerts: 2 },
  { time: "04:00", alerts: 5 },
  { time: "08:00", alerts: 12 },
  { time: "12:00", alerts: 4 },
  { time: "16:00", alerts: 7 },
  { time: "20:00", alerts: 18 },
  { time: "24:00", alerts: 3 },
];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo cargar");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setActivity(data.activity);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error de sincronización",
        description: "No se pudieron cargar los datos del servidor.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Auto-refresh 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0" style={{ backgroundImage: "url('/images/servers.png')" }} />
      <div className="space-y-6 relative z-10">
      <div>
        <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider">
          PANEL DE CONTROL
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Resumen general del estado de seguridad
        </p>
      </div>

      {/* Security Score + Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Score */}
        <Card className="border-primary/20 bg-card/80 glow-green col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeDasharray={`${(stats?.score || 0) * 2.51} ${100 * 2.51}`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_hsl(var(--primary))]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono text-primary text-glow-green">{stats?.score || "--"}</span>
                <span className="text-[10px] text-muted-foreground font-mono">/100</span>
              </div>
            </div>
            <p className="mt-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">Score Seguridad</p>
          </CardContent>
        </Card>

        {/* Vulnerabilities */}
        <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Bug className="w-8 h-8 text-neon-red" />
              <span className="text-3xl font-bold font-mono text-foreground">{stats?.vulnerabilities?.total || 0}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Vulnerabilidades</p>
            <div className="flex gap-1 mt-2">
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] font-mono">{stats?.vulnerabilities?.critical || 0} Críticas</Badge>
              <Badge className="bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30 text-[10px] font-mono">{stats?.vulnerabilities?.high || 0} Altas</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Active Firewalls */}
        <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Flame className="w-8 h-8 text-neon-cyan" />
              <span className="text-3xl font-bold font-mono text-foreground">{stats?.firewalls?.active || 0}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Firewalls Activos</p>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle className="w-3 h-3 text-neon-green" />
              <span className="text-[10px] font-mono text-neon-green">{stats?.firewalls?.status || "Desconocido"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Last Scan */}
        <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-neon-purple" />
              <span className="text-lg font-bold font-mono text-foreground">{stats?.lastScan || "--"}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Último Escaneo</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-neon-green" />
              <span className="text-[10px] font-mono text-neon-green">{stats?.improvement || "--"} mejorado</span>
            </div>
          </CardContent>
        </Card>
      </div>



        {/* Trend Graph using Recharts */}
        <Card className="border-primary/10 bg-card/60 col-span-1 lg:col-span-4 mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-neon-cyan" />
              Tendencia de Alertas (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      {/* Recent Activity Table */}
      <Card className="border-primary/10 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Tipo</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Objetivo</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Estado</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Severidad</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Tiempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((item) => (
                <TableRow key={item.id} className="border-border/20 hover:bg-primary/5">
                  <TableCell className="font-mono text-xs">
                    {item.type === "scan" ? (
                      <span className="text-neon-cyan">SCAN</span>
                    ) : (
                      <span className="text-neon-red">ALERT</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">{item.target}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`font-mono text-[10px] ${severityColor[item.severity]}`}>
                      {item.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Dashboard;
