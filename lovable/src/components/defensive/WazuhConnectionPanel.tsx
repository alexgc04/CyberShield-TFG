// ============================================================================
// WazuhConnectionPanel.tsx — Panel de conexión al servidor Wazuh
// ============================================================================
// DÓNDE VA: lovable/src/components/defensive/WazuhConnectionPanel.tsx
//
// QUÉ HACE: Formulario donde el usuario introduce las credenciales de:
//   - Wazuh Manager API (URL + usuario + contraseña → genera JWT token)
//   - Wazuh Indexer API (URL + usuario + contraseña → Basic Auth en cada request)
//
// Al pulsar "CONECTAR", autentica contra ambas APIs y muestra el estado.
// Si la conexión es exitosa, carga el resumen de agentes.
// ============================================================================

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Unplug, Loader2, Server, Database,
  CheckCircle2, XCircle, Eye, EyeOff,
} from "lucide-react";
import type { WazuhCredentials, AgentSummary, LogEntry } from "@/services/wazuhService";

// ---------------------------------------------------------------------------
// TIPOS DE PROPS
// ---------------------------------------------------------------------------

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface WazuhConnectionPanelProps {
  /** Estado actual de la conexión */
  status: ConnectionStatus;
  /** Resumen de agentes (solo cuando está conectado) */
  agentSummary: AgentSummary | null;
  /** Callback cuando el usuario pulsa CONECTAR */
  onConnect: (credentials: WazuhCredentials) => Promise<void>;
  /** Callback cuando el usuario pulsa DESCONECTAR */
  onDisconnect: () => void;
  /** Función para añadir logs a la consola de actividad */
  pushLog: (level: LogEntry["level"], message: string) => void;
}

// ---------------------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------------------

const WazuhConnectionPanel = ({
  status,
  agentSummary,
  onConnect,
  onDisconnect,
  pushLog,
}: WazuhConnectionPanelProps) => {
  // Estado local del formulario
  const [credentials, setCredentials] = useState<WazuhCredentials>({
    managerUrl: "",
    managerUser: "",
    managerPassword: "",
    indexerUrl: "",
    indexerUser: "",
    indexerPassword: "",
  });

  // Controlar visibilidad de las contraseñas
  const [showManagerPass, setShowManagerPass] = useState(false);
  const [showIndexerPass, setShowIndexerPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Actualizar un campo del formulario
  const updateField = (field: keyof WazuhCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  // Manejar el botón CONECTAR
  const handleConnect = async () => {
    setErrorMsg("");

    // Validación básica
    if (!credentials.managerUrl || !credentials.managerUser || !credentials.managerPassword) {
      setErrorMsg("Completa los campos del Manager API");
      return;
    }
    if (!credentials.indexerUrl || !credentials.indexerUser || !credentials.indexerPassword) {
      setErrorMsg("Completa los campos del Indexer API");
      return;
    }

    try {
      await onConnect(credentials);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error de conexión desconocido");
    }
  };

  // Badge de estado de conexión (mismo patrón que Offensive.tsx)
  const statusBadge = {
    disconnected: {
      label: "DESCONECTADO",
      color: "bg-muted/30 text-muted-foreground border-muted/40",
      dot: "bg-muted-foreground",
    },
    connecting: {
      label: "CONECTANDO...",
      color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      dot: "bg-blue-400 animate-pulse",
    },
    connected: {
      label: "CONECTADO",
      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      dot: "bg-emerald-400",
    },
    error: {
      label: "ERROR",
      color: "bg-red-500/20 text-red-300 border-red-500/40",
      dot: "bg-red-400",
    },
  }[status];

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <Card className="border-primary/10 bg-card/60">
      <CardContent className="p-5 space-y-4">
        {/* Cabecera con estado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-neon-cyan/10 border border-neon-cyan/20">
              <ShieldCheck className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Conexión Wazuh SIEM
              </p>
              <p className="text-xs font-mono text-foreground">
                Manager API + Indexer API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`font-mono text-[10px] gap-1.5 ${statusBadge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Resumen de agentes (solo cuando está conectado) */}
        {isConnected && agentSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Activos", value: agentSummary.active, color: "text-neon-green", dot: "bg-neon-green" },
              { label: "Desconectados", value: agentSummary.disconnected, color: "text-neon-red", dot: "bg-neon-red" },
              { label: "Pendientes", value: agentSummary.pending, color: "text-neon-yellow", dot: "bg-neon-yellow" },
              { label: "Total", value: agentSummary.total, color: "text-neon-cyan", dot: "bg-neon-cyan" },
            ].map(item => (
              <div
                key={item.label}
                className="bg-background/40 border border-border/30 rounded-lg p-3 text-center"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span className={`text-xl font-bold font-mono ${item.color}`}>
                    {item.value}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de credenciales (solo si NO está conectado) */}
        {!isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Manager API */}
            <div className="space-y-3 p-4 rounded-lg bg-background/30 border border-border/20">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs font-mono text-neon-cyan uppercase tracking-wider font-semibold">
                  Manager API (:55000)
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] text-muted-foreground">URL del Manager</Label>
                <Input
                  placeholder="https://192.168.1.100:55000"
                  value={credentials.managerUrl}
                  onChange={e => updateField("managerUrl", e.target.value)}
                  className="bg-background/60 border-primary/30 font-mono text-sm h-9"
                  disabled={isConnecting}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px] text-muted-foreground">Usuario</Label>
                  <Input
                    placeholder="wazuh-wui"
                    value={credentials.managerUser}
                    onChange={e => updateField("managerUser", e.target.value)}
                    className="bg-background/60 border-primary/30 font-mono text-sm h-9"
                    disabled={isConnecting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px] text-muted-foreground">Contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showManagerPass ? "text" : "password"}
                      placeholder="••••••"
                      value={credentials.managerPassword}
                      onChange={e => updateField("managerPassword", e.target.value)}
                      className="bg-background/60 border-primary/30 font-mono text-sm h-9 pr-9"
                      disabled={isConnecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowManagerPass(!showManagerPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showManagerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Indexer API */}
            <div className="space-y-3 p-4 rounded-lg bg-background/30 border border-border/20">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs font-mono text-neon-cyan uppercase tracking-wider font-semibold">
                  Indexer API (:9200)
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[11px] text-muted-foreground">URL del Indexer</Label>
                <Input
                  placeholder="https://192.168.1.100:9200"
                  value={credentials.indexerUrl}
                  onChange={e => updateField("indexerUrl", e.target.value)}
                  className="bg-background/60 border-primary/30 font-mono text-sm h-9"
                  disabled={isConnecting}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px] text-muted-foreground">Usuario</Label>
                  <Input
                    placeholder="admin"
                    value={credentials.indexerUser}
                    onChange={e => updateField("indexerUser", e.target.value)}
                    className="bg-background/60 border-primary/30 font-mono text-sm h-9"
                    disabled={isConnecting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px] text-muted-foreground">Contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showIndexerPass ? "text" : "password"}
                      placeholder="••••••"
                      value={credentials.indexerPassword}
                      onChange={e => updateField("indexerPassword", e.target.value)}
                      className="bg-background/60 border-primary/30 font-mono text-sm h-9 pr-9"
                      disabled={isConnecting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowIndexerPass(!showIndexerPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showIndexerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs font-mono text-destructive">{errorMsg}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex items-center gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-neon-cyan text-black hover:bg-neon-cyan/80 font-mono uppercase tracking-wider text-xs glow-cyan"
            >
              {isConnecting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> CONECTANDO...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> CONECTAR A WAZUH</>
              )}
            </Button>
          ) : (
            <Button
              onClick={onDisconnect}
              variant="outline"
              className="font-mono uppercase tracking-wider text-xs border-neon-red/30 text-neon-red hover:bg-neon-red/10"
            >
              <Unplug className="w-4 h-4 mr-2" /> DESCONECTAR
            </Button>
          )}

          {isConnected && (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Manager + Indexer conectados
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WazuhConnectionPanel;
