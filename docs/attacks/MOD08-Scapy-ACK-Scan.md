# MOD08 — Scapy ACK Scan
ID: SCAPY-002 | MITRE: T1046 | Wazuh Rule: 100507 | Risk: MEDIUM

## Comando (INMUTABLE)
sudo python3 -c "from scapy.all import *; sr1(IP(dst='{{target}}')/TCP(dport=80,flags='A'))"

## Parámetros
| name   | type | default | required |
|--------|------|---------|----------|
| target | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Scapy ACK Firewall Evasion Scan detected against {{target}} - MITRE:T1046"

## Regla Wazuh (INMUTABLE)
<rule id="100507" level="10">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Scapy ACK</match>
  <description>ALERTA CYBERSHIELD: Escaneo ACK (Evasión de Firewall) detectado</description>
  <mitre><id>T1046</id></mitre>
</rule>

## Nota crítica
Detecta si un puerto está filtrado por firewall stateful.
RST = no filtrado. Sin respuesta = filtrado.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-ack != 0' -nn | head -5
```