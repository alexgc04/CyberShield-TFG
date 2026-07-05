import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { Shield, Server, Activity, Flame, ShieldAlert, Cpu, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import CountUp from "@/components/CountUp";
import SpotlightCard from "@/components/SpotlightCard";
import Shuffle from "@/components/Shuffle";
import Threads from "@/components/Threads";

type Health = {
  mongodb: boolean;
  n8n: boolean;
  kali: boolean;
  wazuh: boolean;
};

// Componente contador dinámico animado
const AnimatedCounter = ({ value }: { value: number }) => {
  return <CountUp from={0} to={value} duration={1.5} />;
};

export default function Dashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  
  // Dynamic stats states
  const [totalAttacks, setTotalAttacks] = useState(0);
  const [todayAttacks, setTodayAttacks] = useState(0);
  const [totalTemplates, setTotalTemplates] = useState(0);
  const [lastAttack, setLastAttack] = useState<{ name: string; timestamp: string } | null>(null);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [moduleData, setModuleData] = useState<any[]>([]);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<any[]>([]);
  const [recentOps, setRecentOps] = useState<any[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [animateGrid, setAnimateGrid] = useState(false);

  // Cargar lista de empresas y estado de servicios al arrancar
  const loadInitialData = useCallback(async () => {
    try {
      const [healthRes, companiesRes, templatesRes] = await Promise.all([
        fetch("/api/health", { credentials: "include" }),
        fetch("/api/stats/companies", { credentials: "include" }),
        fetch("/api/attacks/templates", { credentials: "include" })
      ]);

      if (!healthRes.ok || !companiesRes.ok || !templatesRes.ok) {
        throw new Error("Error de conexión con el servidor API");
      }

      const healthData = await healthRes.json();
      const companiesData = await companiesRes.json();
      const templatesData = await templatesRes.json();

      if (healthData.success) {
        const customWazuhConnected = localStorage.getItem("wazuh_connected") === "true";
        setHealth({
          ...healthData.services,
          wazuh: customWazuhConnected || healthData.services.wazuh
        });
      }
      if (companiesData.success) setCompanies(companiesData.companies || []);
      if (templatesData.success) setTotalTemplates(templatesData.templates?.length || 15);
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error conectando con el servidor");
    }
  }, []);

  // Cargar estadísticas filtradas por la empresa seleccionada
  const loadStatsData = useCallback(async (company: string) => {
    try {
      const companyParam = company !== "all" ? `?company=${encodeURIComponent(company)}` : "";
      
      const [timelineRes, moduleRes, severityRes, vulnsRes, recentRes] = await Promise.all([
        fetch(`/api/stats/timeline${companyParam}`, { credentials: "include" }),
        fetch(`/api/stats/by-module${companyParam}`, { credentials: "include" }),
        fetch(`/api/stats/severity${companyParam}`, { credentials: "include" }),
        fetch(`/api/stats/top-vulnerabilities${companyParam}`, { credentials: "include" }),
        fetch(`/api/attacks/recent`, { credentials: "include" })
      ]);

      if (!timelineRes.ok || !moduleRes.ok || !severityRes.ok || !vulnsRes.ok || !recentRes.ok) {
        throw new Error("Error al obtener estadísticas de auditoría");
      }

      const timelineData = await timelineRes.json();
      const moduleData = await moduleRes.json();
      const severityData = await severityRes.json();
      const vulnsData = await vulnsRes.json();
      const recentData = await recentRes.json();

      if (timelineData.success) setTimelineData(timelineData.timeline || []);
      if (moduleData.success) {
        // Formatear datos para el gráfico
        const formatted = (moduleData.stats || []).map((m: any) => ({
          name: m._id || "Otros",
          value: m.count || 0
        }));
        setModuleData(formatted);
      }
      if (severityData.success) {
        const formatted = (severityData.stats || []).map((s: any) => ({
          name: s.name,
          count: s.count
        }));
        setSeverityData(formatted);
      }
      if (vulnsData.success) setVulnerabilities(vulnsData.vulnerabilities || []);
      
      if (recentData.success) {
        const logs = recentData.logs || [];
        setRecentOps(logs.slice(0, 5));
        
        // Filtrar según empresa elegida para calcular totales locales en cliente
        const filteredLogs = company === "all" 
          ? logs 
          : logs.filter((log: any) => log.company_name === company);

        setTotalAttacks(filteredLogs.length);
        
        // Calcular ataques hoy
        const today = new Date().toISOString().split("T")[0];
        const todayLogs = filteredLogs.filter((log: any) => log.timestamp && log.timestamp.split("T")[0] === today);
        setTodayAttacks(todayLogs.length);

        // Último ataque realizado
        if (filteredLogs.length > 0) {
          setLastAttack({
            name: filteredLogs[0].attack_name || filteredLogs[0].attack_id,
            timestamp: filteredLogs[0].timestamp
          });
        } else {
          setLastAttack(null);
        }
      }

      setTimeout(() => setAnimateGrid(true), 100);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadStatsData(selectedCompany);
  }, [selectedCompany, loadStatsData]);

  // Refrescar cada 30 segundos de forma automática
  useEffect(() => {
    const interval = setInterval(() => {
      loadInitialData();
      loadStatsData(selectedCompany);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedCompany, loadInitialData, loadStatsData]);

  const timeAgo = (dateString?: string) => {
    if (!dateString) return "N/A";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "N/A";

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "hace unos segundos";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    return `hace ${diffDays} d`;
  };

  const isWazuhConnected = localStorage.getItem("wazuh_connected") === "true";

  if (error) {
    return (
      <div className="-m-6 p-6 min-h-screen bg-background text-destructive font-sans flex items-center justify-center">
        <div className="border border-destructive bg-destructive/10 p-8 rounded max-w-md text-center space-y-4">
          <p className="text-xl font-bold tracking-wider uppercase">⚠️ Alerta de Sistema</p>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="-m-6 p-6 min-h-screen bg-background text-foreground font-sans flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wider uppercase text-muted-foreground">Verificando estado del sistema...</span>
        </div>
      </div>
    );
  }

  if (!isWazuhConnected) {
    return (
      <div className="-m-6 p-6 min-h-[calc(100vh-3rem)] bg-background text-foreground font-sans flex items-center justify-center relative">
        <div 
          className="absolute inset-0 bg-no-repeat bg-center opacity-[0.02] pointer-events-none z-0 animate-shield-fracture" 
          style={{ 
            backgroundImage: "url('/images/broken-shield.png')",
            backgroundSize: "600px",
            backgroundPosition: "center 50%"
          }} 
        />
        
        <div className="relative z-10 w-full max-w-lg p-8 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl shadow-2xl text-center space-y-6 animate-fade-slide-up">
          <div className="mx-auto w-16 h-16 rounded-full border border-destructive/30 bg-destructive/10 flex items-center justify-center text-destructive shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold uppercase tracking-widest text-foreground font-mono">
              Conexión SIEM Inactiva
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El panel de control ejecutivo requiere una vinculación activa con Wazuh. Actualmente no se ha establecido ninguna conexión con la organización en el módulo defensivo.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-background/50 border border-border/40 text-left space-y-2 text-[10px] font-mono leading-relaxed">
            <span className="text-primary font-bold block uppercase tracking-wide">➔ Requisitos para el acceso:</span>
            <ul className="list-disc pl-4 text-zinc-400 space-y-1.5">
              <li>Configurar la URL del Indexer y del Manager API.</li>
              <li>Tener el agente Wazuh corriendo en el endpoint objetivo.</li>
              <li>Realizar el handshake de conexión exitoso en la pestaña defensiva.</li>
            </ul>
          </div>

          <Link
            to="/defensive"
            className="block w-full py-3 px-6 bg-primary text-primary-foreground text-center font-bold font-mono text-xs tracking-wider uppercase rounded-xl hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(0,255,65,0.15)] hover:shadow-[0_0_35px_rgba(0,255,65,0.35)] animate-bounce"
          >
            Vincular Servidor Wazuh
          </Link>
        </div>
      </div>
    );
  }

  // Determinar la severidad global basada en vulnerabilidades detectadas
  const getGlobalSeverityInfo = () => {
    const hasCritical = vulnerabilities.some(v => v.risk_level === "CRITICAL");
    const hasHigh = vulnerabilities.some(v => v.risk_level === "HIGH");
    
    if (hasCritical) {
      return {
        label: "ACCIÓN REQUERIDA",
        desc: "Se han identificado vulnerabilidades de nivel Crítico explotadas con éxito sin contramedidas activas.",
        color: "text-red-500",
        border: "border-red-500/40",
        bg: "bg-red-950/20",
        icon: <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
      };
    }
    if (hasHigh) {
      return {
        label: "RIESGO ALTO",
        desc: "Se han confirmado brechas graves de seguridad. Se recomienda aplicar medidas de hardening.",
        color: "text-orange-500",
        border: "border-orange-500/40",
        bg: "bg-orange-950/20",
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />
      };
    }
    return {
      label: "POSTURA ESTABLE",
      desc: "No se registran explotaciones exitosas recientes de nivel crítico. Mantenga el monitoreo rutinario.",
      color: "text-primary",
      border: "border-primary/30",
      bg: "bg-primary/5",
      icon: <ShieldCheck className="w-5 h-5 text-primary animate-pulse" />
    };
  };

  const severityStatus = getGlobalSeverityInfo();

  // Colores para el PieChart de Módulos
  const PIE_COLORS = ["#00FF41", "#3fb950", "#209cee", "#8b949e", "#ffdd57"];

  return (
    <div className="relative -m-6 p-6 min-h-[calc(100vh-3rem)] bg-background text-foreground font-sans pb-12 overflow-hidden">
      {/* Background dynamic Threads overlay */}
      <div className="absolute inset-0 z-[1] opacity-[0.12] pointer-events-none">
        <Threads color={[0.0, 0.45, 0.12]} amplitude={1.8} distance={0.25} enableMouseInteraction={true} />
      </div>
      
      <div className="relative z-10 space-y-6">
      <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/40 pb-4 transition-all duration-700 ${animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div>
          <h1 className="text-xl font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2 font-mono">
            <Shield className="w-6 h-6 text-primary shrink-0" />
            <Shuffle text="RESUMEN EJECUTIVO Y AUDITORÍA DE SEGURIDAD" className="text-xl font-extrabold text-foreground tracking-wider" triggerOnHover={true} />
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            Informe técnico y estado general de la postura defensiva
          </p>
        </div>
        
        {/* Selector de empresa a nivel ejecutivo */}
        <div className="flex items-center gap-2">
          <label htmlFor="company-select" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Organización:</label>
          <select
            id="company-select"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-card border border-border/80 text-foreground text-xs rounded-md px-3 py-1.5 focus:border-primary outline-none cursor-pointer font-semibold min-w-[160px]"
          >
            <option value="all">Todas las Empresas</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SEMÁFORO GLOBAL DE RIESGO */}
      <div className={`p-4 border ${severityStatus.border} ${severityStatus.bg} rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-700 ${animateGrid ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-start md:items-center gap-3">
          {severityStatus.icon}
          <div>
            <span className={`text-xs font-black tracking-widest uppercase ${severityStatus.color}`}>{severityStatus.label}</span>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{severityStatus.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 border-t border-border/20 md:border-0 pt-3 md:pt-0">
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono w-full md:w-auto">
            <div className="bg-background/40 border border-border px-3 py-1 rounded">
              <span className="text-muted-foreground block text-[8px] uppercase">Wazuh Manager</span>
              <span className={health.wazuh ? "text-primary font-bold" : "text-destructive font-bold"}>
                {health.wazuh ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <div className="bg-background/40 border border-border px-3 py-1 rounded">
              <span className="text-muted-foreground block text-[8px] uppercase">Kali Host</span>
              <span className={health.kali ? "text-primary font-bold" : "text-destructive font-bold"}>
                {health.kali ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA DE KPIs CON CONTADORES ANIMADOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="bg-card/40 border border-border/60 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 p-5 flex flex-col justify-between h-28 rounded-xl" spotlightColor="rgba(0, 255, 65, 0.12)">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Auditorías</span>
            <Flame className="w-4 h-4 text-primary animate-slow-rotate" />
          </div>
          <div className="w-full text-left">
            <span className="text-3xl font-extrabold text-foreground">
              <AnimatedCounter value={totalAttacks} />
            </span>
            <span className="text-[8px] text-muted-foreground block uppercase mt-0.5 tracking-wider">Ataques Simulados</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="bg-card/40 border border-border/60 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 p-5 flex flex-col justify-between h-28 rounded-xl" spotlightColor="rgba(0, 255, 65, 0.12)">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Ataques Hoy</span>
            <Activity className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div className="w-full text-left">
            <span className="text-3xl font-extrabold text-foreground">
              <AnimatedCounter value={todayAttacks} />
            </span>
            <span className="text-[8px] text-muted-foreground block uppercase mt-0.5 tracking-wider">Últimas 24 Horas</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="bg-card/40 border border-border/60 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 p-5 flex flex-col justify-between h-28 rounded-xl" spotlightColor="rgba(0, 255, 65, 0.12)">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Módulos Totales</span>
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="w-full text-left">
            <span className="text-3xl font-extrabold text-foreground">
              <AnimatedCounter value={totalTemplates} />
            </span>
            <span className="text-[8px] text-muted-foreground block uppercase mt-0.5 tracking-wider">Módulos del TFG</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="bg-card/40 border border-border/60 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 p-5 flex flex-col justify-between h-28 min-w-0 rounded-xl" spotlightColor="rgba(0, 255, 65, 0.12)">
          <div className="flex justify-between items-start w-full">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Último Log</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 w-full text-left">
            <span className="text-xs font-black truncate text-foreground block">
              {lastAttack ? lastAttack.name : "Sin ataques"}
            </span>
            <span className="text-[8px] text-muted-foreground block uppercase mt-0.5 tracking-wider font-mono">
              {lastAttack ? timeAgo(lastAttack.timestamp) : "N/A"}
            </span>
          </div>
        </SpotlightCard>
      </div>

      {/* GRÁFICOS EJECUTIVOS RECHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Línea temporal de ataques */}
        <Card className="bg-card/40 border border-border/60 backdrop-blur-xl xl:col-span-2">
          <CardHeader className="pb-2 border-b border-border/10">
            <CardTitle className="text-xs text-primary flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <span>📈</span> Tendencia de Amenazas y Simulaciones (30 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-64">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-mono">Sin actividad en este rango</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="execThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.15)" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderWidth: '1px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: 'hsl(var(--foreground))'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Ataques Realizados"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#execThreats)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribución por Categorías/Módulos */}
        <Card className="bg-card/40 border border-border/60 backdrop-blur-xl xl:col-span-1">
          <CardHeader className="pb-2 border-b border-border/10">
            <CardTitle className="text-xs text-primary flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <span>🍩</span> Distribución por Categorías
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-64 flex flex-col justify-center">
            {moduleData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-mono">Sin datos de distribución</span>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moduleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {moduleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderWidth: '1px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: 'hsl(var(--foreground))'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Leyenda manual compacta */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[9px] font-bold pb-2 text-zinc-400">
                  {moduleData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEGUNDA FILA DE DATOS EJECUTIVOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Gráfico 3: Severidad y Nivel de Riesgo */}
        <Card className="bg-card/40 border border-border/60 backdrop-blur-xl xl:col-span-1">
          <CardHeader className="pb-2 border-b border-border/10">
            <CardTitle className="text-xs text-primary flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <span>📊</span> Criticidad y Nivel de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-64">
            {severityData.length === 0 || severityData.every(s => s.count === 0) ? (
              <div className="h-full flex items-center justify-center">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-mono">Sin datos de criticidad</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.15)" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderWidth: '1px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      color: 'hsl(var(--foreground))'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, index) => {
                      let color = "#23d160"; // LOW
                      if (entry.name === "CRITICAL") color = "#ff3860";
                      else if (entry.name === "HIGH") color = "#ff8800";
                      else if (entry.name === "MEDIUM") color = "#209cee";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Listado: Top 5 Vulnerabilidades detectadas (Ataques con éxito) */}
        <Card className="bg-card/40 border border-border/60 backdrop-blur-xl xl:col-span-2 flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/10">
            <CardTitle className="text-xs text-primary flex items-center gap-1.5 uppercase font-bold tracking-wider">
              <span>🛑</span> Brechas Confirmadas y Mitigadas (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {vulnerabilities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10">
                <CheckCircle className="w-8 h-8 text-primary mb-2 animate-bounce" />
                <span className="text-primary font-bold text-[10px] uppercase tracking-widest">Sin vulnerabilidades confirmadas</span>
                <span className="text-zinc-500 text-[9px] mt-1 font-mono">Todos los ataques fueron mitigados o fallidos.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] text-muted-foreground uppercase border-b border-border/20 font-bold pb-2">
                      <th className="py-2">Identificador</th>
                      <th className="py-2">Vulnerabilidad</th>
                      <th className="py-2">Técnica MITRE</th>
                      <th className="py-2 text-center">Criticidad</th>
                      <th className="py-2 text-right">Fecha/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {vulnerabilities.map((v) => {
                      let colorClass = "text-emerald-400";
                      let bgClass = "bg-emerald-500/10 border-emerald-500/20";
                      if (v.risk_level === "CRITICAL") {
                        colorClass = "text-red-400";
                        bgClass = "bg-red-500/10 border-red-500/20";
                      } else if (v.risk_level === "HIGH") {
                        colorClass = "text-orange-400";
                        bgClass = "bg-orange-500/10 border-orange-500/20";
                      } else if (v.risk_level === "MEDIUM") {
                        colorClass = "text-sky-400";
                        bgClass = "bg-sky-500/10 border-sky-500/20";
                      }

                      return (
                        <tr key={v.id} className="hover:bg-primary/[0.02] border-b border-border/10">
                          <td className="py-2 font-mono text-[9px] text-muted-foreground">
                            CS-{v.mitre_id || "GEN"}-{v.id.slice(-4).toUpperCase()}
                          </td>
                          <td className="py-2 font-semibold text-foreground">
                            {v.attack_name}
                          </td>
                          <td className="py-2 font-mono text-[9px] text-primary/80">
                            {v.mitre_id || "N/A"}
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className={`text-[8px] font-bold uppercase tracking-wider ${colorClass} ${bgClass} px-1.5 py-0`}>
                              {v.risk_level || "LOW"}
                            </Badge>
                          </td>
                          <td className="py-2 text-right font-mono text-[9px] text-muted-foreground">
                            {new Date(v.timestamp).toLocaleString()}
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
      </div>

      {/* LOG DE ÚLTIMAS 5 OPERACIONES REALES */}
      <Card className="bg-card/40 border border-border/60 backdrop-blur-xl">
        <CardHeader className="pb-2 border-b border-border/10">
          <CardTitle className="text-xs text-primary flex items-center gap-1.5 uppercase font-bold tracking-wider">
            <span>📋</span> Histórico Reciente de Auditorías (Consola General)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recentOps.length === 0 ? (
            <p className="text-center text-muted-foreground uppercase py-6 border border-dashed border-border rounded text-[10px] font-mono">
              Sin operaciones de ataque registradas
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="font-sans text-[10px] uppercase text-foreground font-bold">Fecha/Hora</TableHead>
                    <TableHead className="font-sans text-[10px] uppercase text-foreground font-bold">Organización</TableHead>
                    <TableHead className="font-sans text-[10px] uppercase text-foreground font-bold">Vectores de Auditoría</TableHead>
                    <TableHead className="font-sans text-[10px] uppercase text-foreground font-bold">Módulo</TableHead>
                    <TableHead className="font-sans text-[10px] uppercase text-foreground font-bold text-center">Estado SSH</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOps.map((op, rIdx) => {
                    const exitCode = op.ssh_exit_code;
                    const isOk = exitCode === 0 || exitCode === "0";
                    return (
                      <TableRow
                        key={op._id}
                        className="border-b border-border/50 hover:bg-primary/5 transition-all"
                      >
                        <TableCell className="font-mono text-[9px] text-muted-foreground">
                          {new Date(op.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-sans text-xs text-foreground font-semibold">
                          {op.company_name}
                        </TableCell>
                        <TableCell className="font-sans text-xs text-foreground font-semibold">
                          {op.attack_name || op.attack_id}
                        </TableCell>
                        <TableCell className="font-mono text-[9px] text-muted-foreground">
                          {op.module || "UNKNOWN"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-sans text-[8px] px-2 py-0.5 rounded-full ${isOk ? "text-primary border-primary/30 bg-primary/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
                            {isOk ? "MITIGADO / OK" : "VULNERABLE / ERROR"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
