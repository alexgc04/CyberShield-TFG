# MOD13 — Escalada de Privilegios Local
ID: PRIV-001 | MITRE: T1548 | Wazuh Rule: 100512 | Risk: CRITICAL

## Comando (INMUTABLE)
sudo sh -c 'echo "=== SUID ===" && find / -perm -4000 2>/dev/null && echo "=== SUDO ===" && sudo -l 2>/dev/null && echo "=== CRON ===" && cat /etc/crontab 2>/dev/null && ls -la /etc/cron.d/ 2>/dev/null'

## Parámetros
| name   | type | default | required |
|--------|------|---------|----------|
| (ninguno — el comando se ejecuta sin parámetros) |  |  |  |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Local Privilege Escalation enumeration executed - SUID/sudo/cron audit - MITRE:T1548"

## Regla Wazuh (INMUTABLE)
<rule id="100512" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Local Privilege Escalation</match>
  <description>ALERTA CYBERSHIELD: Enumeración de escalada de privilegios local detectada</description>
  <mitre><id>T1548</id></mitre>
</rule>

## Nota crítica
Combina tres vectores: binarios SUID, permisos sudo y tareas cron.
No modifica el sistema, solo enumera posibles vectores de escalada.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
# Verificar que los SUID listados son los esperados
find / -perm -4000 2>/dev/null | wc -l
sudo -l
```
