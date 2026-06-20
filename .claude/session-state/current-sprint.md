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
- **Sprint 0: Limpieza y Auth ✅**
  - Eliminado express-mongo-sanitize (incompatible con Express 5)
  - Consolidadas constantes duplicadas (MAX_ATTEMPTS, LOCKOUT_MS, BCRYPT_ROUNDS)
  - Schema userSchema corregido (google_id sin unique, solo sparse)
  - Mock SMTP con [MAIL SIMULADO] en consola
  - Register.tsx: muestra "Revisa tu correo" en vez de redirigir a /login
  - Flujo completo verificado: register → verify-email → login ✅
- **Sprint 0 (correcciones SMTP y mensajes) ✅**
  - Register: User.create separado de sendMail (guardado independiente del email)
  - Register: mensajes específicos — "usuario ya en uso", "email ya registrado"
  - Register: frontend con estado success (panel verde) y manejo de mailFailed
  - Login: mensajes específicos — "No existe cuenta", "Contraseña incorrecta (X intentos)", "Cuenta bloqueada", "Verificar email"
  - Login: errores se limpian al escribir, hint naranja para verificación
  - Ruta /api/auth/dev-verify/:username para desarrollo (404 en production)
  - server.js arranca sin errores con SMTP configurado ✅

### 🔄 EN CURSO
- Configuración de SMTP_PASS con Contraseña de Aplicación de Google (pendiente del usuario)

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
  - Integrado el rol de `QA-Tester` (`docs/agents/QA-TESTER.md`) en la metodología de la agencia.
  - Documentados flujos de n8n en `docs/AGENCY.md` (unificando `N8N.md`).
  - Implementada suite de pruebas unitarias en `lovable/src/test/wazuhService.test.ts` con paso exitoso en Vitest.


### 📋 PENDIENTE (en este orden)
- Importar reglas Wazuh en servidor 10.10.10.49
- Configuración de SMTP_PASS con Contraseña de Aplicación de Google (pendiente del usuario)
- GitHub cleanup + README final

---

## PRÓXIMO PASO INMEDIATO
El usuario debe configurar SMTP_PASS con una Contraseña de Aplicación de Google (16 chars) en .env.
Instrucciones: myaccount.google.com → Seguridad → Contraseñas de aplicaciones.

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