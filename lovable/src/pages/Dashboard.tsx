import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Shield, Server, Activity, Flame, ShieldAlert, Cpu } from "lucide-react";

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

// Componente contador dinámico que se anima de 0 a valor en 1.5s
const AnimatedCounter = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1500;
    const incrementTime = Math.max(Math.floor(duration / end), 15);
    
    const timer = setInterval(() => {
      const increment = Math.ceil(end / (duration / incrementTime));
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animateGrid, setAnimateGrid] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/health")
      ]);

      if (!statsRes.ok || !healthRes.ok) {
        throw new Error("Error conectando con el servidor");
      }

      const statsData = await statsRes.json();
      const healthData = await healthRes.json();

      if (!statsData.success || !healthData.success) {
        throw new Error("Error conectando con el servidor");
      }

      setStats(statsData.stats);
      setHealth(healthData.services);
      setError(null);
      // Trigger entrance stagger
      setTimeout(() => setAnimateGrid(true), 50);
    } catch (err) {
      console.error(err);
      setError("Error conectando con el servidor");
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadData]);

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

  if (error) {
    return (
      <div className="-m-6 p-6 min-h-screen bg-[#0a0a0a] text-red-500 font-mono flex items-center justify-center">
        <div className="border border-red-500 bg-red-950/20 p-8 rounded max-w-md text-center space-y-4">
          <p className="text-xl font-bold tracking-wider uppercase">⚠️ Alerta de Sistema</p>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats || !health) {
    return (
      <div className="-m-6 p-6 min-h-screen bg-[#0a0a0a] text-[#00ff41] font-mono flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00ff41] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm tracking-wider uppercase">Verificando estado del sistema...</span>
        </div>
      </div>
    );
  }

  // Generar data del AreaChart
  const getChartData = () => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dataMap: Record<string, { day: string; amenazas: number; bloqueadas: number }> = {};
    
    // Inicializar últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      dataMap[dayName] = { day: dayName, amenazas: 0, bloqueadas: 0 };
    }

    // Agrupar ataques y simulaciones exitosas
    (stats.recentOps || []).forEach(op => {
      const opDate = new Date(op.timestamp);
      const dayName = days[opDate.getDay()];
      if (dataMap[dayName]) {
        dataMap[dayName].amenazas += 1;
        if (op.ssh_exit_code === 0) {
          dataMap[dayName].bloqueadas += 1;
        }
      }
    });

    return Object.values(dataMap);
  };

  const chartData = getChartData();
  const recentOps = stats.recentOps || [];

  // Calcular Security Score Dinámico
  const calculateSecurityScore = () => {
    let base = 100;
    base -= (stats.todayAttacks * 15); // Ataques hoy restan
    if (!health.wazuh) base -= 25;
    if (!health.kali) base -= 20;
    if (!health.n8n) base -= 15;
    return Math.max(base, 10);
  };

  const securityScore = calculateSecurityScore();
  const radius = 35;
  const strokeDashoffset = 2 * Math.PI * radius * (1 - securityScore / 100);

  return (
    <div className="-m-6 p-6 min-h-screen bg-[#0a0a0a] text-[#00ff41] font-mono space-y-8">
      {/* Cabecera del Resumen Ejecutivo */}
      <div className={`transition-all duration-700 ${animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <h1 className="text-3xl font-bold uppercase tracking-wider text-glow-green text-[#00ff41]">
          🛡️ RESUMEN EJECUTIVO DE SEGURIDAD
        </h1>
        <p className="text-xs text-[#00ff41]/70 mt-1 uppercase">
          Estado General del SIEM / Validador de Seguridad CyberShield
        </p>
      </div>

      {/* SECCIÓN 1 — Estado de Sistemas (fila de 4 badges) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "MongoDB", status: health.mongodb },
          { name: "n8n", status: health.n8n },
          { name: "Kali Linux", status: health.kali },
          { name: "Wazuh", status: health.wazuh }
        ].map((sys, idx) => (
          <div
            key={sys.name}
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`flex items-center justify-between p-4 border border-[#00ff41]/20 bg-black/60 rounded transition-all duration-700 ${
              animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="text-sm font-bold uppercase tracking-wider">{sys.name}</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sys.status ? 'bg-[#00ff41]' : 'bg-red-500'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sys.status ? 'bg-[#00ff41]' : 'bg-red-500'}`}></span>
              </span>
              <span className={`text-xs font-bold ${sys.status ? 'text-[#00ff41]' : 'text-red-500'}`}>
                {sys.status ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* SECCIÓN 2 — KPIs principales (fila de 4 tarjetas + Security Score Widget) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Security Score Widget con Radar Sonar Pulse */}
        <div
          style={{ animationDelay: "150ms" }}
          className={`relative p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col items-center justify-between h-36 overflow-hidden md:col-span-1 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Radar Sonar Pulse Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-[#00ff41]/40 animate-radar-sonar pointer-events-none" />
          <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest z-10">Security Score</span>
          <div className="relative flex items-center justify-center z-10 mt-1">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r={radius} fill="transparent" stroke="rgba(0,255,65,0.08)" strokeWidth="4" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="transparent"
                stroke="#00ff41"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * radius}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-sm font-bold text-glow-green">
              {animateGrid ? <AnimatedCounter value={securityScore} /> : 0}%
            </div>
          </div>
        </div>

        {/* Total de ataques ejecutados */}
        <div
          style={{ animationDelay: "200ms" }}
          className={`p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Ataques Ejecutados</span>
            <Flame className="w-4 h-4 text-[#00ff41] animate-slow-rotate" />
          </div>
          <span className="text-3xl font-bold text-glow-green">
            {animateGrid ? <AnimatedCounter value={stats.totalAttacks} /> : 0}
          </span>
        </div>

        {/* Ataques hoy */}
        <div
          style={{ animationDelay: "250ms" }}
          className={`p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Ataques Hoy</span>
            <Activity className="w-4 h-4 text-[#00ff41] animate-pulse" />
          </div>
          <span className="text-3xl font-bold text-glow-green">
            {animateGrid ? <AnimatedCounter value={stats.todayAttacks} /> : 0}
          </span>
        </div>

        {/* Módulos disponibles */}
        <div
          style={{ animationDelay: "300ms" }}
          className={`p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Módulos Disponibles</span>
            <Shield className="w-4 h-4 text-[#00ff41] animate-slow-rotate hover:animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <span className="text-3xl font-bold text-glow-green">
            {animateGrid ? <AnimatedCounter value={stats.totalTemplates} /> : 0}
          </span>
        </div>

        {/* Último ataque */}
        <div
          style={{ animationDelay: "350ms" }}
          className={`p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Último Ataque</span>
            <Cpu className="w-4 h-4 text-[#00ff41]" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold truncate text-[#00ff41]">{stats.lastAttack?.name || "N/A"}</span>
            <span className="text-[10px] text-[#00ff41]/70">{stats.lastAttack ? timeAgo(stats.lastAttack.timestamp) : ""}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3 — Gráfico de actividad (AreaChart Cyberpunk con gradiente shimmer) */}
      <div
        style={{ animationDelay: "400ms" }}
        className={`border border-[#00ff41]/20 bg-black/40 p-5 rounded transition-all duration-700 ${
          animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#00ff41] flex items-center gap-1.5">
          <span>📊</span> Gráfico de Amenazas (Últimos 7 días)
        </h2>
        <div className="h-64 flex items-center justify-center">
          {recentOps.length === 0 ? (
            <span className="text-[#00ff41]/60 uppercase tracking-wider text-sm font-bold">Sin actividad reciente</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff41" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 65, 0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#00ff41" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#00ff41" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 10, 0.85)',
                    borderColor: '#00ff41',
                    borderWidth: '1px',
                    borderRadius: '4px',
                    backdropFilter: 'blur(8px)',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#00ff41'
                  }}
                  itemStyle={{ color: '#00ff41' }}
                />
                <Area
                  type="monotone"
                  dataKey="amenazas"
                  name="Amenazas Simuladas"
                  stroke="#00ff41"
                  fillOpacity={1}
                  fill="url(#gradientThreats)"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={2000}
                />
                <Area
                  type="monotone"
                  dataKey="bloqueadas"
                  name="Detecciones Exitosas"
                  stroke="#00e5ff"
                  fillOpacity={1}
                  fill="url(#gradientBlocked)"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECCIÓN 4 — Últimas 5 operaciones (staggered delay en filas) */}
      <div
        style={{ animationDelay: "450ms" }}
        className={`border border-[#00ff41]/20 bg-black/40 p-5 rounded transition-all duration-700 ${
          animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#00ff41] flex items-center gap-1.5">
          <span>📜</span> Últimas 5 Operaciones
        </h2>
        {recentOps.length === 0 ? (
          <p className="text-center text-[#00ff41]/60 uppercase py-6 border border-dashed border-[#00ff41]/20 rounded">
            Sin operaciones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#00ff41]/20 hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase text-[#00ff41] font-bold">Fecha/Hora</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#00ff41] font-bold">Ataque</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#00ff41] font-bold">Módulo</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-[#00ff41] font-bold">Exit Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOps.map((op, rIdx) => {
                  const exitCode = op.exit_code !== undefined ? op.exit_code : op.ssh_exit_code;
                  const isOk = exitCode === 0 || exitCode === "0";
                  return (
                    <TableRow
                      key={op._id}
                      style={{
                        animationDelay: `${rIdx * 100 + 500}ms`
                      }}
                      className={`border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 transition-all duration-700 ${
                        animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-[#00ff41]/80">
                        {new Date(op.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white font-bold">
                        {op.attack_name || op.attack_id}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#00ff41]/80">
                        {op.module || "UNKNOWN"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[10px] px-2 py-0.5 rounded ${isOk ? "text-[#00ff41] border-[#00ff41]/30 bg-[#00ff41]/10" : "text-red-500 border-red-500/30 bg-red-950/20"}`}>
                          {isOk ? "OK" : "ERROR"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
