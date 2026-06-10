import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertTriangle, RefreshCw, Loader2, Activity, Link as LinkIcon } from "lucide-react";
import WazuhAlertDetail from "@/components/defensive/WazuhAlertDetail";

const WEBHOOK_WAZUH_URL = "http://localhost:5678/webhook/wazuh-alerts";
const REPORTS_LIST_URL = "http://localhost:3010/reports/list";

// Interfaces
interface WazuhAlert {
  _id?: string;
  timestamp: string;
  rule: { id: string; level: number; description: string; groups?: string[] };
  agent?: { id: string; name: string; ip: string };
  full_log?: string;
  location?: string;
}

interface AttackReport {
  filename: string;
  date: string;
  attackType: string;
  target?: string;
}

interface CorrelatedEvent {
  attack: AttackReport;
  alerts: WazuhAlert[];
}

export default function Defensive() {
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [reports, setReports] = useState<AttackReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<WazuhAlert | null>(null);
  const [minLevel, setMinLevel] = useState("0");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Alerts via n8n Proxy
      const alertsRes = await fetch(WEBHOOK_WAZUH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minLevel: Number(minLevel) })
      }).catch(() => null);

      if (alertsRes && alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }

      // 2. Fetch recent attacks from MongoDB via report-server
      const reportsRes = await fetch(REPORTS_LIST_URL).catch(() => null);
      if (reportsRes && reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [minLevel]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Correlate: Find alerts within 5 minutes of an attack
  const correlations: CorrelatedEvent[] = reports.map(attack => {
    const attackTime = new Date(attack.date).getTime();
    const correlatedAlerts = alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const diffMs = Math.abs(alertTime - attackTime);
      return diffMs <= 5 * 60 * 1000; // 5 mins window
    });
    return { attack, alerts: correlatedAlerts };
  }).filter(c => c.alerts.length > 0);

  const getSeverityStyle = (level: number) => {
    if (level >= 12) return "bg-red-500/20 text-red-500 border-red-500/30";
    if (level >= 8) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (level >= 4) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-neon-cyan flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> WAZUH SIEM (Vía n8n Proxy)
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">Pooling de alertas y correlación automática de ataques.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL DE CORRELACIÓN */}
        <Card className="border-neon-cyan/20 bg-card/40">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-neon-cyan uppercase flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Correlación Ataque ↔ Alerta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {correlations.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono">No se encontraron correlaciones recientes (ventana de 5 min).</p>
            ) : (
              correlations.map((corr, i) => (
                <div key={i} className="p-3 border border-neon-cyan/30 bg-neon-cyan/5 rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-foreground">{corr.attack.attackType}</p>
                    <Badge variant="outline" className="text-[10px] text-neon-cyan border-neon-cyan">DETECTADO</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{new Date(corr.attack.date).toLocaleString()}</p>
                  <div className="space-y-2">
                    {corr.alerts.slice(0, 3).map((a, j) => (
                      <div key={j} className="text-xs font-mono bg-background/50 p-2 rounded flex justify-between border-l-2 border-red-500">
                        <span className="truncate pr-2">{a.rule.description}</span>
                        <span className="text-red-500 shrink-0">Lvl {a.rule.level}</span>
                      </div>
                    ))}
                    {corr.alerts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground mt-1">+ {corr.alerts.length - 3} alertas más...</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* PANEL DE ALERTAS CRUDAS */}
        <Card className="border-neon-cyan/20 bg-card/40 flex flex-col h-[600px]">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle className="text-sm font-mono text-neon-cyan uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Últimas Alertas
            </CardTitle>
            <div className="flex gap-2">
              <Input 
                type="number" 
                value={minLevel} 
                onChange={(e) => setMinLevel(e.target.value)} 
                className="w-20 h-8 text-xs font-mono" 
                placeholder="Min Lvl"
                title="Nivel mínimo"
              />
              <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="h-8">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono text-center mt-10">No hay alertas. Verifica n8n y Wazuh.</p>
            ) : (
              alerts.map((alert, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAlert(alert as any)}
                  className="w-full text-left p-3 rounded-md bg-background/40 border border-border/30 hover:border-neon-cyan/30 transition-all flex flex-col gap-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</span>
                    <Badge className={`text-[10px] ${getSeverityStyle(alert.rule.level)}`}>Lvl {alert.rule.level}</Badge>
                  </div>
                  <p className="text-sm font-mono truncate">{alert.rule.description}</p>
                  {alert.agent && <p className="text-[10px] text-muted-foreground">Agent: {alert.agent.name} ({alert.agent.ip})</p>}
                </button>
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
