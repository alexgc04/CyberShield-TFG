# 📋 CyberShield — Plan Operativo: Módulo 02 — Escaneo de Vulnerabilidades

> **Preparado por:** Lead Project Manager
> **Fecha:** 2026-05-06
> **Estado:** 🟡 Pendiente de aprobación del usuario
> **Módulo anterior:** ✅ Módulo 01 — Auditoría de Red (MAC Flooding completado)

---

## 1. Objetivo del Módulo

Realizar un **escaneo exhaustivo de vulnerabilidades** sobre la infraestructura objetivo para identificar:
- Hosts activos en la red
- Puertos y servicios expuestos
- Versiones de software con vulnerabilidades conocidas (CVE)
- Configuraciones débiles explotables

Este módulo alimentará los futuros ataques de explotación y proporcionará un mapa completo de la superficie de ataque.

---

## 2. Fases de Ejecución

### Fase 2.1 — Descubrimiento de Hosts (Reconocimiento)

| Campo | Valor |
|-------|-------|
| **Template** | `Nmap Host Discovery` |
| **Comando** | `sudo nmap -sn 10.10.10.0/24 -oX /tmp/nmap_discovery.xml` |
| **Agente** | Network Infiltrator |
| **MITRE ATT&CK** | T1046 — Network Service Discovery |
| **Duración estimada** | 30–60 segundos |
| **Objetivo** | Identificar todos los hosts activos en el segmento |

**Output esperado:**
- Lista de IPs activas
- MACs asociadas (si están en la misma subred)
- Vendedores de NIC (fingerprinting básico)

---

### Fase 2.2 — Escaneo de Puertos y Servicios

| Campo | Valor |
|-------|-------|
| **Template** | `Nmap TCP SYN Scan` |
| **Comando** | `sudo nmap -sS -sV -O -p 1-1024 <target> -oX /tmp/nmap_syn.xml` |
| **Agente** | Network Infiltrator |
| **MITRE ATT&CK** | T1046 — Network Service Discovery |
| **Duración estimada** | 2–5 minutos por host |
| **Objetivo** | Identificar puertos abiertos, versiones de servicio y OS |

**Output esperado:**
- Tabla de puertos abiertos con servicio y versión
- OS fingerprint del target
- Posibles vectores de ataque identificados

---

### Fase 2.3 — Escaneo Completo (65535 puertos)

| Campo | Valor |
|-------|-------|
| **Template** | `Nmap Full Port Scan` |
| **Comando** | `sudo nmap -sS -p- -T4 --min-rate=1000 <target> -oX /tmp/nmap_full.xml` |
| **Agente** | Network Infiltrator |
| **MITRE ATT&CK** | T1046 |
| **Duración estimada** | 5–15 minutos por host |
| **Objetivo** | Descubrir servicios en puertos no estándar (high ports) |

> ⚠️ **Nota:** Este escaneo es más agresivo y puede generar alertas en Wazuh/Suricata. El Defense Analyst debe monitorizar activamente.

---

### Fase 2.4 — Scripts de Vulnerabilidades (NSE)

| Campo | Valor |
|-------|-------|
| **Template** | `Nmap Vulnerability Scripts` |
| **Comando** | `sudo nmap -sV --script=vuln <target> -oX /tmp/nmap_vuln.xml` |
| **Agente** | Network Infiltrator |
| **MITRE ATT&CK** | T1046 |
| **Duración estimada** | 10–30 minutos por host |
| **Objetivo** | Detectar CVEs conocidas en los servicios expuestos |

**Output esperado:**
- Lista de CVEs detectadas con severidad
- Servicios vulnerables identificados
- Scripts NSE que dieron positivo

---

### Fase 2.5 — Escaneo UDP (Opcional)

| Campo | Valor |
|-------|-------|
| **Template** | `Nmap UDP Scan` |
| **Comando** | `sudo nmap -sU --top-ports=100 <target> -oX /tmp/nmap_udp.xml` |
| **Agente** | Network Infiltrator |
| **MITRE ATT&CK** | T1046 |
| **Duración estimada** | 5–20 minutos |
| **Objetivo** | Descubrir servicios UDP (DNS, SNMP, DHCP, TFTP) |

---

## 3. Asignación de Agentes

| Agente | Rol en este módulo |
|--------|-------------------|
| **Lead Project Manager** | Coordinación, aprobación de cada fase, reporting al usuario |
| **Network Infiltrator** | Ejecución de escaneos Nmap desde Kali Linux vía n8n |
| **Software Architect** | Validar flujos n8n para parsear output XML de Nmap, configurar almacenamiento en MongoDB |
| **Defense Analyst** | Monitorizar Wazuh durante los escaneos, evaluar si las reglas detectan la actividad de reconocimiento |

---

## 4. Pre-Requisitos

- [x] Módulo 01 (MAC Flooding) completado y documentado
- [x] Túnel SSH (puerto 2222) operativo — n8n → Kali
- [x] Nodo Kali accesible con `nmap` instalado
- [ ] Verificar que `nmap` está actualizado en Kali: `nmap --version`
- [ ] Definir target range exacto con el usuario
- [ ] Software Architect: preparar nodo n8n para parsear output XML de Nmap
- [ ] Defense Analyst: confirmar Wazuh activo para monitorización

---

## 5. Flujo n8n Propuesto

```
Lovable Dashboard
    │
    ▼ POST /webhook/scan
n8n (Orquestador)
    │
    ├──▶ [Code Node] Construir comando Nmap con parámetros
    │
    ├──▶ [SSH Execute] Ejecutar en Kali Linux
    │
    ├──▶ [SSH Execute] Leer output XML: cat /tmp/nmap_*.xml
    │
    ├──▶ [Code Node] Parsear XML → JSON estructurado
    │
    ├──▶ [MongoDB] Guardar resultados en colección `scan-results`
    │
    └──▶ [Webhook Response] Devolver resumen al Dashboard
```

---

## 6. Entregables del Módulo

| Entregable | Responsable | Formato |
|------------|-------------|---------|
| Mapa de hosts activos | Network Infiltrator | Tabla IP/MAC/OS |
| Tabla de puertos y servicios | Network Infiltrator | CSV/JSON (MongoDB) |
| Lista de CVEs detectadas | Network Infiltrator | JSON con CVSS scores |
| Informe de detección Wazuh | Defense Analyst | `docs/reports/CS-RPT-*` |
| Informe consolidado de vulnerabilidades | Defense Analyst + Lead PM | Template oficial |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Escaneo detectado y bloqueado por IDS/IPS | Media | Usar flag `-T2` (slower) si es necesario evadir |
| Nmap timeout por hosts lentos | Baja | Configurar `--host-timeout 300s` |
| Output XML demasiado grande | Baja | Segmentar por subred o por host |
| Falsos positivos en scripts NSE | Media | Validar manualmente cada CVE reportada |

---

## ✅ Aprobación Requerida

> **Lead PM al usuario:** El plan operativo para el Módulo 02 — Escaneo de Vulnerabilidades está listo.
>
> Propongo ejecutar las fases en orden secuencial (2.1 → 2.2 → 2.3 → 2.4), con aprobación entre cada fase.
>
> **¿Apruebas iniciar con la Fase 2.1 (Descubrimiento de Hosts)?**
> **¿Cuál es el target range exacto?** (ej: `10.10.10.0/24`)
