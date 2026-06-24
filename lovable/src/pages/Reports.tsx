import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Download, Search, AlertTriangle, CheckCircle2, 
  ShieldAlert, Calendar, RefreshCw, Loader2, Play, Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AttackLog {
  _id: string;
  attack_id: string;
  attack_name: string;
  module: string;
  company_name: string;
  ssh_exit_code: number;
  report_id?: string;
  pdf_url?: string;
  timestamp: string;
  parameters?: Record<string, any>;
  ssh_output?: string;
}

export default function Reports() {
  const [reports, setReports] = useState<AttackLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState("all");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      } else {
        throw new Error(data.error || "Error al obtener reportes");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error de carga",
        description: err.message || "No se pudo conectar con el servidor.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getModuleLabel = (moduleName: string) => {
    const mod = (moduleName || "").toLowerCase();
    if (mod === "lan") return "Red Local (LAN)";
    if (mod === "scapy") return "Inyección Scapy";
    if (mod === "bf" || mod === "brute_force") return "Fuerza Bruta";
    if (mod === "lin" || mod === "privesc") return "Privilegios Linux";
    if (mod === "priv" || mod === "active_directory") return "Active Directory";
    return moduleName;
  };

  const getModuleBadgeStyle = (moduleName: string) => {
    const mod = (moduleName || "").toLowerCase();
    if (mod === "lan") return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    if (mod === "scapy") return "bg-cyan-500/10 text-cyan-500 border-cyan-500/30";
    if (mod === "bf" || mod === "brute_force") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    return "bg-purple-500/10 text-purple-500 border-purple-500/30";
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente este reporte? Se borrará el registro y el archivo PDF del servidor.")) {
      return;
    }
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Reporte eliminado",
          description: "El reporte se ha eliminado correctamente del sistema."
        });
        fetchReports();
      } else {
        throw new Error(data.error || "No se pudo eliminar el reporte.");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error al eliminar",
        description: err.message || "Ocurrió un error al intentar eliminar el reporte.",
        variant: "destructive"
      });
    }
  };

  const filteredReports = reports.filter((rpt) => {
    // Ocultar reportes sin PDF (ejecuciones fallidas)
    if (!rpt.pdf_url) return false;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      rpt.attack_name?.toLowerCase().includes(query) ||
      rpt.attack_id?.toLowerCase().includes(query) ||
      rpt.company_name?.toLowerCase().includes(query) ||
      (rpt.report_id && rpt.report_id.toLowerCase().includes(query));
    
    const matchesFilter = filterModule === "all" || rpt.module?.toLowerCase() === filterModule.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative pb-12 font-mono">
      <div className="fixed inset-0 bg-cover bg-center opacity-15 pointer-events-none z-0" style={{ backgroundImage: "url('/images/servers.png')" }} />
      <div className="space-y-6 relative z-10">
        
        {/* Header de la página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-primary text-glow-green tracking-wider flex items-center gap-2">
              <FileText className="w-6 h-6 animate-pulse" /> REPOSITORIO DE REPORTES
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Historial de auditorías · descarga de reportes PDF académicos · registro de ejecuciones Kali Linux
            </p>
          </div>
          
          <Button 
            onClick={fetchReports} 
            disabled={loading}
            className="bg-primary/10 border border-primary text-primary hover:bg-primary/20 font-mono text-xs h-8 glow-green"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Sincronizar
          </Button>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-card/25 backdrop-blur-md p-3.5 rounded-xl border border-border/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por empresa, ataque o ID de reporte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 font-mono text-xs h-9 border-border/50 focus-visible:ring-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "all", label: "Todos" },
              { value: "lan", label: "Red (LAN)" },
              { value: "scapy", label: "Scapy" },
              { value: "bf", label: "Brute Force" },
              { value: "lin", label: "Privs Linux" },
              { value: "priv", label: "Active Directory" }
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterModule(cat.value)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-all border ${
                  filterModule === cat.value
                    ? "bg-primary/10 border-primary text-primary glow-green"
                    : "bg-background/20 border-border/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Reportes */}
        {loading && reports.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-xs text-muted-foreground animate-pulse">Obteniendo reportes del servidor...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="border-border/30 bg-card/30 py-16 text-center">
            <CardContent>
              <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                {reports.length === 0 ? "No hay registros de ataques en la base de datos." : "Ningún reporte coincide con la búsqueda."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((rpt) => (
              <Card 
                key={rpt._id} 
                className="bg-card/45 backdrop-blur-md border border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground font-semibold">
                        {rpt.report_id || `CS-RPT-${rpt._id.slice(-6).toUpperCase()}`}
                      </span>
                      <Badge className={`text-[8px] font-mono border px-1.5 py-0 ${getModuleBadgeStyle(rpt.module)}`}>
                        {getModuleLabel(rpt.module)}
                      </Badge>
                      {rpt.ssh_exit_code === 0 ? (
                        <Badge className="text-[8px] font-mono bg-neon-green/10 text-neon-green border-neon-green/30 px-1.5 py-0 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> ÉXITO
                        </Badge>
                      ) : (
                        <Badge className="text-[8px] font-mono bg-red-500/10 text-red-500 border-red-500/30 px-1.5 py-0 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> ERROR
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-bold text-foreground font-mono truncate">
                      {rpt.attack_name} ({rpt.attack_id})
                    </h3>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        🏢 Empresa: <strong className="text-foreground">{rpt.company_name}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        📅 Fecha: <strong className="text-foreground">{new Date(rpt.timestamp).toLocaleString()}</strong>
                      </span>
                      {rpt.parameters && rpt.parameters.target && (
                        <span className="flex items-center gap-1">
                          🎯 Host: <strong className="text-primary">{rpt.parameters.target || rpt.parameters.ip}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-border/20 justify-end">
                  {rpt.pdf_url ? (
                    <Button 
                      asChild
                      className="bg-primary hover:bg-primary/80 text-primary-foreground font-mono text-xs glow-green h-8 flex items-center gap-1.5 px-3"
                    >
                      <a href={rpt.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3.5 h-3.5" />
                        DESCARGAR PDF
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      disabled
                      variant="outline"
                      className="border-border/50 text-muted-foreground font-mono text-xs h-8 flex items-center gap-1.5 px-3"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF NO DISPONIBLE
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDelete(rpt._id)}
                    className="bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-500 font-mono text-xs h-8 flex items-center justify-center p-2.5 rounded-lg transition-all"
                    title="Eliminar Reporte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
