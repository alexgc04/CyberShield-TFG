import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Crosshair, Terminal as TerminalIcon, Download, ShieldAlert, HelpCircle, 
  Maximize2, Minimize2, Search, Trash2
} from "lucide-react";
import AttackModule from "@/components/AttackModule";

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

  return (
    <div className={`leading-relaxed break-all ${isError ? "animate-terminal-shake" : ""}`}>
      <span className={textClass}>
        {displayedText}
        {isTyping && <span className="animate-terminal-blink text-[#00ff41] ml-0.5">█</span>}
      </span>
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
  const [kaliIp, setKaliIp] = useState<string>("10.10.10.21");
  const [wazuhIp, setWazuhIp] = useState<string>("10.10.10.49");
  
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "========================================================================", type: "system" },
    { text: "🛡️ CYBERSHIELD ADVANCED ATTACK SIMULATOR (CLI SESSION ACTIVE)", type: "success" },
    { text: "========================================================================", type: "system" },
    { text: "Host: kali-linux-attack-node (10.10.10.21)", type: "info" },
    { text: "Status: Connected via SSH (Port 22)", type: "info" },
    { text: "Wazuh Manager: Active (10.10.10.49)", type: "info" },
    { text: "", type: "info" },
    { text: "Escribe 'help' para ver la lista de comandos disponibles.", type: "info" },
    { text: "Utiliza el panel superior para interactuar con los módulos ofensivos.", type: "info" },
    { text: "========================================================================", type: "system" },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch templates
    fetch("/api/attacks/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTemplates(data.templates);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));

    // Fetch dynamic IP config from health endpoint
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const kIp = data.kali_ip || "10.10.10.21";
          const wIp = data.wazuh_ip || "10.10.10.49";
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
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
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

    setTimeout(() => {
      switch (mainCommand) {
        case "clear":
        case "cls":
          setTerminalLines([]);
          break;
        case "help":
          setTerminalLines(prev => [
            ...prev,
            { text: "Comandos Disponibles:", type: "info" },
            { text: "  help          - Muestra esta pantalla de ayuda.", type: "info" },
            { text: "  clear / cls   - Limpia el output de la terminal.", type: "info" },
            { text: "  status        - Verifica el estado del nodo atacante SSH y Wazuh.", type: "info" },
            { text: "  list          - Lista los módulos de ataque cargados en la base de datos.", type: "info" },
          ]);
          break;
        case "status":
          setTerminalLines(prev => [
            ...prev,
            { text: `[+] Hostname: kali-linux-attack-node (${kaliIp})`, type: "info" },
            { text: "[+] SSH Connect Tunnel: ACTIVE", type: "success" },
            { text: "[+] Wazuh Rule Trigger Mapping: STABLE", type: "success" },
            { text: "[+] Database (MongoDB): CONNECTED (Atlas)", type: "success" },
            { text: "[+] Webhook API Connection: ONLINE", type: "success" },
          ]);
          break;
        case "list":
          setTerminalLines(prev => {
            const header = { text: "ID            MODULO      RIESGO      NOMBRE", type: "system" };
            const divider = { text: "-------------------------------------------------------------", type: "system" };
            const listLines = templates.map(t => ({
              text: `${t.id.padEnd(13)} ${t.module.toUpperCase().padEnd(11)} ${(t.risk_level || 'N/A').padEnd(11)} ${t.name}`,
              type: "info" as const
            }));
            return [...prev, header, divider, ...listLines];
          });
          break;
        default:
          setTerminalLines(prev => [...prev, { text: `bash: command not found: ${args[0]}. Escribe 'help' para ver los comandos válidos.`, type: "error" }]);
      }
    }, 100);
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
      <div className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0" style={{ backgroundImage: "url('/images/nodes.png')" }} />
      <div className="space-y-6 relative z-10">
        
        {/* Header con indicadores de estado */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider flex items-center gap-2">
              <Crosshair className="w-6 h-6 animate-pulse" /> MÓDULOS OFENSIVOS
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Catálogo de intrusiones · ejecución ssh · inyección Wazuh interactiva
            </p>
          </div>
          
          {/* Info Status en Vivo */}
          <div className="flex flex-wrap gap-2.5 text-[10px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-muted-foreground">KALI NODE:</span>
              <span className="text-foreground font-bold">{kaliIp}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-muted-foreground">SSH:</span>
              <span className="text-foreground font-bold">PORT 22</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border/40">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-muted-foreground">WAZUH RULE AGENT:</span>
              <span className="text-foreground font-bold">ACTIVE</span>
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
              <AttackModule key={t.id} attackId={t.id} kaliIp={kaliIp} />
            ))}
          </div>
        )}

        {/* Consola Terminal al Pie de Página */}
        <div 
          id="terminal-console" 
          className={`bg-black/95 rounded-xl border border-primary/20 backdrop-blur-xl flex flex-col transition-all duration-300 overflow-hidden ${
            isTerminalExpanded ? "h-[500px]" : "h-72"
          }`}
        >
          {/* Header de Terminal */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-muted/5 select-none font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <TerminalIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-bold tracking-widest uppercase">
                Consola Linux Kali @ {kaliIp}
              </span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setTerminalLines([
                  { text: "Virtual Terminal v2.4.1 initialized. Connected to Kali.", type: "info" }
                ])}
                title="Limpiar Consola"
                className="p-1 rounded hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setTerminalLines(prev => [
                    ...prev,
                    { text: "cybershield@kali:~$ help", type: "command" },
                    { text: "Comandos Disponibles:", type: "info" },
                    { text: "  help          - Muestra esta pantalla de ayuda.", type: "info" },
                    { text: "  clear / cls   - Limpia el output de la terminal.", type: "info" },
                    { text: "  status        - Verifica el estado del nodo atacante SSH y Wazuh.", type: "info" },
                    { text: "  list          - Lista los módulos de ataque cargados en la base de datos.", type: "info" },
                  ]);
                }}
                title="Ayuda CLI"
                className="p-1 rounded hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                title={isTerminalExpanded ? "Minimizar" : "Maximizar"}
                className="p-1 rounded hover:bg-muted/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isTerminalExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Área de Visualización del Terminal */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-0.5 bg-black text-foreground">
            {terminalLines.map((line, idx) => (
              <TypewriterTerminalLine key={idx} line={line} isLast={idx === terminalLines.length - 1} />
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Formulario de Input del Terminal */}
          <form 
            onSubmit={handleTerminalSubmit}
            className="flex items-center px-4 py-2 border-t border-primary/20 bg-black"
          >
            <span className="text-neon-green font-mono text-xs font-semibold mr-1.5 shrink-0 select-none">
              cybershield@kali:~$
            </span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-xs font-mono text-foreground focus:ring-0 p-0"
              placeholder="Escribe un comando (ej: help, list, status)..."
              autoFocus
            />
          </form>
        </div>

      </div>
    </div>
  );
}
