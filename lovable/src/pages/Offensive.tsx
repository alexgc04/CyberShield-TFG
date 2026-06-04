import { useState, useEffect } from "react";
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
  KeyRound, EyeOff, Users, Workflow, Cable, Zap, Activity, Binary, Unlock,
  Wifi as WifiIcon, CheckCircle2, XCircle, CircleDot, Search, Download, FileText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WEBHOOK_ATTACK_URL = "http://localhost:5678/webhook/ejecutar-ataque";
const WEBHOOK_SCAN_URL = "http://localhost:5678/webhook/scan";
const REPORT_GENERATOR_URL = "http://localhost:3010/generate-report";
const REPORTS_LIST_URL = "http://localhost:3010/reports/list";
const REPORT_DOWNLOAD_BASE = "http://localhost:3010";
const REPORT_DELETE_BASE = "http://localhost:3010/reports/delete";

type ConnState = "idle" | "sending" | "success" | "error";
type ReportState = "idle" | "fetching" | "building" | "error";

interface Report {
  filename: string;
  date: string;
  size: number;
  attackType: string;
  downloadUrl: string;
}

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
  options?: { value: string; label: string }[];
  type?: "input" | "preview";
  template?: string;
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
    id: "nmap-host-discovery",
    name: "Nmap Host Discovery",
    desc: "Escaneo de red configurable (Ping Sweep, SYN, UDP, Fingerprinting)",
    icon: Search,
    severity: "low",
    category: "Escaneo",
    params: [
      { key: "target", label: "Target (IP/Rango)", placeholder: "" },
      { 
        key: "scan_type", 
        label: "Tipo de Escaneo", 
        placeholder: "-sS",
        defaultValue: "-sS",
        options: [
          { value: "-sn", label: "Ping Sweep (-sn)" },
          { value: "-sS", label: "SYN Half-scan (-sS)" },
          { value: "-sT", label: "TCP Connect (-sT)" },
          { value: "-sA", label: "ACK Scan (-sA)" },
          { value: "-sU", label: "UDP Scan (-sU)" },
          { value: "-sN", label: "NULL Scan (-sN)" },
          { value: "-sF", label: "FIN Scan (-sF)" },
          { value: "-sX", label: "XMAS Scan (-sX)" }
        ]
      },
      { 
        key: "flags", 
        label: "Opciones Avanzadas", 
        placeholder: "Ej: -sV -O -F", 
        defaultValue: "-sV -O -F" 
      },
      {
        key: "command_preview",
        label: "Resultado final",
        placeholder: "",
        type: "preview",
        template: "sudo nmap {{scan_type}} {{flags}} {{target}} -oX /tmp/cs_nmap_{timestamp}.xml"
      }
    ],
  },
  {
    id: "mac-flooding",
    name: "MAC Flooding",
    desc: "Saturar la tabla CAM del switch para forzar modo hub (sudo macof -i eth0 -d IP -n count)",
    icon: Network,
    severity: "high",
    category: "Capa 2",
    params: [
      { key: "interface", label: "Interfaz física (L2)", placeholder: "eth0", defaultValue: "eth0" },
      { key: "target", label: "IP Destino (-d)", placeholder: "" },
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
      { key: "bssid", label: "BSSID AP", placeholder: "" },
      { key: "client", label: "MAC Cliente", placeholder: "" },
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
      { key: "bssid", label: "BSSID", placeholder: "" },
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
      { key: "bssid", label: "BSSID", placeholder: "" },
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
      { key: "bssid", label: "BSSID TKIP", placeholder: "" },
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
    desc: "Ataques Pixie Dust y Fuerza Bruta contra WPS",
    icon: Unlock,
    severity: "high",
    category: "Ataque",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID", placeholder: "" },
      { key: "method", label: "Método", placeholder: "pixie | null", defaultValue: "pixie" },
    ],
  },
  {
    id: "wep-attack",
    name: "Ataques WEP",
    desc: "Crackeo automático de redes WEP (besside-ng)",
    icon: KeyRound,
    severity: "critical",
    category: "Ataque",
    params: [
      { key: "interface", label: "Interfaz", placeholder: "wlan0mon", defaultValue: "wlan0mon" },
      { key: "bssid", label: "BSSID WEP", placeholder: "" },
    ],
  },
];

const scapyAttacks: AttackCard[] = [
  {
    id: "scapy-syn-scan",
    name: "Scapy SYN Scan (Half-Open)",
    desc: "Escaneo sigiloso mediante paquetes TCP SYN.",
    icon: Crosshair,
    severity: "medium",
    category: "Reconocimiento",
    params: [
      { key: "target", label: "IP Objetivo", placeholder: "" },
      { key: "port", label: "Puerto", placeholder: "80" },
    ],
  },
  {
    id: "scapy-ack-scan",
    name: "Scapy ACK Scan (Firewall Bypass)",
    desc: "Mapeo de reglas de firewall con paquetes ACK.",
    icon: ShieldAlert,
    severity: "medium",
    category: "Reconocimiento",
    params: [
      { key: "target", label: "IP Objetivo", placeholder: "" },
      { key: "port", label: "Puerto", placeholder: "80" },
    ],
  },
  {
    id: "scapy-arp-scan",
    name: "Scapy ARP Scan (Host Discovery)",
    desc: "Descubrimiento de hosts en la red local vía ARP.",
    icon: Network,
    severity: "low",
    category: "Reconocimiento",
    params: [
      { key: "subnet", label: "Subred", placeholder: "192.168.1.0/24" },
    ],
  },
  {
    id: "scapy-icmp-fuzz",
    name: "Scapy ICMP Fuzzing",
    desc: "Ataque DoS inyectando payloads ICMP malformados.",
    icon: Activity,
    severity: "critical",
    category: "Fuzzing",
    params: [
      { key: "target", label: "IP Objetivo", placeholder: "" },
      { key: "payload_size", label: "Tamaño Payload (bytes)", placeholder: "64", defaultValue: "64" },
      { key: "count", label: "Cantidad", placeholder: "100", defaultValue: "100" },
    ],
  },
  {
    id: "scapy-tcp-fuzz",
    name: "Scapy TCP Fuzzing",
    desc: "Ataque DoS enviando paquetes TCP malformados.",
    icon: Zap,
    severity: "critical",
    category: "Fuzzing",
    params: [
      { key: "target", label: "IP Objetivo", placeholder: "" },
      { key: "port", label: "Puerto", placeholder: "80" },
      { key: "count", label: "Cantidad", placeholder: "100", defaultValue: "100" },
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [connState, setConnState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [reportState, setReportState] = useState<ReportState>("idle");
  const [reportsList, setReportsList] = useState<Report[]>([]);

  const fetchReports = async () => {
    setReportState("fetching");
    try {
      const res = await fetch(REPORTS_LIST_URL);
      if (!res.ok) throw new Error("Error fetching reports");
      const data = await res.json();
      if (data.ok) {
        setReportsList(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportState("idle");
    }
  };

  const handleDeleteReport = async (filename: string) => {
    if (!confirm(`¿Eliminar el informe "${filename}"?`)) return;
    try {
      const res = await fetch(`${REPORT_DELETE_BASE}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pushLog("info", `🗑 Informe eliminado: ${filename}`);
      fetchReports();
    } catch (err: any) {
      pushLog("error", `✘ Error borrando informe: ${err?.message}`);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);
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

    const targetUrl = WEBHOOK_ATTACK_URL;

    const payload = {
      task_name: selected.name,
      params: paramValues,
    };

    pushLog("info", `POST ${targetUrl}`);
    pushLog("info", `Payload → ${JSON.stringify(payload)}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const expectedPdfName = `CS-RPT-${selected.name.replace(/\\s+/g, '-')}.pdf`;

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text().catch(() => "");
      setConnState("success");
      pushLog("success", `✔ Webhook respondió ${res.status}${text ? ` · ${text.slice(0, 120)}` : ""}`);
      
      setIsGeneratingPDF(true);
      pushLog("info", "⏳ Webhook terminado. Esperando renderización del PDF académico...");
      
      const checkPdfInterval = setInterval(async () => {
        try {
          const listRes = await fetch("http://localhost:3010/reports/list");
          const listData = await listRes.json();
          
          const pdfExists = listData.some((r: any) => r.pdf === expectedPdfName);
          
          if (pdfExists) {
            clearInterval(checkPdfInterval);
            setIsGeneratingPDF(false);
            setLaunching(false);
            toast({
              title: `[n8n] Workflow finalizado: ${selected.name}`,
              description: "El informe PDF académico se ha generado y está listo para descargar.",
            });
            setSelected(null);
            fetchReports();
          }
        } catch (e) {
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(checkPdfInterval);
        if (isGeneratingPDF) {
          setIsGeneratingPDF(false);
          setLaunching(false);
          pushLog("error", "⏳ Timeout esperando a la generación del PDF.");
          setSelected(null);
          fetchReports();
        }
      }, 30000);

    } catch (err: any) {
      setConnState("error");
      setLaunching(false);
      setIsGeneratingPDF(false);
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

  const handleGenerateReport = async () => {
    setReportState("building");
    pushLog("info", `POST ${REPORT_GENERATOR_URL}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(REPORT_GENERATOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json().catch(() => ({}));
      setReportState("ready");
      pushLog("success", `✔ Informe generado: ${data?.downloadUrl || REPORT_PDF_URL}`);
      toast({
        title: "Informe generado",
        description: "El PDF ya está listo para descargar desde la web.",
      });
      window.open(REPORT_PDF_URL, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setReportState("error");
      pushLog("error", `✘ Error generando informe: ${err?.message || "fallo desconocido"}`);
      toast({
        title: "No se pudo generar el informe",
        description: err?.message || "Revisa que el servicio de reportes esté arrancado.",
        variant: "destructive",
      });
    }
  };

  const connBadge = {
    idle: { label: "INACTIVO", color: "bg-muted/30 text-muted-foreground border-muted/40", dot: "bg-muted-foreground" },
    sending: { label: "ENVIANDO...", color: "bg-blue-500/20 text-blue-300 border-blue-500/40", dot: "bg-blue-400 animate-pulse" },
    success: { label: "CONECTADO", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400" },
    error: { label: "ERROR", color: "bg-red-500/20 text-red-300 border-red-500/40", dot: "bg-red-400" },
  }[connState];

  return (
    <div className="relative">
      <div className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0" style={{ backgroundImage: "url('/images/nodes.png')" }} />
      <div className="space-y-6 relative z-10">
      <div>
        <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider flex items-center gap-2">
          <Crosshair className="w-6 h-6" /> MÓDULOS OFENSIVOS
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Catálogo de ataques · configuración de parámetros · ejecución vía n8n
        </p>
      </div>

      {/* Estado de Conexión */}
      <Card className="border-primary/10 bg-card/60">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted/30 border border-border/30">
              <WifiIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Estado de Conexión · n8n Webhook
              </p>
              <p className="text-xs font-mono text-foreground break-all">
                <span className="text-muted-foreground">ATTACK:</span> {WEBHOOK_ATTACK_URL} <br/>
                <span className="text-muted-foreground">SCAN:</span> {WEBHOOK_SCAN_URL}
              </p>
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
          <TabsTrigger
            value="reports"
            className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:glow-green gap-2"
          >
            <FileText className="w-4 h-4" /> Informes y Logs
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

          <TabsContent value="reports" className="mt-6">
            <Card className="border-primary/15 bg-card/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Centro de Informes Generados
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  Genera automáticamente y descarga informes PDF de todas las auditorías y ataques lanzados.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <Button
                    onClick={fetchReports}
                    variant="outline"
                    className="border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/10"
                    disabled={reportState === "fetching"}
                  >
                    {reportState === "fetching" ? <Activity className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Refrescar Lista
                  </Button>
                </div>
                
                {reportsList.length === 0 ? (
                  <div className="text-center py-8 bg-background/50 rounded-md border border-primary/20">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-mono text-muted-foreground">No hay informes generados todavía.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {reportsList.map((rep, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-primary/20 rounded-md bg-background/50 hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-mono text-foreground font-semibold">{rep.attackType}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {new Date(rep.date).toLocaleString()} · {(rep.size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{rep.filename}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`${REPORT_DOWNLOAD_BASE}${rep.downloadUrl}`} 
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded hover:bg-primary hover:text-black font-mono text-xs font-bold transition-all"
                          >
                            <Download className="w-4 h-4" />
                            DESCARGAR
                          </a>
                          <button
                            onClick={() => handleDeleteReport(rep.filename)}
                            className="flex items-center gap-1 px-3 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded hover:bg-destructive hover:text-white font-mono text-xs font-bold transition-all"
                            title="Eliminar informe"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Consola de logs */}
        <Card className="border-primary/15 bg-card/80">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Consola de Salida
            </CardTitle>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          </CardHeader>
        <CardContent>
          <div className="bg-background/80 border border-border/50 rounded-md p-3 font-mono text-[11px] max-h-64 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <p className="text-muted-foreground/60">// Sin entradas</p>
            ) : (
              logs.map((l, i) => {
                const Icon =
                  l.level === "success" ? CheckCircle2 : l.level === "error" ? XCircle : CircleDot;
                const color =
                  l.level === "success"
                    ? "text-emerald-400"
                    : l.level === "error"
                    ? "text-red-400"
                    : "text-muted-foreground";
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
                {selected.params.map((p) => {
                  if (p.type === "preview" && p.template) {
                    let previewStr = p.template;
                    selected.params.forEach(param => {
                      if (param.key !== p.key) {
                        previewStr = previewStr.replace(new RegExp(`\\{\\{${param.key}\\}\\}`, 'g'), paramValues[param.key] || "");
                      }
                    });
                    // Limpiar dobles espacios si una flag esta vacia
                    previewStr = previewStr.replace(/  +/g, ' ').trim();
                    
                    return (
                      <div key={p.key} className="space-y-1.5 mt-6 pt-4 border-t border-primary/20">
                        <Label className="font-mono text-xs text-primary/80 uppercase tracking-wider">
                          {p.label}
                        </Label>
                        <div className="p-3 rounded-md bg-black/80 border border-primary/30 font-mono text-[11px] text-green-400 break-all leading-relaxed shadow-inner shadow-black/50">
                          {previewStr}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={p.key} className="space-y-1.5">
                      <Label htmlFor={p.key} className="font-mono text-xs text-foreground">
                        {`{{${p.key}}}`} — {p.label}
                      </Label>
                      {p.options ? (
                        <select
                          id={p.key}
                          value={paramValues[p.key] || ""}
                          onChange={(e) => setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
                          className="flex h-10 w-full rounded-md border bg-background/60 border-primary/30 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-foreground"
                        >
                          {p.options.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={p.key}
                          value={paramValues[p.key] || ""}
                          onChange={(e) =>
                            setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                          }
                          placeholder={p.placeholder}
                          className="bg-background/60 border-primary/30 font-mono text-sm"
                        />
                      )}
                    </div>
                  );
                })}

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
                  disabled={launching || isGeneratingPDF}
                  className="w-full font-mono font-bold tracking-widest text-black bg-primary hover:bg-primary/90 glow-green relative overflow-hidden group transition-all duration-500 ease-out"
                >
                  {launching || isGeneratingPDF ? (
                    <span className="flex items-center gap-2 relative z-10">
                      <Terminal className="w-4 h-4 animate-pulse" />
                      {isGeneratingPDF ? "ESPERANDO REPORTE..." : "PROCESANDO ATAQUE..."}
                    </span>
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
    </div>
  );
};

export default Offensive;
