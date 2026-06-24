# CyberShield Agency — Roles y SOPs

## Roles

### Lead Project Manager 
- Coordina el sprint y verifica el checklist de entrega
- Nunca escribe código directamente
- Activa el SOP antes de cualquier implementación
- Actualiza .claude/session-state/current-sprint.md

### Architect 
- Diseña los cambios en server.js y la estructura MongoDB
- Entrega: JSON para attack_templates + endpoint en server.js

### Infiltrator 
- Implementa el frontend en lovable/src/
- Entrega: componente React con inputs dinámicos del módulo

### Analyst 
- Verifica las reglas Wazuh y la integración defensiva
- Entrega: XML de regla Wazuh + instrucciones de instalación

### QA-Tester
- Diseña casos de prueba detallados y checklists de aseguramiento
- Implementa y ejecuta las pruebas unitarias y de integración en `lovable/src/test/`
- Reporta bugs y valida la estabilidad del frontend y la lógica de negocio

---

## Metodología Spec-Driven Development (SDD)

Para asegurar la calidad y consistencia del proyecto, CyberShield sigue una metodología de Desarrollo Guiado por Especificaciones (Spec-Driven Development o SDD) mediante los comandos `/speckit-*` de GitHub Spec Kit. Esta metodología se coordina entre los diferentes roles de la siguiente manera:

1. **Constitución (`/speckit-constitution`)**:
   - **Responsable:** [Lead Project Manager](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/LEAD-PM.md).
   - **Participantes:** Todo el equipo.
   - **Objetivo:** Establecer las reglas no negociables de arquitectura, diseño de interfaces, seguridad y pruebas que rigen el proyecto en [.specify/memory/constitution.md](file:///c:/Users/Alex%20gc/Desktop/CyberShield/.specify/memory/constitution.md).

2. **Especificación (`/speckit-specify`)**:
   - **Responsable:** [Lead Project Manager](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/LEAD-PM.md) / [Analyst](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ANALYST.md).
   - **Objetivo:** Definir los requisitos funcionales de los ataques y mecanismos de detección a nivel de negocio y casos de uso, de forma agnóstica a la tecnología.

3. **Listas de Control (`/speckit-checklist`)**:
   - **Responsable:** [QA-Tester](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/QA-TESTER.md).
   - **Objetivo:** Validar la calidad y completitud de las especificaciones en base a plantillas de calidad de requisitos (UX, API, Seguridad).

4. **Planificación (`/speckit-plan`)**:
   - **Responsable:** [Architect](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ARCHITECT.md) (Backend/DB) / [Infiltrator](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/INFILTRATOR.md) (UI) / [Analyst](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ANALYST.md) (Wazuh).
   - **Objetivo:** Traducir los requisitos funcionales en un plan técnico detallado (modelos de datos, contratos de interfaz y flujos de red n8n).

5. **Análisis de Consistencia (`/speckit-analyze`)**:
   - **Responsable:** [QA-Tester](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/QA-TESTER.md).
   - **Objetivo:** Verificar la coherencia cruzada entre especificación, plan y dependencias antes del inicio del desarrollo.

6. **Desglose de Tareas (`/speckit-tasks`)**:
   - **Responsable:** [Lead Project Manager](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/LEAD-PM.md) / [Architect](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ARCHITECT.md).
   - **Objetivo:** Generar una lista de tareas estructurada, secuencial y paralelizable (`tasks.md`) con criterios de pruebas unitarias.

7. **Implementación (`/speckit-implement`)**:
   - **Responsables:** [Architect](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ARCHITECT.md) (server.js/MongoDB), [Infiltrator](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/INFILTRATOR.md) (React/Offensive.tsx), [Analyst](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/ANALYST.md) (local_rules.xml).
   - **Objetivo:** Escribir el código y la configuración correspondiente a cada tarea en orden de dependencias.

8. **Convergencia (`/speckit-converge`)**:
   - **Responsable:** [QA-Tester](file:///c:/Users/Alex%20gc/Desktop/CyberShield/docs/agents/QA-TESTER.md).
   - **Objetivo:** Validar que el código final cumple exactamente con la especificación y los criterios de aceptación del plan, inyectando tareas de corrección si se detectan brechas (`missing`, `partial`, `contradicts`, `unrequested`).

---

## SOP (Standard Operating Procedure) — Por cada módulo

**Paso 1 — Architect: MongoDB Template**
Añade la plantilla JSON al infrastructure/mongodb/attack_templates.json
con exactamente estos campos:
{ id, name, module, mitre_id, risk_level, description,
  command, parameters[], logger_command, wazuh_rule_id }

**Paso 2 — Architect: Backend endpoint**
En server.js, el endpoint POST /api/attacks/execute ya existe
y es genérico. Solo necesita leer los parámetros del body
y reemplazar {{variables}} en el comando.

**Paso 3 — Infiltrator: Frontend**
En lovable/src/pages/Offensive.tsx, el componente de módulo
lee la plantilla de MongoDB y renderiza los inputs dinámicamente.
No hay componentes hardcodeados por ataque.

**Paso 4 — Analyst: Wazuh**
Verifica que la regla XML está en infrastructure/wazuh-rules/local_rules.xml
e instruye al usuario cómo copiarla al Manager.

**Paso 5 — QA-Tester: Pruebas Unitarias**
Escribe y ejecuta casos de prueba en `lovable/src/test/` para validar
que el módulo ofensivo responda bien a entradas válidas e inválidas.

---

## Checklist de entrega de cada módulo
- [ ] JSON en attack_templates.json (con comando exacto del TFG)
- [ ] Parámetros dinámicos funcionan en la UI
- [ ] Comando se ejecuta correctamente en Kali vía n8n
- [ ] Logger genera la traza correcta en Kali
- [ ] Regla Wazuh en local_rules.xml con el ID correcto
- [ ] PDF generado al completar el ataque
- [ ] Pruebas unitarias correspondientes aprobadas en `lovable/src/test/`
- [ ] Commit: "[nombre módulo] implementado"

---

## Integración y Orquestación con n8n

El flujo de orquestación de ataques en CyberShield conecta el backend de Node.js, la base de datos MongoDB Atlas y el nodo de ataque Kali Linux usando n8n.

### Arquitectura del Flujo (`attack-executor.json`)

```
Frontend (React) ──▶ server.js (/api/attacks/execute)
                         │
                         ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  n8n Webhook │───▶│   MongoDB    │───▶│   JS Code    │───▶│ SSH Execute  │
│  (Trigger)   │    │  (Templates) │    │  (Command)   │    │ (Kali Linux) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
                                                            ┌──────────────┐
                                                            │  HTTP POST   │──▶ Respond
                                                            │ (PDF Report) │
                                                            └──────────────┘
```

### Detalle de los Nodos del Flujo de n8n

1. **Webhook (Trigger)**: Recibe las peticiones HTTP POST desde `/api/attacks/execute` en el servidor Node.js.
   - Payload esperado:
     ```json
     {
       "attack_id": "LAN-001",
       "parameters": {
         "interface": "eth0",
         "target": "192.168.1.10"
       },
       "company_name": "Empresa de Prueba"
     }
     ```
2. **MongoDB (Read)**: Consulta la plantilla en MongoDB Atlas utilizando la credencial unificada (con el string `MONGODB_URI` del `.env`) haciendo un query por el campo `id` igual a `attack_id`.
3. **JS Code (Build Command)**: Reemplaza las variables encerradas en llaves `{variable}` dentro del comando base con los valores de `parameters` suministrados por el usuario.
4. **SSH Execute (Kali Linux)**: Se conecta por SSH a la máquina Kali (IP de red local, ej: `192.168.1.142`) y ejecuta la cadena de comandos concatenando:
   - El comando ofensivo generado.
   - El comando logger (`logger_command`) de Wazuh para registrar la intrusión en Syslog.
5. **HTTP Request (Generate PDF)**: Realiza un POST a `/api/reports/generate` en Node.js enviando los resultados obtenidos del SSH (exit code y ssh output) para generar el PDF.
6. **Respond to Webhook**: Devuelve el resultado completo con el output del SSH, PDF URL y código de salida al backend de CyberShield para su visualización en la terminal.

### Pasos para Importar el Flujo en n8n sin fallos

1. Inicia n8n localmente (`n8n start` o usando Docker/npm).
2. Abre la interfaz web (habitualmente `http://localhost:5678`).
3. Crea un nuevo flujo de trabajo e importa el archivo [attack-executor.json](file:///c:/Users/Alex%20gc/Desktop/CyberShield/infrastructure/n8n-flows/attack-executor.json) desde la opción *Import from File*.
4. **Configurar Credenciales:**
   - **MongoDB**: Añade una credencial MongoDB usando la cadena de conexión de tu archivo `.env`.
   - **SSH (Kali Linux)**: Añade una credencial de tipo *SSH Key* o *Password* correspondiente al host `192.168.1.142` (o la IP asignada a tu Kali) con su usuario y contraseña (habitualmente `kali`/`kali`).
5. Asigna las credenciales configuradas a los nodos de MongoDB y Execute SSH en el lienzo de n8n.
6. **Activa** el flujo con el botón *Active* en la esquina superior derecha.
