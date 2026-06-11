# MOD10 — Scapy Fuzzing (ICMP/TCP)
ID: SCAPY-004 | MITRE: T1498 | Wazuh Rule: 100509 | Risk: HIGH

## Comando (INMUTABLE)
sudo python3 -c "from scapy.all import *; send(fuzz(IP(dst='{{target}}')/ICMP()),count=100)"

## Parámetros
| name   | type | default | required |
|--------|------|---------|----------|
| target | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Scapy Protocol Fuzzing detected against {{target}} - MITRE:T1498"

## Regla Wazuh (INMUTABLE)
<rule id="100509" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Scapy Protocol Fuzzing</match>
  <description>ALERTA CYBERSHIELD: Inyección de paquetes malformados (Fuzzing) detectada</description>
  <mitre><id>T1498</id></mitre>
</rule>

## Nota crítica
count=100 es OBLIGATORIO. Sin límite puede causar DoS en el objetivo.
No aumentar en el TFG.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 icmp -nn 2>/dev/null | head -10
```