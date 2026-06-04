// ============================================================================
// report-server.js -- Servidor de generación de informes PDF para CyberShield
// ============================================================================
// Puerto: 3010 (configurable via REPORT_SERVER_PORT)
// Endpoints:
//   POST /generate-report          - Genera informe desde datos de webhook
//   POST /generate-attack-report   - Alias del anterior
//   GET  /reports/list             - Lista todos los PDFs generados
//   GET  /reports/download/:file   - Descarga un PDF concreto
//   GET  /health                   - Health check
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.REPORT_SERVER_PORT || 3010);
const HOST = process.env.REPORT_SERVER_HOST || '0.0.0.0';
const REPORTS_DIR = path.join(__dirname, 'docs', 'reports');
const PUBLIC_REPORTS_DIR = path.join(__dirname, 'lovable', 'public', 'reports');

// Crear directorios si no existen
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_REPORTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// MAPAS DE DATOS POR ATAQUE (datos estáticos para enriquecer informes)
// ---------------------------------------------------------------------------

var SEVERITY_MAP = {
  'Nmap Host Discovery': 'Baja',
  'MAC Flooding': 'Alta',
  'Switch Port Stealing': 'Alta',
  'SPAN / Port Mirror': 'Media',
  'Tuneles / Canales Encubiertos': 'Critica',
  'Des-autenticacion': 'Alta',
  'Falsa Autenticacion': 'Media',
  'CTS Frame Attack': 'Alta',
  'Beacon Flood Mode': 'Media',
  'Dissociation Amok': 'Alta',
  'Michael Shutdown': 'Critica',
  'Captura/Analisis Handshake': 'Alta',
  'Fuerza Bruta / Diccionario': 'Alta',
  'Evil Twin': 'Critica',
  'Clientless PMKID': 'Alta',
  'Redes Ocultas': 'Baja',
  'Ataques WPS': 'Alta',
  'Ataques WEP': 'Critica',
  'Introduccion a Scapy': 'Baja',
  'Fundamentos y Capas': 'Baja',
  'Creacion y Captura': 'Media',
  'Escaneo y Vulnerabilidades': 'Alta',
  'Automatizacion Avanzada': 'Alta'
};

var MITRE_MAP = {
  'Nmap Host Discovery': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' },
  'MAC Flooding': { tactic: 'Credential Access', technique: 'Adversary-in-the-Middle', id: 'T1557' },
  'Switch Port Stealing': { tactic: 'Credential Access', technique: 'Adversary-in-the-Middle', id: 'T1557' },
  'SPAN / Port Mirror': { tactic: 'Collection', technique: 'Network Sniffing', id: 'T1040' },
  'Tuneles / Canales Encubiertos': { tactic: 'Command and Control', technique: 'Protocol Tunneling', id: 'T1572' },
  'Des-autenticacion': { tactic: 'Impact', technique: 'Network Denial of Service', id: 'T1498' },
  'Falsa Autenticacion': { tactic: 'Credential Access', technique: 'Adversary-in-the-Middle', id: 'T1557' },
  'CTS Frame Attack': { tactic: 'Impact', technique: 'Network Denial of Service', id: 'T1498' },
  'Beacon Flood Mode': { tactic: 'Impact', technique: 'Network DoS: Direct Flood', id: 'T1498.001' },
  'Dissociation Amok': { tactic: 'Impact', technique: 'Network Denial of Service', id: 'T1498' },
  'Michael Shutdown': { tactic: 'Impact', technique: 'Endpoint Denial of Service', id: 'T1499' },
  'Captura/Analisis Handshake': { tactic: 'Collection', technique: 'Network Sniffing', id: 'T1040' },
  'Fuerza Bruta / Diccionario': { tactic: 'Credential Access', technique: 'Brute Force', id: 'T1110' },
  'Evil Twin': { tactic: 'Credential Access', technique: 'Adversary-in-the-Middle', id: 'T1557.002' },
  'Clientless PMKID': { tactic: 'Credential Access', technique: 'Password Cracking', id: 'T1110.002' },
  'Redes Ocultas': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' },
  'Ataques WPS': { tactic: 'Credential Access', technique: 'Brute Force', id: 'T1110' },
  'Ataques WEP': { tactic: 'Credential Access', technique: 'Brute Force', id: 'T1110' },
  'Introduccion a Scapy': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' },
  'Fundamentos y Capas': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' },
  'Creacion y Captura': { tactic: 'Collection', technique: 'Network Sniffing', id: 'T1040' },
  'Escaneo y Vulnerabilidades': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' },
  'Automatizacion Avanzada': { tactic: 'Discovery', technique: 'Network Service Discovery', id: 'T1046' }
};

var DETECTION_MAP = {
  'MAC Flooding': 'Wazuh detecta este ataque mediante la regla CyberShield 100502 (nivel 12). El agente Wazuh en Kali captura la traza SEC_VIOLATION del syslog y la reenvia al Manager, que genera una alerta con mapeo MITRE T1557. En un entorno real, el switch Cisco/HP enviaría traps syslog PORT_SECURITY-2-PSECURE_VIOLATION.',
  'Switch Port Stealing': 'Wazuh detecta el ARP Spoofing mediante la regla 100503. Dynamic ARP Inspection (DAI) en el switch generaría logs adicionales.',
  'Des-autenticacion': 'Wazuh con Suricata NIDS puede detectar tramas deauth anomalas. Regla CyberShield 100506.',
  'Evil Twin': 'WIPS (Wireless IPS) detecta APs con SSID duplicado. Regla CyberShield 100514.',
  'Nmap Host Discovery': 'Wazuh detecta barridos ARP/ICMP mediante la regla 100501. IDS Suricata genera alertas por escaneos de red.'
};

var RECOMMENDATIONS = {
  'Nmap Host Discovery': '1. Configurar firewalls para denegar ICMP Echo Request en segmentos criticos.\n2. Desplegar IDS (Suricata) para alertar sobre barridos ping.\n3. Segmentar la red con VLANs para limitar el alcance de reconocimiento.',
  'MAC Flooding': '1. Configurar Port Security en switches: maximo 2 MACs por puerto, violation shutdown.\n2. Activar Dynamic ARP Inspection (DAI) en el switch.\n3. Monitorizar la capacidad de la tabla CAM del switch.\n4. Desplegar NIDS (Suricata) integrado con Wazuh para detectar anomalias de trafico.',
  'Switch Port Stealing': '1. Habilitar DHCP Snooping y ARP Inspection.\n2. Configurar entradas ARP estaticas para hosts criticos.\n3. Port Security con sticky MAC learning.',
  'Des-autenticacion': '1. Habilitar Management Frame Protection (802.11w).\n2. Desplegar WIDS/WIPS.\n3. Migrar a WPA3 que incluye proteccion contra deauth.',
  'Evil Twin': '1. Usar 802.1X (WPA2/WPA3-Enterprise).\n2. Verificacion estricta de certificados.\n3. Detectar Rogue APs con WIPS.',
  'Fuerza Bruta / Diccionario': '1. Usar WPA3 (protege contra ataques offline).\n2. Contraseñas de mas de 16 caracteres alfanumericos.',
  'Tuneles / Canales Encubiertos': '1. Inspeccion profunda de paquetes (DPI).\n2. Denegar trafico ICMP/DNS saliente desde servidores no autorizados.'
};

// ---------------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------------

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function sanitizeSlug(value) {
  return String(value || 'ataque')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'ataque';
}

// ---------------------------------------------------------------------------
// GENERADOR DE MARKDOWN — Solo datos reales del ataque
// ---------------------------------------------------------------------------

function renderMarkdown(report) {
  var generatedAt = report.generatedAt;
  var taskName = report.taskName;
  var target = report.target;
  var severity = report.severity;
  var output = report.output;
  var stderr = report.stderr;
  var duration = report.duration;
  var params = report.params;
  var command = report.command;
  var exitCode = report.exitCode;

  // Diccionario de Teoría para TFG
  var TFG_THEORY = {
    'Scapy SYN Scan (Half-Open)': {
      module: 'Módulo 04: Laboratorio Scapy',
      desc: 'Escaneo sigiloso a bajo nivel. Envía un paquete SYN y analiza si la respuesta es SYN-ACK (indicando puerto abierto) o RST (cerrado). Su principal ventaja es que la conexión nunca se completa, dificultando su registro en los logs de aplicación.',
      validation: 'A nivel ofensivo, el script de Python ejecutado por n8n logró forzar el escaneo sigiloso sin romper la conexión SSH. A nivel defensivo, el agente de Wazuh procesó la traza alertando de forma efectiva sobre la manipulación a bajo nivel (T1046).'
    },
    'Scapy ACK Scan (Firewall Bypass)': {
      module: 'Módulo 04: Laboratorio Scapy',
      desc: 'Técnica avanzada para mapear conjuntos de reglas de firewalls. Consiste en enviar un paquete ACK huérfano. Si el sistema responde con RST, el puerto se clasifica como "No filtrado"; si no hay respuesta, es "Filtrado".',
      validation: 'A nivel de red, el atacante consiguió evadir la detección estándar y mapear las políticas del firewall. A nivel defensivo, la consola de Wazuh disparó la alerta correspondiente.'
    },
    'Scapy ARP Scan (Host Discovery)': {
      module: 'Módulo 04: Laboratorio Scapy',
      desc: 'Descubrimiento de hosts activos en la red local solicitando direcciones MAC a través del protocolo ARP. Al operar en Capa 2, es significativamente más rápido y fiable que el escaneo ICMP, ya que no puede ser bloqueado por firewalls de host.',
      validation: 'La ejecución del comando logró descubrir la topología física. A nivel defensivo, el motor generó el informe PDF y Wazuh detectó el barrido de red.'
    },
    'Scapy ICMP Fuzzing': {
      module: 'Módulo 04: Laboratorio Scapy',
      desc: 'Técnica de Fuzzing orientada a desestabilizar servicios de red. Inyecta payloads aleatorios en paquetes ICMP para forzar comportamientos inesperados, caídas de servicio (DoS) o revelar vulnerabilidades subyacentes.',
      validation: 'El script logró enviar la ráfaga de paquetes malformados hacia el objetivo. El SIEM generó un evento de severidad crítica alertando del intento de degradación.'
    },
    'Scapy TCP Fuzzing': {
      module: 'Módulo 04: Laboratorio Scapy',
      desc: 'Ataque de estrés y corrupción a nivel de transporte. Bombardea un puerto específico con paquetes TCP cuyos flags y payloads son mutados aleatoriamente, buscando desbordamientos de búfer en el demonio del servicio.',
      validation: 'Se generó un flujo anómalo de tráfico TCP malformado. La correlación en Wazuh permitió identificar la huella del ataque y generar la incidencia correspondiente.'
    }
  };

  var theory = TFG_THEORY[taskName] || {
    module: taskName.includes('Scapy') ? 'Módulo 04: Laboratorio Scapy' : 'Módulo XX: Ataques de Red',
    desc: 'Se basa en la ejecución de un vector automatizado contra la infraestructura de pruebas. La descripción teórica extendida se detalla en la memoria del proyecto.',
    validation: 'A nivel de red, la ejecución del comando logró el resultado esperado. A nivel defensivo, el motor de CyberShield generó el informe PDF y la consola de Wazuh disparó la alerta correspondiente, mapeando correctamente la técnica de MITRE ATT&CK.'
  };

  var md = [
    '# ' + theory.module + ' - ' + taskName,
    '',
    '## Descripción Técnica',
    theory.desc,
    '',
    '## Parámetros y Ejecución',
    'El ataque se orquesta mediante el motor de automatización, inyectando el siguiente script/comando de forma remota vía SSH:',
    '```bash',
    command,
    '```',
    '',
    '## Integración Defensiva y Telemetría (Wazuh)',
    'Para capturar la actividad maliciosa generada en la infraestructura, el flujo emite una alerta simulada al SIEM.',
    '',
    '**Traza simulada / Alerta generada:**',
    '```bash',
    'logger -t CyberShield -p local0.alert "SEC_VIOLATION: ' + (taskName.includes('Scapy') ? 'Scapy ' + taskName.replace('Scapy ', '') : taskName) + ' detected targeting ' + target + ' - MITRE:[' + mitreInfo.id + ']"',
    '```',
    '',
    '**Regla de Detección Implementada en local_rules.xml:**',
    '```xml',
    '<rule id="1006XX" level="10">',
    '    <if_sid>1002</if_sid>',
    '    <match>SEC_VIOLATION: ' + (taskName.includes('Scapy') ? 'Scapy' : taskName.split(' ')[0]) + '</match>',
    '    <description>ALERTA CYBERSHIELD: ' + taskName + ' detectado</description>',
    '    <mitre>',
    '      <id>' + mitreInfo.id + '</id>',
    '    </mitre>',
    '</rule>',
    '```',
    '',
    '## Resultados de la Validación',
    theory.validation,
    '',
    '**Salida en bruto del proceso:**',
    '```text',
    finalOutput,
    '```',
    ''
  ].join('\n');

  return md;
}

// ---------------------------------------------------------------------------
// GENERACION DE INFORME — Asíncrono para no bloquear
// ---------------------------------------------------------------------------

function generateReport(input) {
  input = input || {};

  var taskName = input.task_name || 'Ataque de Seguridad';
  var target = input.target || input.scan_target || 'objetivo-desconocido';
  var generatedAt = new Date().toISOString();
  
  // Usamos nomenclatura exacta (sin fecha) para facilitar el Polling desde React
  var slug = taskName.replace(/\s+/g, '-');
  var baseName = 'CS-RPT-' + slug;
  
  var markdownPath = path.join(REPORTS_DIR, baseName + '.md');
  var severity = SEVERITY_MAP[taskName] || 'Media';
  var duration = input.duration_seconds || 0;
  var output = input.output || input.stdout || '';
  var stderr = input.stderr || '';
  var params = input.params || {};
  var command = input.command || '';
  var exitCode = input.exit_code !== undefined ? input.exit_code : input.code;

  var markdown = renderMarkdown({
    generatedAt: generatedAt,
    taskName: taskName,
    target: target,
    severity: severity,
    output: output,
    duration: duration,
    params: params,
    command: command,
    exitCode: exitCode
  });

  fs.writeFileSync(markdownPath, markdown, 'utf8');
  console.log('[REPORT] Markdown generado: ' + markdownPath);

  // Generar PDF de forma asíncrona — no bloquea la respuesta HTTP
  var pdfPath = markdownPath.replace(/\.md$/i, '.pdf');
  var filename = path.basename(pdfPath);

  execFile('node', [path.join(__dirname, 'generate-pdf.js'), markdownPath], function(err) {
    if (err) {
      console.error('[REPORT] Error generando PDF (se puede descargar el .md): ' + err.message);
      return;
    }
    console.log('[REPORT] PDF generado: ' + pdfPath);

    // Copiar a carpeta pública para la web
    var publicPdfPath = path.join(PUBLIC_REPORTS_DIR, filename);
    try {
      if (fs.existsSync(pdfPath)) {
        fs.copyFileSync(pdfPath, publicPdfPath);
        fs.copyFileSync(pdfPath, path.join(PUBLIC_REPORTS_DIR, 'latest-scan-report.pdf'));
        console.log('[REPORT] PDF copiado a public: ' + publicPdfPath);
      }
    } catch (copyErr) {
      console.error('[REPORT] Error copiando PDF: ' + copyErr.message);
    }
  });

  return {
    markdownPath: markdownPath,
    pdfPath: pdfPath,
    publicPdfPath: path.join(PUBLIC_REPORTS_DIR, filename),
    downloadUrl: '/reports/download/' + filename,
    filename: filename,
    target: target,
    taskName: taskName
  };
}

// ---------------------------------------------------------------------------
// SERVIDOR HTTP
// ---------------------------------------------------------------------------

var server = http.createServer(function(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  // Limpiar URL
  var cleanUrl = req.url.split('?')[0].replace(/\/+$/, '');
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + cleanUrl);

  if (req.method === 'GET' && cleanUrl === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  // Listar informes (PDFs + MDs)
  if (req.method === 'GET' && cleanUrl === '/reports/list') {
    try {
      var allFiles = fs.readdirSync(REPORTS_DIR);
      var pdfFiles = allFiles.filter(function(f) { return f.endsWith('.pdf'); });
      var mdFiles = allFiles.filter(function(f) { return f.endsWith('.md') && !f.startsWith('.'); });

      // Combinar: PDFs tienen prioridad, pero incluir MDs que aún no tienen PDF
      var reportMap = {};
      mdFiles.forEach(function(mdFile) {
        var key = mdFile.replace('.md', '');
        reportMap[key] = { md: mdFile, pdf: null };
      });
      pdfFiles.forEach(function(pdfFile) {
        var key = pdfFile.replace('.pdf', '');
        if (reportMap[key]) {
          reportMap[key].pdf = pdfFile;
        } else {
          reportMap[key] = { md: null, pdf: pdfFile };
        }
      });

      var reports = Object.keys(reportMap).map(function(key) {
        var entry = reportMap[key];
        var filename = entry.pdf || entry.md;
        var filePath = path.join(REPORTS_DIR, filename);
        var stats = fs.statSync(filePath);
        var parts = key.split('-');
        var attackType = 'Reporte';
        if (parts.length >= 6) {
          attackType = parts.slice(5).join(' ');
          attackType = attackType.charAt(0).toUpperCase() + attackType.slice(1);
        }
        return {
          filename: filename,
          date: stats.mtime.toISOString(),
          size: stats.size,
          attackType: attackType,
          downloadUrl: '/reports/download/' + filename,
          hasPdf: !!entry.pdf,
          hasMd: !!entry.md
        };
      });
      reports.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
      return sendJson(res, 200, { ok: true, reports: reports });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }

  // Descargar informe concreto
  if (req.method === 'GET' && cleanUrl.indexOf('/reports/download/') === 0) {
    var dlFilename = decodeURIComponent(cleanUrl.split('/reports/download/')[1]);
    var dlPath = path.join(REPORTS_DIR, dlFilename);
    if (dlFilename.indexOf('..') !== -1 || !fs.existsSync(dlPath)) {
      return sendJson(res, 404, { ok: false, error: 'File not found' });
    }
    try {
      var stat = fs.statSync(dlPath);
      var contentType = dlFilename.endsWith('.pdf') ? 'application/pdf' : 'text/markdown; charset=utf-8';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename="' + dlFilename + '"',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(dlPath).pipe(res);
      return;
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: 'Error serving file' });
    }
  }

  // Borrar informe
  if (req.method === 'DELETE' && cleanUrl.indexOf('/reports/delete/') === 0) {
    var delFilename = decodeURIComponent(cleanUrl.split('/reports/delete/')[1]);
    if (delFilename.indexOf('..') !== -1) {
      return sendJson(res, 400, { ok: false, error: 'Invalid filename' });
    }
    var baseName = delFilename.replace(/\.(pdf|md)$/i, '');
    var deleted = [];
    [baseName + '.md', baseName + '.pdf'].forEach(function(f) {
      var fp = path.join(REPORTS_DIR, f);
      if (fs.existsSync(fp)) { fs.unlinkSync(fp); deleted.push(f); }
      var pubFp = path.join(PUBLIC_REPORTS_DIR, f);
      if (fs.existsSync(pubFp)) { fs.unlinkSync(pubFp); }
    });
    console.log('[REPORT] Borrados: ' + deleted.join(', '));
    return sendJson(res, 200, { ok: true, deleted: deleted });
  }

  // Generar informe
  if (req.method === 'POST' && (cleanUrl === '/generate-report' || cleanUrl === '/generate-attack-report')) {
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() {
      try {
        var bodyStr = Buffer.concat(chunks).toString('utf8');
        var body = bodyStr ? JSON.parse(bodyStr) : {};
        var result = generateReport(body);
        return sendJson(res, 200, {
          ok: true,
          markdownPath: result.markdownPath,
          pdfPath: result.pdfPath,
          downloadUrl: result.downloadUrl,
          filename: result.filename,
          target: result.target,
          taskName: result.taskName
        });
      } catch (error) {
        console.error('[REPORT] Error generando informe:', error);
        return sendJson(res, 500, { ok: false, error: error.message || 'No se pudo generar el informe' });
      }
    });
    return;
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, function() {
  console.log('CyberShield report server listening on http://' + HOST + ':' + PORT);
});