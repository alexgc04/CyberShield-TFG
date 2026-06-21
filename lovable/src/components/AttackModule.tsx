import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Loader2, Download, AlertTriangle, CheckCircle, Shield } from "lucide-react";
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
  parameters: AttackParameter[];
  logger_command: string;
}

interface AttackModuleProps {
  attackId: string;
}

export default function AttackModule({ attackId }: AttackModuleProps) {
  const [template, setTemplate] = useState<AttackTemplate | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [hoverBg, setHoverBg] = useState<string>("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((centerY - y) / centerY) * 6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`,
      transition: "transform 0.05s ease"
    });

    setHoverBg(`radial-gradient(circle 200px at ${x}px ${y}px, rgba(0, 255, 65, 0.07) 0%, transparent 100%)`);
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.4s ease"
    });
    setHoverBg("");
  };

  const handleMouseDown = () => {
    setTiltStyle(prev => ({
      ...prev,
      transform: prev.transform ? prev.transform.replace(/scale3d\([^)]+\)/, "scale3d(0.98, 0.98, 0.98)") : "perspective(1000px) scale3d(0.98, 0.98, 0.98)"
    }));
  };

  const handleMouseUp = () => {
    setTiltStyle(prev => ({
      ...prev,
      transform: prev.transform ? prev.transform.replace(/scale3d\([^)]+\)/, "scale3d(1.01, 1.01, 1.01)") : "perspective(1000px) scale3d(1.01, 1.01, 1.01)"
    }));
  };

  useEffect(() => {
    let active = true;
    setLoadingTemplate(true);
    fetch(`/api/attacks/templates/${attackId}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la plantilla");
        return res.json();
      })
      .then((data) => {
        if (active && data.success && data.template) {
          setTemplate(data.template);
          // Inicializar parámetros con valores por defecto
          const initialParams: Record<string, string> = {};
          data.template.parameters.forEach((p: AttackParameter) => {
            initialParams[p.name] = p.default?.toString() || "";
          });
          setParams(initialParams);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setError("Error al cargar la plantilla de ataque");
      })
      .finally(() => {
        if (active) setLoadingTemplate(false);
      });

    return () => { active = false; };
  }, [attackId]);

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const getRenderedCommand = () => {
    if (!template) return "";
    let cmd = template.command;
    Object.entries(params).forEach(([key, val]) => {
      cmd = cmd.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || "");
    });
    return cmd;
  };

  const handleLaunch = async () => {
    if (!template) return;

    // Validar parámetros obligatorios
    for (const p of template.parameters) {
      if (p.required && !params[p.name]) {
        toast({
          title: "Campos incompletos",
          description: `El parámetro "${p.label}" es obligatorio.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (!companyName.trim()) {
      toast({
        title: "Campos incompletos",
        description: `El nombre de la organización es obligatorio.`,
        variant: "destructive"
      });
      return;
    }

    setStatus("running");
    setResult(null);
    setError(null);
    setProgress(5);
    setProgressText("Conectando al agente Kali Linux (10.10.10.21)...");

    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 8) + 3;
        if (currentProgress > 90) currentProgress = 90;

        if (currentProgress < 30) {
          setProgressText("Estableciendo túnel SSH seguro con Kali...");
        } else if (currentProgress < 55) {
          setProgressText("Invocando el vector ofensivo en Kali Linux...");
        } else if (currentProgress < 75) {
          setProgressText("Generando firmas de Syslog para Wazuh...");
        } else {
          setProgressText("Compilando auditoría y estructurando informe PDF...");
        }
        setProgress(currentProgress);
      }
    }, 600);

    try {
      const res = await fetch("/api/attacks/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_id: template.id,
          parameters: params,
          company_name: companyName
        })
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ocurrió un error al procesar el ataque.");
      }

      setProgress(100);
      setProgressText("¡Reporte de vulnerabilidades PDF generado con éxito!");
      setResult(data);
      setStatus("done");
      toast({
        title: "Ataque Completado",
        description: `El ataque ha sido lanzado y el informe procesado correctamente.`
      });
    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
      setProgressText("");
      setError(err.message || "Error al conectar con el servidor.");
      setStatus("error");
      toast({
        title: "Error de ejecución",
        description: err.message || "Error al conectar con el servidor.",
        variant: "destructive"
      });
    }
  };

  const isFormValid = () => {
    if (!template) return false;
    if (!companyName.trim()) return false;
    for (const p of template.parameters) {
      if (p.required && !params[p.name]) {
        return false;
      }
    }
    return true;
  };

  const getRiskColor = (level?: string) => {
    const lvl = (level || "").toLowerCase();
    if (lvl === "critical") return "bg-red-500/20 text-red-500 border-red-500/30";
    if (lvl === "high") return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (lvl === "medium") return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-500 border-blue-500/30";
  };

  if (loadingTemplate) {
    return (
      <div className="p-4 border border-[#00ff41]/20 bg-[#0a0a0a] rounded flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[#00ff41]" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="p-4 border border-red-500/30 bg-red-950/10 rounded flex flex-col items-center justify-center h-48 font-mono">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
        <span className="text-red-500 text-xs font-bold text-center">{error}</span>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        ...tiltStyle,
        backgroundImage: hoverBg ? `${hoverBg}` : undefined,
      }}
      className="transition-all duration-300 rounded-lg overflow-hidden"
    >
      <Card className="border-[#00ff41]/20 bg-black/40 glow-green text-[#00ff41] font-mono overflow-hidden">
      <CardHeader className="border-b border-[#00ff41]/10 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#00ff41]/30 text-[#00ff41] text-[10px] font-bold">
              {template.id}
            </Badge>
            <CardTitle className="text-sm font-bold">{template.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-[8px] uppercase font-bold border ${getRiskColor(template.risk_level)}`}>
              RIESGO: {template.risk_level || "MEDIUM"}
            </Badge>
            <Badge variant="outline" className="border-[#00ff41]/30 text-[#00ff41] text-[9px] uppercase font-semibold">
              {template.mitre_id}
            </Badge>
            <Badge variant="outline" className="border-[#00ff41]/30 text-[#00ff41] text-[9px]">
              WAZUH: {template.wazuh_rule_id}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Descripción del ataque */}
        <p className="text-xs text-[#00ff41]/85 leading-normal">{template.description}</p>

        {/* inputs y configurador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {/* Input Nombre Empresa */}
            <div className="space-y-1">
              <Label className="text-[10px] text-[#00ff41]/70 font-mono uppercase tracking-wider flex items-center gap-1">
                <span>🏢</span> Organización Auditada <span className="text-red-500">*</span>
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Banco_UCLM"
                disabled={status === "running"}
                className="font-mono text-xs bg-black/60 border-[#00ff41]/20 focus:border-[#00ff41]/80 focus:ring-1 focus:ring-[#00ff41] h-8 text-[#00ff41] placeholder:text-[#00ff41]/30"
              />
            </div>

            {/* Inputs de plantilla */}
            {template.parameters.map((p) => (
              <div key={p.name} className="space-y-1">
                <Label className="text-[10px] text-[#00ff41]/70 font-mono uppercase tracking-wider flex items-center gap-1">
                  <span>⚙️</span> {p.label} {p.required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type={p.type === "number" ? "number" : "text"}
                  value={params[p.name] || ""}
                  onChange={(e) => handleParamChange(p.name, e.target.value)}
                  placeholder={p.placeholder}
                  disabled={status === "running"}
                  className="font-mono text-xs bg-black/60 border-[#00ff41]/20 focus:border-[#00ff41]/80 focus:ring-1 focus:ring-[#00ff41] h-8 text-[#00ff41] placeholder:text-[#00ff41]/30"
                />
                {p.hint && (
                  <p className="text-[9px] text-[#00ff41]/50 font-mono leading-none italic">{p.hint}</p>
                )}
              </div>
            ))}
          </div>

          {/* Vista previa del comando final y progreso */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-[#00ff41]/70 font-mono uppercase tracking-wider flex items-center gap-1">
                <span>💻</span> Comando en Kali Linux (Vista Previa)
              </Label>
              <div className="p-2.5 bg-black/80 border border-[#00ff41]/25 rounded text-[11px] text-[#00ff41] leading-relaxed break-all select-all font-mono min-h-24">
                {getRenderedCommand()}
              </div>
            </div>

            {/* Progreso de la ejecución */}
            {status === "running" && progress > 0 && (
              <div className="space-y-1.5 p-2 bg-black/70 border border-[#00ff41]/10 rounded">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="animate-pulse">➔ {progressText}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1 bg-[#00ff41]/15" />
              </div>
            )}

            {/* Botón Ejecutar */}
            <Button
              onClick={handleLaunch}
              disabled={status === "running" || !isFormValid()}
              className="w-full font-mono text-xs bg-[#00ff41] text-black hover:bg-[#00ff41]/80 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(0,255,65,0.4)] h-9"
            >
              {status === "running" ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  EJECUTANDO VECTOR...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  EJECUTAR ATAQUE
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Resultados del ataque */}
        {status === "done" && result && (
          <div className="mt-3 space-y-3 border-t border-[#00ff41]/10 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-[#00ff41] font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>EJECUCIÓN FINALIZADA CORRECTAMENTE (EXIT CODE: {result.ssh_exit_code !== undefined ? result.ssh_exit_code : 0})</span>
              </div>
              {result.pdf_url && (
                <a
                  href={result.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00ff41]/10 border border-[#00ff41]/30 hover:border-[#00ff41] rounded text-[11px] text-[#00ff41] font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  INFORME PDF (CS-RPT)
                </a>
              )}
            </div>

            {/* Consola de salida de SSH */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#00ff41]/70 uppercase tracking-widest">Salida Estándar SSH (Logs)</span>
              <div className="p-2.5 bg-black border border-[#00ff41]/15 rounded text-[10px] font-mono text-[#00ff41]/90 overflow-x-auto leading-relaxed max-h-48 whitespace-pre">
                {result.ssh_output || "(Sin salida estándar)"}
              </div>
            </div>
          </div>
        )}

        {/* Errores */}
        {status === "error" && error && (
          <div className="mt-3 p-3 border border-red-500/20 bg-red-950/10 rounded flex items-start gap-2 text-red-500">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase block">Error en la simulación</span>
              <p className="text-[11px] leading-normal">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
