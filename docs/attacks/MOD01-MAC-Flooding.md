# MOD01: MAC Flooding

## Teoría
La tabla CAM del switch asocia MACs con puertos. Si se satura con MACs falsas, el switch retransmite por todas las interfaces (modo hub), exponiendo el tráfico de red.

> **Problema crítico:** tun0 filtra tramas Capa 2. Usar siempre eth0.

## Plantilla JSON (MongoDB)

```json
[
  {
    "id": "LAN-001",
    "name": "MAC Flooding",
    "module": "LAN",
    "mitre_id": "T1557",
    "risk_level": "HIGH",
    "wazuh_rule_id": 100500,
    "description": "Satura la tabla CAM del switch enviando MACs falsas para forzar modo hub y exponer el tráfico de red completo del segmento.",
    "command": "sudo macof -i {{interface}} -n {{count}}",
    "command_alt": "sudo macof -i {{interface}} -d {{target_ip}}",
    "parameters": [
      {
        "name": "interface",
        "label": "Interfaz de red",
        "type": "text",
        "default": "eth0",
        "required": true,
        "placeholder": "eth0",
        "hint": "Usar eth0 (bridge Proxmox Capa 2). No usar tun0."
      },
      {
        "name": "count",
        "label": "Número de tramas",
        "type": "number",
        "default": 5000,
        "required": true,
        "placeholder": "5000"
      },
      {
        "name": "target_ip",
        "label": "IP destino (opcional)",
        "type": "text",
        "default": "",
        "required": false,
        "placeholder": "192.168.1.1",
        "hint": "Dejar vacío para inundación genérica"
      }
    ],
    "logger_command": "logger -t CyberShield -p local0.alert \"SEC_VIOLATION: MAC Flooding detected on Port 1 - Interface {{interface}} - {{count}} packets sent - CAM Table Overflow confirmed - MITRE:T1557\""
  }
]
```
