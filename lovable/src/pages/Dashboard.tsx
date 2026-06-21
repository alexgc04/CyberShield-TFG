import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useCallback } from "react";
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

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      console.error(err);
      setError("Error conectando con el servidor");
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Llama a GET /api/health y /api/stats cada 30 segundos
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

  const chartData = (stats.attacksByModule || []).map(m => ({
    name: m._id,
    ataques: m.count
  }));

  const recentOps = stats.recentOps || [];

  return (
    <div className="-m-6 p-6 min-h-screen bg-[#0a0a0a] text-[#00ff41] font-mono space-y-8">
      {/* Cabecera del Resumen Ejecutivo */}
      <div>
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
        ].map((sys) => (
          <div key={sys.name} className="flex items-center justify-between p-4 border border-[#00ff41]/20 bg-black/60 rounded">
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

      {/* SECCIÓN 2 — KPIs principales (fila de 4 tarjetas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de ataques ejecutados */}
        <div className="p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Ataques Ejecutados</span>
          <span className="text-3xl font-bold">{stats.totalAttacks}</span>
        </div>

        {/* Ataques hoy */}
        <div className="p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Ataques Hoy</span>
          <span className="text-3xl font-bold">{stats.todayAttacks}</span>
        </div>

        {/* Módulos disponibles */}
        <div className="p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Módulos Disponibles</span>
          <span className="text-3xl font-bold">{stats.totalTemplates}</span>
        </div>

        {/* Último ataque */}
        <div className="p-5 border border-[#00ff41]/20 bg-black/40 rounded flex flex-col justify-between h-28">
          <span className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest">Último Ataque</span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-bold truncate text-[#00ff41]">{stats.lastAttack?.name || "N/A"}</span>
            <span className="text-[10px] text-[#00ff41]/70">{stats.lastAttack ? timeAgo(stats.lastAttack.timestamp) : ""}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3 — Gráfico de actividad */}
      <div className="border border-[#00ff41]/20 bg-black/40 p-5 rounded">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#00ff41]">
          📊 Gráfico de Actividad (Últimos 7 días)
        </h2>
        <div className="h-64 flex items-center justify-center">
          {chartData.length === 0 ? (
            <span className="text-[#00ff41]/60 uppercase tracking-wider text-sm font-bold">Sin actividad reciente</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 65, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#00ff41" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#00ff41" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#00ff41' }}
                  itemStyle={{ color: '#00ff41' }}
                />
                <Bar dataKey="ataques" fill="#00ff41" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECCIÓN 4 — Últimas 5 operaciones */}
      <div className="border border-[#00ff41]/20 bg-black/40 p-5 rounded">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#00ff41]">
          📜 Últimas 5 Operaciones
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
                {recentOps.map((op) => {
                  const exitCode = op.exit_code !== undefined ? op.exit_code : op.ssh_exit_code;
                  const isOk = exitCode === 0 || exitCode === "0";
                  return (
                    <TableRow key={op._id} className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5">
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
