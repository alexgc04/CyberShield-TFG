# MOD09 — Scapy ARP Scan
ID: SCAPY-003 | MITRE: T1018 | Wazuh Rule: 100508 | Risk: LOW

## Comando (INMUTABLE)
sudo python3 -c "from scapy.all import *; arping('{{target_subnet}}')"

## Parámetros
| name          | type | default       | required |
|---------------|------|---------------|----------|
| target_subnet | text | 192.168.1.0/24| true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Scapy ARP Discovery Scan detected on subnet {{target_subnet}} - MITRE:T1018"

## Regla Wazuh (INMUTABLE)
<rule id="100508" level="8">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Scapy ARP</match>
  <description>ALERTA CYBERSHIELD: Escaneo de descubrimiento ARP en red local detectado</description>
  <mitre><id>T1018</id></mitre>
</rule>

## Nota crítica
Solo funciona en misma subred Capa 2. No es enrutable.
Parámetro es subred CIDR, no IP individual.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 arp -nn 2>/dev/null | head -10
```