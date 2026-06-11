# MOD03 — SPAN / Port Mirror
ID: LAN-003 | MITRE: T1040 | Wazuh Rule: 100502 | Risk: HIGH

## Comando (INMUTABLE)
sudo tcpdump -i {{interface}} -c 200 -w /tmp/cs_mirror.pcap

## Parámetros
| name      | type | default | required |
|-----------|------|---------|----------|
| interface | text | eth0    | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: SPAN/Port Mirror capture on Interface {{interface}} - MITRE:T1040"

## Regla Wazuh (INMUTABLE)
<rule id="100502" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: SPAN/Port Mirror</match>
  <description>ALERTA CYBERSHIELD: Captura de tráfico de red no autorizada detectada</description>
  <mitre><id>T1040</id></mitre>
</rule>

## Nota crítica
Limitar siempre con -c 200. Sin límite puede llenar el disco de Kali.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
ls -lh /tmp/cs_mirror.pcap
sudo tcpdump -r /tmp/cs_mirror.pcap 2>/dev/null | wc -l
```