import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertTriangle, RefreshCw, Loader2, Link as LinkIcon, Activity, Server, Target } from "lucide-react";
import WazuhAlertDetail from "@/components/defensive/WazuhAlertDetail";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface WazuhAlert {
  _id?: string;
  timestamp: string;
  rule: { id: string; level: number; description: string; groups?: string[] };
  agent?: { id: string; name: string; ip: string };
  full_log?: string;
  location?: string;
}

interface AttackLog {
  _id: string;
  timestamp: string;
  attack_name: string;
  module: string;
}

interface CorrelatedEvent {
  attack: AttackLog;
  alerts: WazuhAlert[];
}

export default function Defensive() {
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [attacks, setAttacks] = useState<AttackLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<WazuhAlert | null>(null);
  const [minLevel, setMinLevel] = useState("0");
  
  const [indexerUrl, setIndexerUrl] = useState("https://10.10.10.145:9200");
  const [managerUrl, setManagerUrl] = useState("https://10.10.10.145:55000");

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Alerts via local proxy
      const alertsRes = await fetch("/api/wazuh/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minLevel: Number(minLevel), indexerUrl, managerUrl })
      }).catch(() => null);

      if (alertsRes && alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      // 2. Fetch recent attacks from stats
      const statsRes = await fetch("/api/stats").catch(() => null);
      if (statsRes && statsRes.ok) {
        const data = await statsRes.json();
        if (data.success) {
          setAttacks(data.stats.recentOps || []);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el backend o Wazuh.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [minLevel, indexerUrl, managerUrl, toast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Correlación: Ataques vs Alertas en ventana de +- 5 min
  const correlations: CorrelatedEvent[] = attacks.map(attack => {
    const attackTime = new Date(attack.timestamp).getTime();
    const correlatedAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const diffMs = Math.abs(alertTime - attackTime);
      return diffMs <= 5 * 60 * 1000; // 5 mins
    });
    return { attack, alerts: correlatedAlerts };
  });

  const getSeverityStyle = (level: number) => {
    if (level >= 12) return "bg-red-500/20 text-red-500 border-red-500/30";
    if (level >= 8) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (level >= 4) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  };

  // Preparar datos para el gráfico
  const chartData = [...alerts].reverse().reduce((acc: any[], alert) => {
    const time = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existing = acc.find(item => item.time === time);
    if (existing) {
      if (alert.rule.level >= 12) existing.critical = (existing.critical || 0) + 1;
      else if (alert.rule.level >= 8) existing.high = (existing.high || 0) + 1;
      else existing.low = (existing.low || 0) + 1;
    } else {
      acc.push({
        time,
        critical: alert.rule.level >= 12 ? 1 : 0,
        high: (alert.rule.level >= 8 && alert.rule.level < 12) ? 1 : 0,
        low: alert.rule.level < 8 ? 1 : 0,
      });
    }
    return acc;
  }, []);

  // KPIs
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.rule.level >= 12).length;
  const activeAgents = new Set(alerts.map(a => a.agent?.id).filter(Boolean)).size;
  const ruleCounts = alerts.reduce((acc: Record<string, number>, a) => {
    acc[a.rule.id] = (acc[a.rule.id] || 0) + 1;
    return acc;
  }, {});
  const topRuleId = Object.keys(ruleCounts).sort((a, b) => ruleCounts[b] - ruleCounts[a])[0];
  const topRule = alerts.find(a => a.rule.id === topRuleId)?.rule.description || "N/A";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-neon-cyan flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> WAZUH SIEM DASHBOARD
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Pooling de alertas y correlación automática de ataques.</p>
        </div>
        
        {/* Zonas Configurables de Conexión */}
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-mono">Indexer URL</Label>
            <Input 
              value={indexerUrl} 
              onChange={(e) => setIndexerUrl(e.target.value)} 
              className="h-8 w-64 font-mono text-xs" 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-mono">Manager URL</Label>
            <Input 
              value={managerUrl} 
              onChange={(e) => setManagerUrl(e.target.value)} 
              className="h-8 w-64 font-mono text-xs" 
            />
          </div>
          <Button onClick={loadData} disabled={loading} className="h-8 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 border border-neon-cyan/50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Conectar
          </Button>
        </div>
      </div>

      {/* Fila 1 — KPIs Wazuh */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-neon-cyan/20 bg-card/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Activity className="w-8 h-8 text-neon-cyan" />
              <span className="text-3xl font-bold font-mono">{totalAlerts}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Total Alertas (24h)</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-card/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <span className="text-3xl font-bold font-mono text-red-500">{criticalAlerts}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Alertas Críticas</p>
          </CardContent>
        </Card>
        <Card className="border-neon-purple/20 bg-card/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Server className="w-8 h-8 text-neon-purple" />
              <span className="text-3xl font-bold font-mono text-neon-purple">{activeAgents}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">Agentes Activos</p>
          </CardContent>
        </Card>
        <Card className="border-neon-yellow/20 bg-card/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Target className="w-8 h-8 text-neon-yellow" />
              <span className="text-sm font-bold font-mono text-neon-yellow text-right truncate max-w-[100px]">{topRuleId || "--"}</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider truncate" title={topRule}>
              Regla Top: {topRule}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fila 2 — Gráfico de alertas */}
      <Card className="border-neon-cyan/20 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-neon-cyan uppercase flex items-center gap-2">
            <Activity className="w-4 h-4" /> Tendencia de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground font-mono text-sm">Sin datos para graficar.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={false} name="Críticas" />
                <Line type="monotone" dataKey="high" stroke="#eab308" strokeWidth={2} dot={false} name="Altas" />
                <Line type="monotone" dataKey="low" stroke="#06b6d4" strokeWidth={2} dot={false} name="Bajas/Medias" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fila 3 — Tabla de Alertas con cursor */}
        <Card className="border-neon-cyan/20 bg-card/40 flex flex-col h-[500px]">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-mono text-neon-cyan uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alertas (Últimas 50)
            </CardTitle>
            <div className="flex gap-2 items-center">
              <Label className="text-xs text-muted-foreground font-mono">Min Lvl</Label>
              <Input 
                type="number" 
                value={minLevel} 
                onChange={(e) => setMinLevel(e.target.value)} 
                className="w-16 h-8 text-xs font-mono" 
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono text-center mt-10">No hay alertas. Verifica n8n y Wazuh.</p>
            ) : (
              alerts.slice(0, 50).map((alert, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAlert(alert)}
                  className="w-full text-left p-3 rounded-md bg-background/40 border border-border/30 hover:border-neon-cyan/30 transition-all flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</span>
                    <Badge className={`text-[10px] ${getSeverityStyle(alert.rule.level)}`}>Lvl {alert.rule.level}</Badge>
                  </div>
                  <p className="text-sm font-mono truncate text-foreground">{alert.rule.description}</p>
                  {alert.agent && <p className="text-[10px] text-muted-foreground">Agente: {alert.agent.name} ({alert.agent.ip}) | Regla: {alert.rule.id}</p>}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Fila 4 — Correlación Ataque <-> Alerta */}
        <Card className="border-neon-cyan/20 bg-card/40 h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-neon-cyan uppercase flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Correlación Ataque ↔ Alerta (±5min)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 pr-2">
            {correlations.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono text-center mt-10">No hay ataques recientes para correlacionar.</p>
            ) : (
              correlations.map((corr, i) => (
                <div key={i} className={`p-3 border rounded-md ${corr.alerts.length > 0 ? 'border-neon-green/30 bg-neon-green/5' : 'border-neon-red/30 bg-neon-red/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground font-mono">{corr.attack.attack_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(corr.attack.timestamp).toLocaleString()}</p>
                    </div>
                    {corr.alerts.length > 0 ? (
                      <Badge variant="outline" className="text-[10px] text-neon-green border-neon-green">✅ DETECTADO</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-neon-red border-neon-red">⚠️ NO DETECTADO</Badge>
                    )}
                  </div>
                  {corr.alerts.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {corr.alerts.slice(0, 3).map((a, j) => (
                        <div key={j} className="text-xs font-mono bg-background/50 p-2 rounded flex justify-between border-l-2 border-neon-cyan">
                          <span className="truncate pr-2">{a.rule.description}</span>
                          <span className={`shrink-0 ${a.rule.level >= 12 ? 'text-red-500' : 'text-neon-cyan'}`}>Lvl {a.rule.level}</span>
                        </div>
                      ))}
                      {corr.alerts.length > 3 && (
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">+ {corr.alerts.length - 3} alertas más</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {selectedAlert && (
        <WazuhAlertDetail alert={selectedAlert as any} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
}
