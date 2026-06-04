// ============================================================================
// WazuhAlertDetail.tsx — Sheet lateral con detalle completo de una alerta
// ============================================================================
// DÓNDE VA: lovable/src/components/defensive/WazuhAlertDetail.tsx
//
// QUÉ HACE: Cuando haces click en una alerta de la tabla, se abre este
// panel lateral (Sheet) mostrando TODOS los campos de la alerta:
//   - Regla: ID, nivel, descripción, grupos, MITRE ATT&CK
//   - Agente: ID, nombre, IP
//   - Red: IPs y puertos de origen/destino, protocolo, acción
//   - Log completo: el raw log original
//   - File Integrity: si es una alerta de FIM, muestra path y diff
//   - Metadata: decoder, location, manager, fired times
//
// Estos son los "20-30 campos" que mencionó tu amigo.
// El diseño sigue el mismo patrón que el Sheet del módulo ofensivo.
// ============================================================================

import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertTriangle, Monitor, Globe, Terminal, Shield, FileSearch,
  Clock, Hash, Crosshair, User, MapPin,
} from "lucide-react";
import type { WazuhAlert } from "@/services/wazuhService";
import { getSeverityFromLevel, formatTimestamp } from "@/services/wazuhService";

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

interface WazuhAlertDetailProps {
  /** La alerta a mostrar (null = cerrar el sheet) */
  alert: WazuhAlert | null;
  /** Callback para cerrar el sheet */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Sección colapsable del detalle
// ---------------------------------------------------------------------------

const DetailSection = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof AlertTriangle;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-neon-cyan" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-neon-cyan font-semibold">
        {title}
      </span>
    </div>
    <div className="ml-5 space-y-1.5">{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Fila de campo clave-valor
// ---------------------------------------------------------------------------

const FieldRow = ({ label, value }: { label: string; value: string | number | undefined }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider min-w-[90px] shrink-0">
        {label}:
      </span>
      <span className="text-xs font-mono text-foreground break-all">
        {String(value)}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

const WazuhAlertDetail = ({ alert, onClose }: WazuhAlertDetailProps) => {
  if (!alert) return null;

  const severity = getSeverityFromLevel(alert.rule.level);

  // ¿Tiene datos MITRE ATT&CK?
  const hasMitre = alert.rule.mitre &&
    (alert.rule.mitre.id?.length > 0 || alert.rule.mitre.technique?.length > 0);

  // ¿Tiene datos de red?
  const hasNetworkData = alert.data.srcip || alert.data.dstip ||
    alert.data.srcport || alert.data.dstport || alert.data.protocol;

  // ¿Tiene datos de FIM/syscheck?
  const hasSyscheck = alert.syscheck &&
    (alert.syscheck.path || alert.syscheck.event);

  // ¿Tiene datos de usuario?
  const hasUserData = alert.data.srcuser || alert.data.dstuser;

  return (
    <Sheet open={!!alert} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-card border-l border-neon-cyan/30 w-full sm:max-w-lg overflow-y-auto">
        {/* Cabecera */}
        <SheetHeader>
          <SheetTitle className="font-mono text-neon-cyan text-glow-cyan flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alerta #{alert.rule.id}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs text-foreground/90">
            {alert.rule.description}
          </SheetDescription>

          {/* Badges de severidad y grupos */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge className={`font-mono text-[10px] ${severity.badgeClass}`}>
              LEVEL {alert.rule.level} — {severity.label}
            </Badge>
            {alert.rule.groups.slice(0, 3).map(group => (
              <Badge
                key={group}
                variant="outline"
                className="font-mono text-[10px] border-neon-cyan/30 text-neon-cyan"
              >
                {group}
              </Badge>
            ))}
          </div>
        </SheetHeader>

        {/* Cuerpo con todas las secciones */}
        <div className="mt-6 space-y-5">

          {/* TIMESTAMP */}
          <DetailSection icon={Clock} title="Timestamp">
            <FieldRow label="Fecha" value={formatTimestamp(alert.timestamp)} />
            <FieldRow label="ISO" value={alert.timestamp} />
          </DetailSection>

          {/* REGLA */}
          <DetailSection icon={Shield} title="Regla">
            <FieldRow label="Rule ID" value={alert.rule.id} />
            <FieldRow label="Level" value={alert.rule.level} />
            <FieldRow label="Descripción" value={alert.rule.description} />
            <FieldRow label="Grupos" value={alert.rule.groups.join(", ")} />
            <FieldRow label="Veces" value={alert.rule.firedtimes} />
          </DetailSection>

          {/* MITRE ATT&CK */}
          {hasMitre && (
            <DetailSection icon={Crosshair} title="MITRE ATT&CK">
              <FieldRow label="Tactic" value={alert.rule.mitre?.tactic?.join(", ")} />
              <FieldRow label="Technique" value={alert.rule.mitre?.technique?.join(", ")} />
              <FieldRow label="ID" value={alert.rule.mitre?.id?.join(", ")} />
            </DetailSection>
          )}

          {/* AGENTE */}
          <DetailSection icon={Monitor} title="Agente">
            <FieldRow label="ID" value={alert.agent.id} />
            <FieldRow label="Nombre" value={alert.agent.name} />
            <FieldRow label="IP" value={alert.agent.ip} />
          </DetailSection>

          {/* DATOS DE RED */}
          {hasNetworkData && (
            <DetailSection icon={Globe} title="Datos de Red">
              <FieldRow label="Src IP" value={alert.data.srcip} />
              <FieldRow label="Src Port" value={alert.data.srcport} />
              <FieldRow label="Dst IP" value={alert.data.dstip} />
              <FieldRow label="Dst Port" value={alert.data.dstport} />
              <FieldRow label="Protocolo" value={alert.data.protocol} />
              <FieldRow label="Acción" value={alert.data.action} />
            </DetailSection>
          )}

          {/* DATOS DE USUARIO */}
          {hasUserData && (
            <DetailSection icon={User} title="Datos de Usuario">
              <FieldRow label="Src User" value={alert.data.srcuser} />
              <FieldRow label="Dst User" value={alert.data.dstuser} />
            </DetailSection>
          )}

          {/* FILE INTEGRITY MONITORING */}
          {hasSyscheck && (
            <DetailSection icon={FileSearch} title="File Integrity (Syscheck)">
              <FieldRow label="Path" value={alert.syscheck?.path} />
              <FieldRow label="Evento" value={alert.syscheck?.event} />
              <FieldRow label="MD5" value={alert.syscheck?.md5_after} />
              <FieldRow label="SHA256" value={alert.syscheck?.sha256_after} />
              {alert.syscheck?.diff && (
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Diff:
                  </span>
                  <pre className="mt-1 p-2 bg-background/60 border border-border/40 rounded text-[10px] font-mono text-foreground overflow-x-auto max-h-32">
                    {alert.syscheck.diff}
                  </pre>
                </div>
              )}
            </DetailSection>
          )}

          {/* METADATA */}
          <DetailSection icon={Hash} title="Metadata">
            <FieldRow label="Manager" value={alert.manager.name} />
            <FieldRow label="Decoder" value={alert.decoder.name} />
            {alert.decoder.parent && (
              <FieldRow label="Parent Dec" value={alert.decoder.parent} />
            )}
            <FieldRow label="Location" value={alert.location} />
            <FieldRow label="Index" value={alert._index} />
            <FieldRow label="Doc ID" value={alert._id} />
          </DetailSection>

          {/* LOG COMPLETO */}
          <DetailSection icon={Terminal} title="Log Completo (Raw)">
            <div className="bg-background/80 border border-border/50 rounded-md p-3 font-mono text-[10px] text-foreground/90 max-h-48 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
              {alert.full_log || "(sin log disponible)"}
            </div>
          </DetailSection>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WazuhAlertDetail;
