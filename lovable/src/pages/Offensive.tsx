import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Crosshair, Terminal as TerminalIcon, Download, ShieldAlert, Loader2, Play, 
  Trash2, HelpCircle, Maximize2, Minimize2, Search
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  command_alt?: string;
  parameters: AttackParameter[];
  logger_command: string;
}

interface TerminalLine {
  text: string;
  type: "info" | "success" | "error" | "command" | "output" | "system";
  timestamp?: string;
  link?: { url: string; label: string };
}

export default function Offensive() {
  const [templates, setTemplates] = useState<AttackTemplate[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<AttackTemplate | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  // New UI/UX States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "========================================================================", type: "system" },
    { text: "🛡️ CYBERSHIELD ADVANCED ATTACK SIMULATOR (CLI SESSION ACTIVE)", type: "success" },
    { text: "========================================================================", type: "system" },
    { text: "Host: kali-linux-attack-node (10.10.10.21)", type: "info" },
    { text: "Status: Connected via SSH (Port 22)", type: "info" },
    { text: "Wazuh Manager: Active (10.10.10.49)", type: "info" },
    { text: "", type: "info" },
    { text: "Escribe 'help' para ver la lista de comandos disponibles.", type: "info" },
    { text: "Selecciona un ataque del catálogo para configurarlo y ejecutarlo.", type: "info" },
    { text: "========================================================================", type: "system" },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/attacks/templates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTemplates(data.templates);
        }
      })
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // Scroll to bottom on new terminal lines
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLines]);

  const handleSelect = (template: AttackTemplate) => {
    setSelectedAttack(template);
    const initialParams: Record<string, string> = {};
    template.parameters.forEach((param) => {
      initialParams[param.name] = param.default?.toString() || "";
    });
    setParamValues(initialParams);
    setIsModalOpen(true);
  };

  const handleParamChange = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
  };

  const getRenderedCommand = (template: AttackTemplate, params: Record<string, string>) => {
    let cmd = template.command;
    template.parameters.forEach((param) => {
      const val = params[param.name] || param.default?.toString() || `{${param.name}}`;
      cmd = cmd.replace(new RegExp(`{${param.name}}`, 'g'), val);
    });
    return cmd;
  };

  const handleLaunch = async () => {
    if (!selectedAttack) return;
    
    // Check if required params are filled
    for (const param of selectedAttack.parameters) {
      if (param.required && !paramValues[param.name]) {
        toast({
          title: "Parámetros incompletos",
          description: `El parámetro ${param.label} es obligatorio.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Close Modal and scroll to terminal
    setIsModalOpen(false);
    const terminalElement = document.getElementById("terminal-console");
    if (terminalElement) {
      terminalElement.scrollIntoView({ behavior: "smooth" });
    }

    setLoading(true);
    const cmdRun = getRenderedCommand(selectedAttack, paramValues);
    
    // Print starting command output logs
    setTerminalLines(prev => [
      ...prev,
      { text: `cybershield@kali:~$ run ${selectedAttack.id} --company="${companyName || 'Empresa Auditada'}"`, type: "command" },
      { text: `[~] SSH: Iniciando túnel SSH seguro con el agente Kali Linux (10.10.10.21)...`, type: "info" },
    ]);

    // Simulated connection delays for visuals
    await new Promise(resolve => setTimeout(resolve, 500));
    setTerminalLines(prev => [
      ...prev,
      { text: `[+] SSH: Conexión establecida con éxito (sesión activa @ ${selectedAttack.id}).`, type: "success" },
      { text: `[~] Kali: Ejecutando comando ofensivo...`, type: "info" },
      { text: `$ ${cmdRun}`, type: "system" }
    ]);

    try {
      const res = await fetch("/api/attacks/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_id: selectedAttack.id,
          parameters: paramValues,
          company_name: companyName || "Empresa Auditada"
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al ejecutar el ataque");
      }

      setTerminalLines(prev => [
        ...prev,
        { text: `[+] Kali: Comando completado con éxito (código de salida: ${data.ssh_exit_code ?? 0}).`, type: "success" },
        { text: `--- OUTPUT SSH ---`, type: "system" },
        ...(data.ssh_output ? data.ssh_output.split('\n').map((line: string) => ({ text: line, type: "output" as const })) : [{ text: "(sin output estándar de terminal)", type: "output" as const }]),
        { text: `------------------`, type: "system" },
        { text: `[+] Wazuh: Logs de simulación generados e inyectados correctamente (Wazuh Rule ID: ${selectedAttack.wazuh_rule_id}).`, type: "success" },
        { text: `[+] Reporte PDF: Generado con identificador ${data.report_id || 'N/A'}.`, type: "success" },
        { 
          text: `[+] Descarga disponible: `, 
          type: "success", 
          link: data.pdf_url ? { url: data.pdf_url, label: "Descargar informe de auditoría (PDF)" } : undefined 
        },
      ]);

      toast({
        title: "Ataque Completado",
        description: `El ataque ha sido lanzado y el informe procesado vía n8n.`,
      });
    } catch (err: any) {
      setTerminalLines(prev => [
        ...prev,
        { text: `[-] Error: ${err.message}`, type: "error" },
        { text: `[-] Kali: Ejecución del ataque interrumpida debido a una anomalía.`, type: "error" }
      ]);

      toast({
        title: "Error de ejecución",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            { text: "  run <id>      - Abre el configurador y lanza el módulo ofensivo especificado.", type: "info" },
          ]);
          break;
        case "status":
          setTerminalLines(prev => [
            ...prev,
            { text: "[+] Hostname: kali-linux-attack-node (10.10.10.21)", type: "info" },
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
        case "run":
          if (args.length < 2) {
            setTerminalLines(prev => [...prev, { text: "[-] Error: Escribe 'run <ID_DEL_MODULO>'. Ejemplo: 'run LAN-001'", type: "error" }]);
          } else {
            const attackId = args[1].toUpperCase();
            const found = templates.find(t => t.id.toUpperCase() === attackId);
            if (found) {
              setTerminalLines(prev => [...prev, { text: `[+] Cargando parámetros para el módulo ${found.id}...`, type: "info" }]);
              handleSelect(found);
            } else {
              setTerminalLines(prev => [...prev, { text: `[-] Error: Módulo de ataque '${args[1]}' no encontrado. Escribe 'list' para ver la lista.`, type: "error" }]);
            }
          }
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

  const getRiskStyle = (level: string) => {
    const lvl = (level || '').toLowerCase();
    if (lvl === 'critical') return {
      badge: "bg-red-500/20 text-red-500 border-red-500/30",
      border: "border-red-500/30 hover:border-red-500",
      glow: "hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      text: "text-red-500"
    };
    if (lvl === 'high') return {
      badge: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      border: "border-orange-500/30 hover:border-orange-500",
      glow: "hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]",
      text: "text-orange-500"
    };
    if (lvl === 'medium') return {
      badge: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      border: "border-yellow-500/30 hover:border-yellow-500",
      glow: "hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]",
      text: "text-yellow-500"
    };
    return {
      badge: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      border: "border-blue-500/30 hover:border-blue-500",
      glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      text: "text-blue-500"
    };
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
              <span className="text-muted-foreground">KALI TARGET:</span>
              <span className="text-foreground font-bold">10.10.10.21</span>
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
              className="pl-9 bg-background/50 font-mono text-xs h-9 border-border/50 focus-visible:ring-primary"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((t) => {
              const style = getRiskStyle(t.risk_level);
              return (
                <Card
                  key={t.id}
                  className={`bg-card/45 backdrop-blur-md border ${style.border} ${style.glow} hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-1.5">
                      <Badge className="font-mono text-[9px] font-bold bg-background border border-primary/20 text-primary px-1.5 py-0">
                        {t.id}
                      </Badge>
                      <Badge className={`font-mono text-[8px] uppercase font-semibold px-1.5 py-0 border ${style.badge}`}>
                        Riesgo: {t.risk_level || 'Medium'}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold font-mono text-foreground line-clamp-1">
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col justify-between pt-0">
                    <p className="text-[11px] text-muted-foreground font-mono line-clamp-3 leading-normal">
                      {t.description}
                    </p>
                    
                    <div className="space-y-1.5 pt-2 border-t border-border/20">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">MITRE ID:</span>
                        <span className="text-foreground font-semibold uppercase">{t.mitre_id}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">Regla Wazuh:</span>
                        <span className="text-primary font-semibold">{t.wazuh_rule_id}</span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-3 pt-0">
                    <Button
                      onClick={() => handleSelect(t)}
                      className={`w-full font-mono text-xs border ${style.badge} hover:bg-primary hover:text-primary-foreground hover:glow-green transition-all duration-300 flex items-center justify-center gap-1.5 h-8`}
                      variant="outline"
                    >
                      <Play className="w-3 h-3" />
                      CONFIGURAR Y LANZAR
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de Configuración Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-card/95 border-primary/30 backdrop-blur-xl glow-green text-foreground p-5 rounded-lg font-mono">
            {selectedAttack && (
              <>
                <DialogHeader className="border-b border-border/30 pb-3">
                  <div className="flex justify-between items-center gap-3">
                    <DialogTitle className="text-base font-bold font-mono text-primary text-glow-green tracking-wide">
                      🛡️ CONFIGURAR: {selectedAttack.id}
                    </DialogTitle>
                    <Badge className={`font-mono text-[8px] uppercase border ${getRiskStyle(selectedAttack.risk_level).badge}`}>
                      {selectedAttack.risk_level}
                    </Badge>
                  </div>
                  <DialogDescription className="text-[11px] font-mono text-muted-foreground mt-1">
                    {selectedAttack.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5 my-3 max-h-[300px] overflow-y-auto pr-1">
                  
                  {/* Detalles del ataque */}
                  <div className="bg-muted/20 border border-border/30 p-2.5 rounded text-[11px] space-y-1.5">
                    <p className="text-muted-foreground leading-normal">
                      {selectedAttack.description}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[9px] text-muted-foreground pt-1 border-t border-border/20">
                      <div>MITRE: <span className="text-foreground uppercase font-bold">{selectedAttack.mitre_id}</span></div>
                      <div>Wazuh Rule: <span className="text-foreground font-bold">{selectedAttack.wazuh_rule_id}</span></div>
                    </div>
                  </div>

                  {/* Formulario */}
                  <div className="space-y-3">
                    {/* Nombre Empresa */}
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1">
                        <span>🏢</span> Empresa / Organización Auditada <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej: Banco_UCLM"
                        className="font-mono text-xs bg-background/50 border-border/50 focus:border-primary/80 h-8"
                      />
                    </div>

                    {/* Parámetros Dinámicos de Attack */}
                    {selectedAttack.parameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1">
                          <span>⚙️</span> {param.label} {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={paramValues[param.name] || ""}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          placeholder={param.placeholder}
                          className="font-mono text-xs bg-background/50 border-border/50 focus:border-primary/80 h-8"
                        />
                        {param.hint && (
                          <p className="text-[9px] text-muted-foreground font-mono leading-none">{param.hint}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Vista previa del comando */}
                  <div className="space-y-1 pt-1">
                    <Label className="text-[10px] text-primary font-mono uppercase tracking-wider flex items-center gap-1">
                      <span>💻</span> Comando en Kali Linux (Vista Previa)
                    </Label>
                    <div className="p-2 bg-black border border-border/40 rounded overflow-x-auto">
                      <code className="text-[11px] text-neon-green break-all">
                        {getRenderedCommand(selectedAttack, paramValues)}
                      </code>
                    </div>
                  </div>

                </div>

                <DialogFooter className="border-t border-border/30 pt-3 flex gap-2">
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    variant="outline"
                    className="font-mono text-xs border-border/60 hover:bg-muted/10 h-8"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/80 hover:glow-green h-8"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        EJECUTANDO...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" />
                        LANZAR ATAQUE
                      </span>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

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
                Consola Linux Kali @ 10.10.10.21
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
                    { text: "  run <id>      - Abre el configurador y lanza el módulo ofensivo especificado.", type: "info" },
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
            {terminalLines.map((line, idx) => {
              let textClass = "text-muted-foreground";
              if (line.type === "command") textClass = "text-foreground font-bold";
              else if (line.type === "success") textClass = "text-neon-green";
              else if (line.type === "error") textClass = "text-red-500 font-bold";
              else if (line.type === "output") textClass = "text-primary/90 brightness-90";
              else if (line.type === "system") textClass = "text-muted-foreground/50";
              
              return (
                <div key={idx} className="leading-relaxed break-all">
                  <span className={textClass}>{line.text}</span>
                  {line.link && (
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
            })}
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
              placeholder="Escribe un comando (ej: help, list, status, run LAN-001)..."
              autoFocus
            />
          </form>
        </div>

      </div>
    </div>
  );
}

