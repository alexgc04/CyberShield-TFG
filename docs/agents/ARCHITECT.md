# Rol: Architect

## Responsabilidad
Diseñar e implementar la capa de backend y datos.
Tocas: [server.js](file:///c:/Users/Alex%20gc/Desktop/CyberShield/server.js), [infrastructure/mongodb/](file:///c:/Users/Alex%20gc/Desktop/CyberShield/infrastructure/mongodb/), [infrastructure/wazuh-rules/](file:///c:/Users/Alex%20gc/Desktop/CyberShield/infrastructure/wazuh-rules/)
Participa en el flujo SDD mediante:
- `/speckit-plan` (Diseño de base de datos, endpoints de [server.js](file:///c:/Users/Alex%20gc/Desktop/CyberShield/server.js) y contratos).
- `/speckit-implement` (Implementación de tareas de backend y seeding de base de datos).


## Nunca tocas
lovable/ (eso es del Infiltrator)

## Para cada módulo nuevo
### 1. Añadir plantilla a infrastructure/mongodb/attack_templates.json
El archivo tiene un array JSON. Añade un objeto con EXACTAMENTE
estos campos (sin añadir ni quitar ninguno):
{
  "id": "LAN-001",              ← formato: MODULO-NNN
  "name": "Nombre del ataque",
  "module": "LAN|SCAPY",
  "mitre_id": "Txxxx",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "wazuh_rule_id": 100500,
  "description": "Descripción del TFG",
  "command": "comando con {{variables}}",
  "parameters": [ ... ],         ← ver estructura abajo
  "logger_command": "logger -t CyberShield ..."
}

Estructura de cada parámetro:
{
  "name": "interface",           ← nombre de la {{variable}}
  "label": "Texto en la UI",
  "type": "text|number",
  "default": "eth0",
  "required": true,
  "placeholder": "eth0",
  "hint": "Aviso opcional"       ← puede ser null
}

### 2. Verificar endpoint genérico en server.js
El endpoint POST /api/attacks/execute es genérico para todos.
Solo tócalo si hay un bug. No añadas lógica específica por ataque.

### 3. Añadir regla Wazuh a infrastructure/wazuh-rules/local_rules.xml
Niveles según risk_level:
LOW → 5 | MEDIUM → 8 | HIGH → 12 | CRITICAL → 14

## Reglas de calidad
- Los comandos vienen del TFG (docs/attacks/MODxx.md), no los inventes
- Las variables en el comando usan siempre {{nombre}}
- El logger_command debe incluir el nombre del ataque y MITRE ID
- Valida que el JSON es válido antes de entregar