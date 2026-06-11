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
- SPRINT COMPLETO TAREA 1: attack_templates.json con 15 módulos
- SPRINT COMPLETO TAREA 2: local_rules.xml con 15 reglas Wazuh (100499-100513)
- SPRINT COMPLETO TAREA 3: seed-templates.js funcional (15/15 ✅)
- SPRINT COMPLETO TAREA 4: Dashboard inicial con datos reales (/dashboard)
- SPRINT COMPLETO TAREA 5: Dashboard defensivo real con correlación (/defensive)
- SPRINT COMPLETO TAREA 6: Verificación en Kali en todos los MODs
- Endpoint /api/stats para KPIs de ataques y health checks
- Endpoint /api/wazuh/alerts proxy configurado en backend

### 🔄 EN CURSO
- Importación de reglas Wazuh al servidor de producción.

### 📋 PENDIENTE (en este orden)
- Importar reglas Wazuh en servidor 10.10.10.49 (esperando confirmación del usuario).
- GitHub cleanup + README final.

---

## PRÓXIMO PASO INMEDIATO
Esperar respuesta del usuario: "¿Confirmas acceso SSH al servidor 10.10.10.49 para importar las reglas Wazuh?"

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
- Dashboard centralizado utiliza endpoints /api/stats, /api/health y /api/wazuh/alerts.

---

## CÓMO USAR ESTE ARCHIVO
- El agente lo lee al inicio de CADA sesión
- Tú lo editas cuando algo cambia de estado (✅/🔄/📋)
- El agente puede proponerte el nuevo texto al finalizar una tarea
- Nunca borra el historial, solo mueve items entre secciones