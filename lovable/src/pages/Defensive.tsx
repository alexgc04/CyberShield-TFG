// ============================================================================
// Defensive.tsx — Módulo Defensivo con integración real de Wazuh SIEM
// ============================================================================
// DÓNDE VA: lovable/src/pages/Defensive.tsx (REEMPLAZA el archivo existente)
//
// QUÉ HACE: Página principal del módulo defensivo con:
//   1. Panel de conexión a Wazuh (credenciales Manager + Indexer)
//   2. Tab AGENTES: Lista de todos los ordenadores monitorizados
//   3. Tab ALERTAS: Dashboard de alertas reales con filtros
//   4. Consola de actividad (igual que la del módulo ofensivo)
//
// CÓMO FUNCIONA:
//   - El usuario introduce las credenciales de su Wazuh
//   - Se autentica contra Manager (JWT) e Indexer (Basic Auth)
//   - Se cargan los agentes y las alertas reales
//   - Cada 30 segundos se refrescan las alertas automáticamente
//   - Si el token del Manager caduca (~15 min), se renueva automáticamente
//   - Al hacer click en una alerta, se abre el detalle con todos los campos
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Monitor, AlertTriangle, Terminal, Activity,
  RefreshCw, Search, Filter, ChevronRight,
  CheckCircle2, XCircle, CircleDot, Loader2,
} from "lucide-react";

// Importar servicios y tipos
import {
  managerAPI,
  indexerAPI,
  getSeverityFromLevel,
  getAgentStatusStyle,
  formatTimestamp,
  timeAgo,
} from "@/services/wazuhService";
import type {
  WazuhCredentials,
  WazuhAgent,
  WazuhAlert,
  AgentSummary,
  AlertFilters,
  LogEntry,
} from "@/services/wazuhService";

// Importar sub-componentes
import WazuhConnectionPanel from "@/components/defensive/WazuhConnectionPanel";
import WazuhAlertDetail from "@/components/defensive/WazuhAlertDetail";

// ---------------------------------------------------------------------------
// TIPOS LOCALES
// ---------------------------------------------------------------------------

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

// Opciones de rango de tiempo para el selector de alertas
const TIME_RANGES = [
  { value: "now-15m", label: "Últimos 15 min" },
  { value: "now-1h", label: "Última hora" },
  { value: "now-6h", label: "Últimas 6 horas" },
  { value: "now-24h", label: "Últimas 24 horas" },
  { value: "now-7d", label: "Última semana" },
  { value: "now-30d", label: "Último mes" },
];

// Opciones de severidad mínima
const MIN_LEVELS = [
  { value: "0", label: "Todos los niveles" },
  { value: "4", label: "Nivel ≥ 4 (Low+)" },
  { value: "7", label: "Nivel ≥ 7 (Medium+)" },
  { value: "11", label: "Nivel ≥ 11 (High+)" },
  { value: "14", label: "Nivel ≥ 14 (Critical)" },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Defensive = () => {
  // --- Estado de conexión ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [agentSummary, setAgentSummary] = useState<AgentSummary | null>(null);

  // --- Estado de datos ---
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<WazuhAlert | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // --- Filtros de alertas ---
  const [filters, setFilters] = useState<AlertFilters>({
    timestampGte: "now-24h",
    minLevel: 0,
    agentId: "",
    searchText: "",
    size: 50,
    from: 0,
  });

  // --- Consola de actividad (mismo patrón que Offensive.tsx) ---
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: new Date().toLocaleTimeString(), level: "info", message: "Módulo defensivo inicializado. Introduce las credenciales de Wazuh para conectar." },
  ]);

  // --- Ref para el auto-refresh ---
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Función para añadir logs a la consola
  const pushLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs(prev => [
      ...prev.slice(-99),
      { ts: new Date().toLocaleTimeString(), level, message },
    ]);
  }, []);

  // =========================================================================
  // CONECTAR A WAZUH
  // =========================================================================

  const handleConnect = useCallback(async (credentials: WazuhCredentials) => {
    setConnectionStatus("connecting");
    pushLog("info", `Conectando al Manager: ${credentials.managerUrl}...`);

    try {
      // 1. Autenticar contra el Manager API (obtener JWT token)
      const token = await managerAPI.authenticate(
        credentials.managerUrl,
        credentials.managerUser,
        credentials.managerPassword
      );
      pushLog("success", `✔ Manager autenticado. Token JWT obtenido (${token.slice(0, 20)}...)`);

      // 2. Autenticar contra el Indexer API (verificar credenciales)
      pushLog("info", `Conectando al Indexer: ${credentials.indexerUrl}...`);
      const indexerInfo = await indexerAPI.authenticate(
        credentials.indexerUrl,
        credentials.indexerUser,
        credentials.indexerPassword
      );
      pushLog("success", `✔ Indexer conectado. Cluster: ${indexerInfo?.cluster_name || "OK"}`);

      // 3. Cargar resumen de agentes
      pushLog("info", "Obteniendo resumen de agentes...");
      const summary = await managerAPI.getAgentSummary();
      setAgentSummary(summary);
      pushLog("success", `✔ ${summary.total} agentes encontrados (${summary.active} activos)`);

      setConnectionStatus("connected");

      // 4. Cargar datos iniciales
      await loadAgents();
      await loadAlerts();

      // 5. Iniciar auto-refresh de alertas cada 30 segundos
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = setInterval(() => {
        loadAlerts(true);
      }, 30000);

    } catch (err: any) {
      setConnectionStatus("error");
      pushLog("error", `✘ Error de conexión: ${err?.message || "Error desconocido"}`);
      throw err; // Re-lanzar para que el panel de conexión muestre el error
    }
  }, [pushLog]);

  // =========================================================================
  // DESCONECTAR
  // =========================================================================

  const handleDisconnect = useCallback(() => {
    managerAPI.disconnect();
    indexerAPI.disconnect();
    setConnectionStatus("disconnected");
    setAgents([]);
    setAlerts([]);
    setAlertsTotal(0);
    setAgentSummary(null);
    setSelectedAlert(null);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    pushLog("info", "Desconectado de Wazuh. Credenciales limpiadas de memoria.");
  }, [pushLog]);

  // Limpiar interval al desmontar el componente
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  // =========================================================================
  // CARGAR AGENTES
  // =========================================================================

  const loadAgents = useCallback(async () => {
    if (!managerAPI.isConfigured()) return;
    setLoadingAgents(true);

    try {
      // Comprobar si el token necesita renovación
      const renewed = await managerAPI.ensureAuth();
      if (renewed) {
        pushLog("warning", "⟳ Token JWT renovado automáticamente");
      }

      pushLog("info", "GET /agents → Consultando lista de agentes...");
      const agentList = await managerAPI.getAgents();
      setAgents(agentList);

      // Actualizar también el resumen
      const summary = await managerAPI.getAgentSummary();
      setAgentSummary(summary);

      pushLog("success", `✔ ${agentList.length} agentes cargados`);
    } catch (err: any) {
      pushLog("error", `✘ Error cargando agentes: ${err?.message}`);
    } finally {
      setLoadingAgents(false);
    }
  }, [pushLog]);

  // =========================================================================
  // CARGAR ALERTAS
  // =========================================================================

  const loadAlerts = useCallback(async (silent: boolean = false) => {
    if (!indexerAPI.isConfigured()) return;
    setLoadingAlerts(true);

    try {
      if (!silent) {
        pushLog("info", `POST /wazuh-alerts-*/_search → Consultando alertas (${filters.timestampGte || "now-24h"})...`);
      }

      const result = await indexerAPI.queryAlerts(filters);
      setAlerts(result.alerts);
      setAlertsTotal(result.total);

      if (!silent) {
        pushLog("success", `✔ ${result.alerts.length} alertas obtenidas (${result.total} total)`);
      }
    } catch (err: any) {
      pushLog("error", `✘ Error consultando alertas: ${err?.message}`);
    } finally {
      setLoadingAlerts(false);
    }
  }, [pushLog, filters]);

  // Recargar alertas cuando cambian los filtros (solo si está conectado)
  useEffect(() => {
    if (connectionStatus === "connected") {
      loadAlerts();
    }
  }, [filters.timestampGte, filters.minLevel, filters.agentId]);

  // =========================================================================
  // RENDER
  // =========================================================================

  const isConnected = connectionStatus === "connected";

  return (
    <div className="relative">
      {/* Fondo con imagen */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0"
        style={{ backgroundImage: "url('/images/broken-shield.png')" }}
      />

      <div className="space-y-6 relative z-10">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold font-mono text-neon-cyan text-glow-cyan tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" /> WAZUH SIEM
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Monitorización de seguridad · Fleet de agentes · Alertas en tiempo real
          </p>
        </div>

        {/* Panel de Conexión */}
        <WazuhConnectionPanel
          status={connectionStatus}
          agentSummary={agentSummary}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          pushLog={pushLog}
        />

        {/* Contenido principal (solo visible cuando está conectado) */}
        {isConnected && (
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="bg-card/60 border border-neon-cyan/20 p-1 h-auto flex-wrap">
              <TabsTrigger
                value="agents"
                className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:glow-cyan gap-2"
              >
                <Monitor className="w-4 h-4" /> Agentes ({agents.length})
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan data-[state=active]:glow-cyan gap-2"
              >
                <AlertTriangle className="w-4 h-4" /> Alertas ({alertsTotal})
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* TAB: AGENTES (Fleet de ordenadores monitorizados)            */}
            {/* ============================================================ */}
            <TabsContent value="agents" className="mt-6">
              <Card className="border-neon-cyan/15 bg-card/40">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-mono text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Fleet de Agentes
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAgents}
                    disabled={loadingAgents}
                    className="font-mono text-[10px] uppercase tracking-wider border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 h-7"
                  >
                    {loadingAgents ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Actualizar
                  </Button>
                </CardHeader>
                <CardContent>
                  {agents.length === 0 ? (
                    <div className="text-center py-8">
                      <Monitor className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-xs font-mono text-muted-foreground">
                        {loadingAgents ? "Cargando agentes..." : "No se encontraron agentes"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agents.map(agent => {
                        const statusStyle = getAgentStatusStyle(agent.status);
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30 hover:border-neon-cyan/30 transition-all group"
                          >
                            {/* Info del agente */}
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Dot de estado */}
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusStyle.dotClass}`} />

                              {/* ID */}
                              <span className="text-xs font-mono text-muted-foreground font-semibold w-8 shrink-0">
                                {agent.id}
                              </span>

                              {/* Nombre + IP */}
                              <div className="min-w-0">
                                <p className="text-sm font-mono text-foreground font-semibold truncate group-hover:text-neon-cyan transition-colors">
                                  {agent.name}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {agent.ip} · {agent.os.name} {agent.os.version}
                                </p>
                              </div>
                            </div>

                            {/* Metadata derecha */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Versión Wazuh */}
                              <span className="text-[10px] font-mono text-muted-foreground hidden md:block">
                                {agent.version}
                              </span>

                              {/* Último keepalive */}
                              <span className="text-[10px] font-mono text-muted-foreground hidden lg:block">
                                {timeAgo(agent.lastKeepAlive)}
                              </span>

                              {/* Badge de estado */}
                              <Badge className={`font-mono text-[10px] ${statusStyle.badgeClass}`}>
                                {statusStyle.label.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB: ALERTAS (Dashboard de alertas reales)                   */}
            {/* ============================================================ */}
            <TabsContent value="alerts" className="mt-6 space-y-4">
              {/* Barra de filtros */}
              <Card className="border-neon-cyan/15 bg-card/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-neon-cyan" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neon-cyan font-semibold">
                      Filtros de Búsqueda
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Rango de tiempo */}
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] text-muted-foreground uppercase">
                        Rango de tiempo
                      </Label>
                      <Select
                        value={filters.timestampGte || "now-24h"}
                        onValueChange={v => setFilters(prev => ({ ...prev, timestampGte: v, from: 0 }))}
                      >
                        <SelectTrigger className="bg-background/60 border-primary/30 font-mono text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_RANGES.map(r => (
                            <SelectItem key={r.value} value={r.value} className="font-mono text-xs">
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Severidad mínima */}
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] text-muted-foreground uppercase">
                        Severidad mínima
                      </Label>
                      <Select
                        value={String(filters.minLevel || 0)}
                        onValueChange={v => setFilters(prev => ({ ...prev, minLevel: Number(v), from: 0 }))}
                      >
                        <SelectTrigger className="bg-background/60 border-primary/30 font-mono text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MIN_LEVELS.map(l => (
                            <SelectItem key={l.value} value={l.value} className="font-mono text-xs">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro por agente */}
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] text-muted-foreground uppercase">
                        Agente
                      </Label>
                      <Select
                        value={filters.agentId || "all"}
                        onValueChange={v => setFilters(prev => ({ ...prev, agentId: v === "all" ? "" : v, from: 0 }))}
                      >
                        <SelectTrigger className="bg-background/60 border-primary/30 font-mono text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-mono text-xs">
                            Todos los agentes
                          </SelectItem>
                          {agents.map(a => (
                            <SelectItem key={a.id} value={a.id} className="font-mono text-xs">
                              {a.id} — {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Búsqueda de texto */}
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] text-muted-foreground uppercase">
                        Buscar en descripción
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="brute force, ssh..."
                          value={filters.searchText || ""}
                          onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && loadAlerts()}
                          className="bg-background/60 border-primary/30 font-mono text-xs h-9"
                        />
                        <Button
                          onClick={() => loadAlerts()}
                          disabled={loadingAlerts}
                          size="sm"
                          className="bg-neon-cyan text-black hover:bg-neon-cyan/80 h-9 px-3"
                        >
                          {loadingAlerts ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Filtro rápido CyberShield */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neon-cyan/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`font-mono text-[10px] uppercase tracking-wider h-7 gap-1.5 ${
                        filters.searchText === "SEC_VIOLATION"
                          ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50"
                          : "border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10"
                      }`}
                      onClick={() => {
                        if (filters.searchText === "SEC_VIOLATION") {
                          setFilters(prev => ({ ...prev, searchText: "", from: 0 }));
                        } else {
                          setFilters(prev => ({ ...prev, searchText: "SEC_VIOLATION", from: 0 }));
                        }
                        loadAlerts();
                      }}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {filters.searchText === "SEC_VIOLATION" ? "Mostrando CyberShield" : "Alertas CyberShield"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono text-[10px] uppercase tracking-wider h-7 border-muted/40 text-muted-foreground hover:bg-muted/10"
                      onClick={() => {
                        setFilters({ timestampGte: "now-24h", minLevel: 0, agentId: "", searchText: "", size: 50, from: 0 });
                        loadAlerts();
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de alertas */}
              <Card className="border-neon-cyan/15 bg-card/40">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-mono text-neon-cyan uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Alertas ({alertsTotal} total)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAlerts()}
                    disabled={loadingAlerts}
                    className="font-mono text-[10px] uppercase tracking-wider border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10 h-7"
                  >
                    {loadingAlerts ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Refrescar
                  </Button>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-xs font-mono text-muted-foreground">
                        {loadingAlerts
                          ? "Consultando alertas al Indexer..."
                          : "No se encontraron alertas con los filtros actuales"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {alerts.map(alert => {
                        const severity = getSeverityFromLevel(alert.rule.level);
                        return (
                          <button
                            key={alert._id}
                            onClick={() => setSelectedAlert(alert)}
                            className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30 hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Badge de nivel */}
                              <Badge className={`font-mono text-[10px] shrink-0 ${severity.badgeClass}`}>
                                {alert.rule.level}
                              </Badge>

                              {/* Descripción + agente */}
                              <div className="min-w-0">
                                <p className="text-xs font-mono text-foreground font-semibold truncate group-hover:text-neon-cyan transition-colors">
                                  {alert.rule.description}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  <span className="text-neon-cyan/70">Agent:</span> {alert.agent.name || alert.agent.id}
                                  {alert.agent.ip && <> · {alert.agent.ip}</>}
                                  {alert.data.srcip && <> · <span className="text-neon-yellow/70">Src:</span> {alert.data.srcip}</>}
                                  <span className="ml-2">{timeAgo(alert.timestamp)}</span>
                                </p>
                              </div>
                            </div>

                            {/* Flecha + Rule ID */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                                R:{alert.rule.id}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-neon-cyan transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Paginación simple */}
                  {alertsTotal > (filters.size || 50) && (
                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/20">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(filters.from || 0) === 0}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          from: Math.max(0, (prev.from || 0) - (prev.size || 50)),
                        }))}
                        className="font-mono text-[10px] uppercase border-neon-cyan/30 text-neon-cyan h-7"
                      >
                        ← Anterior
                      </Button>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {(filters.from || 0) + 1}–{Math.min((filters.from || 0) + (filters.size || 50), alertsTotal)} de {alertsTotal}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(filters.from || 0) + (filters.size || 50) >= alertsTotal}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          from: (prev.from || 0) + (prev.size || 50),
                        }))}
                        className="font-mono text-[10px] uppercase border-neon-cyan/30 text-neon-cyan h-7"
                      >
                        Siguiente →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* ================================================================ */}
        {/* CONSOLA DE ACTIVIDAD (mismo diseño que Offensive.tsx)            */}
        {/* ================================================================ */}
        <Card className="border-neon-cyan/15 bg-card/80">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-neon-cyan" /> Consola de Actividad
            </CardTitle>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          </CardHeader>
          <CardContent>
            <div className="bg-background/80 border border-border/50 rounded-md p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className="text-muted-foreground/60">// Sin entradas</p>
              ) : (
                logs.map((l, i) => {
                  const Icon =
                    l.level === "success" ? CheckCircle2 :
                    l.level === "error" ? XCircle :
                    l.level === "warning" ? AlertTriangle :
                    CircleDot;
                  const color =
                    l.level === "success" ? "text-emerald-400" :
                    l.level === "error" ? "text-red-400" :
                    l.level === "warning" ? "text-neon-yellow" :
                    "text-muted-foreground";
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground/60 shrink-0">[{l.ts}]</span>
                      <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${color}`} />
                      <span className={`${color} break-all`}>{l.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sheet de detalle de alerta */}
        <WazuhAlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      </div>
    </div>
  );
};

export default Defensive;
