import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Shield, Server, Activity, Flame, ShieldAlert, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

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
      <div className="-m-6 p-6 min-h-screen bg-background text-destructive font-sans flex items-center justify-center">
        <div className="border border-destructive bg-destructive/10 p-8 rounded max-w-md text-center space-y-4">
          <p className="text-xl font-bold tracking-wider uppercase">⚠️ Alerta de Sistema</p>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats || !health) {
    return (
      <div className="-m-6 p-6 min-h-screen bg-background text-foreground font-sans flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wider uppercase text-muted-foreground">Verificando estado del sistema...</span>
        </div>
      </div>
    );
  }

  const isWazuhConnected = localStorage.getItem("wazuh_connected") === "true";

  if (!isWazuhConnected) {
    return (
      <div className="-m-6 p-6 min-h-[calc(100vh-3rem)] bg-background text-foreground font-sans flex items-center justify-center relative">
        {/* Shield outline watermark */}
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

          <div className="p-4 rounded-lg bg-background/50 border border-border/40 text-left space-y-2 text-2xs font-mono">
            <span className="text-primary font-bold block uppercase tracking-wide">➔ Requisitos para el acceso:</span>
            <ul className="list-disc pl-4 text-zinc-400 space-y-1.5">
              <li>Configurar la URL del Indexer y del Manager API.</li>
              <li>Tener el agente Wazuh corriendo en el endpoint objetivo.</li>
              <li>Realizar el handshake de conexión exitoso.</li>
            </ul>
          </div>

          <Link
            to="/defensive"
            className="block w-full py-3 px-6 bg-primary text-primary-foreground text-center font-bold font-mono text-xs tracking-wider uppercase rounded-xl hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(0,255,65,0.15)] hover:shadow-[0_0_35px_rgba(0,255,65,0.35)]"
          >
            Vincular Servidor Wazuh
          </Link>
        </div>
      </div>
    );
  }

  const getChartData = () => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dataMap: Record<string, { day: string; amenazas: number; bloqueadas: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      dataMap[dayName] = { day: dayName, amenazas: 0, bloqueadas: 0 };
    }

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

  const calculateSecurityScore = () => {
    let base = 100;
    base -= (stats.todayAttacks * 15);
    if (!health.wazuh) base -= 25;
    if (!health.mongodb) base -= 30;
    if (!health.kali) base -= 20;
    if (!health.n8n) base -= 15;
    return Math.max(base, 10);
  };

  const securityScore = calculateSecurityScore();
  const radius = 35;
  const strokeDashoffset = 2 * Math.PI * radius * (1 - securityScore / 100);

  return (
    <div className="-m-6 p-6 min-h-[calc(100vh-3rem)] bg-background text-foreground font-sans space-y-8 pb-12">
      <div className={`transition-all duration-700 ${animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <h1 className="text-2xl font-extrabold uppercase tracking-wider text-foreground">
          🛡️ RESUMEN EJECUTIVO DE SEGURIDAD
        </h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase">
          Estado General del SIEM / Validador de Seguridad CyberShield
        </p>
      </div>

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
            className={`flex items-center justify-between p-4 border border-border bg-card/40 backdrop-blur-xl rounded transition-all duration-700 ${
              animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="text-sm font-bold uppercase tracking-wider text-foreground">{sys.name}</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sys.status ? 'bg-primary' : 'bg-destructive'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sys.status ? 'bg-primary' : 'bg-destructive'}`}></span>
              </span>
              <span className={`text-xs font-bold uppercase ${sys.status ? 'text-primary' : 'text-destructive'}`}>
                {sys.status ? "ACTIVO" : "CAÍDO"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          style={{ animationDelay: "150ms" }}
          className={`relative p-5 border border-border bg-card/40 rounded flex flex-col items-center justify-between h-36 overflow-hidden md:col-span-1 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-primary/20 animate-radar-sonar pointer-events-none" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest z-10">Security Score</span>
          
          <div className="relative flex items-center justify-center w-24 h-24 z-10">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r={radius} stroke="hsl(var(--border))" strokeWidth="4" fill="transparent" />
              <circle
                cx="40"
                cy="40"
                r={radius}
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={2 * Math.PI * radius}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-sm font-bold text-foreground">
              {securityScore}%
            </div>
          </div>
        </div>

        <div
          style={{ animationDelay: "200ms" }}
          className={`p-5 border border-border bg-card/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Ataques Ejecutados</span>
            <Flame className="w-4 h-4 text-primary animate-slow-rotate" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-bold text-foreground">
              {stats.totalAttacks}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Histórico</span>
          </div>
        </div>

        <div
          style={{ animationDelay: "250ms" }}
          className={`p-5 border border-border bg-card/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Ataques Hoy</span>
            <Activity className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-bold text-foreground">
              {stats.todayAttacks}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Últimas 24 Horas</span>
          </div>
        </div>

        <div
          style={{ animationDelay: "300ms" }}
          className={`p-5 border border-border bg-card/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Módulos Disponibles</span>
            <Shield className="w-4 h-4 text-primary animate-slow-rotate hover:animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-3xl font-bold text-foreground">
              {stats.totalTemplates}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Módulos Activos</span>
          </div>
        </div>

        <div
          style={{ animationDelay: "350ms" }}
          className={`p-5 border border-border bg-card/40 rounded flex flex-col justify-between h-36 transition-all duration-700 ${
            animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Último Ataque</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold truncate text-foreground">{stats.lastAttack?.name || "N/A"}</span>
            <span className="text-[10px] text-muted-foreground">{stats.lastAttack ? timeAgo(stats.lastAttack.timestamp) : ""}</span>
          </div>
        </div>
      </div>

      <div
        style={{ animationDelay: "400ms" }}
        className={`border border-border bg-card/40 p-5 rounded transition-all duration-700 ${
          animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground flex items-center gap-1.5">
          <span>📊</span> Gráfico de Amenazas (Últimos 7 días)
        </h2>
        <div className="h-64 flex items-center justify-center">
          {recentOps.length === 0 ? (
            <span className="text-muted-foreground uppercase tracking-wider text-xs font-bold">Sin actividad reciente</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.2)" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderWidth: '1px',
                    borderRadius: '6px',
                    backdropFilter: 'blur(8px)',
                    fontFamily: 'sans-serif',
                    fontSize: '11px',
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="amenazas"
                  name="Amenazas Simuladas"
                  stroke="hsl(var(--primary))"
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
                  stroke="hsl(var(--secondary))"
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

      <div
        style={{ animationDelay: "450ms" }}
        className={`border border-border bg-card/40 p-5 rounded transition-all duration-700 ${
          animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground flex items-center gap-1.5">
          <span>📜</span> Últimas 5 Operaciones
        </h2>
        {recentOps.length === 0 ? (
          <p className="text-center text-muted-foreground uppercase py-6 border border-dashed border-border rounded text-xs font-semibold">
            Sin operaciones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="font-sans text-xs uppercase text-foreground font-bold">Fecha/Hora</TableHead>
                  <TableHead className="font-sans text-xs uppercase text-foreground font-bold">Ataque</TableHead>
                  <TableHead className="font-sans text-xs uppercase text-foreground font-bold">Módulo</TableHead>
                  <TableHead className="font-sans text-xs uppercase text-foreground font-bold">Exit Code</TableHead>
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
                      className={`border-b border-border/50 hover:bg-primary/5 transition-all duration-700 ${
                        animateGrid ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(op.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-sans text-xs text-foreground font-semibold">
                        {op.attack_name || op.attack_id}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {op.module || "UNKNOWN"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-sans text-[10px] px-2 py-0.5 rounded ${isOk ? "text-primary border-primary/30 bg-primary/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
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
