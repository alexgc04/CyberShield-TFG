import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crosshair, Terminal, Download, ShieldAlert, Loader2 } from "lucide-react";
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

export default function Offensive() {
  const [templates, setTemplates] = useState<AttackTemplate[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<AttackTemplate | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(false);

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

  const handleSelect = (template: AttackTemplate) => {
    setSelectedAttack(template);
    const initialParams: Record<string, string> = {};
    template.parameters.forEach((param) => {
      initialParams[param.name] = param.default?.toString() || "";
    });
    setParamValues(initialParams);
  };

  const handleParamChange = (key: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [key]: value }));
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

    setLoading(true);
    toast({
      title: "Ejecutando Ataque",
      description: `Lanzando ${selectedAttack.name} vía SSH...`,
    });

    try {
      const res = await fetch("/api/attacks/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_id: selectedAttack.id,
          parameters: paramValues,
          company_name: companyName
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al ejecutar el ataque");
      }

      toast({
        title: "Ataque Completado",
        description: `El ataque ha sido lanzado y el informe procesado vía n8n.`,
      });
      setSelectedAttack(null);
    } catch (err: any) {
      toast({
        title: "Error de ejecución",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="fixed inset-0 bg-cover bg-center opacity-20 pointer-events-none z-0" style={{ backgroundImage: "url('/images/nodes.png')" }} />
      <div className="space-y-6 relative z-10">
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary text-glow-green tracking-wider flex items-center gap-2">
            <Crosshair className="w-6 h-6" /> MÓDULOS OFENSIVOS
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Catálogo de ataques · parámetros dinámicos · inyección Wazuh
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda: Catálogo */}
          <Card className="border-primary/10 bg-card/60 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Catálogo de Plantillas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground">No hay plantillas cargadas en MongoDB.</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t)}
                      className={`w-full text-left p-4 rounded-md border transition-all ${
                        selectedAttack?.id === t.id
                          ? "bg-primary/10 border-primary glow-green"
                          : "bg-background/40 border-border/30 hover:border-primary/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-primary">{t.id}</span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{t.mitre_id}</span>
                      </div>
                      <p className="text-sm font-bold font-mono mt-1">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Columna Derecha: Configuración y Ejecución */}
          <Card className="border-primary/10 bg-card/60 h-fit">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-mono text-primary uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Configuración de Lanzamiento
              </CardTitle>
              {selectedAttack && (
                <CardDescription className="text-xs font-mono mt-2">
                  Plantilla seleccionada: <span className="text-foreground font-bold">{selectedAttack.id}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {!selectedAttack ? (
                <div className="text-center py-10 opacity-50">
                  <Terminal className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-mono text-muted-foreground">Selecciona un ataque del catálogo para configurarlo.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-muted/20 border border-border/30 rounded-md">
                    <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Comando Base (Vista Previa)</p>
                    <code className="text-sm font-mono text-primary break-all">
                      {selectedAttack.command}
                    </code>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Empresa/Organización auditada
                      </Label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Empresa Auditada"
                        className="font-mono text-sm bg-background/50 focus:border-primary"
                      />
                    </div>
                    {selectedAttack.parameters.map((param) => (
                      <div key={param.name} className="space-y-2">
                        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          {param.label} {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={paramValues[param.name] || ""}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          placeholder={param.placeholder}
                          className="font-mono text-sm bg-background/50 focus:border-primary"
                        />
                        {param.hint && (
                          <p className="text-[10px] text-muted-foreground font-mono">{param.hint}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/80 glow-green font-mono uppercase tracking-widest text-sm transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        EJECUTANDO EN KALI...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4" />
                        LANZAR ATAQUE
                      </span>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
