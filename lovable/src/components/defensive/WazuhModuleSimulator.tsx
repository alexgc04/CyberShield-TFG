import React from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield, AlertTriangle, Bug, FileSearch, Crosshair, GitBranch,
  Activity, CreditCard, Lock, Network, Zap, Key, ArrowUpCircle,
  CheckCircle2, XCircle, Terminal, HelpCircle, ShieldAlert, Cpu
} from "lucide-react";
import type { WazuhAgent } from "@/services/wazuhService";

interface WazuhModuleSimulatorProps {
  module: string | null;
  onClose: () => void;
  agents: WazuhAgent[];
}

export default function WazuhModuleSimulator({ module, onClose, agents }: WazuhModuleSimulatorProps) {
  if (!module) return null;

  // Seleccionar por defecto el primer agente si existe, sino fallback a 001
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>(() => 
    (agents && agents.length > 0) ? agents[0].id : "001"
  );

  const selectedAgent = (agents && agents.length > 0)
    ? (agents.find(a => a.id === selectedAgentId) || agents[0])
    : { id: "001", name: "kali-agent", ip: "10.10.10.142", status: "active" };

  const isKali = selectedAgent.name.toLowerCase().includes("kali");
  const isManager = selectedAgent.name.toLowerCase().includes("manager") || selectedAgent.id === "000";
  const isDebian = selectedAgent.name.toLowerCase().includes("debian");

  const getAgentOS = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("kali")) return "Kali GNU/Linux 2026.1";
    if (n.includes("debian")) return "Debian GNU/Linux 11";
    if (n.includes("manager")) return "Wazuh Manager Host (Ubuntu 22.04)";
    if (n.includes("ubuntu")) return "Ubuntu Linux 22.04 LTS";
    if (n.includes("windows") || n.includes("win")) return "Windows Server 2022";
    return "Linux Kernel 5.15 Generic";
  };

  const getModuleInfo = () => {
    switch (module) {
      case "config_assessment":
        return {
          title: "Config Assessment (SCA)",
          subtitle: "Evaluación de Hardening y Cumplimiento CIS",
          icon: Shield,
          color: "text-primary"
        };
      case "malware_detection":
        return {
          title: "Malware Detection",
          subtitle: "Firmas y Detección de Rootkits/IOCs",
          icon: Bug,
          color: "text-primary"
        };
      case "fim":
        return {
          title: "File Integrity Monitoring (FIM)",
          subtitle: "Auditoría en Tiempo Real de Cambios en Archivos",
          icon: FileSearch,
          color: "text-primary"
        };
      case "threat_hunting":
        return {
          title: "Threat Hunting",
          subtitle: "Búsqueda Proactiva y Correlación de Alertas de Nivel Alto",
          icon: Crosshair,
          color: "text-primary"
        };
      case "vulnerability":
        return {
          title: "Vulnerability Detection",
          subtitle: "Análisis de CVEs y Parches de Software del Agente",
          icon: AlertTriangle,
          color: "text-primary"
        };
      case "mitre":
        return {
          title: "MITRE ATT&CK",
          subtitle: "Mapeo de Técnicas y Tácticas Adversarias Detectadas",
          icon: GitBranch,
          color: "text-primary"
        };
      case "it_hygiene":
        return {
          title: "IT Hygiene & Inventory",
          subtitle: "Control de Puertos, Procesos y Software Obsoleto",
          icon: Activity,
          color: "text-primary"
        };
      case "pci_dss":
        return {
          title: "PCI DSS Compliance",
          subtitle: "Cumplimiento del Estándar de Tarjetas de Pago",
          icon: CreditCard,
          color: "text-primary"
        };
      case "gdpr":
        return {
          title: "GDPR Compliance",
          subtitle: "Monitoreo del Reglamento de Protección de Datos",
          icon: Lock,
          color: "text-primary"
        };
      case "cs_lan":
        return {
          title: "CyberShield LAN Module",
          subtitle: "Detección de Ataques MAC Flooding, ARP Spoofing y DHCP Starvation",
          icon: Network,
          color: "text-[#3fb950]"
        };
      case "cs_scapy":
        return {
          title: "CyberShield Scapy Module",
          subtitle: "Detección de Escaneos Sigilosos TCP/ARP y Protocol Fuzzing",
          icon: Zap,
          color: "text-[#3fb950]"
        };
      case "cs_brute":
        return {
          title: "CyberShield BruteForce Module",
          subtitle: "Detección de Ataques de Fuerza Bruta SSH y Web",
          icon: Key,
          color: "text-[#3fb950]"
        };
      case "cs_privesc":
        return {
          title: "CyberShield PrivEsc Module",
          subtitle: "Detección de Escalada de Privilegios Local y de Dominio",
          icon: ArrowUpCircle,
          color: "text-[#3fb950]"
        };
      default:
        return {
          title: "Wazuh SIEM Module",
          subtitle: "Telemetría de Seguridad",
          icon: Shield,
          color: "text-primary"
        };
    }
  };

  const info = getModuleInfo();
  const Icon = info.icon;

  return (
    <Dialog open={!!module} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] font-sans overflow-hidden p-0 max-h-[85vh] flex flex-col">
        
        {/* CABECERA ESTILO KIBANA */}
        <DialogHeader className="bg-[#161b22] px-6 py-4 border-b border-[#30363d] flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-[#21262d] border border-[#30363d] rounded-md ${info.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-widest">Wazuh SIEM Console</span>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/30 font-bold px-1.5 py-0.2 rounded-full uppercase scale-90">DEMO MOCK</span>
              </div>
              <DialogTitle className="text-base font-extrabold text-[#f0f6fc]">{info.title}</DialogTitle>
              <DialogDescription className="text-xs text-[#8b949e] mt-0.5">{info.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENIDO DEL MODULO */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm leading-relaxed">
          
          {/* SELECTOR DE AGENTES REGISTRADOS */}
          {agents && agents.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#161b22]/30 border border-[#30363d] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-foreground">Agente en inspección:</span>
              </div>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="bg-[#21262d] border border-[#30363d] text-foreground text-xs rounded px-2.5 py-1 focus:outline-none focus:border-primary font-mono cursor-pointer"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id}) - {a.status === 'active' ? 'Conectado' : 'Desconectado'}</option>
                ))}
              </select>
            </div>
          )}

          {/* DETALLES DEL AGENTE CONECTADO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#161b22]/50 border border-[#30363d] rounded-lg p-3 font-mono text-[10px]">
            <div>
              <span className="text-muted-foreground block uppercase">Agente Objetivo:</span>
              <span className="text-foreground font-bold">{selectedAgent.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase">ID Agente:</span>
              <span className="text-foreground">{selectedAgent.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase">Dirección IP:</span>
              <span className="text-[#58a6ff]">{selectedAgent.ip || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block uppercase">Sistema Operativo:</span>
              <span className="text-[#3fb950]">{getAgentOS(selectedAgent.name)}</span>
            </div>
          </div>

          {/* 1. CONFIG ASSESSMENT (SCA) */}
          {module === "config_assessment" && (() => {
            const scaScore = isManager ? 95 : isDebian ? 83 : isKali ? 76 : 80;
            const scaPassed = isManager ? 45 : isDebian ? 31 : isKali ? 28 : 30;
            const scaFailed = isManager ? 2 : isDebian ? 6 : isKali ? 9 : 8;

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#161b22] p-4 rounded-lg border border-[#30363d]">
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center rounded-full border-4 border-[#3fb950] bg-black/40">
                    <div className="text-center">
                      <span className="text-lg font-black text-[#f0f6fc]">{scaScore}%</span>
                      <span className="text-[8px] text-muted-foreground block uppercase">Score</span>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#21262d] p-2 rounded border border-[#30363d]">
                      <span className="text-[#8b949e] block text-[10px]">REGLAS CIS</span>
                      <span className="text-base font-bold text-foreground">{scaPassed + scaFailed}</span>
                    </div>
                    <div className="bg-[#21262d] p-2 rounded border border-[#30363d]">
                      <span className="text-[#8b949e] block text-[10px]">PASADAS</span>
                      <span className="text-base font-bold text-[#3fb950]">{scaPassed}</span>
                    </div>
                    <div className="bg-[#21262d] p-2 rounded border border-[#30363d]">
                      <span className="text-[#8b949e] block text-[10px]">FALLIDAS</span>
                      <span className="text-base font-bold text-destructive">{scaFailed}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#f0f6fc] text-xs">Directivas CIS {isManager ? "Ubuntu" : "Debian"} Linux Auditadas ({selectedAgent.name}):</h4>
                  <div className="border border-[#30363d] rounded-lg divide-y divide-[#30363d] text-xs max-h-[220px] overflow-y-auto">
                    {isKali && (
                      <>
                        <div className="p-2.5 flex justify-between gap-3 bg-destructive/5 hover:bg-destructive/10">
                          <div>
                            <span className="text-destructive font-bold">[FAIL]</span> <span className="text-[#c9d1d9] font-medium">Permit root login is disabled in SSH configuration</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Control 5.2.10: Deshabilitar el acceso directo de root vía SSH reduce la superficie de fuerza bruta.</p>
                          </div>
                          <Badge className="bg-destructive text-white uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">HIGH</Badge>
                        </div>
                        <div className="p-2.5 flex justify-between gap-3 bg-destructive/5 hover:bg-destructive/10">
                          <div>
                            <span className="text-destructive font-bold">[FAIL]</span> <span className="text-[#c9d1d9] font-medium">Password expiration policies must be set to 90 days or less</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Control 5.4.1.1: Evita el uso indefinido de credenciales vulneradas.</p>
                          </div>
                          <Badge className="bg-warning text-black uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">MEDIUM</Badge>
                        </div>
                      </>
                    )}
                    {isDebian && (
                      <>
                        <div className="p-2.5 flex justify-between gap-3 bg-destructive/5 hover:bg-destructive/10">
                          <div>
                            <span className="text-destructive font-bold">[FAIL]</span> <span className="text-[#c9d1d9] font-medium">Ensure SSH password authentication is disabled</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Control 5.2.8: Se prefiere la autenticación por llaves públicas.</p>
                          </div>
                          <Badge className="bg-destructive text-white uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">HIGH</Badge>
                        </div>
                      </>
                    )}
                    {isManager && (
                      <>
                        <div className="p-2.5 flex justify-between gap-3 bg-[#3fb950]/5 hover:bg-[#3fb950]/10">
                          <div>
                            <span className="text-[#3fb950] font-bold">[PASS]</span> <span className="text-[#c9d1d9] font-medium">Verify that SSH root login is disabled</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Control 5.2.10: Root login está configurado en "prohibit-password" en el Manager.</p>
                          </div>
                          <Badge className="bg-primary/20 text-primary border border-primary/30 uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">HIGH</Badge>
                        </div>
                      </>
                    )}
                    <div className="p-2.5 flex justify-between gap-3 bg-[#3fb950]/5 hover:bg-[#3fb950]/10">
                      <div>
                        <span className="text-[#3fb950] font-bold">[PASS]</span> <span className="text-[#c9d1d9] font-medium">Verify that password complexity requirements are enabled via pam_pwquality</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Control 5.3.1: Longitud mínima de contraseña obligatoria de 14 caracteres.</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary border border-primary/30 uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">MEDIUM</Badge>
                    </div>
                    <div className="p-2.5 flex justify-between gap-3 bg-[#3fb950]/5 hover:bg-[#3fb950]/10">
                      <div>
                        <span className="text-[#3fb950] font-bold">[PASS]</span> <span className="text-[#c9d1d9] font-medium">Verify that core dumps are disabled in security limits configuration</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Control 1.5.1: Evita la exfiltración de memoria de procesos caídos.</p>
                      </div>
                      <Badge className="bg-zinc-800 text-zinc-400 uppercase text-[8px] h-fit px-1.5 py-0.2 pointer-events-none">LOW</Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 2. MALWARE DETECTION */}
          {module === "malware_detection" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg space-y-2">
                  <span className="text-xs text-muted-foreground uppercase font-mono font-bold block text-primary">Estado de Rootcheck</span>
                  <div className="flex justify-between text-xs border-b border-[#30363d] pb-2">
                    <span>Motor de escaneo ({selectedAgent.name}):</span> <span className="text-[#3fb950] font-bold">ACTIVO</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-[#30363d] pb-2">
                    <span>Último análisis completo:</span> <span className="text-foreground">Hoy, 09:12 AM</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Frecuencia de escaneo:</span> <span className="text-foreground">Cada 12 horas</span>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg space-y-2">
                  <span className="text-xs text-muted-foreground uppercase font-mono font-bold block text-primary">Estadísticas de Amenazas</span>
                  <div className="flex justify-between text-xs border-b border-[#30363d] pb-2">
                    <span>Rootkits conocidos:</span> <span className="text-[#3fb950] font-bold">0 detectados</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-[#30363d] pb-2">
                    <span>Procesos ocultos / troyanos:</span> <span className="text-[#3fb950] font-bold">0 detectados</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Ficheros en cuarentena:</span> <span className="text-foreground">0</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f0f6fc] text-xs">Historial de Escaneos de Rootkits en {selectedAgent.name}:</h4>
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 font-mono text-[10px] text-muted-foreground max-h-[140px] overflow-y-auto leading-relaxed">
                  <div>[2026-06-30 09:12:14] Info: Iniciando escaneo de rootkits en {selectedAgent.name}...</div>
                  <div>[2026-06-30 09:12:35] Info: Comprobando firmas conocidas de troyanos en la base de datos...</div>
                  <div>[2026-06-30 09:13:05] Info: Escaneando directorio /dev en busca de ficheros ocultos...</div>
                  <div>[2026-06-30 09:13:18] Info: Comprobando integridad de llamadas al sistema (LKM rootkits)...</div>
                  <div>[2026-06-30 09:13:42] Success: Escaneo completado. No se han detectado anomalías de firmware, kernel ni rootkits en {selectedAgent.name}.</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. FILE INTEGRITY MONITORING (FIM) */}
          {module === "fim" && (() => {
            const filesList = isKali ? [
              { path: "/etc/shadow", action: "MODIFICADO", time: "Hoy, 11:58 AM", user: "root" },
              { path: "/etc/ssh/sshd_config", action: "MODIFICADO", time: "Hoy, 11:50 AM", user: "root" },
              { path: "/etc/pam.d/common-auth", action: "ATRIBUTOS", time: "Hoy, 10:44 AM", user: "root" },
              { path: "/usr/bin/sudo", action: "ATRIBUTOS", time: "Ayer, 08:30 PM", user: "root" }
            ] : isDebian ? [
              { path: "/var/www/html/index.html", action: "MODIFICADO", time: "Hoy, 09:30 AM", user: "www-data" },
              { path: "/etc/apache2/ports.conf", action: "MODIFICADO", time: "Hoy, 09:28 AM", user: "root" },
              { path: "/etc/passwd", action: "ATRIBUTOS", time: "Ayer, 11:22 AM", user: "root" }
            ] : [
              { path: "/var/ossec/etc/ossec.conf", action: "MODIFICADO", time: "Hoy, 10:15 AM", user: "admin" },
              { path: "/var/ossec/etc/rules/local_rules.xml", action: "MODIFICADO", time: "Hoy, 10:05 AM", user: "admin" }
            ];

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">MONITOREADOS</span>
                    <span className="text-lg font-bold text-foreground">{isManager ? "4,124" : isDebian ? "1,245" : "1,489"} ficheros</span>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">EVENTOS (7D)</span>
                    <span className="text-lg font-bold text-warning">{filesList.length} eventos</span>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">ESTADO SENSOR</span>
                    <span className="text-lg font-bold text-[#3fb950]">ACTIVO</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#f0f6fc] text-xs">Historial de Integridad en Tiempo Real (Syscheck) de {selectedAgent.name}:</h4>
                  <div className="border border-[#30363d] rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-[#161b22] text-[#8b949e] text-[9px] uppercase border-b border-[#30363d]">
                        <tr>
                          <th className="p-2">Archivo</th>
                          <th className="p-2">Acción</th>
                          <th className="p-2">Fecha y Hora</th>
                          <th className="p-2">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]">
                        {filesList.map((file, idx) => (
                          <tr key={idx} className="hover:bg-[#161b22]/30">
                            <td className="p-2 text-foreground font-semibold truncate max-w-[280px]">{file.path}</td>
                            <td className="p-2"><Badge className={`text-[8px] pointer-events-none font-bold ${file.action === 'MODIFICADO' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'bg-warning/20 text-warning border border-warning/30'}`}>{file.action}</Badge></td>
                            <td className="p-2 text-muted-foreground">{file.time}</td>
                            <td className="p-2">{file.user}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. THREAT HUNTING */}
          {module === "threat_hunting" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`rule.level: >=10 AND (agent.name: ${selectedAgent.name} OR rule.groups: cybershield)`}
                  className="flex-1 bg-black/60 border border-[#30363d] rounded p-2 text-xs font-mono text-[#58a6ff]"
                />
                <button className="bg-primary text-black font-bold px-3 py-1.5 rounded text-xs">Search</button>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f0f6fc] text-xs">Eventos de Seguridad Relevantes Mapeados ({selectedAgent.name}):</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {isKali ? (
                    <>
                      <div className="p-2 bg-destructive/10 border border-destructive/30 rounded flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">Hoy, 11:58:32 AM</span>
                            <Badge className="bg-destructive text-white text-[8px] pointer-events-none">LEVEL 15</Badge>
                          </div>
                          <p className="text-xs font-semibold text-foreground mt-1">ALERTA CYBERSHIELD: Intento de canal encubierto y exfiltración de datos detectado</p>
                          <span className="text-[9px] font-mono text-muted-foreground block mt-0.5">Regla: 100503 · MITRE ID: T1048 · Decoder: json</span>
                        </div>
                      </div>

                      <div className="p-2 bg-warning/10 border border-warning/30 rounded flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">Hoy, 11:50:12 AM</span>
                            <Badge className="bg-warning text-black text-[8px] pointer-events-none">LEVEL 12</Badge>
                          </div>
                          <p className="text-xs font-semibold text-foreground mt-1">ALERTA CYBERSHIELD: Envenenamiento de caché ARP (Man-in-the-Middle) detectado</p>
                          <span className="text-[9px] font-mono text-muted-foreground block mt-0.5">Regla: 100504 · MITRE ID: T1557 · Decoder: json</span>
                        </div>
                      </div>
                    </>
                  ) : isDebian ? (
                    <div className="p-2 bg-warning/10 border border-warning/30 rounded flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Ayer, 03:22:15 PM</span>
                          <Badge className="bg-warning text-black text-[8px] pointer-events-none">LEVEL 10</Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-1">sshd: Múltiples intentos de autenticación fallidos desde IP externa</p>
                        <span className="text-[9px] font-mono text-muted-foreground block mt-0.5">Regla: 5712 · MITRE ID: T1110 · Decoder: sshd</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded text-center text-xs text-muted-foreground font-mono">
                      No se registran eventos críticos de seguridad (nivel 10+) en el host del Manager.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. VULNERABILITY DETECTION */}
          {module === "vulnerability" && (() => {
            const vulnCritical = isManager ? 0 : isDebian ? 1 : isKali ? 2 : 1;
            const vulnHigh = isManager ? 0 : isDebian ? 1 : isKali ? 3 : 2;
            const vulnMedium = isManager ? 1 : isDebian ? 3 : isKali ? 2 : 2;
            const vulnLow = isManager ? 2 : isDebian ? 1 : isKali ? 1 : 1;
            const total = vulnCritical + vulnHigh + vulnMedium + vulnLow;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="bg-[#161b22] border border-[#30363d] p-2 rounded">
                    <span className="text-destructive font-black block">CRITICAL</span>
                    <span className="text-base font-bold">{vulnCritical}</span>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-2 rounded">
                    <span className="text-orange-500 font-black block">HIGH</span>
                    <span className="text-base font-bold">{vulnHigh}</span>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-2 rounded">
                    <span className="text-yellow-500 font-black block">MEDIUM</span>
                    <span className="text-base font-bold">{vulnMedium}</span>
                  </div>
                  <div className="bg-[#161b22] border border-[#30363d] p-2 rounded">
                    <span className="text-emerald-500 font-black block">LOW</span>
                    <span className="text-base font-bold">{vulnLow}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#f0f6fc] text-xs">Vulnerabilidades de Software ({selectedAgent.name}):</h4>
                  {total === 0 ? (
                    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded text-center text-xs text-muted-foreground font-mono">
                      No se han encontrado vulnerabilidades en el inventario del agente.
                    </div>
                  ) : (
                    <div className="border border-[#30363d] rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-[#161b22] text-[#8b949e] text-[9px] uppercase border-b border-[#30363d]">
                          <tr>
                            <th className="p-2">CVE</th>
                            <th className="p-2">Software Afectado</th>
                            <th className="p-2">Gravedad</th>
                            <th className="p-2">Acción Recomendada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]">
                          {isKali && (
                            <>
                              <tr className="hover:bg-[#161b22]/30">
                                <td className="p-2 font-mono text-[#58a6ff] font-bold">CVE-2024-1086</td>
                                <td className="p-2 text-zinc-300">Linux Kernel netfilter module (LPE)</td>
                                <td className="p-2"><Badge className="bg-destructive text-white text-[8px] pointer-events-none">CRITICAL</Badge></td>
                                <td className="p-2 text-[#3fb950] font-semibold">Actualizar Kernel y reiniciar</td>
                              </tr>
                              <tr className="hover:bg-[#161b22]/30">
                                <td className="p-2 font-mono text-[#58a6ff] font-bold">CVE-2023-4911</td>
                                <td className="p-2 text-zinc-300">glibc dynamic loader ld.so (Buffer Overflow)</td>
                                <td className="p-2"><Badge className="bg-destructive/20 text-destructive text-[8px] pointer-events-none">HIGH</Badge></td>
                                <td className="p-2 text-[#3fb950] font-semibold">Instalar libc6 v2.36 o posterior</td>
                              </tr>
                            </>
                          )}
                          {isDebian && (
                            <tr className="hover:bg-[#161b22]/30">
                              <td className="p-2 font-mono text-[#58a6ff] font-bold">CVE-2023-38606</td>
                              <td className="p-2 text-zinc-300">WebKit web rendering framework</td>
                              <td className="p-2"><Badge className="bg-warning/20 text-warning text-[8px] pointer-events-none">MEDIUM</Badge></td>
                              <td className="p-2 text-muted-foreground">Mitigación activa por GPO</td>
                            </tr>
                          )}
                          {isManager && (
                            <tr className="hover:bg-[#161b22]/30">
                              <td className="p-2 font-mono text-[#58a6ff] font-bold">CVE-2023-22809</td>
                              <td className="p-2 text-zinc-300">sudo editor configuration bypass</td>
                              <td className="p-2"><Badge className="bg-warning/20 text-warning text-[8px] pointer-events-none">MEDIUM</Badge></td>
                              <td className="p-2 text-[#3fb950] font-semibold">Actualizar sudo a la última versión</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 6. MITRE ATT&CK */}
          {module === "mitre" && (
            <div className="space-y-4">
              <div className="text-[11px] text-[#8b949e]">Matriz de Tácticas y Técnicas Adversarias identificadas en las auditorías de CyberShield:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg space-y-2">
                  <span className="text-primary font-bold block uppercase border-b border-[#30363d] pb-1.5">Discovery</span>
                  <div className="p-1.5 bg-[#0d1117] rounded border border-primary/20 text-center font-mono text-[10px]">
                    <span className="text-foreground block font-bold">Network Service Scanning (T1046)</span>
                    <span className="text-primary text-[8px] font-bold">Detectado por Scapy SCAN (Regla 100506)</span>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg space-y-2">
                  <span className="text-primary font-bold block uppercase border-b border-[#30363d] pb-1.5">Credential Access</span>
                  <div className="p-1.5 bg-[#0d1117] rounded border border-primary/20 text-center font-mono text-[10px]">
                    <span className="text-foreground block font-bold">Brute Force (T1110)</span>
                    <span className="text-primary text-[8px] font-bold">Detectado en SSH y Web (Reglas 100510-511)</span>
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg space-y-2">
                  <span className="text-primary font-bold block uppercase border-b border-[#30363d] pb-1.5">Exfiltration</span>
                  <div className="p-1.5 bg-[#0d1117] rounded border border-primary/20 text-center font-mono text-[10px]">
                    <span className="text-foreground block font-bold">Exfiltration Over Alternative Protocol (T1048)</span>
                    <span className="text-primary text-[8px] font-bold">Detectado en Canal Encubierto (Regla 100503)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. IT HYGIENE */}
          {module === "it_hygiene" && (() => {
            const ports = isManager ? [
              { port: "1514 (Wazuh Comm)", state: "Listening", type: "Security" },
              { port: "1515 (Registration)", state: "Listening", type: "Security" },
              { port: "55000 (Wazuh API)", state: "Listening", type: "Admin" }
            ] : isKali ? [
              { port: "22 (SSH Daemon)", state: "Listening", type: "Service" },
              { port: "80 (Apache HTTP)", state: "Listening", type: "Web" },
              { port: "4444 (Ncat Listener)", state: "Listening (Alerta de Shell)", type: "Critical" }
            ] : [
              { port: "22 (SSH Daemon)", state: "Listening", type: "Service" },
              { port: "80 (Apache HTTP)", state: "Listening", type: "Web" },
              { port: "3306 (MySQL Server)", state: "Listening", type: "Database" }
            ];

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg space-y-2">
                    <span className="text-primary font-bold block uppercase border-b border-[#30363d] pb-1.5">Servicios & Puertos Abiertos ({selectedAgent.name})</span>
                    <ul className="space-y-1 font-mono text-[10px]">
                      {ports.map((p, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>Puerto {p.port}</span> 
                          <span className={p.type === 'Critical' ? 'text-destructive font-bold animate-pulse' : 'text-primary font-bold'}>{p.state}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg space-y-2">
                    <span className="text-primary font-bold block uppercase border-b border-[#30363d] pb-1.5">Software Crítico Instalado</span>
                    <ul className="space-y-1 font-mono text-[10px]">
                      {isManager ? (
                        <>
                          <li className="flex justify-between"><span>wazuh-manager</span> <span className="text-foreground">v4.7.2</span></li>
                          <li className="flex justify-between"><span>nodejs</span> <span className="text-foreground">v18.16.0</span></li>
                        </>
                      ) : (
                        <>
                          <li className="flex justify-between"><span>openssh-server</span> <span className="text-warning">v8.4p1 (Actualizar)</span></li>
                          <li className="flex justify-between"><span>apache2</span> <span className="text-foreground">v2.4.56</span></li>
                          <li className="flex justify-between"><span>wazuh-agent</span> <span className="text-foreground">v4.7.2</span></li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 8. PCI DSS COMPLIANCE */}
          {module === "pci_dss" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-mono font-semibold">Cumplimiento Global PCI DSS ({selectedAgent.name})</span>
                  <span className="text-lg font-black text-foreground">{isManager ? "96.2%" : isDebian ? "91.8%" : "88.4%"} Conforme</span>
                </div>
                <div className="h-2.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: isManager ? "96.2%" : isDebian ? "91.8%" : "88.4%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f0f6fc] text-xs">Mapeo de Requisitos PCI DSS en {selectedAgent.name}:</h4>
                <div className="border border-[#30363d] rounded-lg divide-y divide-[#30363d] text-xs font-mono">
                  <div className="p-2 flex justify-between items-center bg-[#3fb950]/5">
                    <span>PCI DSS Req 10.2: Log all administrative and system-level actions</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 text-[8px] pointer-events-none font-bold">COMPLIANT</Badge>
                  </div>
                  <div className="p-2 flex justify-between items-center bg-[#3fb950]/5">
                    <span>PCI DSS Req 11.5: Deploy file-integrity monitoring software (FIM)</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 text-[8px] pointer-events-none font-bold">COMPLIANT</Badge>
                  </div>
                  <div className="p-2 flex justify-between items-center bg-destructive/5">
                    <span>PCI DSS Req 6.1: Establish a process to identify security vulnerabilities</span>
                    <Badge className="bg-destructive/20 text-destructive border border-destructive/40 text-[8px] pointer-events-none font-bold">NON-COMPLIANT</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. GDPR COMPLIANCE */}
          {module === "gdpr" && (
            <div className="space-y-4">
              <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block uppercase font-mono font-semibold">Auditoría GDPR (Protección de Datos) - {selectedAgent.name}</span>
                  <span className="text-lg font-black text-foreground">100% Controles Cubiertos</span>
                </div>
                <div className="h-2.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "100%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f0f6fc] text-xs">Artículos de Cumplimiento Registrados:</h4>
                <div className="border border-[#30363d] rounded-lg divide-y divide-[#30363d] text-xs font-mono">
                  <div className="p-2 flex justify-between items-center bg-[#3fb950]/5">
                    <span>Artículo 32 (Seguridad del tratamiento de datos personales)</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 text-[8px] pointer-events-none font-bold">PASSED</Badge>
                  </div>
                  <div className="p-2 flex justify-between items-center bg-[#3fb950]/5">
                    <span>Artículo 33 (Notificación de violaciones de seguridad a la autoridad)</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 text-[8px] pointer-events-none font-bold">PASSED</Badge>
                  </div>
                  <div className="p-2 flex justify-between items-center bg-[#3fb950]/5">
                    <span>Artículo 25 (Privacidad desde el diseño y por defecto)</span>
                    <Badge className="bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 text-[8px] pointer-events-none font-bold">PASSED</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. CYBERSHIELD CUSTOM MODULES */}
          {["cs_lan", "cs_scapy", "cs_brute", "cs_privesc"].includes(module) && (
            <div className="space-y-4">
              <div className="bg-[#161b22] border border-[#3fb950]/30 p-4 rounded-lg">
                <h4 className="font-bold text-foreground text-xs uppercase font-mono text-[#3fb950]">Firma de Detección de Reglas en Wazuh Manager:</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Estas reglas se encuentran almacenadas en el fichero de reglas de CyberShield (<code className="text-foreground">local_rules.xml</code>) y procesan las firmas procedentes de syslog:
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f0f6fc] text-xs">Especificaciones de Reglas:</h4>
                <div className="border border-[#30363d] rounded-lg divide-y divide-[#30363d] text-xs font-mono">
                  {module === "cs_lan" && (
                    <>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100500 - MAC Flooding Alert</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detecta tormentas de direcciones MAC en la red local interna destinadas a saturar la tabla CAM del switch.</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100504 - ARP Spoofing Detection</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Dispara alerta inmediata de Man-in-the-Middle si se reciben tramas ARP gratuitous que suplanten la IP de la puerta de enlace.</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100505 - DHCP Starvation Attack</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Monitorea peticiones DHCPDISCOVER consecutivas solicitando todo el rango de IPs para bloquear la red.</p>
                      </div>
                    </>
                  )}
                  {module === "cs_scapy" && (
                    <>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100506 - Scapy SYN Scan</span> <Badge className="bg-warning/20 text-warning pointer-events-none">LVL 10</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detección de escaneos TCP a puertos cerrados/abiertos sin cerrar el handshake (Half-Open Scan).</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100507 - Scapy ACK Scan</span> <Badge className="bg-warning/20 text-warning pointer-events-none">LVL 10</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detección de paquetes con la flag ACK activada para mapear las reglas del cortafuegos.</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100509 - Scapy Protocol Fuzzing</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detección de inyecciones de campos malformados en cabeceras de red (evasión de IDS).</p>
                      </div>
                    </>
                  )}
                  {module === "cs_brute" && (
                    <>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100510 - SSH Brute Force Detection</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Disparada por el decoder de SSH tras registrar más de 8 intentos fallidos consecutivos en menos de 15 segundos.</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100511 - Web Admin Brute Force</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Monitorea códigos HTTP 401 recurrentes disparados por peticiones a rutas de login del servidor web.</p>
                      </div>
                    </>
                  )}
                  {module === "cs_privesc" && (
                    <>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100512 - Local Privilege Escalation</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detecta ejecuciones de herramientas de auditoría local de privilegios (ej. LinPEAS, unix-privesc-check).</p>
                      </div>
                      <div className="p-2.5 hover:bg-[#161b22]/30">
                        <div className="flex justify-between"><span className="text-foreground font-bold">Regla 100513 - Kerberos ASREPRoast Alert</span> <Badge className="bg-destructive/20 text-destructive pointer-events-none">LVL 12</Badge></div>
                        <p className="text-[10px] text-muted-foreground mt-1">Detección de cuentas del Active Directory solicitando tickets sin preautenticación requerida.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIE DE DIALOGO */}
        <div className="bg-[#161b22] px-6 py-3 border-t border-[#30363d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] rounded text-xs font-bold text-[#c9d1d9] transition-colors"
          >
            Entendido
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
