// ============================================================================
// wazuhService.ts — Servicio de comunicación con Wazuh Manager API e Indexer
// ============================================================================
// DÓNDE VA: lovable/src/services/wazuhService.ts
//
// QUÉ HACE: Centraliza TODA la comunicación con Wazuh en dos clases:
//   1. WazuhManagerAPI  → Autenticación JWT + listado de agentes (puerto 55000)
//   2. WazuhIndexerAPI  → Consulta de alertas via OpenSearch DSL (puerto 9200)
//
// CÓMO FUNCIONA:
//   - Manager: POST /security/user/authenticate con Basic Auth → recibe JWT
//     Ese token dura ~15 min. Se re-autentica automáticamente al caducar.
//   - Indexer: Cada petición lleva Basic Auth (usuario:contraseña).
//     Se consultan alertas con queries OpenSearch sobre el índice wazuh-alerts-*
// ============================================================================

// ---------------------------------------------------------------------------
// TIPOS TYPESCRIPT — Definen la forma de todos los datos de Wazuh
// ---------------------------------------------------------------------------

/** Credenciales que el usuario introduce en el panel de conexión */
export interface WazuhCredentials {
  managerUrl: string;       // Ej: https://192.168.1.100:55000
  managerUser: string;      // Ej: wazuh-wui
  managerPassword: string;
  indexerUrl: string;       // Ej: https://192.168.1.100:9200
  indexerUser: string;      // Ej: admin
  indexerPassword: string;
}

/** Un agente Wazuh = un ordenador/servidor monitorizado */
export interface WazuhAgent {
  id: string;               // "001", "002", etc.
  name: string;             // Hostname del equipo
  ip: string;               // IP del agente
  status: "active" | "disconnected" | "never_connected" | "pending";
  os: {
    name: string;           // "Ubuntu", "Windows 11", "CentOS", etc.
    version: string;        // "22.04", "10.0", etc.
    platform: string;       // "ubuntu", "windows", "centos"
  };
  lastKeepAlive: string;    // ISO 8601 de última señal de vida
  version: string;          // "Wazuh v4.x.x"
  group: string[];          // Grupos asignados (ej: ["default", "linux"])
}

/** Resumen de estados de todos los agentes */
export interface AgentSummary {
  active: number;
  disconnected: number;
  never_connected: number;
  pending: number;
  total: number;
}

/** Una alerta de Wazuh con todos sus campos relevantes */
export interface WazuhAlert {
  _id: string;              // ID del documento en OpenSearch
  _index: string;           // Índice donde está almacenada
  timestamp: string;        // Cuándo se generó la alerta
  rule: {
    id: string;             // ID de la regla (ej: "5712")
    level: number;          // Severidad 0-16
    description: string;    // Descripción legible
    groups: string[];       // Grupos de la regla (ej: ["sshd", "authentication_failed"])
    mitre?: {
      id: string[];         // IDs MITRE ATT&CK (ej: ["T1110"])
      tactic: string[];     // Tácticas (ej: ["Credential Access"])
      technique: string[];  // Técnicas (ej: ["Brute Force"])
    };
    firedtimes: number;     // Cuántas veces se ha disparado esta regla
  };
  agent: {
    id: string;
    name: string;
    ip: string;
  };
  manager: {
    name: string;
  };
  decoder: {
    name: string;
    parent?: string;
  };
  full_log: string;         // El log original completo
  location: string;         // Fuente del log (ruta de fichero o módulo)
  data: {
    srcip?: string;         // IP de origen
    srcport?: string;       // Puerto de origen
    dstip?: string;         // IP de destino
    dstport?: string;       // Puerto de destino
    srcuser?: string;       // Usuario de origen
    dstuser?: string;       // Usuario de destino
    protocol?: string;      // Protocolo (TCP, UDP, etc.)
    action?: string;        // Acción tomada (drop, allow, etc.)
  };
  syscheck?: {              // Solo en alertas de File Integrity Monitoring
    path?: string;          // Fichero que cambió
    event?: string;         // Tipo: added, modified, deleted
    diff?: string;          // Diferencia del contenido
    md5_after?: string;     // Hash MD5 post-cambio
    sha256_after?: string;  // Hash SHA256 post-cambio
  };
}

/** Filtros para consultar alertas al Indexer */
export interface AlertFilters {
  timestampGte?: string;    // ISO date o notación relativa ("now-1h", "now-24h")
  timestampLte?: string;    // Por defecto "now"
  agentId?: string;         // Filtrar por ID de agente
  minLevel?: number;        // Nivel mínimo de severidad (0-16)
  searchText?: string;      // Búsqueda libre en rule.description
  ruleGroups?: string[];    // Filtrar por grupos de regla
  size?: number;            // Cantidad de resultados (default 50)
  from?: number;            // Offset para paginación
}

/** Entrada de log para la consola de actividad */
export interface LogEntry {
  ts: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

// ---------------------------------------------------------------------------
// WAZUH MANAGER API — Autenticación JWT + Gestión de Agentes
// ---------------------------------------------------------------------------
// Puerto por defecto: 55000
// Autenticación: Basic Auth → JWT token (válido ~15 min)
// Documentación: https://documentation.wazuh.com/current/user-manual/api/reference.html
// ---------------------------------------------------------------------------

export class WazuhManagerAPI {
  private url: string = "";
  private username: string = "";
  private password: string = "";
  private token: string = "";
  private tokenTimestamp: number = 0;

  // Margen de seguridad: renovar el token a los 14 min (el token dura 15 min)
  private readonly TOKEN_TTL_MS = 14 * 60 * 1000;

  /**
   * Autentica contra el Manager API y obtiene un JWT token.
   * Equivalente a: curl -u user:pass -k -X POST "https://IP:55000/security/user/authenticate?raw=true"
   */
  async authenticate(url: string, username: string, password: string): Promise<string> {
    this.url = url.replace(/\/+$/, ""); // Quitar trailing slashes
    this.username = username;
    this.password = password;

    const response = await fetch(`${this.url}/security/user/authenticate?raw=true`, {
      method: "POST",
      headers: {
        // Basic Auth: base64(username:password)
        "Authorization": "Basic " + btoa(`${username}:${password}`),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Manager auth failed (${response.status}): ${errorText || response.statusText}`);
    }

    // Con ?raw=true, la respuesta es directamente el token como texto plano
    this.token = await response.text();
    this.tokenTimestamp = Date.now();

    return this.token;
  }

  /** Comprueba si el token ha caducado (>14 min desde obtención) */
  isTokenExpired(): boolean {
    if (!this.token || !this.tokenTimestamp) return true;
    return (Date.now() - this.tokenTimestamp) > this.TOKEN_TTL_MS;
  }

  /**
   * Se asegura de que el token es válido. Si ha caducado, re-autentica.
   * Devuelve true si tuvo que renovar el token.
   */
  async ensureAuth(): Promise<boolean> {
    if (!this.isTokenExpired()) return false;

    if (!this.url || !this.username || !this.password) {
      throw new Error("No hay credenciales del Manager guardadas. Reconecta.");
    }

    await this.authenticate(this.url, this.username, this.password);
    return true; // Indica que se renovó el token
  }

  /**
   * Realiza una petición autenticada al Manager API.
   * Añade automáticamente el header "Authorization: Bearer <token>"
   */
  private async request<T>(endpoint: string, method: string = "GET"): Promise<T> {
    await this.ensureAuth();

    const response = await fetch(`${this.url}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // Token rechazado → forzar re-autenticación e intentar de nuevo
      await this.authenticate(this.url, this.username, this.password);
      const retry = await fetch(`${this.url}${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });
      if (!retry.ok) throw new Error(`Manager API error (${retry.status})`);
      return retry.json();
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Manager API error (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtiene la lista de todos los agentes (ordenadores monitorizados).
   * Equivalente a: curl -k -X GET "https://IP:55000/agents?select=id,name,..." -H "Authorization: Bearer $TOKEN"
   */
  async getAgents(): Promise<WazuhAgent[]> {
    const fields = "id,name,ip,status,os.name,os.version,os.platform,lastKeepAlive,version,group";
    const data = await this.request<any>(
      `/agents?select=${fields}&limit=500&sort=-id&q=id!=000`
    );

    // La respuesta del Manager siempre viene envuelta en { data: { affected_items: [...] } }
    const items = data?.data?.affected_items || [];

    return items.map((item: any) => ({
      id: item.id || "",
      name: item.name || "",
      ip: item.ip || "",
      status: item.status || "never_connected",
      os: {
        name: item.os?.name || "Desconocido",
        version: item.os?.version || "",
        platform: item.os?.platform || "",
      },
      lastKeepAlive: item.lastKeepAlive || "",
      version: item.version || "",
      group: item.group || ["default"],
    }));
  }

  /**
   * Obtiene el resumen de estados de agentes.
   * Devuelve cuántos están activos, desconectados, etc.
   */
  async getAgentSummary(): Promise<AgentSummary> {
    const data = await this.request<any>("/agents/summary/status");
    const conn = data?.data?.connection || {};
    return {
      active: conn.active || 0,
      disconnected: conn.disconnected || 0,
      never_connected: conn.never_connected || 0,
      pending: conn.pending || 0,
      total: conn.total || 0,
    };
  }

  /** Limpia las credenciales y token de memoria */
  disconnect(): void {
    this.url = "";
    this.username = "";
    this.password = "";
    this.token = "";
    this.tokenTimestamp = 0;
  }

  /** Devuelve true si hay credenciales almacenadas */
  isConfigured(): boolean {
    return !!this.url && !!this.username;
  }
}

// ---------------------------------------------------------------------------
// WAZUH INDEXER API — Consulta de Alertas via OpenSearch
// ---------------------------------------------------------------------------
// Puerto por defecto: 9200
// Autenticación: Basic Auth EN CADA petición (no hay token)
// Las alertas están en índices con patrón: wazuh-alerts-*
// Se consultan con OpenSearch/Elasticsearch Query DSL
// ---------------------------------------------------------------------------

export class WazuhIndexerAPI {
  private url: string = "";
  private username: string = "";
  private password: string = "";

  /**
   * Verifica la conexión al Indexer haciendo un GET / (cluster health).
   * Equivalente a: curl -k -u admin:password "https://IP:9200/"
   */
  async authenticate(url: string, username: string, password: string): Promise<any> {
    this.url = url.replace(/\/+$/, "");
    this.username = username;
    this.password = password;

    const response = await fetch(`${this.url}/`, {
      method: "GET",
      headers: {
        "Authorization": "Basic " + btoa(`${username}:${password}`),
      },
    });

    if (!response.ok) {
      throw new Error(`Indexer auth failed (${response.status}): ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Realiza una petición autenticada al Indexer API.
   * Siempre envía Basic Auth (username:password en base64).
   */
  private async request<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
    if (!this.url || !this.username) {
      throw new Error("Indexer no configurado. Conecta primero.");
    }

    const options: RequestInit = {
      method,
      headers: {
        "Authorization": "Basic " + btoa(`${this.username}:${this.password}`),
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.url}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Indexer API error (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Consulta alertas al Indexer usando OpenSearch Query DSL.
   * 
   * Esto es lo que dice tu amigo: "al indexer le dices que te muestre
   * solamente las alertas más nuevas que el timestamp del ataque"
   * 
   * Construye una query con filtros combinados:
   *   - Rango de tiempo (timestamp >= fecha del ataque)
   *   - Agente específico (agent.id)
   *   - Nivel de severidad mínimo (rule.level >= X)
   *   - Búsqueda de texto en la descripción de la regla
   *   - Grupos de regla específicos
   */
  async queryAlerts(filters: AlertFilters = {}): Promise<{ alerts: WazuhAlert[]; total: number }> {
    const {
      timestampGte = "now-24h",
      timestampLte = "now",
      agentId,
      minLevel,
      searchText,
      ruleGroups,
      size = 50,
      from = 0,
    } = filters;

    // Construir la query OpenSearch con bool query
    const must: any[] = [];
    const filter: any[] = [];

    // Filtro de rango de tiempo — SIEMPRE presente
    filter.push({
      range: {
        timestamp: {
          gte: timestampGte,
          lte: timestampLte,
          format: "strict_date_optional_time||epoch_millis",
        },
      },
    });

    // Filtro por agente específico
    if (agentId) {
      filter.push({ term: { "agent.id": agentId } });
    }

    // Filtro por nivel de severidad mínimo
    if (minLevel !== undefined && minLevel > 0) {
      filter.push({ range: { "rule.level": { gte: minLevel } } });
    }

    // Búsqueda de texto libre en la descripción de la regla
    if (searchText && searchText.trim()) {
      must.push({ match: { "rule.description": searchText.trim() } });
    }

    // Filtro por grupos de regla (ej: ["authentication_failed", "sshd"])
    if (ruleGroups && ruleGroups.length > 0) {
      filter.push({ terms: { "rule.groups": ruleGroups } });
    }

    // Query final
    const query = {
      query: {
        bool: {
          ...(must.length > 0 ? { must } : {}),
          filter,
        },
      },
      size,
      from,
      sort: [{ timestamp: { order: "desc" } }],
      // Solo traer los campos que necesitamos (optimización)
      _source: [
        "timestamp",
        "rule.id", "rule.level", "rule.description", "rule.groups",
        "rule.mitre.id", "rule.mitre.tactic", "rule.mitre.technique",
        "rule.firedtimes",
        "agent.id", "agent.name", "agent.ip",
        "manager.name",
        "decoder.name", "decoder.parent",
        "full_log",
        "location",
        "data.srcip", "data.srcport", "data.dstip", "data.dstport",
        "data.srcuser", "data.dstuser", "data.protocol", "data.action",
        "syscheck.path", "syscheck.event", "syscheck.diff",
        "syscheck.md5_after", "syscheck.sha256_after",
      ],
    };

    const result = await this.request<any>("/wazuh-alerts-*/_search", "POST", query);

    const hits = result?.hits?.hits || [];
    const total = result?.hits?.total?.value || result?.hits?.total || 0;

    const alerts: WazuhAlert[] = hits.map((hit: any) => ({
      _id: hit._id || "",
      _index: hit._index || "",
      timestamp: hit._source?.timestamp || "",
      rule: {
        id: hit._source?.rule?.id || "",
        level: hit._source?.rule?.level ?? 0,
        description: hit._source?.rule?.description || "",
        groups: hit._source?.rule?.groups || [],
        mitre: hit._source?.rule?.mitre || undefined,
        firedtimes: hit._source?.rule?.firedtimes ?? 0,
      },
      agent: {
        id: hit._source?.agent?.id || "",
        name: hit._source?.agent?.name || "",
        ip: hit._source?.agent?.ip || "",
      },
      manager: {
        name: hit._source?.manager?.name || "",
      },
      decoder: {
        name: hit._source?.decoder?.name || "",
        parent: hit._source?.decoder?.parent || "",
      },
      full_log: hit._source?.full_log || "",
      location: hit._source?.location || "",
      data: {
        srcip: hit._source?.data?.srcip || "",
        srcport: hit._source?.data?.srcport || "",
        dstip: hit._source?.data?.dstip || "",
        dstport: hit._source?.data?.dstport || "",
        srcuser: hit._source?.data?.srcuser || "",
        dstuser: hit._source?.data?.dstuser || "",
        protocol: hit._source?.data?.protocol || "",
        action: hit._source?.data?.action || "",
      },
      syscheck: hit._source?.syscheck ? {
        path: hit._source.syscheck.path || "",
        event: hit._source.syscheck.event || "",
        diff: hit._source.syscheck.diff || "",
        md5_after: hit._source.syscheck.md5_after || "",
        sha256_after: hit._source.syscheck.sha256_after || "",
      } : undefined,
    }));

    return { alerts, total };
  }

  /** Limpia las credenciales de memoria */
  disconnect(): void {
    this.url = "";
    this.username = "";
    this.password = "";
  }

  /** Devuelve true si hay credenciales almacenadas */
  isConfigured(): boolean {
    return !!this.url && !!this.username;
  }
}

// ---------------------------------------------------------------------------
// INSTANCIAS SINGLETON — Se importan desde cualquier componente
// ---------------------------------------------------------------------------
// Usamos singletons para que el token y las credenciales persistan
// mientras la aplicación esté abierta (se pierden al recargar la página)
// ---------------------------------------------------------------------------

export const managerAPI = new WazuhManagerAPI();
export const indexerAPI = new WazuhIndexerAPI();

// ---------------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------------

/** Mapeo de nivel de regla Wazuh a label y color para la UI */
export function getSeverityFromLevel(level: number): {
  label: string;
  color: string;
  badgeClass: string;
} {
  if (level >= 14) return {
    label: "CRITICAL",
    color: "text-destructive",
    badgeClass: "bg-destructive/20 text-destructive border-destructive/30",
  };
  if (level >= 11) return {
    label: "HIGH",
    color: "text-neon-red",
    badgeClass: "bg-neon-red/20 text-neon-red border-neon-red/30",
  };
  if (level >= 7) return {
    label: "MEDIUM",
    color: "text-neon-yellow",
    badgeClass: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
  };
  if (level >= 4) return {
    label: "LOW",
    color: "text-neon-cyan",
    badgeClass: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
  };
  return {
    label: "INFO",
    color: "text-muted-foreground",
    badgeClass: "bg-muted/20 text-muted-foreground border-muted/30",
  };
}

/** Formatea una fecha ISO a formato legible */
export function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Calcula tiempo relativo (hace 5 min, hace 2h, etc.) */
export function timeAgo(iso: string): string {
  if (!iso) return "";
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Justo ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHr < 24) return `Hace ${diffHr}h`;
    return `Hace ${diffDay}d`;
  } catch {
    return "";
  }
}

/** Devuelve el color + icono para el estado de un agente */
export function getAgentStatusStyle(status: string): {
  dotClass: string;
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "active":
      return {
        dotClass: "bg-neon-green animate-pulse shadow-[0_0_8px_hsl(120_100%_50%/0.8)]",
        label: "Activo",
        badgeClass: "bg-neon-green/20 text-neon-green border-neon-green/30",
      };
    case "disconnected":
      return {
        dotClass: "bg-neon-red",
        label: "Desconectado",
        badgeClass: "bg-neon-red/20 text-neon-red border-neon-red/30",
      };
    case "pending":
      return {
        dotClass: "bg-neon-yellow animate-pulse",
        label: "Pendiente",
        badgeClass: "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30",
      };
    default:
      return {
        dotClass: "bg-muted-foreground",
        label: "Sin conexión",
        badgeClass: "bg-muted/20 text-muted-foreground border-muted/30",
      };
  }
}
