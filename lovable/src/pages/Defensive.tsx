import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, Activity, AlertTriangle, Globe, Server, Wifi,
  Lock, Eye, Zap, CheckCircle, XCircle, TrendingUp
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const firewalls = [
  { name: "Palo Alto Networks", status: "active", threats: 1247, uptime: "99.98%", icon: "🔥", throughput: "45 Gbps" },
  { name: "Fortinet FortiGate", status: "active", threats: 892, uptime: "99.95%", icon: "🛡️", throughput: "38 Gbps" },
  { name: "Check Point", status: "active", threats: 634, uptime: "99.99%", icon: "✓", throughput: "28 Gbps" },
  { name: "Cisco Firepower", status: "active", threats: 421, uptime: "99.92%", icon: "🌐", throughput: "22 Gbps" },
  { name: "Sophos XGS", status: "maintenance", threats: 156, uptime: "98.50%", icon: "⚡", throughput: "15 Gbps" },
];

const trafficData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  incoming: Math.floor(Math.random() * 500) + 200,
  blocked: Math.floor(Math.random() * 80) + 10,
  suspicious: Math.floor(Math.random() * 30) + 5,
}));

const threatAlerts = [
  { id: 1, type: "DDoS Attack", source: "185.234.XX.XX", status: "blocked", time: "Hace 12 min", severity: "critical" },
  { id: 2, type: "Port Scan", source: "92.118.XX.XX", status: "blocked", time: "Hace 28 min", severity: "high" },
  { id: 3, type: "Malware C2", source: "45.33.XX.XX", status: "blocked", time: "Hace 1h", severity: "critical" },
  { id: 4, type: "Brute Force SSH", source: "103.25.XX.XX", status: "blocked", time: "Hace 2h", severity: "high" },
  { id: 5, type: "SQL Injection", source: "192.168.XX.XX", status: "investigating", time: "Hace 3h", severity: "medium" },
  { id: 6, type: "Phishing Email", source: "spam@malicio.us", status: "quarantined", time: "Hace 4h", severity: "medium" },
];

const defenseRules = [
  { name: "Protección DDoS", desc: "Mitigación automática L3/L4/L7", enabled: true },
  { name: "IPS/IDS", desc: "Sistema de prevención de intrusiones", enabled: true },
  { name: "WAF", desc: "Firewall de aplicaciones web", enabled: true },
  { name: "Geo-Blocking", desc: "Bloqueo por ubicación geográfica", enabled: false },
  { name: "Rate Limiting", desc: "Limitación de tasa de peticiones", enabled: true },
  { name: "SSL Inspection", desc: "Inspección de tráfico cifrado", enabled: true },
  { name: "DNS Filtering", desc: "Filtrado de consultas DNS", enabled: true },
  { name: "Sandbox Analysis", desc: "Análisis en sandbox de archivos", enabled: false },
];

const threatRegions = [
  { region: "Asia-Pacífico", attacks: 4521, percentage: 38 },
  { region: "Europa del Este", attacks: 2894, percentage: 24 },
  { region: "América del Norte", attacks: 1876, percentage: 16 },
  { region: "América Latina", attacks: 1234, percentage: 10 },
  { region: "Otros", attacks: 1432, percentage: 12 },
];

const severityColor: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-neon-red/20 text-neon-red border-neon-red/30",
  medium: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
};

const Defensive = () => {
  const [rules, setRules] = useState(defenseRules);

  const toggleRule = (index: number) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-neon-cyan text-glow-cyan tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> MÓDULO DEFENSIVO
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Firewalls, monitoreo de tráfico y gestión de amenazas
        </p>
      </div>

      {/* Firewall Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {firewalls.map((fw) => (
          <Card key={fw.name} className={`border-primary/10 bg-card/60 hover:glow-cyan transition-shadow ${fw.status === "maintenance" ? "opacity-70" : ""}`}>
            <CardContent className="pt-4 pb-4 px-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg">{fw.icon}</span>
                {fw.status === "active" ? (
                  <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 text-[9px] font-mono">ACTIVO</Badge>
                ) : (
                  <Badge className="bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30 text-[9px] font-mono">MANT.</Badge>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-foreground leading-tight">{fw.name}</p>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                <div className="flex justify-between"><span>Amenazas:</span><span className="text-neon-cyan">{fw.threats.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Uptime:</span><span className="text-neon-green">{fw.uptime}</span></div>
                <div className="flex justify-between"><span>Throughput:</span><span className="text-foreground">{fw.throughput}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic Monitor + Threat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-primary/10 bg-card/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan" /> Monitor de Tráfico — 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(187, 100%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(187, 100%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(120, 40%, 15%)" />
                <XAxis dataKey="hour" tick={{ fill: 'hsl(120, 20%, 55%)', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(120, 40%, 15%)' }} interval={3} />
                <YAxis tick={{ fill: 'hsl(120, 20%, 55%)', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'hsl(120, 40%, 15%)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(0, 0%, 7%)', border: '1px solid hsl(120, 40%, 15%)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <Area type="monotone" dataKey="incoming" stroke="hsl(187, 100%, 45%)" fill="url(#incGrad)" strokeWidth={2} name="Entrante" />
                <Area type="monotone" dataKey="blocked" stroke="hsl(0, 100%, 50%)" fill="url(#blkGrad)" strokeWidth={2} name="Bloqueado" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Threat Origins */}
        <Card className="border-primary/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-neon-red" /> Origen de Amenazas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {threatRegions.map((r) => (
              <div key={r.region} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-foreground">{r.region}</span>
                  <span className="text-neon-red">{r.attacks.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-red to-neon-yellow"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Threat Alerts */}
        <Card className="border-primary/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-neon-red" /> Alertas de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {threatAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30">
                <div className="flex items-center gap-3">
                  {alert.status === "blocked" ? (
                    <CheckCircle className="w-4 h-4 text-neon-green shrink-0" />
                  ) : alert.status === "quarantined" ? (
                    <Lock className="w-4 h-4 text-neon-yellow shrink-0" />
                  ) : (
                    <Eye className="w-4 h-4 text-neon-cyan shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-mono text-foreground">{alert.type}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{alert.source} • {alert.time}</p>
                  </div>
                </div>
                <Badge className={`font-mono text-[10px] ${severityColor[alert.severity]}`}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Defense Rules */}
        <Card className="border-primary/10 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-neon-green" /> Reglas de Protección
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((rule, i) => (
              <div key={rule.name} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-neon-green animate-pulse" : "bg-muted-foreground"}`} />
                  <div>
                    <p className="text-xs font-mono text-foreground">{rule.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{rule.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(i)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Defensive;
