# Estado del Sprint — CyberShield TFG

Última actualización: 2026-06-11
Agente que actualizó: Gemini (Antigravity)

---

## ESTADO GENERAL DEL PROYECTO

### ⚠️ PROBLEMAS CONOCIDOS (arreglar primero)
1. AUTH ROTO: El registro inserta usuario hardcodeado (seed-mod00.js)
   en vez de leer el formulario. Register.tsx no conecta con la API.
   Fix: revisar Register.tsx → POST /api/auth/register → MongoDB.
2. Login puede no funcionar si el usuario guardado no tiene hash bcrypt
   generado desde el formulario real.

### ✅ Completado
- Estructura de carpetas del proyecto
- server.js con endpoints básicos de auth
- Vite proxy configurado (:8080 → :3001)
- Archivos de roles y AGENT.md
- TAREA 0: Fix auth (PRIORIDAD MÁXIMA antes de cualquier ataque)
- MOD01: MAC Flooding (JSON + Wazuh + seed + verificación Kali)
- MOD02: Switch Port Stealing (JSON + Wazuh + seed + verificación Kali)
- server.js conectado a n8n webhook (POST /api/attacks/execute)
- Frontend Offensive.tsx: inputs dinámicos + company_name
- SPRINT COMPLETO TAREA 1: attack_templates.json con 15 módulos
- SPRINT COMPLETO TAREA 2: local_rules.xml con 15 reglas Wazuh (100499-100513)
- SPRINT COMPLETO TAREA 3: seed-templates.js funcional (15/15 ✅)
- SPRINT COMPLETO TAREA 6: Verificación en Kali en todos los MODs
- MOD03: SPAN/Port Mirror
- MOD04: Canales Encubiertos (ICMP)
- MOD05a: ARP Spoofing — Inyección de tráfico
- MOD05b: ARP Spoofing — Man in the Middle
- MOD06: DHCP Starvation / Rogue DHCP
- MOD07: Scapy SYN Scan
- MOD08: Scapy ACK Scan
- MOD09: Scapy ARP Scan
- MOD10: Scapy Fuzzing (ICMP/TCP)
- MOD11: Fuerza Bruta SSH (Medusa)
- MOD12: Fuerza Bruta Web (Hydra)
- MOD13: Escalada de Privilegios Local (SUID/sudo/cron)
- MOD14: Escalada de Dominio (Kerberos ASREPRoast)

### 🔄 EN CURSO
- TAREA 4: Dashboard inicial real (/dashboard)
- TAREA 5: Dashboard defensivo real (/defensive)

### 📋 PENDIENTE (en este orden)
- TAREA 4: Dashboard con datos reales de MongoDB + Wazuh
- TAREA 5: Dashboard defensivo con correlación ataque↔alerta
- Importar reglas Wazuh en servidor 10.10.10.145 (confirmar acceso SSH)
- GitHub cleanup + README final

---

## PRÓXIMO PASO INMEDIATO
Implementar TAREA 4: Dashboard con datos reales de MongoDB
(KPIs, gráfico ataques, tabla operaciones, alertas Wazuh, estado sistema)

---

## DECISIONES TOMADAS (no revertir)
- Wireless eliminado del scope (no hay hardware físico)
- 14 módulos: 10 LAN/Scapy + 2 Brute Force + 2 PrivEsc
- ARP Spoofing split en LAN-005a (injection) y LAN-005b (MitM)
- AttackModule.tsx es genérico (no un componente por ataque)
- Módulo defensivo mantiene zonas Indexer + Manager configurables
- UN solo servidor (:8080), sin puertos separados para el usuario
- Comandos del TFG son inamovibles
- BF-001: Medusa SSH, BF-002: Hydra Web
- PRIV-001: Local (SUID+sudo+cron), PRIV-002: AD (kerbrute+impacket)
- Reglas Wazuh 100510-100513 para los 4 módulos nuevos

---

## CÓMO USAR ESTE ARCHIVO
- El agente lo lee al inicio de CADA sesión
- Tú lo editas cuando algo cambia de estado (✅/🔄/📋)
- El agente puede proponerte el nuevo texto al finalizar una tarea
- Nunca borra el historial, solo mueve items entre secciones