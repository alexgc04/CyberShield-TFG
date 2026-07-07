import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Crosshair, Terminal as TerminalIcon, Download, ShieldAlert, HelpCircle, 
  Maximize2, Minimize2, Search, Trash2
} from "lucide-react";
import AttackModule from "@/components/AttackModule";
import DecryptedText from "@/components/DecryptedText";
import Shuffle from "@/components/Shuffle";
import Radar from "@/components/Radar";

interface AttackParameter {
  name: string;
  label: string;
  type: string;
  default: string | number;
  required: boolean;
  placeholder: string;
  hint?: string;
}

interface AttackTemplate {
  id: string;
  name: string;
  module: string;
  mitre_id: string;
  risk_level: string;
  wazuh_rule_id: number;
  description: string;
  command: string;
  parameters: AttackParameter[];
  logger_command: string;
}

interface TerminalLine {
  text: string;
  type: "info" | "success" | "error" | "command" | "output" | "system";
  timestamp?: string;
  link?: { url: string; label: string };
}

const TypewriterTerminalLine = ({ line, isLast }: { line: TerminalLine; isLast: boolean }) => {
  const [displayedText, setDisplayedText] = useState(isLast ? "" : line.text);
  const [isTyping, setIsTyping] = useState(isLast);

  useEffect(() => {
    if (!isLast) {
      setDisplayedText(line.text);
      setIsTyping(false);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    let index = 0;
    const txt = line.text;
    if (!txt) {
      setIsTyping(false);
      return;
    }

    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + txt.charAt(index));
      index++;
      if (index >= txt.length) {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [line.text, isLast]);

  let textClass = "text-muted-foreground";
  if (line.type === "command") textClass = "text-foreground font-bold";
  else if (line.type === "success") textClass = "text-neon-green";
  else if (line.type === "error") textClass = "text-red-500 font-bold";
  else if (line.type === "output") textClass = "text-primary/90 brightness-90";
  else if (line.type === "system") textClass = "text-muted-foreground/50";

  const isError = line.type === "error";
  const isOutput = line.type === "output";

  return (
    <div className={`leading-relaxed break-all ${isError ? "animate-terminal-shake" : ""}`}>
      {isOutput && isLast ? (
        <DecryptedText
          text={line.text}
          animateOn="view"
          speed={10}
          maxIterations={6}
          parentClassName={textClass}
          className="text-primary font-bold"
          encryptedClassName="text-primary/45 font-mono"
        />
      ) : (
        <span className={textClass}>
          {displayedText}
          {isTyping && <span className="animate-terminal-blink text-[#00ff41] ml-0.5">█</span>}
        </span>
      )}
      {line.link && !isTyping && (
        <a
          href={line.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 ml-2 text-neon-cyan underline font-bold hover:brightness-110"
        >
          <Download className="w-3 h-3" />
          {line.link.label}
        </a>
      )}
    </div>
  );
};

export default function Offensive() {
  const [templates, setTemplates] = useState<AttackTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [kaliIp, setKaliIp] = useState<string>("cargando...");
  const [wazuhIp, setWazuhIp] = useState<string>("cargando...");
  
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "========================================================================", type: "system" },
    { text: "🛡️ CYBERSHIELD ADVANCED ATTACK SIMULATOR (CLI SESSION ACTIVE)", type: "success" },
    { text: "========================================================================", type: "system" },
    { text: "Cargando configuración de red desde el servidor...", type: "info" },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch templates
    fetch("/api/attacks/templates", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.templates) {
          const sorted = [...data.templates].sort((a, b) => {
            const getCatOrder = (id: string) => {
              const lid = id.toLowerCase();
              if (lid.startsWith("lan-")) return 1;
              if (lid.startsWith("scapy-")) return 2;
              if (lid.startsWith("bf-")) return 3;
              if (lid.startsWith("lin-") || lid.startsWith("priv-")) return 4;
              return 5;
            };
            const catA = getCatOrder(a.id);
            const catB = getCatOrder(b.id);
            if (catA !== catB) return catA - catB;
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
          });
          setTemplates(sorted);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));

    // Fetch dynamic IP config from health endpoint
    fetch("/api/health", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const kIp = data.kali_ip || "N/A";
          const wIp = data.wazuh_ip || "N/A";
          setKaliIp(kIp);
          setWazuhIp(wIp);
          
          setTerminalLines([
            { text: "========================================================================", type: "system" },
            { text: "🛡️ CYBERSHIELD ADVANCED ATTACK SIMULATOR (CLI SESSION ACTIVE)", type: "success" },
            { text: "========================================================================", type: "system" },
            { text: `Host: kali-linux-attack-node (${kIp})`, type: "info" },
            { text: "Status: Connected via SSH (Port 22)", type: "info" },
            { text: `Wazuh Manager: Active (${wIp})`, type: "info" },
            { text: "", type: "info" },
            { text: "Escribe 'help' para ver la lista de comandos disponibles.", type: "info" },
            { text: "Utiliza el panel superior para interactuar con los módulos ofensivos.", type: "info" },
            { text: "========================================================================", type: "system" },
          ]);
        }
      })
      .catch((err) => console.error("Error fetching health data for Offensive page:", err));
  }, []);

  // Scroll to bottom on new terminal lines
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const timestamp = new Date().toLocaleTimeString();
    setTerminalLines(prev => [...prev, { text: `cybershield@kali:~$ ${cmd}`, type: "command", timestamp }]);
    setTerminalInput("");

    const args = cmd.split(/\s+/);
    const mainCommand = args[0].toLowerCase();

    if (["clear", "cls"].includes(mainCommand)) {
      setTerminalLines([]);
    } else if (mainCommand === "help") {
      setTerminalLines(prev => [
        ...prev,
        { text: "Comandos Locales:", type: "info" },
        { text: "  help          - Muestra esta pantalla de ayuda.", type: "info" },
        { text: "  clear / cls   - Limpia el output de la terminal.", type: "info" },
        { text: "  status        - Verifica el estado del nodo atacante SSH y Wazuh.", type: "info" },
        { text: "  list          - Lista los módulos de ataque cargados en la base de datos.", type: "info" },
        { text: "Comandos de Red / Sistema (ejecutados en Kali):", type: "info" },
        { text: "  Escribe cualquier comando de Linux (ej: whoami, ip a, route, ping -c 2 8.8.8.8, etc.)", type: "system" }
      ]);
    } else if (mainCommand === "status") {
      setTerminalLines(prev => [
        ...prev,
        { text: `[+] Hostname: kali-linux-attack-node (${kaliIp})`, type: "info" },
        { text: "[+] SSH Connect Tunnel: ACTIVE", type: "success" },
        { text: "[+] Wazuh Rule Trigger Mapping: STABLE", type: "success" },
        { text: "[+] Database (MongoDB): CONNECTED (Atlas)", type: "success" },
        { text: "[+] Webhook API Connection: ONLINE", type: "success" },
      ]);
    } else if (mainCommand === "list") {
      setTerminalLines(prev => {
        const header = { text: "ID            MODULO      RIESGO      NOMBRE", type: "system" as const };
        const divider = { text: "-------------------------------------------------------------", type: "system" as const };
        const listLines = templates.map(t => ({
          text: `${t.id.padEnd(13)} ${t.module.toUpperCase().padEnd(11)} ${(t.risk_level || 'N/A').padEnd(11)} ${t.name}`,
          type: "info" as const
        }));
        return [...prev, header, divider, ...listLines];
      });
    } else {
      // Execute command on Kali over SSH
      setTerminalLines(prev => [...prev, { text: `[SSH] Ejecutando comando en Kali Linux...`, type: "system" }]);
      
      fetch("/api/ssh/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ command: cmd })
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then(errData => { throw new Error(errData.error || `HTTP ${res.status}`); });
          }
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            setTerminalLines(prev => {
              const lines = [...prev];
              if (data.stdout && data.stdout.trim()) {
                data.stdout.split("\n").forEach((l: string) => {
                  if (l.trim()) lines.push({ text: l, type: "output" });
                });
              }
              if (data.stderr && data.stderr.trim()) {
                data.stderr.split("\n").forEach((l: string) => {
                  if (l.trim()) lines.push({ text: l, type: "error" });
                });
              }
              if (!data.stdout.trim() && !data.stderr.trim()) {
                lines.push({ text: `(Comando finalizado con exit code: ${data.exitCode})`, type: "system" });
              }
              return lines;
            });
          } else {
            setTerminalLines(prev => [...prev, { text: `Error: ${data.error || "Error de ejecución"}`, type: "error" }]);
          }
        })
        .catch((err) => {
          setTerminalLines(prev => [...prev, { text: `Error SSH: ${err.message}`, type: "error" }]);
        });
    }
  };

  // Group templates filtering
  const categories = [
    { value: "all", label: "Todos los Módulos" },
    { value: "lan", label: "Red Local (LAN)" },
    { value: "scapy", label: "Inyección Scapy" },
    { value: "bf", label: "Fuerza Bruta" },
    { value: "lin", label: "Privilegios Linux" },
    { value: "priv", label: "Active Directory / Privilegios" }
  ];

  const getTemplateCategory = (t: AttackTemplate) => {
    const id = t.id.toLowerCase();
    if (id.startsWith("lan-")) return "lan";
    if (id.startsWith("scapy-")) return "scapy";
    if (id.startsWith("bf-")) return "bf";
    if (id.startsWith("lin-")) return "lin";
    if (id.startsWith("priv-")) return "priv";
    return "other";
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || getTemplateCategory(t) === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative pb-12 font-mono">
      <div className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0" style={{ backgroundImage: "url('/images/nodes.png')" }} />
      <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.35]">
        <Radar
          speed={0.8}
          scale={0.65}
          ringCount={8}
          spokeCount={12}
          ringThickness={0.03}
          spokeThickness={0.005}
          sweepSpeed={1.0}
          sweepWidth={3.0}
          sweepLobes={1}
          color="#ff3b30"
          backgroundColor="#000000"
          falloff={1.5}
          brightness={1.0}
          enableMouseInteraction={true}
          mouseInfluence={0.08}
        />
      </div>
      <div className="space-y-6 relative z-10">
        
        {/* Header con indicadores de estado */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider flex items-center gap-2">
              <Crosshair className="w-6 h-6 animate-pulse" /> 
              <Shuffle text="MÓDULOS OFENSIVOS" className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider" triggerOnHover={true} />
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Catálogo de intrusiones · ejecución ssh · inyección Wazuh interactiva
            </p>
          </div>
          
          {/* Info Status en Vivo */}
          <div className="flex flex-wrap gap-2.5 text-[10px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${kaliIp === "cargando..." ? "bg-yellow-500" : (kaliIp === "N/A" || kaliIp === "No configurado" ? "bg-destructive" : "bg-neon-green")}`} />
              <span className="text-muted-foreground">KALI NODE:</span>
              <span className="text-foreground font-bold uppercase">
                {kaliIp === "cargando..." ? "CARGANDO..." : (kaliIp === "N/A" || kaliIp === "No configurado" ? "OFFLINE" : "ONLINE")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${kaliIp === "cargando..." ? "bg-yellow-500" : (kaliIp === "N/A" || kaliIp === "No configurado" ? "bg-destructive" : "bg-neon-green")}`} />
              <span className="text-muted-foreground">SSH CONECTADO:</span>
              <span className="text-foreground font-bold uppercase">
                {kaliIp === "cargando..." ? "VERIFICANDO..." : (kaliIp === "N/A" || kaliIp === "No configurado" ? "DESCONECTADO" : "ONLINE")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-muted-foreground">AGENTE WAZUH:</span>
              <span className="text-foreground font-bold">ACTIVO</span>
            </div>
          </div>
        </div>

        {/* Buscador y Filtrado */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-card/25 backdrop-blur-md p-3.5 rounded-xl border border-border/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar ataque..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 font-mono text-xs h-9 border-border/50 focus-visible:ring-primary text-[#00ff41]"
            />
          </div>
          
          {/* Categorías Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all border ${
                  categoryFilter === cat.value
                    ? "bg-primary/10 border-primary text-primary glow-green"
                    : "bg-background/20 border-border/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catálogo de Tarjetas de Ataque */}
        {filteredTemplates.length === 0 ? (
          <Card className="border-border/30 bg-card/30 py-12 text-center">
            <CardContent>
              <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                No hay plantillas de ataque que coincidan con la búsqueda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredTemplates.map((t) => (
              <AttackModule 
                key={t.id} 
                attackId={t.id} 
                kaliIp={kaliIp} 
                template={t} 
                onTerminalLine={(text, type) => {
                  const timestamp = new Date().toLocaleTimeString();
                  setTerminalLines((prev) => [...prev, { text, type, timestamp }]);
                }}
              />
            ))}
          </div>
        )}

        {/* Terminal removed by request */}

      </div>
    </div>
  );
}
