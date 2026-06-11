# MOD07 — Scapy SYN Scan
ID: SCAPY-001 | MITRE: T1046 | Wazuh Rule: 100506 | Risk: MEDIUM

## Comando (INMUTABLE)
sudo python3 -c "from scapy.all import *; sr1(IP(dst='{{target}}')/TCP(dport=80,flags='S'))"

## Parámetros
| name   | type | default | required |
|--------|------|---------|----------|
| target | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Scapy SYN Stealth Scan detected against {{target}} - MITRE:T1046"

## Regla Wazuh (INMUTABLE)
<rule id="100506" level="10">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Scapy SYN</match>
  <description>ALERTA CYBERSHIELD: Escaneo de red sigiloso (Half-Open Scan) detectado</description>
  <mitre><id>T1046</id></mitre>
</rule>

## Nota crítica
Siempre prefijo sudo. Scapy requiere privilegios para forjar paquetes TCP.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0' -nn | head -5
```