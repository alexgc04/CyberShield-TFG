# MOD04 — Túneles / Canales Encubiertos
ID: LAN-004 | MITRE: T1048 | Wazuh Rule: 100503 | Risk: HIGH

## Comando (INMUTABLE)
sudo nping --icmp --data-string 'exfiltration_test' {{target}}

## Parámetros
| name   | type | default | required |
|--------|------|---------|----------|
| target | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Covert Channel ICMP Tunnel detected targeting {{target}} - MITRE:T1048"

## Regla Wazuh (INMUTABLE)
<rule id="100503" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Covert Channel</match>
  <description>ALERTA CYBERSHIELD: Intento de canal encubierto y exfiltración de datos detectado</description>
  <mitre><id>T1048</id></mitre>
</rule>

## Nota crítica
No requiere servidor externo escuchando. Simula exfiltración
inyectando firma en paquetes ICMP.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 icmp -nn 2>/dev/null | head -10
```