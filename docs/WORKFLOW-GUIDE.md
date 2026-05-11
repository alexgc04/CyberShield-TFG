# CyberShield — Guía Completa de Flujo de Trabajo

> **Cómo ejecutar una operación de seguridad ofensiva de principio a fin usando la Agencia de IA de CyberShield.**
>
> Esta guía cubre el ciclo completo: planificación, ejecución, monitorización,
> retrospectiva, generación de informes y remediación.

---

## Tabla de Contenidos

1. [Vista General del Ciclo](#vista-general-del-ciclo)
2. [Fase 1: Planificación del Ataque](#fase-1-planificación-del-ataque)
3. [Fase 2: Ejecución del Ataque](#fase-2-ejecución-del-ataque)
4. [Fase 3: Monitorización en Tiempo Real](#fase-3-monitorización-en-tiempo-real)
5. [Fase 4: Retrospectiva Post-Ataque](#fase-4-retrospectiva-post-ataque)
6. [Fase 5: Informe de Vulnerabilidades](#fase-5-informe-de-vulnerabilidades)
7. [Fase 6: Remediación y Mejora Continua](#fase-6-remediación-y-mejora-continua)
8. [Referencia Rápida de Agentes](#referencia-rápida-de-agentes)

---

## Vista General del Ciclo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   FASE 1    │     │   FASE 2    │     │   FASE 3    │
│ Planificar  │────▶│  Ejecutar   │────▶│ Monitorizar │
│  (Lead PM)  │     │(Specialist) │     │  (Wazuh)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │   FASE 6    │     │   FASE 4    │
                    │  Remediar   │◀────│Retrospectiva│
                    │  (Equipo)   │     │(Defense An.)│
                    └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │   FASE 5    │
                                        │  Informar   │
                                        │(Defense An.)│
                                        └─────────────┘
```

---

## Fase 1: Planificación del Ataque

**Agente principal:** Lead Project Manager
**Participantes:** Usuario, Software Architect

### 1.1 Definir Objetivo

El Lead PM consulta con el usuario:

```
Preguntas clave:
1. ¿Qué queremos probar? (red interna, WiFi, segmentación VLAN)
2. ¿Cuál es el target? (IP, rango, SSID)
3. ¿Qué herramientas queremos evaluar? (macof, bettercap, aircrack-ng)
4. ¿Cuánto tiempo dura la ventana de ataque?
5. ¿Qué nivel de agresividad? (reconocimiento, ataque limitado, ataque completo)
```

### 1.2 Seleccionar Template de Ataque

Consultar los templates disponibles en `design/mongodb/attack-templates.json`:

```json
{
  "name": "MAC Flooding",
  "command_base": "sudo macof -i {{interface}} -n {{count}}",
  "params": {
    "interface": "eth0",
    "count": "5000"
  }
}
```

### 1.3 Validar con Software Architect

El Software Architect verifica:
- [ ] Flujo n8n configurado para este tipo de ataque
- [ ] Webhook endpoint activo y validando payloads
- [ ] MongoDB preparado para recibir logs
- [ ] Conexión SSH con Kali operativa

### 1.4 Aprobación del Usuario

> **REGLA DE ORO:** Ningún ataque se lanza sin aprobación explícita del usuario.

```
Lead PM: "Plan de ataque preparado:
  - Tipo: MAC Flooding
  - Target: 10.10.10.0/24 via eth0
  - Duración: 30 segundos
  - Paquetes: 5000
  - Wazuh: activo para monitorización

  ¿Apruebas la ejecución?"

Usuario: "Aprobado. Procede."
```

---

## Fase 2: Ejecución del Ataque

**Agente principal:** Network Infiltrator o Wireless Strike Expert
**Supervisión:** Lead Project Manager

### 2.1 Pre-Ejecución Checklist

El Specialist verifica antes de ejecutar:

**Para ataques de red (Network Infiltrator):**
- [ ] Target accesible
- [ ] Interfaz correcta seleccionada
- [ ] Wazuh agent activo en el target/segmento
- [ ] Plan de reversión preparado
- [ ] Comando validado por Software Architect

**Para ataques WiFi (Wireless Strike Expert):**
- [ ] Adaptador en modo monitor
- [ ] Red objetivo identificada (BSSID, canal)
- [ ] `airmon-ng check kill` ejecutado
- [ ] Directorio de capturas preparado

### 2.2 Lanzamiento vía n8n

```
Lovable (Dashboard)
    │
    ▼ POST /webhook/attack
n8n (Orquestador)
    │
    ▼ SSH Execute Command
Kali Linux (Nodo Ofensivo)
    │
    ▼ Ejecutar herramienta (macof, bettercap, aircrack-ng...)
    │
    ▼ Output → n8n → MongoDB (attack-log)
```

### 2.3 Durante la Ejecución

El Specialist monitoriza:
- Estado del comando (exitoso, error, timeout)
- Impacto observable en la red
- Alertas tempranas de Wazuh
- Cualquier efecto colateral no esperado

> **PROTOCOLO DE PARADA DE EMERGENCIA:** Si se detecta impacto fuera del alcance definido, el Specialist detiene inmediatamente y reporta al Lead PM.

---

## Fase 3: Monitorización en Tiempo Real

**Herramienta:** Wazuh Dashboard
**Observador:** Defense Analyst + Lead PM

### 3.1 Qué Monitorizar

| Fuente | Qué buscar |
|--------|------------|
| **Security Events** | Alertas de detección de intrusos |
| **Network Events** | Tráfico anómalo (Suricata/Snort) |
| **FIM** | Cambios en archivos críticos |
| **Syslog** | Errores de sistema inusuales |

### 3.2 Registro de Alertas en Tiempo Real

El Defense Analyst toma nota de:
- Timestamp de cada alerta relevante
- Rule ID y nivel de severidad
- Descripción del evento
- Correlación con la acción del Specialist

---

## Fase 4: Retrospectiva Post-Ataque

**Agente principal:** Defense Analyst (Wazuh Liaison)
**Participantes:** Todos los agentes + Usuario

### 4.1 Recopilación de Datos

El Defense Analyst recopila:

```
1. Logs de Wazuh (ventana temporal del ataque)
   └── Filtrar por: timestamp, rule.level >= 3, agent.name

2. Output del Specialist (resultados del ataque)
   └── ¿Se completó? ¿Qué se observó?

3. Logs de n8n (flujo de ejecución)
   └── ¿Hubo errores en la orquestación?

4. Estado de MongoDB (registros almacenados)
   └── ¿Se guardó correctamente el attack-log?
```

### 4.2 Análisis de Detección

Responder estas preguntas:

| Pregunta | Respuesta esperada |
|----------|-------------------|
| ¿Wazuh detectó el ataque? | Sí/No/Parcialmente |
| ¿Cuántas alertas generó? | Número total |
| ¿En cuántos segundos detectó? | TTD (Time To Detect) |
| ¿Hubo falsos positivos? | Número y detalle |
| ¿Qué técnicas pasaron desapercibidas? | Lista de gaps |
| ¿Las reglas actuales son suficientes? | Sí/No + recomendación |

### 4.3 Sesión de Retrospectiva

El Lead PM coordina una sesión estructurada:

```markdown
## Retrospectiva — [Nombre del Ataque] — [Fecha]

### ✅ ¿Qué funcionó bien?
- [Ejemplo: Wazuh detectó el ARP Spoofing en 3 segundos]

### ❌ ¿Qué no funcionó?
- [Ejemplo: MAC Flooding no generó alertas — gap en las reglas]

### 🔧 ¿Qué mejorar?
- [Ejemplo: Crear regla custom de Wazuh para detectar CAM overflow]

### 📋 Acciones
- [ ] [Responsable] - [Acción] - [Deadline]
```

---

## Fase 5: Informe de Vulnerabilidades

**Agente principal:** Defense Analyst
**Template:** `docs/templates/vulnerability-report.md`

### 5.1 Generar el Informe

El Defense Analyst produce un informe profesional siguiendo el template:

```markdown
# 🛡️ CyberShield — Informe de Vulnerabilidades

## Resumen Ejecutivo
[Párrafo con hallazgos clave y nivel de riesgo general]

## Tabla de Vulnerabilidades
| ID | Vulnerabilidad | Severidad | CVSS | Impacto | Remediación |
|----|---------------|-----------|------|---------|-------------|
| CS-001 | [Nombre] | Crítico | 9.8 | [Descripción] | [Pasos] |

## Análisis de Detección
[Métricas: TTD, cobertura, gaps]

## Recomendaciones Priorizadas
1. [Crítico] [Acción inmediata]
2. [Alto] [Acción a corto plazo]
3. [Medio] [Mejora continua]
```

### 5.2 Revisión y Aprobación

```
Defense Analyst → Lead PM (revisión técnica) → Usuario (aprobación final)
```

### 5.3 Almacenamiento

- Informe guardado en `docs/reports/YYYY-MM-DD-[nombre-ataque].md`
- Metadata almacenada en MongoDB (colección `vulnerability-reports`)
- Información del informe disponible en Dashboard Lovable

---

## Fase 6: Remediación y Mejora Continua

**Coordinador:** Lead Project Manager
**Ejecutores:** Software Architect + Defense Analyst

### 6.1 Priorizar Remediaciones

Basándose en el informe:

| Prioridad | Criterio | Plazo |
|-----------|----------|-------|
| **P0 — Crítico** | Explotable remotamente, sin autenticación | 24h |
| **P1 — Alto** | Explotable con acceso a la red | 1 semana |
| **P2 — Medio** | Requiere condiciones específicas | 1 mes |
| **P3 — Bajo** | Mejoras de hardening | Próximo ciclo |

### 6.2 Implementar Mejoras

- **Reglas Wazuh**: Defense Analyst propone nuevas reglas → Software Architect las implementa
- **Configuración de Red**: Ajustes basados en hallazgos (port security, DHCP snooping, etc.)
- **Flujos n8n**: Software Architect ajusta flujos para mejorar orquestación
- **Templates de Ataque**: Actualizar `attack-templates.json` con variantes descubiertas

### 6.3 Validar Mejoras

Tras implementar remediaciones, re-ejecutar el mismo ataque para verificar:
- ¿La vulnerabilidad fue corregida?
- ¿Wazuh ahora detecta lo que antes no detectaba?
- ¿El TTD mejoró?

---

## Referencia Rápida de Agentes

| Fase | Agente | Rol |
|------|--------|-----|
| 1. Planificar | Lead Project Manager | Coordina, consulta con usuario |
| 1. Planificar | Software Architect | Valida infraestructura |
| 2. Ejecutar | Network Infiltrator | Ataques Capa 2/3 |
| 2. Ejecutar | Wireless Strike Expert | Ataques WiFi |
| 3. Monitorizar | Defense Analyst | Observa Wazuh en vivo |
| 4. Retrospectiva | Defense Analyst + Lead PM | Análisis post-ataque |
| 5. Informar | Defense Analyst | Genera informe de vulnerabilidades |
| 6. Remediar | Software Architect + Defense Analyst | Implementa mejoras |
