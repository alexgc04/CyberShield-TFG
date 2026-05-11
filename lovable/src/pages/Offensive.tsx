import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Crosshair, Network, Wifi, Code2, Play, Terminal, ShieldAlert, Radio,
  KeyRound, EyeOff, Users, Workflow, Cable, Zap, Activity, Binary,
  Wifi as WifiIcon, CheckCircle2, XCircle, CircleDot,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WEBHOOK_URL = "http://localhost:5678/webhook-test/ejecutar-ataque";

type ConnState = "idle" | "sending" | "success" | "error";
interface LogEntry {
  ts: string;
  level: "info" | "success" | "error";
  message: string;
}

type Severity = "critical" | "high" | "medium" | "low";

interface AttackParam {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
}

interface AttackCard {
  id: string;
  name: string;
  desc: string;
  icon: typeof Crosshair;
  severity: Severity;
  category: string;
  params: AttackParam[];
}

const lanAttacks: AttackCard[] = [
  {
    id: "mac-flooding",
    name: "MAC Flooding",
    desc: "Saturar la tabla CAM del switch para forzar modo hub",
    icon: Network,
    severity: "high",
    category: "Capa 2",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "tun0", defaultValue: "tun0" },
      { key: "count", label: "Cantidad de paquetes", placeholder: "5000", defaultValue: "5000" },
    ],
  },
  {
    id: "port-stealing",
    name: "Switch Port Stealing",
    desc: "Robo de puerto mediante envenenamiento de tabla CAM",
    icon: Cable,
    severity: "high",
    category: "Capa 2",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "eth0", defaultValue: "eth0" },
      { key: "target", label: "MAC Víctima", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "span-mirror",
    name: "SPAN / Port Mirror",
    desc: "Detección y abuso de puertos espejo",
    icon: Activity,
    severity: "medium",
    category: "Monitoreo",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "eth0", defaultValue: "eth0" },
      { key: "vlan", label: "VLAN ID", placeholder: "10" },
    ],
  },
  {
    id: "covert-channel",
    name: "Túneles / Canales Encubiertos",
    desc: "Exfiltración de información por canales ocultos (DNS, ICMP)",
    icon: Binary,
    severity: "critical",
    category: "Exfiltración",
    params: [
      { key: "protocol", label: "Protocolo", placeholder: "dns | icmp", defaultValue: "dns" },
      { key: "target", label: "Servidor C2", placeholder: "c2.attacker.com" },
      { key: "payload", label: "Payload", placeholder: "/etc/passwd" },
    ],
  },
];

const wirelessAttacks: AttackCard[] = [
  {
    id: "deauth",
    name: "Des-autenticación",
    desc: "Envío de tramas de deauth para desconectar clientes",
    icon: ShieldAlert,
    severity: "high",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz Mon", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID AP", placeholder: "AA:BB:CC:DD:EE:FF" },
      { key: "client", label: "MAC Cliente", placeholder: "broadcast" },
    ],
  },
  {
    id: "fake-auth",
    name: "Falsa Autenticación",
    desc: "Asociación fraudulenta contra el AP objetivo",
    icon: KeyRound,
    severity: "medium",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "cts-frame",
    name: "CTS Frame Attack",
    desc: "Inyección de tramas CTS para denegación de servicio",
    icon: Radio,
    severity: "high",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "duration", label: "Duración (s)", placeholder: "30" },
    ],
  },
  {
    id: "beacon-flood",
    name: "Beacon Flood Mode",
    desc: "Inundación de SSIDs falsos en el espectro",
    icon: Wifi,
    severity: "medium",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "ssidList", label: "Archivo SSIDs", placeholder: "/usr/share/ssids.txt" },
    ],
  },
  {
    id: "dissoc-amok",
    name: "Dissociation Amok",
    desc: "Disociación masiva de clientes conectados",
    icon: Zap,
    severity: "high",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "michael-shutdown",
    name: "Michael Shutdown",
    desc: "Explotación de TKIP/Michael MIC failure",
    icon: ShieldAlert,
    severity: "critical",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID TKIP", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "handshake-capture",
    name: "Captura/Análisis Handshake",
    desc: "Captura del 4-way handshake WPA/WPA2",
    icon: Activity,
    severity: "high",
    category: "Handshake",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "channel", label: "Canal", placeholder: "6" },
      { key: "output", label: "Archivo salida", placeholder: "capture.pcap" },
    ],
  },
  {
    id: "brute-force",
    name: "Fuerza Bruta / Diccionario",
    desc: "Crackeo offline de handshake con wordlist",
    icon: KeyRound,
    severity: "high",
    category: "Ataque",
    params: [
      { key: "capture", label: "Archivo Handshake", placeholder: "capture.pcap" },
      { key: "wordlist", label: "Diccionario", placeholder: "rockyou.txt" },
    ],
  },
  {
    id: "evil-twin",
    name: "Evil Twin",
    desc: "AP gemelo malicioso para captura de credenciales",
    icon: Users,
    severity: "critical",
    category: "Ataque",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "ssid", label: "SSID a clonar", placeholder: "CorpWiFi" },
      { key: "channel", label: "Canal", placeholder: "6" },
    ],
  },
  {
    id: "pmkid",
    name: "Clientless PMKID",
    desc: "Ataque PMKID sin necesidad de cliente conectado",
    icon: KeyRound,
    severity: "high",
    category: "Ataque",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "hidden-ssid",
    name: "Redes Ocultas",
    desc: "Descubrimiento de SSIDs ocultos",
    icon: EyeOff,
    severity: "low",
    category: "Ataque",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID objetivo", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
  {
    id: "wps-attack",
    name: "Ataques WPS",
    desc: "Pixie Dust y fuerza bruta de PIN WPS",
    icon: KeyRound,
    severity: "high",
    category: "WPS",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "AA:BB:CC:DD:EE:FF" },
      { key: "method", label: "Método", placeholder: "pixie | brute", defaultValue: "pixie" },
    ],
  },
  {
    id: "wep-attack",
    name: "Ataques WEP",
    desc: "Crackeo de cifrado WEP (ARP replay, chopchop)",
    icon: KeyRound,
    severity: "critical",
    category: "WEP",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "AA:BB:CC:DD:EE:FF" },
    ],
  },
];

const scapyAttacks: AttackCard[] = [
  {
    id: "scapy-intro",
    name: "Introducción a Scapy",
    desc: "Script base de inicialización y carga de módulos",
    icon: Code2,
    severity: "low",
    category: "Fundamentos",
    params: [
      { key: "version", label: "Versión Scapy", placeholder: "2.5.0", defaultValue: "2.5.0" },
    ],
  },
  {
    id: "scapy-layers",
    name: "Fundamentos y Capas",
    desc: "Manipulación de capas Ethernet, IP, TCP, UDP",
    icon: Workflow,
    severity: "low",
    category: "Fundamentos",
    params: [
      { key: "layer", label: "Capa objetivo", placeholder: "Ethernet | IP | TCP" },
    ],
  },
  {
    id: "scapy-craft",
    name: "Creación y Captura",
    desc: "Crafting de paquetes personalizados y sniffing",
    icon: Binary,
    severity: "medium",
    category: "Paquetes",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "eth0", defaultValue: "eth0" },
      { key: "filter", label: "BPF Filter", placeholder: "tcp port 80" },
      { key: "count", label: "Cantidad", placeholder: "100" },
    ],
  },
  {
    id: "scapy-scan",
    name: "Escaneo y Vulnerabilidades",
    desc: "Detección de hosts y servicios vulnerables",
    icon: Crosshair,
    severity: "high",
    category: "Escaneo",
    params: [
      { key: "target", label: "Rango/IP", placeholder: "192.168.1.0/24" },
      { key: "ports", label: "Puertos", placeholder: "1-1024" },
    ],
  },
  {
    id: "scapy-automation",
    name: "Automatización Avanzada",
    desc: "Scripts encadenados disparados por n8n",
    icon: Workflow,
    severity: "high",
    category: "Automatización",
    params: [
      { key: "workflow", label: "ID Workflow n8n", placeholder: "wf_recon_full" },
      { key: "target", label: "Objetivo", placeholder: "10.0.0.0/24" },
      { key: "schedule", label: "Cron", placeholder: "0 */6 * * *" },
    ],
  },
];

const severityStyles: Record<Severity, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-neon-red/20 text-neon-red border-neon-red/30",
  medium: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
  low: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
};

const AttackGrid = ({
  attacks,
  onSelect,
}: {
  attacks: AttackCard[];
  onSelect: (a: AttackCard) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {attacks.map((a) => (
      <button
        key={a.id}
        onClick={() => onSelect(a)}
        className="text-left group rounded-lg border border-primary/15 bg-card/60 hover:border-primary/50 hover:bg-primary/5 hover:glow-green transition-all p-4 flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="p-2 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/20">
            <a.icon className="w-4 h-4 text-primary" />
          </div>
          <Badge className={`font-mono text-[10px] ${severityStyles[a.severity]}`}>
            {a.severity.toUpperCase()}
          </Badge>
        </div>
        <div>
          <p className="text-xs font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {a.category}
          </p>
          <p className="text-sm font-mono font-semibold text-foreground group-hover:text-primary">
            {a.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{a.desc}</p>
        </div>
      </button>
    ))}
  </div>
);

const Offensive = () => {
  const [selected, setSelected] = useState<AttackCard | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const [connState, setConnState] = useState<ConnState>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: new Date().toLocaleTimeString(), level: "info", message: "Consola inicializada. Esperando comandos..." },
  ]);

  const pushLog = (level: LogEntry["level"], message: string) =>
    setLogs((prev) => [...prev.slice(-49), { ts: new Date().toLocaleTimeString(), level, message }]);

  const handleSelect = (a: AttackCard) => {
    const defaults: Record<string, string> = {};
    a.params.forEach((p) => {
      if (p.defaultValue) defaults[p.key] = p.defaultValue;
    });
    setParamValues(defaults);
    setSelected(a);
  };

  const handleLaunch = async () => {
    if (!selected) return;
    setLaunching(true);
    setConnState("sending");

    const payload = {
      task_name: selected.name,
      params: paramValues,
    };

    pushLog("info", `POST ${WEBHOOK_URL}`);
    pushLog("info", `Payload → ${JSON.stringify(payload)}`);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text().catch(() => "");
      setConnState("success");
      pushLog("success", `✔ Webhook respondió ${res.status}${text ? ` · ${text.slice(0, 120)}` : ""}`);
      toast({
        title: `[n8n] Workflow disparado: ${selected.name}`,
        description: "Petición enviada correctamente.",
      });
      setSelected(null);
    } catch (err: any) {
      setConnState("error");
      pushLog("error", `✘ Error de envío: ${err?.message || "fallo desconocido"}`);
      toast({
        title: "Error al enviar al webhook",
        description: err?.message || "No se pudo conectar con n8n.",
        variant: "destructive",
      });
    } finally {
      setLaunching(false);
    }
  };

  const connBadge = {
    idle: { label: "INACTIVO", color: "bg-muted/30 text-muted-foreground border-muted/40", dot: "bg-muted-foreground" },
    sending: { label: "ENVIANDO...", color: "bg-blue-500/20 text-blue-300 border-blue-500/40", dot: "bg-blue-400 animate-pulse" },
    success: { label: "CONECTADO", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400" },
    error: { label: "ERROR", color: "bg-red-500/20 text-red-300 border-red-500/40", dot: "bg-red-400" },
  }[connState];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider flex items-center gap-2">
          <Crosshair className="w-6 h-6" /> MÓDULOS OFENSIVOS
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Catálogo de ataques · configuración de parámetros · ejecución vía n8n
        </p>
      </div>

      {/* Estado de Conexión */}
      <Card className="border-slate-700/60 bg-slate-900/60">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-slate-800 border border-slate-700">
              <WifiIcon className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Estado de Conexión · n8n Webhook
              </p>
              <p className="text-xs font-mono text-slate-300 break-all">{WEBHOOK_URL}</p>
            </div>
          </div>
          <Badge className={`font-mono text-[10px] gap-1.5 ${connBadge.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connBadge.dot}`} />
            {connBadge.label}
          </Badge>
        </CardContent>
      </Card>

      <Tabs defaultValue="lan" className="w-full">
        <TabsList className="bg-card/60 border border-primary/20 p-1 h-auto flex-wrap">
          <TabsTrigger
            value="lan"
            className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:glow-green gap-2"
          >
            <Network className="w-4 h-4" /> Infraestructura LAN
          </TabsTrigger>
          <TabsTrigger
            value="wireless"
            className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:glow-green gap-2"
          >
            <Wifi className="w-4 h-4" /> Auditoría Wireless
          </TabsTrigger>
          <TabsTrigger
            value="scapy"
            className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:glow-green gap-2"
          >
            <Code2 className="w-4 h-4" /> Laboratorio Scapy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lan" className="mt-6">
          <Card className="border-primary/15 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4" /> Ataques a Infraestructura LAN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttackGrid attacks={lanAttacks} onSelect={handleSelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wireless" className="mt-6">
          <Card className="border-primary/15 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-4 h-4" /> Handshake · Ataques · WPS · WEP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttackGrid attacks={wirelessAttacks} onSelect={handleSelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scapy" className="mt-6">
          <Card className="border-primary/15 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <Code2 className="w-4 h-4" /> Scripts y Automatización Scapy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttackGrid attacks={scapyAttacks} onSelect={handleSelect} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consola de logs */}
      <Card className="border-slate-700/60 bg-slate-950/80">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Consola de Salida
          </CardTitle>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300"
          >
            Limpiar
          </button>
        </CardHeader>
        <CardContent>
          <div className="bg-black/60 border border-slate-800 rounded-md p-3 font-mono text-[11px] max-h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p className="text-slate-600">// Sin entradas</p>
            ) : (
              logs.map((l, i) => {
                const Icon =
                  l.level === "success" ? CheckCircle2 : l.level === "error" ? XCircle : CircleDot;
                const color =
                  l.level === "success"
                    ? "text-emerald-400"
                    : l.level === "error"
                    ? "text-red-400"
                    : "text-slate-400";
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">[{l.ts}]</span>
                    <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${color}`} />
                    <span className={`${color} break-all`}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="bg-card border-l border-primary/30 w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-primary text-glow-green flex items-center gap-2">
                  <selected.icon className="w-5 h-5" /> {selected.name}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selected.desc}
                </SheetDescription>
                <div className="flex gap-2 pt-2">
                  <Badge className={`font-mono text-[10px] ${severityStyles[selected.severity]}`}>
                    {selected.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                    {selected.category}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Parámetros del ataque
                </p>
                {selected.params.map((p) => (
                  <div key={p.key} className="space-y-1.5">
                    <Label htmlFor={p.key} className="font-mono text-xs text-foreground">
                      {`{{${p.key}}}`} — {p.label}
                    </Label>
                    <Input
                      id={p.key}
                      value={paramValues[p.key] || ""}
                      onChange={(e) =>
                        setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                      placeholder={p.placeholder}
                      className="bg-background/60 border-primary/30 font-mono text-sm"
                    />
                  </div>
                ))}

                <div className="bg-background/60 border border-border/50 rounded-md p-3 font-mono text-[11px] space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> POST /webhook/n8n/{selected.id}
                  </p>
                  <p className="text-primary break-all">
                    {JSON.stringify(paramValues)}
                  </p>
                </div>
              </div>

              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-mono uppercase tracking-wider text-xs glow-green"
                >
                  {launching ? (
                    <><Activity className="w-4 h-4 mr-2 animate-pulse" /> ENVIANDO A n8n...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> LANZAR ATAQUE</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelected(null)}
                  className="w-full font-mono uppercase tracking-wider text-xs border-primary/30"
                >
                  Cancelar
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Offensive;
