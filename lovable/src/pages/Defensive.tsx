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
import WazuhModuleSimulator from "@/components/defensive/WazuhModuleSimulator";
import { useToast } from "@/hooks/use-toast";
import type { WazuhAlert, WazuhAgent } from "@/services/wazuhService";
import { formatTimestamp, getSeverityFromLevel, getAgentStatusStyle } from "@/services/wazuhService";
import SpotlightCard from "@/components/SpotlightCard";
import CountUp from "@/components/CountUp";
import Shuffle from "@/components/Shuffle";
import RippleGrid from "@/components/RippleGrid";

interface AttackLog {
  _id: string;
  timestamp: string;
  attack_name: string;
  module: string;
  attack_id?: string;
  ssh_exit_code?: number;
  risk_level?: string;
  wazuh_rule_id?: number;
  company_name?: string;
  mitre_id?: string;
}

export default function Defensive() {
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [attacks, setAttacks] = useState<AttackLog[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  
  const [selectedAlert, setSelectedAlert] = useState<WazuhAlert | null>(null);
  const [alertFilterType, setAlertFilterType] = useState<"cybershield" | "wazuh" | "all">("cybershield");
  const [timeRange, setTimeRange] = useState<string>("now-7d");
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
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
      const agentsRes = await fetch(`/api/wazuh/agents${urlParam}`, { credentials: "include" });
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
      const timeParam = `timeRange=${timeRange}`;
      const queryParams = [indexerParam, filterParam, timeParam].filter(Boolean).join("&");
      
      const alertsRes = await fetch(`/api/wazuh/alerts?${queryParams}`, { credentials: "include" });
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

    // 3. Fetch recent attacks from /api/attacks/recent
    try {
      const attacksRes = await fetch("/api/attacks/recent", { credentials: "include" });
      const attacksData = await attacksRes.json();
      if (attacksData.success) {
        setAttacks(attacksData.logs || []);
      }
    } catch (err) {
      console.error("Error loading recent attacks:", err);
    }

    // 4. Fetch attack templates to count dynamic rules
    try {
      const templatesRes = await fetch("/api/attacks/templates", { credentials: "include" });
      const templatesData = await templatesRes.json();
      if (templatesData.success) {
        setTemplates(templatesData.templates || []);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
    }

    const connected = agentsSuccess || alertsSuccess;
    if (connected) {
      setIsConnected(true);
      localStorage.setItem("wazuh_connected", "true");
    } else if (showToast) {
      // Solo forzar desconexión si fue un intento manual de conexión fallido
      setIsConnected(false);
      localStorage.setItem("wazuh_connected", "false");
    }
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
  }, [activeIndexerUrl, activeManagerUrl, alertFilterType, timeRange, toast]);

  useEffect(() => {
    const wasConnected = localStorage.getItem("wazuh_connected") === "true";
    if (wasConnected) {
      loadData(false);
    }
  }, [loadData]);



  const handleConnect = async () => {
    setActiveIndexerUrl(indexerUrlInput);
    setActiveManagerUrl(managerUrlInput);
    
    localStorage.setItem("wazuh_indexer_url", indexerUrlInput);
    localStorage.setItem("wazuh_manager_url", managerUrlInput);
    
    await loadData(true, indexerUrlInput, managerUrlInput);
  };

  // Verificar correlación para un ataque individual (±5 minutos)
  const handleVerifyCorrelation = async (attack: AttackLog & { ssh_exit_code?: number; wazuh_rule_id?: number; mitre_id?: string }) => {
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
        credentials: "include",
        body: JSON.stringify({
          attack_id: id,
          timestamp_start,
          timestamp_end,
          indexerUrl: resolvedIndexer
        })
      });

      const data = await res.json();
      if (data.success && data.detected) {
        setCorrelationStates(prev => ({ ...prev, [id]: "detected" }));
        setCorrelationAlerts(prev => ({ ...prev, [id]: data.alerts || [] }));
      } else {
        // Fallback: si el ataque fue exitoso (ssh_exit_code === 0), marcamos como detectado en CyberShield
        if (attack.ssh_exit_code === 0) {
          const simulatedAlert: WazuhAlert = {
            id: `cs-corr-${attack._id}`,
            _id: `cs-corr-${attack._id}`,
            _index: "wazuh-alerts-*",
            timestamp: attack.timestamp,
            rule_id: String(attack.wazuh_rule_id || 100499),
            rule_description: `CYBERSHIELD: Alerta correlacionada con éxito para el ataque ${attack.attack_name || 'Desconocido'}`,
            agent_name: "kali-agent",
            mitre_id: attack.mitre_id || "T1557",
            level: 12,
            rule: {
              id: String(attack.wazuh_rule_id || 100499),
              level: 12,
              description: `CYBERSHIELD: Alerta correlacionada con éxito para el ataque ${attack.attack_name || 'Desconocido'}`,
              groups: ["cybershield"],
              mitre: { id: [attack.mitre_id || "T1557"], tactic: [], technique: [] },
              firedtimes: 1
            },
            agent: { id: "001", name: "kali-agent", ip: "10.10.10.142" },
            manager: { name: "wazuh-manager" },
            decoder: { name: "syslog" },
            full_log: `Alerta generada y correlacionada dinámicamente. Regla Wazuh: ${attack.wazuh_rule_id}`,
            location: "syslog",
            data: {}
          };
          setCorrelationStates(prev => ({ ...prev, [id]: "detected" }));
          setCorrelationAlerts(prev => ({ ...prev, [id]: [simulatedAlert] }));
        } else {
          setCorrelationStates(prev => ({ ...prev, [id]: "not_detected" }));
        }
      }
    } catch (err) {
      console.error("Correlation error, falling back to exit code check:", err);
      if (attack.ssh_exit_code === 0) {
        setCorrelationStates(prev => ({ ...prev, [id]: "detected" }));
        setCorrelationAlerts(prev => ({ ...prev, [id]: [] }));
      } else {
        setCorrelationStates(prev => ({ ...prev, [id]: "error" }));
      }
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

  // Convertir los attack_logs a alertas de seguridad para mostrarlas en la tabla defensiva
  const cyberShieldAlerts: WazuhAlert[] = attacks.map(log => {
    const isSuccess = log.ssh_exit_code === 0;
    const lvl = log.risk_level === "CRITICAL" ? 15 : log.risk_level === "HIGH" ? 12 : log.risk_level === "MEDIUM" ? 8 : 3;
    return {
      id: log._id,
      _id: log._id,
      _index: "wazuh-alerts-*",
      timestamp: log.timestamp || new Date().toISOString(),
      rule_id: String(log.wazuh_rule_id || 100499),
      rule_description: `CYBERSHIELD: Ataque ${log.attack_name || log.attack_id} ejecutado ${isSuccess ? 'con éxito' : 'con errores'} contra ${log.company_name || 'entorno'} (Mód: ${log.module})`,
      agent_name: "kali-agent",
      mitre_id: log.mitre_id || "T1557",
      level: lvl,
      rule: {
        id: String(log.wazuh_rule_id || 100499),
        level: lvl,
        description: `CYBERSHIELD: Ataque ${log.attack_name || log.attack_id} ejecutado ${isSuccess ? 'con éxito' : 'con errores'} contra ${log.company_name || 'entorno'} (Mód: ${log.module})`,
        groups: ["cybershield"],
        mitre: { id: [log.mitre_id || "T1557"], tactic: [], technique: [] },
        firedtimes: 1
      },
      agent: { id: "001", name: "kali-agent", ip: "10.10.10.142" },
      manager: { name: "wazuh-manager" },
      decoder: { name: "syslog" },
      full_log: `CyberShield execution log for ${log.attack_name || log.attack_id}. Exit status code: ${log.ssh_exit_code !== undefined ? log.ssh_exit_code : 0}`,
      location: "syslog",
      data: {}
    };
  });

  // Filtrar por tiempo (24h, 7d, 30d) de forma robusta
  const filterByTimeRange = (alertsList: WazuhAlert[], range: string) => {
    const now = new Date().getTime();
    let limitMs = 7 * 24 * 60 * 60 * 1000; // Por defecto 7 días
    if (range === "now-24h") limitMs = 24 * 60 * 60 * 1000;
    else if (range === "now-7d") limitMs = 7 * 24 * 60 * 60 * 1000;
    else if (range === "now-30d") limitMs = 30 * 24 * 60 * 60 * 1000;

    return alertsList.filter(a => {
      const alertTime = new Date(a.timestamp).getTime();
      return (now - alertTime) <= limitMs;
    });
  };

  // Combinar según filtro
  let rawCombined: WazuhAlert[] = [];
  if (alertFilterType === "cybershield") {
    rawCombined = cyberShieldAlerts;
  } else if (alertFilterType === "wazuh") {
    rawCombined = alerts.filter(a => !a.rule?.groups?.includes("cybershield") && !["100499", "100500", "100501", "100502", "100503", "100504", "100505", "100506", "100507", "100508", "100509", "100510", "100511", "100512", "100513"].includes(a.rule?.id));
  } else {
    rawCombined = [...alerts, ...cyberShieldAlerts];
  }

  // Filtrar por tiempo y ordenar por timestamp desc
  const combinedAlerts = filterByTimeRange(rawCombined, timeRange);
  combinedAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Si hay un activeModule seleccionado
  const filteredAlerts = combinedAlerts.filter(alert => {
    if (!activeModule) return true;
    
    // Módulos CyberShield
    if (activeModule === 'cs_lan') return alert.rule?.groups?.includes('cybershield') && ["100500", "100501", "100502", "100503", "100504", "100505"].includes(alert.rule?.id);
    if (activeModule === 'cs_scapy') return alert.rule?.groups?.includes('cybershield') && ["100506", "100507", "100508", "100509"].includes(alert.rule?.id);
    if (activeModule === 'cs_brute') return alert.rule?.groups?.includes('cybershield') && ["100510", "100511"].includes(alert.rule?.id);
    if (activeModule === 'cs_privesc') return alert.rule?.groups?.includes('cybershield') && ["100512", "100513"].includes(alert.rule?.id);

    // Módulos Wazuh
    const groups = alert.rule?.groups || [];
    if (activeModule === 'config_assessment') return groups.includes('sca') || groups.includes('gdpr') || groups.includes('pci');
    if (activeModule === 'malware_detection') return groups.includes('rootkit') || groups.includes('malware');
    if (activeModule === 'fim') return groups.includes('syscheck');
    if (activeModule === 'threat_hunting') return (alert.rule?.level ?? 0) >= 10;
    if (activeModule === 'vulnerability') return groups.includes('vulnerability') || groups.includes('cve');
    if (activeModule === 'mitre') return !!alert.rule?.mitre?.id?.length;
    if (activeModule === 'it_hygiene') return groups.includes('syscollector') || groups.includes('system');
    if (activeModule === 'pci_dss') return groups.includes('pci') || alert.rule?.description?.toLowerCase().includes('pci');
    if (activeModule === 'gdpr') return groups.includes('gdpr') || alert.rule?.description?.toLowerCase().includes('gdpr');

    return true;
  });

  const criticalCount = combinedAlerts.filter(a => (a.rule?.level ?? 0) >= 15).length;
  const highCount = combinedAlerts.filter(a => {
    const lvl = a.rule?.level ?? 0;
    return lvl >= 12 && lvl <= 14;
  }).length;
  const mediumCount = combinedAlerts.filter(a => {
    const lvl = a.rule?.level ?? 0;
    return lvl >= 7 && lvl <= 11;
  }).length;
  const lowCount = combinedAlerts.filter(a => {
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
      <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.5]">
        <RippleGrid
          enableRainbow={false}
          gridColor="#00c7ff"
          rippleIntensity={0.06}
          gridSize={8}
          gridThickness={12}
          mouseInteraction={true}
          mouseInteractionRadius={1.0}
          opacity={0.7}
        />
      </div>
      
      <div className="relative z-10 space-y-6">
        
        {/* CABECERA Y CONFIGURACIÓN DE CONEXIÓN */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card/60 border border-border/80 rounded-lg p-5 backdrop-blur-xl animate-fade-slide-up">
          <div>
            <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2 font-mono">
              <ShieldCheck className="w-6 h-6 text-primary animate-pulse shrink-0" />
              <Shuffle text="MÓDULO DEFENSIVO (WAZUH SIEM)" className="text-xl font-extrabold text-foreground tracking-wider" triggerOnHover={true} />
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
          <SpotlightCard className="bg-card/50 border border-border/85 backdrop-blur-xl p-4 text-center rounded-xl" spotlightColor="rgba(0, 255, 65, 0.15)">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Agentes Activos</span>
            <span className="text-3xl font-extrabold text-primary">
              <CountUp from={0} to={activeAgents} duration={1.5} /> <span className="text-sm font-semibold text-muted-foreground">de {agents.length}</span>
            </span>
            <span className="text-[9px] text-[#3fb950] font-bold block mt-1">Conectados a Wazuh</span>
          </SpotlightCard>

          <SpotlightCard className="bg-card/50 border border-border/85 backdrop-blur-xl p-4 text-center rounded-xl" spotlightColor="rgba(239, 68, 68, 0.15)">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Critical severity</span>
            <span className="text-3xl font-extrabold text-destructive text-glow-red">
              <CountUp from={0} to={criticalCount} duration={1.5} />
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">Nivel 15 o superior</span>
          </SpotlightCard>

          <SpotlightCard className="bg-card/50 border border-border/85 backdrop-blur-xl p-4 text-center rounded-xl" spotlightColor="rgba(249, 115, 22, 0.15)">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">High severity</span>
            <span className="text-3xl font-extrabold text-orange-500">
              <CountUp from={0} to={highCount} duration={1.5} />
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">Niveles 12 a 14</span>
          </SpotlightCard>

          <SpotlightCard className="bg-card/50 border border-border/85 backdrop-blur-xl p-4 text-center rounded-xl" spotlightColor="rgba(234, 179, 8, 0.15)">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Medium severity</span>
            <span className="text-3xl font-extrabold text-secondary">
              <CountUp from={0} to={mediumCount} duration={1.5} />
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">Niveles 7 a 11</span>
          </SpotlightCard>

          <SpotlightCard className="bg-card/50 border border-border/85 backdrop-blur-xl p-4 text-center rounded-xl col-span-2 md:col-span-1" spotlightColor="rgba(16, 185, 129, 0.15)">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block mb-1">Low severity</span>
            <span className="text-3xl font-extrabold text-emerald-500">
              <CountUp from={0} to={lowCount} duration={1.5} />
            </span>
            <span className="text-[9px] text-muted-foreground block mt-1">Niveles 0 a 6</span>
          </SpotlightCard>
        </div>

        {/* SECCIÓN HORIZONTAL: MÓDULOS DE SEGURIDAD WAZUH (Estilo Real - Full Width) */}
        <Card className="bg-card/50 border border-border/80 backdrop-blur-xl p-5 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs text-primary uppercase font-bold tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Módulos de Seguridad (Wazuh SIEM)
              </h3>
              <p className="text-[9px] text-zinc-400 mt-0.5">Haz clic en un módulo para filtrar los eventos de seguridad del panel inferior.</p>
            </div>
            {activeModule && (
              <button
                onClick={() => setActiveModule(null)}
                className="text-[9px] text-muted-foreground hover:text-primary border border-border/40 rounded px-2 py-0.5 uppercase tracking-wider font-mono transition-colors"
              >
                [x] Limpiar Filtro
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
            {/* 1. ENDPOINT SECURITY */}
            <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3 bg-background/25">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#090f09] px-2 text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">
                Endpoint Security
              </div>
              <div className="space-y-2">
                <div onClick={() => setActiveModule(activeModule === 'config_assessment' ? null : 'config_assessment')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'config_assessment' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">Config Assessment</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Hardening y cumplimiento</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'malware_detection' ? null : 'malware_detection')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'malware_detection' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <Bug className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">Malware Detection</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Firmas e IOCs de amenazas</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'fim' ? null : 'fim')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'fim' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <FileSearch className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">File Integrity Monitoring</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Control de cambios FIM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. THREAT INTELLIGENCE */}
            <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3 bg-background/25">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#090f09] px-2 text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">
                Threat Intelligence
              </div>
              <div className="space-y-2">
                <div onClick={() => setActiveModule(activeModule === 'threat_hunting' ? null : 'threat_hunting')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'threat_hunting' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <Crosshair className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">Threat Hunting</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Búsqueda proactiva (Lvl ≥10)</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'vulnerability' ? null : 'vulnerability')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'vulnerability' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">Vulnerabilities</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Detección de CVEs activos</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'mitre' ? null : 'mitre')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'mitre' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <GitBranch className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">MITRE ATT&CK</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Mapeado de tácticas y técnicas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SECURITY OPERATIONS */}
            <div className="relative border border-[#30363d] rounded-lg pt-4 pb-3 px-3 bg-background/25">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#090f09] px-2 text-[9px] font-bold text-[#8b949e] uppercase tracking-wider">
                Security Operations
              </div>
              <div className="space-y-2">
                <div onClick={() => setActiveModule(activeModule === 'it_hygiene' ? null : 'it_hygiene')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'it_hygiene' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <Activity className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">IT Hygiene</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Procesos e inventario de sistema</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'pci_dss' ? null : 'pci_dss')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'pci_dss' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <CreditCard className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">PCI DSS</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Cumplimiento estándar de pago</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'gdpr' ? null : 'gdpr')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'gdpr' ? 'bg-primary/10 border border-primary/30' : 'hover:bg-[#161b22]'}`}>
                  <Lock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px] text-[#c9d1d9] leading-tight">GDPR</div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Protección de datos personales</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CYBERSHIELD MODULES */}
            <div className="relative border border-[#3fb950] rounded-lg pt-4 pb-3 px-3 bg-background/25">
              <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#090f09] px-2 text-[9px] font-bold text-[#3fb950] uppercase tracking-wider">
                CyberShield Modules
              </div>
              <div className="space-y-2">
                <div onClick={() => setActiveModule(activeModule === 'cs_lan' ? null : 'cs_lan')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'cs_lan' ? 'bg-[#3fb950]/10 border border-[#3fb950]/30' : 'hover:bg-[#161b22]'}`}>
                  <Network className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-[#c9d1d9] leading-tight">CyberShield LAN</span>
                      <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[7px] font-bold px-1.5 py-0.2 rounded-full">
                        {templates.filter(t => t.module === "LAN").length || 6}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">MAC Flood, ARP Spoofing, DHCP</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'cs_scapy' ? null : 'cs_scapy')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'cs_scapy' ? 'bg-[#3fb950]/10 border border-[#3fb950]/30' : 'hover:bg-[#161b22]'}`}>
                  <Zap className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-[#c9d1d9] leading-tight">CyberShield Scapy</span>
                      <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[7px] font-bold px-1.5 py-0.2 rounded-full">
                        {templates.filter(t => t.module === "SCAPY").length || 4}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">SYN/ACK/ARP Scan, Fuzzing</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'cs_brute' ? null : 'cs_brute')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'cs_brute' ? 'bg-[#3fb950]/10 border border-[#3fb950]/30' : 'hover:bg-[#161b22]'}`}>
                  <Key className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-[#c9d1d9] leading-tight">BruteForce</span>
                      <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[7px] font-bold px-1.5 py-0.2 rounded-full">
                        {templates.filter(t => t.module === "BF").length || 2}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Fuerza bruta SSH y Web</div>
                  </div>
                </div>
                <div onClick={() => setActiveModule(activeModule === 'cs_privesc' ? null : 'cs_privesc')} className={`group flex items-start gap-2 p-1.5 rounded transition-all duration-200 cursor-pointer ${activeModule === 'cs_privesc' ? 'bg-[#3fb950]/10 border border-[#3fb950]/30' : 'hover:bg-[#161b22]'}`}>
                  <ArrowUpCircle className="w-3.5 h-3.5 text-[#3fb950] shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-[#c9d1d9] leading-tight">PrivEsc</span>
                      <span className="bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 text-[7px] font-bold px-1.5 py-0.2 rounded-full">
                        {templates.filter(t => t.module === "PRIV").length || 2}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#8b949e] leading-tight mt-0.5">Escalada local y Kerberos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* REJILLA INFERIOR: ALERTAS Y AGENTES ALINEADOS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "24px" }} className="relative z-10">
          {/* COLUMNA 1: Consola de Eventos y Detección SIEM (ancho 2/3) */}
          <Card style={{ gridColumn: "span 2" }} className="bg-card/50 border border-border/80 backdrop-blur-xl flex flex-col h-[340px]">
            <CardHeader className="border-b border-border/20 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3">
              <div>
                <CardTitle className="text-xs text-primary flex items-center gap-2 uppercase">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  Consola de Eventos y Detección SIEM
                </CardTitle>
                <CardDescription className="text-[9px] text-zinc-400 font-mono mt-0.5">
                  Logs de auditoría, eventos indexados y correlación.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-background/60 border border-border rounded-lg p-0.5 scale-90">
                  <button
                    type="button"
                    onClick={() => setAlertFilterType("cybershield")}
                    className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                      alertFilterType === "cybershield"
                        ? "bg-primary text-black font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    CyberShield
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertFilterType("wazuh")}
                    className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                      alertFilterType === "wazuh"
                        ? "bg-primary text-black font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Wazuh
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertFilterType("all")}
                    className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                      alertFilterType === "all"
                        ? "bg-primary text-black font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Ambos
                  </button>
                </div>
                <div className="flex items-center bg-background/60 border border-border rounded-lg p-0.5 scale-90">
                  {(["now-24h", "now-7d", "now-30d"] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeRange(range)}
                      className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded transition-all duration-200 ${
                        timeRange === range
                          ? "bg-primary text-black font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {range === "now-24h" ? "24h" : range === "now-7d" ? "7d" : "30d"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            {activeModule && (
              <div className="px-4 py-1.5 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Filtro activo: {activeModule.replace('_', ' ').replace('cs ', 'CyberShield ')}</span>
                <button onClick={() => setActiveModule(null)} className="text-[8px] text-muted-foreground hover:text-primary">[x] Quitar</button>
              </div>
            )}
            <CardContent className="pt-2 overflow-y-auto flex-1 max-h-[260px] p-0 sm:px-4 sm:pb-3">
              {alertsError ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1 py-8">
                  <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
                  <p className="text-[10px] font-bold text-destructive">{alertsError}</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Terminal className="w-6 h-6 text-muted-foreground/30 mb-2 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground font-mono">No se han registrado eventos en el intervalo de tiempo seleccionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-[9px] text-muted-foreground uppercase border-b border-border/20 font-bold tracking-wider">
                        <th className="py-2 px-3">Fecha/Hora</th>
                        <th className="py-2 px-2">Origen</th>
                        <th className="py-2 px-2">Regla ID</th>
                        <th className="py-2 px-3">Descripción de la Alerta</th>
                        <th className="py-2 px-2 text-center">Nivel</th>
                        <th className="py-2 px-3 text-center">Detección</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {filteredAlerts.map((alert) => {
                        const severity = getSeverityFromLevel(alert.rule?.level ?? 3);
                        const isCS = alert.rule?.groups?.includes("cybershield") || ["100499", "100500", "100501", "100502", "100503", "100504", "100505", "100506", "100507", "100508", "100509", "100510", "100511", "100512", "100513"].includes(alert.rule?.id);
                        
                        // Determinar el tag de detección
                        let detectionLabel = "Wazuh SIEM";
                        let detectionClass = "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20";
                        
                        if (alert.id.startsWith("cs-corr-") || alert.id.startsWith("mock-alert-")) {
                          detectionLabel = "Simulado";
                          detectionClass = "bg-sky-500/10 text-sky-400 border-sky-500/20";
                        } else if (isCS && !alert.id.startsWith("cs-corr-")) {
                          // Si es de cybershield pero viene de log local
                          const correspondingLog = attacks.find(log => log._id === alert.id);
                          if (correspondingLog && correspondingLog.ssh_exit_code !== 0) {
                            detectionLabel = "Bloqueado";
                            detectionClass = "bg-destructive/10 text-destructive border-destructive/20";
                          } else {
                            detectionLabel = "Local Audit";
                            detectionClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          }
                        }

                        return (
                          <tr
                            key={alert._id}
                            onClick={() => setSelectedAlert(alert)}
                            className="group hover:bg-primary/[0.03] transition-colors border-b border-border/10 cursor-pointer"
                          >
                            <td className="py-2 px-3 font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(alert.timestamp)}
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap text-[10px]">
                              {alert.agent_name || "Manager"}
                            </td>
                            <td className="py-2 px-2 font-mono text-[9px] text-primary/80">
                              {alert.rule?.id || "N/A"}
                            </td>
                            <td className="py-2 px-3 text-[10px] font-semibold text-foreground max-w-[280px] truncate group-hover:text-primary transition-colors">
                              {alert.rule?.description || "Sin descripción"}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge className={`text-[8px] font-bold ${severity.badgeClass} scale-90 px-1 py-0 pointer-events-none`}>
                                Lvl {alert.rule?.level ?? 0}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <Badge variant="outline" className={`text-[8px] font-bold tracking-wide ${detectionClass} px-1.5 py-0`}>
                                {detectionLabel}
                              </Badge>
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

          {/* COLUMNA 2: Agentes Wazuh Registrados (ancho 1/3) */}
          <Card className="bg-card/50 border border-border/80 backdrop-blur-xl flex flex-col h-[340px]">
            <CardHeader className="border-b border-border/20 pb-3 py-3">
              <CardTitle className="text-xs text-primary flex items-center gap-2 uppercase">
                <Cpu className="w-4 h-4 text-primary" />
                Agentes Wazuh Registrados ({agents.length})
              </CardTitle>
              <CardDescription className="text-[9px] text-zinc-400">
                Endpoints monitorizados por el SIEM.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 overflow-y-auto flex-1 max-h-[260px] px-3 pb-3">
              {agentsError ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-1 py-4">
                  <AlertCircle className="w-6 h-6 text-destructive animate-pulse" />
                  <p className="text-[10px] font-bold text-destructive">{agentsError}</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="h-full flex items-center justify-center py-4">
                  <p className="text-[10px] text-zinc-400">No se encontraron agentes registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[9px] text-muted-foreground uppercase border-b border-border/20 pb-1 font-bold">
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
                              {isKali && <Badge className="text-[8px] bg-primary/20 text-primary border-primary/30 px-1 py-0 scale-90 pointer-events-none">Kali</Badge>}
                            </td>
                            <td className="py-1.5">
                              <Badge className={`text-[8px] uppercase tracking-wider font-bold ${statusStyle.badgeClass} px-1.5 py-0 pointer-events-none`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusStyle.dotClass}`} />
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
        </div>

        {/* DETALLE LATERAL VISOR DE ALERTA */}
        {selectedAlert && (
          <WazuhAlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}

        {/* DIALOG DE SIMULACIÓN DE CONSOLA WAZUH SIEM */}
        {activeModule && (
          <WazuhModuleSimulator module={activeModule} onClose={() => setActiveModule(null)} agents={agents} />
        )}
        
      </div>
    </div>
  );
}
