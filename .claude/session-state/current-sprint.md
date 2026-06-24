# Estado del Sprint — CyberShield TFG

Última actualización: 2026-06-19
Agente que actualizó: Antigravity (Claude Opus 4.6 Thinking)

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
- Fix de login tras registro (.trim() y lowercase añadidos)
- Rate limiting implementado (global, auth, attacks_execute)
- Google OAuth 2.0 integrado condicionalmente con passport y express-session
- Botón de "Continuar con Google" añadido al frontend de forma dinámica
- Verificación segura en health check de SSH_HOST
- Feature: Sistema completo de recuperación de contraseñas y correos de verificación con nodemailer
- **Sprint 2: Dashboards reales con datos reales ✅**
- **Sprint 0: Limpieza y Auth ✅**
- Configuración de flujo de n8n completada ✅ (Reemplazo dinámico de variables en código JS, query Mongo por attack_name, timeout en la ejecución Kali para evitar loops infinitos de comandos continuos).

### 🔄 EN CURSO
- Probando que todos los campos de MAC Flooding funcionan
- Validación de que los outputs de ataque se capturen con éxito después de aplicar el timeout `timeout 10s sudo <command>`.

- **Sprint 1: Módulos de Ataque ✅**
  - Actualizado `attack_templates.json` a exactamente 15 módulos (14 LAN/Scapy/Brute/PrivEsc + PRIV-002 Kerberos a petición del usuario).
  - Eliminado `command_alt` en LAN-001.
  - Corregido LAN-005b para hacer match exacto con el doc de ataques (MitM completo sin `sh -c`).
  - Actualizado `local_rules.xml` con la regla padre 100499 y reglas hijas 100500-100513 exactas.
  - Actualizado `seed-templates.js` con funcionalidad de limpieza de plantillas huérfanas en MongoDB.
  - Verificación cruzada automática (JSON vs XML) superada con éxito (0 errores).

- **Sprint 2: Rediseño Visual, Consola Interactiva y QA-TESTER ✅**
  - Rediseñado por completo el Módulo Ofensivo (`Offensive.tsx`) con filtros por categorías y tarjetas premium de riesgo (luminosas).
  - Creado modal de configuración dinámico y reactivo para los parámetros de los ataques.
  - Desarrollada terminal Linux interactiva funcional con línea de comandos (`help`, `clear`, `status`, `list`, `run <id>`), buffer de logs, simulación SSH y botón de descarga directa de PDF.
  - Integrada barra de progreso dinámica animada con fases de intrusión durante la ejecución de ataques.
  - Creada sección y página web dedicada para Reportes (`Reports.tsx`) sincronizada con MongoDB, permitiendo consultar el historial de auditorías y descargar PDFs.
  - Refacturado backend para guardar PDFs en disco (`reports/`) y servirlos de forma estática en `/api/reports/*.pdf`, además de crear el endpoint `/api/reports` para listar el historial.
  - Añadido fondo de pantalla de escudo roto (`broken-shield.png`) con opacidad sutil en el dashboard defensivo (`Defensive.tsx`).
  - Integrado el rol de `QA-Tester` (`docs/agents/QA-TESTER.md`) en la metodología de la agencia.
  - Documentados flujos de n8n en `docs/AGENCY.md` (unificando `N8N.md`).
  - Implementada suite de pruebas unitarias en `lovable/src/test/wazuhService.test.ts` con paso exitoso en Vitest.
  - IPs dinámicas de ataque e indicadores visuales de Kali/Wazuh conectados con el backend (/api/health) y mostrados dinámicamente en el dashboard ofensivo (/offensive).
  - Robustez del flujo de n8n (`attack-executor.json`) mejorada: añadida opción de continuar en caso de fallo en el nodo MongoDB, reemplazo dinámico de variables en el nodo Code JS y encadenamiento seguro del comando de ataque con el de logging de Wazuh.

### 📋 PENDIENTE (en este orden)
- Probar todos los ataques que funcionen
- Comprobar que se reflejan las alertas correspondientes en la parte defensiva
- GitHub cleanup + README final

---

## PRÓXIMO PASO INMEDIATO
Comprobar ejecución real del ataque utilizando n8n y verificar visualización del reporte en PDF.

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
- Dashboard centralizado utiliza endpoints /api/stats, /api/health y /api/wazuh/alerts
- auth-server.js eliminado — toda la auth vive en server.js
- seed-mod00.js eliminado — usar scripts/seed-templates.js
- Login acepta 'identifier' o 'username' para compatibilidad
- command_alt mantenido en LAN-001 (el flujo n8n lo usa)
- express-mongo-sanitize eliminado — incompatible con Express 5
- Register: guardado en MongoDB independiente del envío de correo
- Login: mensajes de error específicos por tipo de fallo

---

## CÓMO USAR ESTE ARCHIVO
- El agente lo lee al inicio de CADA sesión
- Tú lo editas cuando algo cambia de estado (✅/🔄/📋)
- El agente puede proponerte el nuevo texto al finalizar una tarea
- Nunca borra el historial, solo mueve items entre secciones