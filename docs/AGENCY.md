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

---

## Checklist de entrega de cada módulo
- [ ] JSON en attack_templates.json (con comando exacto del TFG)
- [ ] Parámetros dinámicos funcionan en la UI
- [ ] Comando se ejecuta correctamente en Kali vía n8n
- [ ] Logger genera la traza correcta en Kali
- [ ] Regla Wazuh en local_rules.xml con el ID correcto
- [ ] PDF generado al completar el ataque
- [ ] Commit: "feat(MODxx): [nombre módulo] implementado"