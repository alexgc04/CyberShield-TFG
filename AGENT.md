# AGENT.md — CyberShield TFG
# Instrucciones para Claude Code y Gemini Code Assist

## Quién eres
Eres el agente de desarrollo de CyberShield, una plataforma ASV
(Automated Security Validation) desarrollada como TFG en la UCLM
(curso 25/26). Orquestas ataques reales de red desde un dashboard
web hacia Kali Linux y validas su detección en Wazuh SIEM.

Si eres Claude: sigue estas instrucciones más las de docs/roles/
Si eres Gemini: sigue estas instrucciones más las de docs/roles/
Las reglas son idénticas para ambos.

## PRIMERA ACCIÓN OBLIGATORIA
Antes de responder cualquier mensaje, lee:
1. Este archivo (AGENT.md)
2. .claude/session-state/current-sprint.md
3. El archivo de rol activo (docs/roles/)
Confirma en 2 líneas qué vas a hacer y qué archivos vas a tocar.

## Reglas absolutas
1. UN SOLO SERVIDOR. Todo en localhost:8080. Express en :3001,
   Vite hace proxy /api/* → :3001. El usuario solo ve un puerto.
2. TEORÍA INAMOVIBLE. Comandos, reglas Wazuh y MITRE IDs
   vienen del TFG (docs/attacks/). No los cambies nunca.
3. TAREAS PEQUEÑAS. Solo lo que se pide. Nada más.
4. PREGUNTA antes de tocar archivos no mencionados.
5. COMMIT tras cada tarea que funcione.
6. ACTUALIZA current-sprint.md al final de cada tarea.
7. Sin dependencias nuevas sin permiso explícito.
8. Si dudas: pregunta, no inventes.

## Stack tecnológico (no cambiar)
- Frontend: React + Vite + TypeScript (lovable/)
- Backend: Express.js unificado (server.js, puerto 3001 en dev)
- DB: MongoDB Atlas (colecciones: users, attack_templates,
  attack_logs, scan_logs)
- Orquestador: n8n (comunicación por webhooks HTTP)
- Agente atacante: Kali Linux (conexión SSH)
- SIEM: Wazuh en 10.10.10.145 (Indexer :9200, API :55000)

## Flujo de cada ataque (siempre igual, no cambiar)
Frontend → POST /api/attacks/execute → server.js
→ POST webhook n8n → SSH Kali (comando ataque)
→ SSH Kali (logger Wazuh) → POST /api/reports/generate → PDF

## Variables de entorno (.env)
MONGODB_URI, JWT_SECRET, PORT=3001,
N8N_WEBHOOK_URL, WAZUH_HOST=10.10.10.49,
WAZUH_PORT=9200, WAZUH_USER, WAZUH_PASS,
SSH_HOST, SSH_USER, SSH_PASS

## Módulos del TFG (solo estos, en este orden)
MOD01 MAC Flooding        LAN  T1557  rule:100500
MOD02 Switch Port Stealing LAN  T1557  rule:100501
MOD03 SPAN/Port Mirror     LAN  T1040  rule:100502
MOD04 Covert Channels      LAN  T1048  rule:100503
MOD05 ARP Spoofing MitM    LAN  T1557  rule:100504
MOD06 DHCP Starvation      LAN  T1498  rule:100505
MOD07 Scapy SYN Scan       SCAPY T1046 rule:100506
MOD08 Scapy ACK Scan       SCAPY T1046 rule:100507
MOD09 Scapy ARP Scan       SCAPY T1018 rule:100508
MOD10 Scapy Fuzzing        SCAPY T1498 rule:100509