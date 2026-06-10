# Estado del Sprint — CyberShield TFG

Última actualización: [fecha de hoy]
Agente que actualizó: [Claude/Gemini]

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
- Dashboard con datos (verificar si son reales o hardcoded)
- Archivos de roles y AGENT.md
- TAREA 0: Fix auth (PRIORIDAD MÁXIMA antes de cualquier ataque)

### 🔄 EN CURSO
- MOD01: MAC Flooding

### 📋 PENDIENTE (en este orden)
- MOD02: Switch Port Stealing
- MOD03: SPAN/Port Mirror
- MOD04: Covert Channels (ICMP/DNS)
- MOD05: ARP Spoofing MitM
- MOD06: DHCP Starvation/Rogue DHCP
- MOD07: Scapy SYN Scan
- MOD08: Scapy ACK Scan
- MOD09: Scapy ARP Scan
- MOD10: Scapy Fuzzing
- Módulo Defensivo Wazuh (alertas en tiempo real)
- Nmap → PDF (reconocimiento inicial)
- GitHub cleanup + README final

---

## PRÓXIMO PASO INMEDIATO
Implementar MOD01 MAC Flooding
(leer docs/attacks/MOD01-MAC-Flooding.md antes)

---

## DECISIONES TOMADAS (no revertir)
- Wireless eliminado del scope (no hay hardware físico)
- 10 módulos LAN/Scapy según TFG
- AttackModule.tsx es genérico (no un componente por ataque)
- Módulo defensivo mantiene zonas Indexer + Manager configurables
- UN solo servidor (:8080), sin puertos separados para el usuario
- Comandos del TFG son inamovibles

---

## CÓMO USAR ESTE ARCHIVO
- El agente lo lee al inicio de CADA sesión
- Tú lo editas cuando algo cambia de estado (✅/🔄/📋)
- El agente puede proponerte el nuevo texto al finalizar una tarea
- Nunca borra el historial, solo mueve items entre secciones