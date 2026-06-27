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
  Play, ShieldAlert, Cpu, Terminal,
  Shield, Bug, FileSearch, Crosshair, GitBranch, CreditCard, Lock,
  Network, Zap, Key, ArrowUpCircle
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
  const [alertFilterType, setAlertFilterType] = useState<"cybershield" | "wazuh" | "all">("cybershield");
  
  const [indexerUrlInput, setIndexerUrlInput] = useState(() => localStorage.getItem("wazuh_indexer_url") || "");
  const [managerUrlInput, setManagerUrlInput] = useState(() => localStorage.getItem("wazuh_manager_url") || "");
  
  const [activeIndexerUrl, setActiveIndexerUrl] = useState(() => localStorage.getItem("wazuh_indexer_url") || "");
  const [activeManagerUrl, setActiveManagerUrl] = useState(() => localStorage.getItem("wazuh_manager_url") || "");
  const [isConnected, setIsConnected] = useState(() => localStorage.getItem("wazuh_connected") === "true");

  const [agentsError, setAgentsError] = useState("");
  const [alertsError, setAlertsError] = useState("");

  const [correlationStates, setCorrelationStates] = useState<Record<string, "idle" | "loading" | "detected" | "not_detected" | "error">>({});
  const [correlationAlerts, setCorrelationAlerts] = useState<Record<string, WazuhAlert[]>>({});

  const { toast } = useToast();

  const loadData = useCallback(async (
    showToast = false, 
    indexerToUse = activeIndexerUrl, 
    managerToUse = activeManagerUrl, 
    filterToUse = alertFilterType
  ) => {
    setLoading(true);
    setAgentsError("");
    setAlertsError("");

    const resolvedIndexer = indexerToUse.trim();
    const resolvedManager = managerToUse.trim();

    let agentsSuccess = false;
    let alertsSuccess = false;

    // 1. Fetch Agents via local proxy
    try {
      const urlParam = resolvedManager ? `?managerUrl=${encodeURIComponent(resolvedManager)}` : "";
      const agentsRes = await fetch(`/api/wazuh/agents${urlParam}`);
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
      const indexerParam = resolvedIndexer ? `indexerUrl=${encodeURIComponent(resolvedIndexer)}` : "";
      const filterParam = `filterType=${filterToUse}`;
      const queryParams = [indexerParam, filterParam].filter(Boolean).join("&");
      
      const alertsRes = await fetch(`/api/wazuh/alerts?${queryParams}`);
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
    localStorage.setItem("wazuh_connected", connected ? "true" : "false");
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
  }, [activeIndexerUrl, activeManagerUrl, alertFilterType, toast]);

  useEffect(() => {
    loadData(false);
    // Poll data every 20 seconds
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleConnect = async () => {
    setActiveIndexerUrl(indexerUrlInput);
    setActiveManagerUrl(managerUrlInput);
    
    localStorage.setItem("wazuh_indexer_url", indexerUrlInput);
    localStorage.setItem("wazuh_manager_url", managerUrlInput);
    
    await loadData(true, indexerUrlInput, managerUrlInput);
  };

  // Verificar correlación para un ataque individual (±5 minutos)
  const handleVerifyCorrelation = async (attack: AttackLog) => {
    const id = attack._id;
    setCorrelationStates(prev => ({ ...prev, [id]: "loading" }));

    const resolvedIndexer = activeIndexerUrl.trim();

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
          indexerUrl: resolvedIndexer
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

  // El filtrado de alertas ahora se gestiona directamente en el servidor proxy
  const filteredAlerts = alerts;

  const criticalCount = alerts.filter(a => (a.rule?.level ?? 0) >= 15).length;
  const highCount = alerts.filter(a => {
    const lvl = a.rule?.level ?? 0;
    return lvl >= 12 && lvl <= 14;
  }).length;
  const mediumCount = alerts.filter(a => {
    const lvl = a.rule?.level ?? 0;
    return lvl >= 7 && lvl <= 11;
  }).length;
  const lowCount = alerts.filter(a => {
    const lvl = a.rule?.level ?? 0;
    return lvl >= 0 && lvl <= 6;
  }).length;

  const activeAgents = agents.filter(a => a.status === "active").length;

  return (
    <div className="relative space-y-6 select-none font-sans pb-10">
      {/* Background broken shield watermark */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-center opacity-[0.035] pointer-events-none z-0 animate-shield-fracture" 
        style={{ 
          backgroundImage: "url('/images/broken-shield.png')",
          backgroundSize: "600px",
          backgroundPosition: "center 50%"
        }} 
      />
      
      <div className="relative z-10 space-y-6">
        
        {/* CABECERA Y CONFIGURACIÓN DE CONEXIÓN */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card/60 border border-border/80 rounded-lg p-5 backdrop-blur-xl animate-fade-slide-up">
          <div>
            <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary animate-pulse" />
              MÓDULO DEFENSIVO (WAZUH SIEM)
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Visualización de alertas del sistema, auditoría de agentes y correlación cruzada ofensiva/defensiva.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Wazuh Indexer URL</Label>
              <Input
                placeholder="https://<IP_WAZUH_INDEXER>:9200"
                value={indexerUrlInput}
                onChange={(e) => setIndexerUrlInput(e.target.value)}
                className="h-8 w-60 text-xs bg-background/60 border-border focus:border-primary text-foreground font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Wazuh Manager URL</Label>
              <Input
                placeholder="https://<IP_WAZUH_MANAGER>:55000"
                value={managerUrlInput}
                onChange={(e) => setManagerUrlInput(e.target.value)}
                className="h-8 w-60 text-xs bg-background/60 border-border focus:border-primary text-foreground font-mono"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-bold text-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                CONECTAR
              </Button>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-background/60 border border-border rounded-md px-3 h-8 text-xs select-none">
                <span className="text-[9px] text-muted-foreground font-bold">ESTADO:</span>
                {isConnected ? (
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold flex items-center gap-1.5 px-2 py-0.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
                    CONECTADO
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px] font-bold flex items-center gap-1.5 px-2 py-0.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                    DESCONECTADO
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* GUÍA DE CONEXIÓN / AYUDA */}
        <Card className="bg-card/30 border border-border/40 p-4 backdrop-blur-md animate-fade-slide-up">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-md shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Guía de Conexión SIEM (Wazuh)</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Para vincular tu entorno de auditoría defensiva, introduce las direcciones HTTPS correspondientes. Si dejas los campos en blanco, la plataforma utilizará automáticamente las variables de entorno preconfiguradas del servidor proxy.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 mt-2 border-t border-border/20 text-[10px] font-mono leading-relaxed">
                <div>
                  <strong className="text-primary uppercase block mb-1">🔗 Servidor Indexador (Wazuh Indexer):</strong>
                  <p className="text-zinc-500">
                    Introduce la URL HTTPS completa del indexador de Wazuh. Por ejemplo: <code className="text-foreground">https://&lt;DIRECCION_IP&gt;:9200</code>.
                  </p>
                </div>
                <div>
                  <strong className="text-primary uppercase block mb-1">💻 API del Administrador (Wazuh Manager):</strong>
                  <p className="text-zinc-500">
                    Introduce la URL HTTPS completa de la API del administrador. Por ejemplo: <code className="text-foreground">https://&lt;DIRECCION_IP&gt;:55000</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* FILA DE METRICAS DE WAZUH - ESTILO REAL */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-slide-up">
          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Agentes Activos</span>
              <span className="text-3xl font-extrabold text-primary">{activeAgents} / {agents.length}</span>
              <span className="text-[9px] text-muted-foreground block mt-1">Conectados a Wazuh</span>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Critical severity</span>
              <span className="text-3xl font-extrabold text-destructive text-glow-red">{criticalCount}</span>
              <span className="text-[9px] text-muted-foreground block mt-1">Nivel 15 o superior</span>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">High severity</span>
              <span className="text-3xl font-extrabold text-orange-500">{highCount}</span>
              <span className="text-[9px] text-muted-foreground block mt-1">Niveles 12 a 14</span>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Medium severity</span>
              <span className="text-3xl font-extrabold text-secondary">{mediumCount}</span>
              <span className="text-[9px] text-muted-foreground block mt-1">Niveles 7 a 11</span>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl col-span-2 md:col-span-1">
            <CardContent className="p-4 text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Low severity</span>
              <span className="text-3xl font-extrabold text-emerald-500">{lowCount}</span>
              <span className="text-[9px] text-muted-foreground block mt-1">Niveles 0 a 6</span>
            </CardContent>
          </Card>
        </div>

        {/* REJILLA BENTO - COMPACTA */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
          
          {/* COLUMNA 1: Agentes y Módulos */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Agentes Wazuh */}
            <Card className="bg-card/50 border border-border/80 backdrop-blur-xl flex-1 flex flex-col min-h-[220px]">
              <CardHeader className="border-b border-border/20 pb-3">
                <CardTitle className="text-xs text-primary flex items-center gap-2 uppercase">
                  <Cpu className="w-4 h-4 text-primary" />
                  Agentes Wazuh Registrados ({agents.length})
                </CardTitle>
                <CardDescription className="text-[9px] text-muted-foreground">
                  Endpoints monitorizados por el Manager.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-3 overflow-y-auto max-h-[160px] flex-1">
                {agentsError ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-1 py-4">
                    <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
                    <p className="text-[10px] font-bold text-destructive">{agentsError}</p>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="h-full flex items-center justify-center py-4">
                    <p className="text-[10px] text-muted-foreground">No se encontraron agentes registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[9px] text-muted-foreground uppercase border-b border-border/20 pb-1">
                          <th className="py-1">ID</th>
                          <th className="py-1">Nombre</th>
                          <th className="py-1">Estado</th>
                          <th className="py-1">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {agents.map((agent) => {
                          const statusStyle = getAgentStatusStyle(agent.status);
                          const isKali = agent.name.toLowerCase().includes("kali");
                          return (
                            <tr key={agent.id} className={`hover:bg-primary/5 transition-colors ${isKali ? "bg-primary/5 font-semibold text-primary" : ""}`}>
                              <td className="py-1.5 font-mono text-[10px] text-primary/70">{agent.id}</td>
                              <td className="py-1.5 flex items-center gap-1">
                                {agent.name}
                                {isKali && <Badge className="text-[8px] bg-primary/20 text-primary border-primary/30 px-1 py-0 scale-90 pointer-events-none">Kali Agent</Badge>}
                              </td>
                              <td className="py-1.5">
                                <Badge className={`text-[8px] uppercase tracking-wider font-bold ${statusStyle.badgeClass} px-1.5 py-0 pointer-events-none`}>
                                  <span className={`w-1 h-1 rounded-full mr-1 ${statusStyle.dotClass}`} />
                                  {statusStyle.label}
                                </Badge>
                              </td>
                              <td className="py-1.5 font-mono text-[10px] text-muted-foreground">{agent.ip || "N/A"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MÓDULOS DE SEGURIDAD WAZUH (Estilo Real) */}
            <Card className="bg-card/50 border border-border/80 backdrop-blur-xl p-5 space-y-6">
              <div>
                <h3 className="text-xs text-primary uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Wazuh Security Modules
                </h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">Módulos operativos y directivas de seguridad monitorizadas.</p>
              </div>

              <div className="space-y-6">
                {/* ENDPOINT SECURITY */}
                <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1117] px-2 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                    Endpoint Security
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">Config Assessment</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Evaluación de hardening y cumplimiento</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Bug className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">Malware Detection</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Firmas e IOCs de amenazas activas</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 sm:col-span-2">
                      <FileSearch className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">File Integrity Monitoring</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Control de cambios en archivos críticos</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THREAT INTELLIGENCE */}
                <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1117] px-2 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                    Threat Intelligence
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Crosshair className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">Threat Hunting</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Búsqueda proactiva de amenazas en el entorno</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">Vulnerability Detection</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Aplicaciones afectadas por CVEs conocidos</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 sm:col-span-2">
                      <GitBranch className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">MITRE ATT&CK</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Alertas mapeadas a tácticas y técnicas MITRE</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECURITY OPERATIONS */}
                <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1117] px-2 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                    Security Operations
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">IT Hygiene</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Procesos, software y configuraciones del sistema</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">PCI DSS</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Cumplimiento del estándar de seguridad de pagos</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 sm:col-span-2">
                      <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold text-[14px] text-[#c9d1d9] leading-tight">GDPR</div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Conformidad con protección de datos personales</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CYBERSHIELD MODULES */}
                <div className="relative border border-[#3fb950] rounded-lg pt-4 pb-3 px-3">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1117] px-2 text-[11px] font-bold text-[#3fb950] uppercase tracking-wider whitespace-nowrap">
                    CyberShield Modules
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Network className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-[#c9d1d9] leading-tight">CyberShield LAN</span>
                          <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap uppercase pointer-events-none scale-90">6 reglas</span>
                        </div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">MAC Flooding, ARP Spoofing, DHCP · reglas 100500-100505</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Zap className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-[#c9d1d9] leading-tight">CyberShield Scapy</span>
                          <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap uppercase pointer-events-none scale-90">4 reglas</span>
                        </div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">SYN/ACK/ARP Scan, Fuzzing · reglas 100506-100509</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <Key className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-[#c9d1d9] leading-tight">CyberShield BruteForce</span>
                          <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap uppercase pointer-events-none scale-90">2 reglas</span>
                        </div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Fuerza bruta SSH y Web · reglas 100510-100511</div>
                      </div>
                    </div>
                    <div className="group flex items-start gap-2.5 p-2 rounded-md hover:bg-[#161b22] transition-all duration-200 cursor-pointer hover:-translate-y-0.5">
                      <ArrowUpCircle className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-[#c9d1d9] leading-tight">CyberShield PrivEsc</span>
                          <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[8px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap uppercase pointer-events-none scale-90">2 reglas</span>
                        </div>
                        <div className="text-[12px] text-[#8b949e] leading-snug line-clamp-2 mt-0.5">Escalada local y Kerberos · reglas 100512-100513</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* COLUMNA 2: CyberShield Alerts Stream */}
          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl xl:col-span-1 flex flex-col min-h-[420px]">
            <CardHeader className="border-b border-border/20 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs text-primary flex items-center gap-2 uppercase">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  Alertas de Seguridad (indexer)
                </CardTitle>
                <CardDescription className="text-[9px] text-muted-foreground">
                  Cola en tiempo real de eventos detectados.
                </CardDescription>
              </div>
              <div className="flex items-center bg-background/60 border border-border rounded-lg p-0.5 scale-90">
                <button
                  type="button"
                  onClick={() => setAlertFilterType("cybershield")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    alertFilterType === "cybershield"
                      ? "bg-primary text-black shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  CyberShield
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilterType("wazuh")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    alertFilterType === "wazuh"
                      ? "bg-primary text-black shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wazuh
                </button>
                <button
                  type="button"
                  onClick={() => setAlertFilterType("all")}
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                    alertFilterType === "all"
                      ? "bg-primary text-black shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ambos
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-3 overflow-y-auto flex-1 max-h-[320px]">
              {alertsError ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1 py-8">
                  <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
                  <p className="text-[10px] font-bold text-destructive">{alertsError}</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <Terminal className="w-6 h-6 text-muted-foreground/30 mb-1 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground">No hay alertas en las últimas 24 horas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map((alert) => {
                    const severity = getSeverityFromLevel(alert.rule?.level ?? 3);
                    return (
                      <div
                        key={alert._id}
                        onClick={() => setSelectedAlert(alert)}
                        className="group p-2 bg-background/30 border border-border hover:border-primary/30 transition-all rounded cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-200" />
                        <div className="flex justify-between items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] text-muted-foreground font-mono">{formatTimestamp(alert.timestamp)}</span>
                              <Badge variant="outline" className="text-[8px] border-primary/20 text-primary/70 font-mono px-1 py-0 pointer-events-none">
                                Regla: {alert.rule?.id || "N/A"}
                              </Badge>
                            </div>
                            <p className="text-[11px] font-semibold text-foreground truncate group-hover:text-primary transition-colors mt-0.5">
                              {alert.rule?.description || "Sin descripción"}
                            </p>
                          </div>
                          <Badge className={`text-[8px] font-bold shrink-0 ${severity.badgeClass} px-1.5 py-0 pointer-events-none`}>
                            Lvl {alert.rule?.level ?? 0}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* COLUMNA 3: Auditorías y Correlación */}
          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl flex flex-col min-h-[420px]">
            <CardHeader className="border-b border-border/20 pb-3 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xs text-primary flex items-center gap-2 uppercase">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  Auditoría de Ataques (SIEM)
                </CardTitle>
                <CardDescription className="text-[9px] text-muted-foreground">
                  Audita el histórico de ataques y verifica su detección.
                </CardDescription>
              </div>
              <Button
                onClick={handleVerifyAll}
                disabled={verifyingAll || attacks.length === 0}
                className="h-6 px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-[9px] font-bold"
              >
                {verifyingAll ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <Play className="w-2.5 h-2.5 mr-1" />}
                AUDITAR TODO
              </Button>
            </CardHeader>
            <CardContent className="pt-3 overflow-y-auto flex-1 max-h-[320px]">
              {attacks.length === 0 ? (
                <div className="h-full flex items-center justify-center py-10">
                  <p className="text-[10px] text-muted-foreground text-center">No hay logs de ataques lanzados para correlacionar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attacks.slice(0, 8).map((attack) => {
                    const status = correlationStates[attack._id] || "idle";
                    const alertsFound = correlationAlerts[attack._id] || [];

                    return (
                      <div
                        key={attack._id}
                        className={`p-2 border rounded transition-all ${
                          status === "detected" 
                            ? "bg-primary/5 border-primary/30" 
                            : status === "not_detected" 
                            ? "bg-warning/5 border-warning/30" 
                            : status === "error" 
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-background/20 border-border"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]">{attack.attack_name || attack.attack_id}</span>
                              <Badge variant="outline" className="text-[8px] font-mono border-primary/20 text-primary/70 px-1 py-0 pointer-events-none">
                                {attack.module}
                              </Badge>
                            </div>
                            <span className="text-[8px] text-muted-foreground block">
                              {formatTimestamp(attack.timestamp)}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {status === "idle" && (
                              <Button
                                onClick={() => handleVerifyCorrelation(attack)}
                                className="h-5 px-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[8px] font-bold border border-primary/25"
                              >
                                Verificar
                              </Button>
                            )}

                            {status === "loading" && (
                              <Badge className="bg-primary/10 text-primary border border-primary/30 text-[8px] font-bold animate-pulse px-1 py-0 pointer-events-none">
                                Buscando...
                              </Badge>
                            )}

                            {status === "detected" && (
                              <Badge className="bg-primary/20 text-primary border border-primary/50 text-[8px] font-bold px-1.5 py-0 pointer-events-none">
                                Det. ({alertsFound.length})
                              </Badge>
                            )}

                            {status === "not_detected" && (
                              <Badge className="bg-warning/20 text-warning border border-warning/50 text-[8px] font-bold px-1.5 py-0 pointer-events-none">
                                No Det.
                              </Badge>
                            )}

                            {status === "error" && (
                              <Badge className="bg-destructive/20 text-destructive border-destructive/50 text-[8px] font-bold px-1.5 py-0 pointer-events-none">
                                Error
                              </Badge>
                            )}
                          </div>
                        </div>

                        {status === "detected" && alertsFound.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-primary/10 space-y-1">
                            {alertsFound.slice(0, 1).map((alert, index) => (
                              <div
                                key={index}
                                onClick={() => setSelectedAlert(alert)}
                                className="text-[9px] bg-black/40 border border-primary/10 hover:border-primary/20 rounded p-1 flex justify-between items-center cursor-pointer"
                              >
                                <span className="text-foreground truncate max-w-[170px]">
                                  {alert.rule?.description || "Sin descripción"}
                                </span>
                                <Badge variant="outline" className="text-[7px] border-primary/20 text-primary px-1 py-0 scale-90 pointer-events-none">
                                  Lvl {alert.rule?.level ?? 0}
                                </Badge>
                              </div>
                            ))}
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

        {/* DETALLE LATERAL VISOR DE ALERTA */}
        {selectedAlert && (
          <WazuhAlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
        
      </div>
    </div>
  );
}
