# Estado del Sprint — CyberShield TFG

Última actualización: 2026-06-14
Agente que actualizó: Claude Opus 4.6 (Thinking)

---

## ESTADO GENERAL DEL PROYECTO

### ✅ Completado
- Estructura de carpetas del proyecto
- server.js unificado con auth robusta (bloqueo fuerza bruta, validaciones)
- auth-server.js y seed-mod00.js eliminados del repositorio
- Vite proxy configurado (:8080 → :3001)
- Archivos de roles y AGENT.md
- attack_templates.json con 15 módulos (14 + PRIV-002 Kerberos)
- local_rules.xml con 15 reglas Wazuh (100499-100513)
- seed-templates.js funcional (15/15 ✅)
- Dashboard con datos reales (/dashboard) — KPIs, BarChart, tabla operaciones
- Dashboard defensivo real con correlación (/defensive) — apunta a 10.10.10.49
- Módulo ofensivo genérico (/offensive) — lee plantillas dinámicas de MongoDB
- Verificación en Kali documentada en todos los MODs
- Endpoint /api/stats para KPIs reales de MongoDB
- Endpoint /api/health para ping a servicios
- Endpoint /api/wazuh/alerts proxy configurado
- .env.example completado con todas las variables
- Login.tsx envía `identifier` para seguridad
- Register.tsx envía `confirmPassword` para validación server-side
- Auth con bloqueo: 5 intentos fallidos → cuenta bloqueada 15 min
- Middleware verifyToken reutilizable en server.js

### 🔄 EN CURSO
- Importación de reglas Wazuh al servidor 10.10.10.49.

### 📋 PENDIENTE (en este orden)
- Importar reglas Wazuh en servidor 10.10.10.49 (esperando confirmación del usuario).
- GitHub cleanup + README final.

---

## PRÓXIMO PASO INMEDIATO
Esperar respuesta del usuario: "¿Confirmas acceso SSH al servidor 10.10.10.49 para importar las reglas Wazuh?"

---

## DECISIONES TOMADAS (no revertir)
- Wireless eliminado del scope (no hay hardware físico)
- 15 módulos: 10 LAN/Scapy + 2 Brute Force + 2 PrivEsc + 1 Kerberos
- ARP Spoofing split en LAN-005a (injection) y LAN-005b (MitM)
- AttackModule.tsx es genérico (no un componente por ataque)
- Módulo defensivo mantiene zonas Indexer + Manager configurables
- UN solo servidor (:8080), sin puertos separados para el usuario
- Comandos del TFG son inamovibles
- BF-001: Medusa SSH, BF-002: Hydra Web
- PRIV-001: Local (SUID+sudo+cron), PRIV-002: AD (kerbrute+impacket)
- Reglas Wazuh 100510-100513 para los 4 módulos nuevos
- Dashboard centralizado utiliza endpoints /api/stats, /api/health y /api/wazuh/alerts.
- auth-server.js eliminado — toda la auth vive en server.js
- seed-mod00.js eliminado — usar scripts/seed-templates.js
- Login acepta 'identifier' o 'username' para compatibilidad
- command_alt mantenido en LAN-001 (el flujo n8n lo usa)

---

## CÓMO USAR ESTE ARCHIVO
- El agente lo lee al inicio de CADA sesión
- Tú lo editas cuando algo cambia de estado (✅/🔄/📋)
- El agente puede proponerte el nuevo texto al finalizar una tarea
- Nunca borra el historial, solo mueve items entre secciones