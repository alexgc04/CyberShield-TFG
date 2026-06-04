# 🛡️ CyberShield – Instalación de Reglas y Decoders en Wazuh

Guía paso a paso para integrar los decoders y reglas personalizadas de **CyberShield** en tu **Wazuh Manager**.

---

## Requisitos previos

- Acceso **root** (o `sudo`) al servidor donde corre el Wazuh Manager.
- Wazuh Manager versión **4.x** o superior.
- El agente Wazuh del equipo Kali debe estar conectado y reportando.

---

## Paso 1 — Copiar los decoders

Copia el archivo de decoders al directorio de decoders personalizados de Wazuh:

```bash
sudo cp cybershield_decoders.xml /var/ossec/etc/decoders/cybershield_decoders.xml
sudo chown wazuh:wazuh /var/ossec/etc/decoders/cybershield_decoders.xml
sudo chmod 640 /var/ossec/etc/decoders/cybershield_decoders.xml
```

---

## Paso 2 — Copiar las reglas

Copia el archivo de reglas al directorio de reglas personalizadas:

```bash
sudo cp cybershield_rules.xml /var/ossec/etc/rules/cybershield_rules.xml
sudo chown wazuh:wazuh /var/ossec/etc/rules/cybershield_rules.xml
sudo chmod 640 /var/ossec/etc/rules/cybershield_rules.xml
```

---

## Paso 3 — Verificar con `wazuh-logtest`

Antes de reiniciar el servicio, valida que los decoders y reglas funcionan correctamente con la herramienta de pruebas:

```bash
sudo /var/ossec/bin/wazuh-logtest
```

Cuando se abra la consola interactiva, pega la siguiente línea de log de ejemplo y pulsa **Enter**:

```
May 30 10:00:00 kali CyberShield: SEC_VIOLATION: Nmap_Host_Discovery on eth0 target=192.168.1.0/24 - MITRE:T1046
```

**Resultado esperado:**

1. **Fase 1 (Pre-decoding):** El campo `program_name` debe mostrar `CyberShield`.
2. **Fase 2 (Decoding):** El decoder `cybershield-sec-violation` debe activarse y extraer los campos:
   - `attack_type` → `Nmap_Host_Discovery`
   - `interface` → `on`
   - `extra_info` → `eth0 target=192.168.1.0/24`
   - `mitre_id` → `T1046`
3. **Fase 3 (Rules):** Debe dispararse la regla **100501** (level 5) con la descripción de Nmap Host Discovery.

Escribe `quit` para salir de `wazuh-logtest`.

---

## Paso 4 — Reiniciar el Wazuh Manager

Si las pruebas del paso anterior fueron satisfactorias, reinicia el servicio para aplicar los cambios:

```bash
sudo systemctl restart wazuh-manager
```

Verifica que el servicio ha arrancado correctamente:

```bash
sudo systemctl status wazuh-manager
```

Asegúrate de que el estado muestra **active (running)** y que no hay errores en los logs:

```bash
sudo tail -50 /var/ossec/logs/ossec.log | grep -i error
```

---

## Paso 5 — Verificar con un log de prueba desde Kali

Desde la máquina **Kali** (que debe tener el agente Wazuh instalado y conectado), ejecuta el siguiente comando para enviar un evento de prueba al syslog local:

```bash
logger -t CyberShield "SEC_VIOLATION: MAC_Flooding on eth0 flood_packets=50000 src=aa:bb:cc:dd:ee:ff - MITRE:T1557"
```

Espera unos segundos y comprueba en el **dashboard de Wazuh** (Kibana / Wazuh Dashboard) que:

- Aparece una alerta con `rule.id = 100502`.
- El nivel de la alerta es **12**.
- La descripción contiene `CyberShield: MAC Flooding detectado`.
- El campo MITRE muestra la técnica **T1557**.

### Otros comandos de prueba

Puedes probar diferentes ataques cambiando los valores:

```bash
# Evil Twin (regla 100514, nivel 14)
logger -t CyberShield "SEC_VIOLATION: Evil_Twin on wlan0 ssid=FakeNetwork bssid=00:11:22:33:44:55 - MITRE:T1557.002"

# Handshake Capture (regla 100512, nivel 10)
logger -t CyberShield "SEC_VIOLATION: Handshake_Capture on wlan0mon target_bssid=AA:BB:CC:DD:EE:FF - MITRE:T1040"

# Automated Scan (regla 100523, nivel 10)
logger -t CyberShield "SEC_VIOLATION: Automated_Scan on eth0 target=10.0.0.0/8 ports=1-1024 - MITRE:T1046"
```

---

## Solución de problemas

| Problema | Solución |
|---|---|
| `wazuh-logtest` no reconoce el decoder | Verifica que el archivo está en `/var/ossec/etc/decoders/` y tiene permisos `640` con propietario `wazuh:wazuh` |
| La regla no se dispara | Comprueba que no hay conflicto de IDs (100500-100523) con otras reglas personalizadas |
| El agente Kali no envía logs | Revisa la conectividad del agente con `sudo /var/ossec/bin/wazuh-control status` en Kali |
| Error de XML al reiniciar | Ejecuta `sudo /var/ossec/bin/wazuh-logtest` para ver errores de parsing en los XML |

---

## Estructura de archivos

```
wazuh-rules/
├── cybershield_decoders.xml   → /var/ossec/etc/decoders/
├── cybershield_rules.xml      → /var/ossec/etc/rules/
└── INSTALL.md                 → Esta guía
```

---

> **Nota:** Los IDs de regla 100500-100523 están en el rango reservado para reglas personalizadas (≥ 100000). Si ya utilizas ese rango, ajusta los IDs según sea necesario.
