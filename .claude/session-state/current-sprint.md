# Estado del Sprint — CyberShield TFGÚltima actualización: 2026-07-04
Agente que actualizó: Antigravity (Claude 3.5 Sonnet)

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
- Rediseño visual de "Wazuh Security Modules" en `Defensive.tsx` completado ✅ (Layout idéntico al Wazuh Overview oficial, etiquetas flotantes superiores y módulo CyberShield resaltado en verde con conteo de reglas).
- Terminal SSH interactiva real conectada con Kali Linux en `Offensive.tsx` y `server.js` (`POST /api/ssh/execute`) completada ✅ (Permite ejecutar cualquier comando de red/sistema en Kali, y canaliza los outputs y logs de las tarjetas de ataque en tiempo real al buffer de la consola).
- Motor de informes PDF premium y oscuro reescrito en `server.js` (`POST /api/reports/generate`) completado ✅ (Corrige la extracción de datos de n8n, elminando emojis que corrompen el renderizado, optimiza espacio para evitar páginas vacías y escala las medidas correctivas según el nivel de riesgo).
- **Fase de Validación de Ataques y Correlación (Sprint 1 & 2) ✅**:
  - [x] Conectar Wazuh Agent en Kali con Wazuh Manager en Debian (Registro manual via key import)
  - [x] Validar la ejecución y correlación en tiempo real de los 15 módulos del TFG
  - [x] Comprobar que todas las alertas correspondientes se reflejan automáticamente en el Dashboard Defensivo
  - [x] Verificar la descarga del PDF de reporte técnico generado en la sección /reports
- **Integración de Fondos WebGL Interactivos (React Bits) ✅**:
  - [x] Fondo ColorBends (Verde y Negro) en Dashboard y sección Sobre el Proyecto
  - [x] Fondo Radar (Rojo) en consola ofensiva y sección Ataques
  - [x] Fondo RippleGrid (Azul) en consola defensiva y sección Detección
  - [x] Fondo Threads (Morado) en reportes y sección Arquitectura
  - [x] Eliminado z-index conflictivo e implementadas transiciones de difuminado vertical entre secciones
- **Limpieza de Repositorio y README Profesional ✅**:
  - [x] Eliminar script redundante duplicado scripts/seed-templates.js
  - [x] Crear README.md profesional de presentación corporativa en la raíz
  - [x] Actualizar documentación de sprint

### 🔄 EN CURSO
- Ninguno (Sprint Finalizado exitosamente)

### 📋 PENDIENTE (en este orden)
- Ninguno

---

## PRÓXIMO PASO INMEDIATO
- Presentación y entrega final al usuario del TFG completado al 100%.

---O PASO INMEDIATO
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