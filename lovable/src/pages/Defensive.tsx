import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ShieldCheck, AlertTriangle, RefreshCw, Loader2, Link as LinkIcon,
  Activity, Server, Target, CheckCircle2, XCircle, AlertCircle, Eye,
  Play, ShieldAlert, Cpu, Terminal
} from "lucide-react";
import WazuhAlertDetail from "@/components/defensive/WazuhAlertDetail";
import { useToast } from "@/hooks/use-toast";
import type { WazuhAlert, WazuhAgent } from "@/services/wazuhService";
import { formatTimestamp, getSeverityFromLevel, getAgentStatusStyle } from "@/services/wazuhService";

interface AttackLog {
  _id: string;
  timestamp: string;
  attack_name: string;
  module: string;
  attack_id?: string;
}

export default function Defensive() {
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [attacks, setAttacks] = useState<AttackLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  
  const [selectedAlert, setSelectedAlert] = useState<WazuhAlert | null>(null);
  const [onlyCyberShield, setOnlyCyberShield] = useState(true);
  
  const [indexerUrl, setIndexerUrl] = useState("https://10.10.10.49:9200");
  const [managerUrl, setManagerUrl] = useState("https://10.10.10.49:55000");
  const [isConnected, setIsConnected] = useState(false);

  const [agentsError, setAgentsError] = useState("");
  const [alertsError, setAlertsError] = useState("");

  const [correlationStates, setCorrelationStates] = useState<Record<string, "idle" | "loading" | "detected" | "not_detected" | "error">>({});
  const [correlationAlerts, setCorrelationAlerts] = useState<Record<string, WazuhAlert[]>>({});

  const { toast } = useToast();

  const loadData = useCallback(async (showToast = false) => {
    setLoading(true);
    setAgentsError("");
    setAlertsError("");

    let agentsSuccess = false;
    let alertsSuccess = false;

    // 1. Fetch Agents via local proxy
    try {
      const agentsRes = await fetch(`/api/wazuh/agents?managerUrl=${encodeURIComponent(managerUrl)}`);
      const agentsData = await agentsRes.json();
      if (agentsData.success) {
        setAgents(agentsData.agents || []);
        agentsSuccess = true;
      } else {
        setAgentsError(agentsData.error || "No se puede conectar con Wazuh Manager");
      }
    } catch (err) {
      setAgentsError("No se puede conectar con Wazuh Manager");
    }

    // 2. Fetch Alerts via local proxy
    try {
      const alertsRes = await fetch(`/api/wazuh/alerts?indexerUrl=${encodeURIComponent(indexerUrl)}`);
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts || []);
        alertsSuccess = true;
      } else {
        setAlertsError(alertsData.error || "Wazuh no disponible");
      }
    } catch (err) {
      setAlertsError("Wazuh no disponible");
    }

    // 3. Fetch recent attacks from stats
    try {
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setAttacks(statsData.stats.recentOps || []);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }

    const connected = agentsSuccess || alertsSuccess;
    setIsConnected(connected);
    setLoading(false);

    if (showToast) {
      toast({
        title: connected ? "Conexión Establecida" : "Conexión Fallida",
        description: connected 
          ? "Se ha sincronizado con los servicios de Wazuh correctamente." 
          : "No se pudo establecer conexión con Wazuh Indexer o Manager.",
        variant: connected ? "default" : "destructive"
      });
    }
  }, [indexerUrl, managerUrl, toast]);

  useEffect(() => {
    loadData(false);
    // Poll data every 20 seconds
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Verificar correlación para un ataque individual (±5 minutos)
  const handleVerifyCorrelation = async (attack: AttackLog) => {
    const id = attack._id;
    setCorrelationStates(prev => ({ ...prev, [id]: "loading" }));

    try {
      const attackTime = new Date(attack.timestamp).getTime();
      const timestamp_start = new Date(attackTime - 5 * 60 * 1000).toISOString();
      const timestamp_end = new Date(attackTime + 5 * 60 * 1000).toISOString();

      const res = await fetch("/api/wazuh/correlation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_id: id,
          timestamp_start,
          timestamp_end,
          indexerUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.detected) {
          setCorrelationStates(prev => ({ ...prev, [id]: "detected" }));
          setCorrelationAlerts(prev => ({ ...prev, [id]: data.alerts || [] }));
        } else {
          setCorrelationStates(prev => ({ ...prev, [id]: "not_detected" }));
        }
      } else {
        setCorrelationStates(prev => ({ ...prev, [id]: "error" }));
      }
    } catch (err) {
      console.error("Correlation error:", err);
      setCorrelationStates(prev => ({ ...prev, [id]: "error" }));
    }
  };

  // Verificar correlación para todos los ataques del historial
  const handleVerifyAll = async () => {
    setVerifyingAll(true);
    for (const attack of attacks.slice(0, 10)) {
      await handleVerifyCorrelation(attack);
    }
    setVerifyingAll(false);
    toast({
      title: "Verificación de Auditoría Completada",
      description: "Se han correlacionado los ataques recientes con el histórico de Wazuh.",
    });
  };

  // Filtrado de alertas CyberShield
  const filteredAlerts = alerts.filter(alert => {
    if (!onlyCyberShield) return true;
    const rid = Number(alert.rule.id || alert.rule_id);
    return rid >= 100499 && rid <= 100513;
  });

  return (
    <div className="relative space-y-6 select-none font-mono">
      {/* Background matrix mesh overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />
      
      <div className="relative z-10 space-y-6">
        
        {/* CABECERA Y ZONA 1 (Configuración de conexión) */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-black/40 border border-primary/10 rounded-lg p-5 backdrop-blur-xl animate-fade-slide-up">
          <div>
            <h1 className="text-2xl font-bold font-mono text-primary text-glow-green flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary animate-pulse" />
              MÓDULO DEFENSIVO (WAZUH SIEM)
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Visualización de alertas del sistema, auditoría de agentes y correlación cruzada ofensiva/defensiva.
            </p>
          </div>

          {/* ZONA 1 — Configuración de Wazuh */}
          <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Wazuh Indexer URL</Label>
              <Input
                value={indexerUrl}
                onChange={(e) => setIndexerUrl(e.target.value)}
                className="h-8 w-60 text-xs bg-background/60 border-primary/20 focus:border-primary text-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Wazuh Manager URL</Label>
              <Input
                value={managerUrl}
                onChange={(e) => setManagerUrl(e.target.value)}
                className="h-8 w-60 text-xs bg-background/60 border-primary/20 focus:border-primary text-primary"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Button
                onClick={() => loadData(true)}
                disabled={loading}
                className="h-8 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 glow-green font-bold text-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                CONECTAR
              </Button>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-background/60 border border-primary/20 rounded-md px-3 h-8 text-xs select-none">
                <span className="text-[10px] text-muted-foreground">ESTADO:</span>
                {isConnected ? (
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00ff41]" />
                    CONECTADO
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    DESCONECTADO
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* REJILLA DE ZONAS 2 Y 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ZONA 2 — Agentes Wazuh */}
          <Card className="bg-black/60 border border-primary/10 backdrop-blur-xl animate-fade-slide-up [animation-delay:0.1s]">
            <CardHeader className="border-b border-primary/5 pb-4">
              <CardTitle className="text-sm text-primary text-glow-green flex items-center gap-2 uppercase font-mono">
                <Cpu className="w-4 h-4 text-primary" />
                Agentes Wazuh Registrados ({agents.length})
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-mono">
                Lista de endpoints e infraestructura monitorizada por Wazuh Manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 h-[350px] overflow-y-auto">
              {agentsError ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-destructive animate-pulse" />
                  <p className="text-sm font-bold text-destructive font-mono">{agentsError}</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground font-mono">No se encontraron agentes registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-muted-foreground uppercase border-b border-primary/10 pb-2">
                        <th className="py-2">ID</th>
                        <th className="py-2">Nombre</th>
                        <th className="py-2">Estado</th>
                        <th className="py-2">IP</th>
                        <th className="py-2">Keepalive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {agents.map((agent) => {
                        const statusStyle = getAgentStatusStyle(agent.status);
                        return (
                          <tr key={agent.id} className="hover:bg-primary/5 transition-colors">
                            <td className="py-3 font-semibold text-primary/70">{agent.id}</td>
                            <td className="py-3 font-semibold">{agent.name}</td>
                            <td className="py-3">
                              <Badge className={`text-[9px] uppercase tracking-wider font-bold ${statusStyle.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusStyle.dotClass}`} />
                                {statusStyle.label}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">{agent.ip || "N/A"}</td>
                            <td className="py-3 text-muted-foreground text-[10px]">
                              {agent.lastKeepAlive ? formatTimestamp(agent.lastKeepAlive) : "Sin señal"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ZONA 4 — Correlación de ataques (Crítica) */}
          <Card className="bg-black/60 border border-primary/10 backdrop-blur-xl animate-fade-slide-up [animation-delay:0.2s]">
            <CardHeader className="border-b border-primary/5 pb-4 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-sm text-primary text-glow-green flex items-center gap-2 uppercase font-mono">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  Correlación Ofensiva-Defensiva (±5m)
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-mono">
                  Audita el histórico de ataques y verifica su detección en el SIEM.
                </CardDescription>
              </div>
              <Button
                onClick={handleVerifyAll}
                disabled={verifyingAll || attacks.length === 0}
                className="h-7 px-3 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-[10px] font-bold font-mono"
              >
                {verifyingAll ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Play className="w-3 h-3 mr-1.5" />}
                AUDITAR TODO
              </Button>
            </CardHeader>
            <CardContent className="pt-4 h-[350px] overflow-y-auto">
              {attacks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-xs text-muted-foreground font-mono">No hay logs de ataques lanzados para correlacionar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attacks.slice(0, 10).map((attack) => {
                    const status = correlationStates[attack._id] || "idle";
                    const alertsFound = correlationAlerts[attack._id] || [];

                    return (
                      <div
                        key={attack._id}
                        className={`p-3 border rounded-lg transition-all ${
                          status === "detected" 
                            ? "bg-primary/5 border-primary/30" 
                            : status === "not_detected" 
                            ? "bg-warning/5 border-warning/30" 
                            : status === "error" 
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-background/20 border-primary/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{attack.attack_name || attack.attack_id}</span>
                              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary/70 uppercase">
                                {attack.module}
                              </Badge>
                            </div>
                            <span className="text-[9px] text-muted-foreground block mt-1">
                              Ejecutado: {formatTimestamp(attack.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {status === "idle" && (
                              <Button
                                onClick={() => handleVerifyCorrelation(attack)}
                                className="h-6 px-2 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-bold border border-primary/20"
                              >
                                Verificar
                              </Button>
                            )}

                            {status === "loading" && (
                              <Badge className="bg-primary/10 text-primary border border-primary/30 text-[9px] font-bold animate-pulse">
                                <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                BUSCANDO...
                              </Badge>
                            )}

                            {status === "detected" && (
                              <Badge className="bg-primary/20 text-primary border border-primary/60 text-[9px] font-bold glow-green">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-primary" />
                                ✅ DETECTADO ({alertsFound.length})
                              </Badge>
                            )}

                            {status === "not_detected" && (
                              <Badge className="bg-warning/20 text-warning border border-warning/60 text-[9px] font-bold">
                                <AlertTriangle className="w-2.5 h-2.5 mr-1 text-warning" />
                                ⚠️ NO DETECTADO
                              </Badge>
                            )}

                            {status === "error" && (
                              <Badge className="bg-destructive/20 text-destructive border border-destructive/60 text-[9px] font-bold">
                                <XCircle className="w-2.5 h-2.5 mr-1 text-destructive" />
                                ❌ ERROR SIEM
                              </Badge>
                            )}
                          </div>
                        </div>

                        {status === "detected" && alertsFound.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-primary/10 space-y-1.5">
                            <span className="text-[9px] text-primary/70 uppercase tracking-widest font-bold block">Alertas SIEM Correlacionadas:</span>
                            {alertsFound.slice(0, 2).map((alert, index) => (
                              <div
                                key={index}
                                onClick={() => setSelectedAlert(alert)}
                                className="text-[10px] bg-black/40 border border-primary/10 hover:border-primary/30 transition-all rounded p-2 flex justify-between items-center cursor-pointer hover:scale-[1.01]"
                              >
                                <span className="text-foreground font-medium truncate max-w-[320px]">
                                  {alert.rule?.description || alert.rule_description}
                                </span>
                                <Badge variant="outline" className="text-[8px] border-primary/25 text-primary scale-90">
                                  Lvl {alert.rule?.level ?? alert.level}
                                </Badge>
                              </div>
                            ))}
                            {alertsFound.length > 2 && (
                              <span className="text-[9px] text-muted-foreground block text-right">
                                + {alertsFound.length - 2} alertas más
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ZONA 3 — Alertas Recientes (Últimas 24h) */}
        <Card className="bg-black/60 border border-primary/10 backdrop-blur-xl animate-fade-slide-up [animation-delay:0.3s]">
          <CardHeader className="border-b border-primary/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm text-primary text-glow-green flex items-center gap-2 uppercase font-mono">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Alertas Recientes en Wazuh Indexer (24 Horas)
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-mono">
                Cola en tiempo real de eventos detectados. Haz clic en una alerta para desplegar el visor de metadatos.
              </CardDescription>
            </div>
            
            {/* Filtro Checkbox */}
            <div className="flex items-center space-x-2 bg-background/40 border border-primary/10 rounded-md px-3 py-1.5 self-start md:self-auto">
              <Checkbox
                id="filter-cybershield"
                checked={onlyCyberShield}
                onCheckedChange={(checked) => setOnlyCyberShield(!!checked)}
                className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:text-black"
              />
              <label
                htmlFor="filter-cybershield"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer select-none font-bold uppercase tracking-wider"
              >
                Solo alertas de CyberShield (100499 - 100513)
              </label>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[420px] overflow-y-auto">
            {alertsError ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-destructive animate-pulse" />
                <p className="text-sm font-bold text-destructive font-mono">{alertsError}</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Terminal className="w-8 h-8 text-muted-foreground/30 mb-2 animate-pulse" />
                <p className="text-xs text-muted-foreground font-mono">No hay alertas de CyberShield en las últimas 24 horas.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAlerts.map((alert) => {
                  const severity = getSeverityFromLevel(alert.rule?.level ?? alert.level ?? 3);
                  return (
                    <div
                      key={alert._id || alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background/30 border border-primary/10 hover:border-primary/30 transition-all duration-200 rounded-md cursor-pointer hover:scale-[1.005] relative overflow-hidden"
                    >
                      {/* Left glowing border on hover */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-200" />
                      
                      <div className="space-y-1 flex-1 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                          <Badge variant="outline" className="text-[9px] border-primary/20 text-primary/70">
                            Regla: {alert.rule?.id || alert.rule_id}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {alert.rule?.description || alert.rule_description}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span>Agente: {alert.agent?.name || alert.agent_name}</span>
                          <span>|</span>
                          <span>MITRE ID: {alert.rule?.mitre?.id?.[0] || alert.mitre_id || "N/A"}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 sm:mt-0 flex items-center gap-3 shrink-0">
                        <Badge className={`text-[10px] font-bold ${severity.badgeClass}`}>
                          LEVEL {alert.rule?.level ?? alert.level} — {severity.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DETALLE LATERAL VISOR DE ALERTA */}
        {selectedAlert && (
          <WazuhAlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
        
      </div>
    </div>
  );
}
