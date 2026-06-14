import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Target, Server, Activity as ActivityIcon, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

type Stats = {
  totalTemplates: number;
  totalAttacks: number;
  todayAttacks: number;
  lastAttack: { name: string; timestamp: string } | null;
  attacksByModule: { _id: string; count: number }[];
  recentOps: any[];
};

type Health = {
  mongodb: boolean;
  n8n: boolean;
  kali: boolean;
  wazuh: boolean;
};

const severityColor: Record<number, string> = {
  12: "bg-destructive text-destructive-foreground",
  10: "bg-neon-red/20 text-neon-red border border-neon-red/30",
  8: "bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/30",
  4: "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30",
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [statsRes, healthRes, alertsRes] = await Promise.all([
        fetch("/api/stats").catch(() => null),
        fetch("/api/health").catch(() => null),
        fetch("/api/wazuh/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minLevel: 12 })
        }).catch(() => null)
      ]);

      if (statsRes?.ok) {
        const data = await statsRes.json();
        if (data.success) setStats(data.stats);
      }

      if (healthRes?.ok) {
        const data = await healthRes.json();
        if (data.success) setHealth(data.services);
      }

      if (alertsRes?.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error de sincronización",
        description: "No se pudieron cargar los datos del servidor.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const chartData = (stats?.attacksByModule || []).map(m => ({
    name: m._id,
    ataques: m.count
  }));

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

        {/* Panel 1 — KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-card/80 glow-green">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Target className="w-8 h-8 text-neon-cyan" />
                <span className="text-3xl font-bold font-mono text-foreground">{stats?.todayAttacks || 0} / {stats?.totalAttacks || 0}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Ataques Hoy / Total</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <ActivityIcon className="w-8 h-8 text-neon-purple" />
                <span className="text-lg font-bold font-mono text-foreground truncate max-w-[120px] text-right">
                  {stats?.lastAttack?.name || "--"}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider flex justify-between">
                <span>Último Ataque</span>
                <span>{stats?.lastAttack?.timestamp ? new Date(stats?.lastAttack.timestamp).toLocaleTimeString() : ""}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Shield className="w-8 h-8 text-neon-green" />
                <span className="text-3xl font-bold font-mono text-foreground">{stats?.totalTemplates || 0}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Módulos Disponibles</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/60 hover:glow-green transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-8 h-8 text-neon-red" />
                <span className="text-3xl font-bold font-mono text-foreground">{alerts.length}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Alertas Críticas (24h)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel 2 — Gráfico de ataques por módulo */}
          <Card className="border-primary/10 bg-card/60 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-neon-cyan" />
                Ataques por Módulo (Últimos 7 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground font-mono text-sm">Sin operaciones registradas. Lanza tu primer ataque.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Bar dataKey="ataques" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Panel 5 — Estado del sistema */}
          <Card className="border-primary/10 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-neon-purple" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Kali SSH", status: health?.kali },
                  { name: "Wazuh", status: health?.wazuh },
                  { name: "MongoDB", status: health?.mongodb },
                  { name: "n8n", status: health?.n8n }
                ].map((s) => (
                  <div key={s.name} className="flex justify-between items-center p-2 border border-border/30 rounded-md bg-background/50">
                    <span className="font-mono text-sm">{s.name}</span>
                    {s.status === undefined ? (
                      <Badge variant="outline" className="text-[10px]">VERIFICANDO</Badge>
                    ) : s.status ? (
                      <div className="flex items-center gap-1 text-neon-green">
                        <CheckCircle className="w-4 h-4" /> <span className="font-mono text-[10px]">ONLINE</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-neon-red">
                        <XCircle className="w-4 h-4" /> <span className="font-mono text-[10px]">OFFLINE</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel 3 — Tabla últimas operaciones */}
        <Card className="border-primary/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Últimas 5 Operaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentOps?.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm p-4 text-center border border-dashed border-border/50 rounded">
                Sin operaciones registradas. Lanza tu primer ataque.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Ataque</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Parámetros</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Exit Code</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.recentOps?.map((op) => (
                    <TableRow key={op._id} className="border-border/20 hover:bg-primary/5">
                      <TableCell className="font-mono text-xs text-muted-foreground">{new Date(op.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground font-bold">{op.attack_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {JSON.stringify(op.parameters)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[10px] ${op.ssh_exit_code === 0 ? "text-neon-green border-neon-green/30" : "text-neon-red border-neon-red/30"}`}>
                          {op.ssh_exit_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {op.pdf_url ? (
                          <a href={op.pdf_url} target="_blank" rel="noreferrer" className="text-neon-cyan hover:underline font-mono text-xs">
                            Ver PDF
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Panel 4 — Últimas alertas Wazuh */}
        <Card className="border-primary/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-neon-cyan" />
              Últimas 5 Alertas Wazuh (Críticas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm p-4 text-center border border-dashed border-border/50 rounded">
                No hay alertas críticas recientes.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Nivel</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Regla</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Descripción</TableHead>
                    <TableHead className="font-mono text-[10px] uppercase text-muted-foreground">Agente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a, i) => (
                    <TableRow key={i} className="border-border/20 hover:bg-primary/5">
                      <TableCell className="font-mono text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`font-mono text-[10px] ${a.rule.level >= 12 ? 'bg-destructive text-destructive-foreground' : a.rule.level >= 6 ? 'bg-neon-yellow/20 text-neon-yellow' : 'bg-neon-green/20 text-neon-green'}`}>
                          Lvl {a.rule.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.rule.id}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{a.rule.description}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.agent?.name || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
