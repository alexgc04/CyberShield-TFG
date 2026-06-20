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
- [ ] Commit: "feat(MODxx): [nombre módulo] implementado"

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