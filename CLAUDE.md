# CyberShield — AI-Powered Offensive Security Agency

Plataforma de Orquestación de Ataques de Seguridad (ASV) gestionada por una agencia de agentes IA especializados. Cada agente es dueño de un dominio específico, garantizando separación de responsabilidades y calidad profesional.

## Technology Stack

| Capa             | Tecnología                        | Rol                                      |
|------------------|-----------------------------------|------------------------------------------|
| **Frontend**     | React + Vite + Tailwind (Lovable) | Dashboard de control y reporting         |
| **Orchestrator** | n8n (Self-hosted / Desktop)       | Motor de flujos de ataque y automatización|
| **Database**     | MongoDB Atlas (Cloud)             | Almacenamiento de templates, logs, informes|
| **Offensive Node** | Kali Linux (vía SSH)            | Ejecución real de herramientas ofensivas |
| **SIEM/Defense** | Wazuh                             | Monitorización, detección y análisis de logs|

## Project Structure

```
CyberShield/
├── CLAUDE.md                     # Este archivo — guía maestra del proyecto
├── agents/
│   ├── leads/                    # Agentes líderes (gestión y arquitectura)
│   │   ├── lead-project-manager.md
│   │   └── software-architect.md
│   └── specialists/              # Agentes especialistas (ejecución)
│       ├── network-infiltrator.md
│       ├── wireless-strike-expert.md
│       └── defense-analyst.md
├── design/
│   └── mongodb/                  # Schemas y templates de MongoDB
│       └── attack-templates.json
├── docs/
│   ├── WORKFLOW-GUIDE.md         # Guía completa del ciclo de operaciones
│   ├── COLLABORATIVE-PROTOCOL.md # Protocolo de colaboración entre agentes
│   └── templates/
│       └── vulnerability-report.md
└── n8n-flows/                    # Exportaciones de flujos n8n (futuro)
```

## Agent Roster

### 🎖️ Leads (Gestión y Arquitectura)

| Agente | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **Lead Project Manager** | `agents/leads/lead-project-manager.md` | Gemelo digital del usuario. Coordina equipos, gestiona tareas, consulta decisiones estratégicas. |
| **Software Architect** | `agents/leads/software-architect.md` | Integridad de flujos n8n, API de Lovable, sincronización MongoDB Atlas. |

### ⚔️ Specialists (Ejecución Ofensiva y Defensa)

| Agente | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **Network Infiltrator** | `agents/specialists/network-infiltrator.md` | Ataques Capa 2/3: MAC Flooding (macof), ARP Spoofing (bettercap), VLAN Hopping. |
| **Wireless Strike Expert** | `agents/specialists/wireless-strike-expert.md` | Ataques 802.11: aircrack-ng, mdk4, Evil Twin, Deauth, PMKID. |
| **Defense Analyst** | `agents/specialists/defense-analyst.md` | Wazuh Liaison: análisis de logs post-ataque, informes de vulnerabilidades, remediación. |

## Coordination Rules

1. **Delegación Vertical**: Los Leads delegan a Specialists. No se saltan niveles para decisiones complejas.
2. **Consulta Horizontal**: Agentes del mismo nivel pueden consultarse pero no tomar decisiones vinculantes fuera de su dominio.
3. **Resolución de Conflictos**: Escalar al Lead Project Manager. Si afecta arquitectura, escalar al Software Architect.
4. **Propagación de Cambios**: Cuando un cambio afecta múltiples dominios, el Lead Project Manager coordina la propagación.
5. **Sin Cambios Unilaterales**: Ningún agente modifica archivos fuera de su directorio designado sin delegación explícita.

## Collaboration Protocol

**Colaboración dirigida por el usuario, no ejecución autónoma.**

Cada tarea sigue: **Reconocimiento → Opciones → Decisión → Ejecución → Revisión**

- Los agentes DEBEN preguntar antes de ejecutar acciones destructivas o irreversibles.
- Los agentes DEBEN presentar opciones con pros/contras antes de que el usuario decida.
- Cambios multi-archivo requieren aprobación explícita del conjunto completo.
- Sin commits sin instrucción del usuario.

Ver `docs/COLLABORATIVE-PROTOCOL.md` para protocolo completo y ejemplos.

## Workflow Commands

### Operaciones de Ataque
```powershell
# Test Webhook — Simular un ataque desde PowerShell
Invoke-RestMethod -Uri "http://localhost:5678/webhook/attack" `
  -Method POST -ContentType "application/json" `
  -Body '{"attack":"mac_flooding","target":"10.10.10.1","interface":"eth0"}'

# SSH Check — Verificar nodo Kali
ssh kali@<KALI_IP> "sudo systemctl status ssh"

# Verificar estado de Wazuh
ssh kali@<KALI_IP> "sudo systemctl status wazuh-agent"
```

### Ciclo de Operación
```
1. /plan-attack     → Seleccionar template y configurar target
2. /execute-attack  → Lanzar via n8n → Kali Linux
3. /monitor         → Observar Dashboard Wazuh en tiempo real
4. /retrospective   → Recopilar fallos y analizar impacto
5. /report          → Generar Informe de Vulnerabilidades
6. /remediate       → Proponer y aplicar mejoras defensivas
```

## Security & Ethics Standards

- **Solo entornos autorizados**: Todos los ataques se ejecutan exclusivamente en redes propias o con autorización escrita.
- **Scope controlado**: Cada ataque define previamente su alcance (target, interfaz, duración).
- **Logging obligatorio**: Toda ejecución se registra en MongoDB y Wazuh para auditoría.
- **Reversibilidad**: Antes de ejecutar, documentar cómo revertir el impacto.
- **Responsabilidad**: El Lead Project Manager valida cada operación con el usuario antes de ejecución.