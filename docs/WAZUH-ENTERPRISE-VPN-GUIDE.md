# 🔐 CyberShield — Guía de Conexión a Wazuh Empresarial vía VPN

> **Objetivo:** Conectar CyberShield (Kali + n8n) a un Wazuh Manager desplegado en la
> red interna de una empresa, accediendo a través de su VPN corporativa.
>
> **Escenario TFG:** Auditoría de seguridad autorizada sobre infraestructura real.

---

## 1. Arquitectura Completa

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TU ENTORNO (Local / VirtualBox)                                             │
│                                                                              │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐                  │
│  │  Lovable   │───▶│    n8n     │───▶│   Kali Linux       │                  │
│  │ Dashboard  │    │ Orquestador│    │   (VirtualBox)     │                  │
│  │ :5173      │    │ :5678      │    │   SSH :2222        │                  │
│  └────────────┘    └────────────┘    │                    │                  │
│                                      │ ┌────────────────┐ │                  │
│                                      │ │ Wazuh Agent    │ │                  │
│                                      │ │ (instalado)    │ │                  │
│                                      │ └───────┬────────┘ │                  │
│                                      │         │          │                  │
│                                      │    ┌────┴─────┐    │                  │
│                                      │    │ tun0/tap0│    │                  │
│                                      │    │ VPN      │    │                  │
│                                      │    └────┬─────┘    │                  │
│                                      └─────────┼──────────┘                  │
└─────────────────────────────────────────────────┼────────────────────────────┘
                                                  │
                                         VPN Tunnel (cifrado)
                                         OpenVPN / WireGuard / IPSec
                                                  │
┌─────────────────────────────────────────────────┼────────────────────────────┐
│  RED CORPORATIVA DE LA EMPRESA                  │                            │
│                                                  │                            │
│                                      ┌───────────▼───────────┐               │
│                                      │   VPN Gateway         │               │
│                                      │   (Firewall/Router)   │               │
│                                      └───────────┬───────────┘               │
│                                                  │                            │
│  ════════════════════════════════════════════════╪════════════════════════    │
│                    RED INTERNA (ej: 192.168.1.0/24)                          │
│                                                  │                            │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   │   ┌────────────────────┐   │
│  │ PC-01    │    │ PC-02    │    │ Server   │   │   │  WAZUH MANAGER     │   │
│  │ Wazuh Ag.│    │ Wazuh Ag.│    │ Wazuh Ag.│   │   │  192.168.1.50      │   │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘   │   │  Puerto: 1514     │   │
│       │               │               │         │   │  API: 55000       │   │
│       └───────────────┴───────────────┴─────────┘   │  Dashboard: 443   │   │
│                       │                              └────────────────────┘   │
│                       │          Todos reportan al Manager ──────────────────▶│
│                       │                                                      │
│              ┌────────┴────────┐                                             │
│              │  SWITCH CAPA 2  │                                             │
│              │  (target ataque)│                                             │
│              └─────────────────┘                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Requisitos Previos — Lo que la empresa debe proporcionarte

Antes de conectarte, necesitas que el responsable IT de la empresa te entregue:

| # | Requisito | Para qué lo necesitas | Ejemplo |
|---|-----------|----------------------|---------|
| 1 | **Archivo de configuración VPN** | Conectar Kali a la red corporativa | `empresa.ovpn` o config WireGuard |
| 2 | **Credenciales VPN** | Autenticación | usuario/password o certificado `.p12` |
| 3 | **IP del Wazuh Manager** | Registrar el Kali como agente | `192.168.1.50` |
| 4 | **Clave de registro Wazuh** | Autenticar el agente nuevo | Proporcionada por Wazuh Manager |
| 5 | **Rango de red autorizado** | Saber qué IPs puedes auditar | `192.168.1.0/24` |
| 6 | **Autorización escrita** | Cobertura legal para el pentesting | Carta firmada |

> ⚠️ **IMPORTANTE PARA EL TFG:** Debes tener **autorización escrita** antes de cualquier ataque. Sin ella, incluso en un entorno de pruebas, es ilegal. Incluye esta autorización como anexo del TFG.

---

## 3. Paso a Paso: Conexión VPN desde Kali

### 3.1 Opción A: OpenVPN (más común en empresas)

```bash
# 1. Copiar el archivo .ovpn a Kali
# (desde tu host Windows, vía SCP o carpeta compartida)
scp empresa.ovpn kali@<IP_KALI>:/home/kali/vpn/

# 2. Instalar OpenVPN si no está
sudo apt-get update && sudo apt-get install openvpn -y

# 3. Conectar a la VPN
sudo openvpn --config /home/kali/vpn/empresa.ovpn

# Si requiere usuario/contraseña, crear archivo de auth:
echo -e "usuario\npassword" > /home/kali/vpn/auth.txt
chmod 600 /home/kali/vpn/auth.txt
sudo openvpn --config /home/kali/vpn/empresa.ovpn --auth-user-pass /home/kali/vpn/auth.txt

# 4. Verificar conexión — debería crear interfaz tun0 o tap0
ip addr show tun0
# Debe mostrar una IP del rango de la empresa (ej: 192.168.1.200)

# 5. Verificar conectividad con la red interna
ping -c 3 192.168.1.1    # Gateway de la empresa
ping -c 3 192.168.1.50   # Wazuh Manager
```

### 3.2 Opción B: WireGuard (más moderno)

```bash
# 1. Instalar WireGuard
sudo apt-get install wireguard -y

# 2. Copiar la configuración proporcionada
sudo cp empresa.conf /etc/wireguard/wg-empresa.conf

# 3. Levantar la interfaz
sudo wg-quick up wg-empresa

# 4. Verificar
sudo wg show
ip addr show wg-empresa
ping -c 3 192.168.1.50
```

### 3.3 Verificar conectividad completa

```bash
# === TEST DE CONECTIVIDAD ===

# 1. ¿Tienes IP en la red corporativa?
ip addr show tun0    # OpenVPN
ip addr show wg0     # WireGuard

# 2. ¿Llegas al gateway?
ping -c 3 <GATEWAY_EMPRESA>

# 3. ¿Llegas al Wazuh Manager?
ping -c 3 <IP_WAZUH_MANAGER>

# 4. ¿El puerto 1514 del Wazuh Manager está abierto? (registro de agentes)
nc -zv <IP_WAZUH_MANAGER> 1514

# 5. ¿El Dashboard de Wazuh está accesible?
curl -k https://<IP_WAZUH_MANAGER>:443 --head

# 6. ¿La API de Wazuh responde?
curl -k -X GET "https://<IP_WAZUH_MANAGER>:55000/" -u "wazuh-wui:wazuh-wui"
```

---

## 4. Instalar y Registrar Wazuh Agent en Kali

### 4.1 Instalar el agente

```bash
# Importar clave GPG de Wazuh
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring \
  --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && \
  chmod 644 /usr/share/keyrings/wazuh.gpg

# Añadir repositorio
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" \
  | sudo tee /etc/apt/sources.list.d/wazuh.list

# Instalar (apuntando al Manager de la empresa)
sudo apt-get update
sudo WAZUH_MANAGER="<IP_WAZUH_MANAGER>" apt-get install wazuh-agent -y

# Ejemplo con IP real:
# sudo WAZUH_MANAGER="192.168.1.50" apt-get install wazuh-agent -y
```

### 4.2 Configurar el agente

```bash
# Editar configuración del agente
sudo nano /var/ossec/etc/ossec.conf
```

Verificar que el bloque `<server>` apunta al Manager de la empresa:

```xml
<ossec_config>
  <client>
    <server>
      <address>192.168.1.50</address>  <!-- IP del Wazuh Manager de la empresa -->
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
  </client>

  <!-- Monitorizar syslog para capturar eventos del logger -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <!-- Monitorizar auth.log para eventos SSH -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>
</ossec_config>
```

### 4.3 Registrar el agente en el Manager

Hay dos formas de registrar el agente:

#### Método 1: Registro automático (enrollment)

```bash
# Si el Manager tiene enrollment habilitado (puerto 1515)
sudo systemctl daemon-reload
sudo systemctl enable wazuh-agent
sudo systemctl start wazuh-agent

# El agente se registra automáticamente
# Verificar en el log:
sudo tail -f /var/ossec/logs/ossec.log
# Buscar: "Connected to the server"
```

#### Método 2: Registro manual vía API

```bash
# Desde cualquier máquina con acceso a la API del Manager:

# 1. Obtener token de autenticación
TOKEN=$(curl -u "wazuh-wui:wazuh-wui" -k -s \
  "https://192.168.1.50:55000/security/user/authenticate" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 2. Registrar el nuevo agente
curl -k -X POST "https://192.168.1.50:55000/agents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "kali-cybershield", "ip": "any"}'

# 3. Anotar el ID y la KEY que devuelve
# Respuesta ejemplo:
# {"data": {"id": "003", "key": "MDAzIGthbGktY3liZXJzaGllbGQgYW55IGY5..."}}

# 4. Importar la clave en el agente (en Kali)
sudo /var/ossec/bin/manage_agents -i "<KEY_DEL_PASO_3>"

# 5. Reiniciar el agente
sudo systemctl restart wazuh-agent
```

### 4.4 Verificar que el agente está conectado

```bash
# En Kali (agente):
sudo /var/ossec/bin/wazuh-control status
# Debe mostrar: wazuh-agentd is running...

sudo cat /var/ossec/logs/ossec.log | grep -i "connected"
# Debe mostrar: Connected to the server (192.168.1.50:1514/tcp)

# Desde la API del Manager (o Dashboard):
curl -k -X GET "https://192.168.1.50:55000/agents?name=kali-cybershield" \
  -H "Authorization: Bearer $TOKEN"
# status debe ser "active"
```

---

## 5. Desplegar Decoders y Rules de CyberShield en el Manager

> **⚠️ ESTO SE HACE EN EL WAZUH MANAGER, NO EN KALI.**
> Necesitas acceso SSH o via Dashboard al servidor del Manager.

### 5.1 Crear el decoder personalizado

```bash
# Conectar al Wazuh Manager vía SSH (o pedir al admin de la empresa que lo haga)
ssh admin@192.168.1.50

# Crear archivo de decoder
sudo tee /var/ossec/etc/decoders/cybershield_decoders.xml << 'EOF'
<!-- ============================================= -->
<!-- CyberShield Custom Decoders                   -->
<!-- Proyecto TFG - Detección de ataques de red    -->
<!-- ============================================= -->

<!-- Decoder padre: identifica logs del tag "CyberShield" -->
<decoder name="cybershield">
  <program_name>CyberShield</program_name>
</decoder>

<!-- Decoder hijo: extrae campos de SEC_VIOLATION -->
<decoder name="cybershield-sec-violation">
  <parent>cybershield</parent>
  <regex>SEC_VIOLATION: (\S+ \S+) detected on (\S+ \d+) - Interface (\S+) - (\d+) packets sent - (.+) - MITRE:(\S+)</regex>
  <order>attack_type, port_info, interface, packet_count, status, mitre_id</order>
</decoder>

<!-- Decoder alternativo sin campo MITRE (compatibilidad) -->
<decoder name="cybershield-sec-violation-simple">
  <parent>cybershield</parent>
  <regex>SEC_VIOLATION: (\S+ \S+) detected on (\S+ \d+) - Interface (\S+) - (\d+) packets sent</regex>
  <order>attack_type, port_info, interface, packet_count</order>
</decoder>
EOF
```

### 5.2 Crear las reglas personalizadas

```bash
sudo tee /var/ossec/etc/rules/cybershield_rules.xml << 'EOF'
<!-- ============================================= -->
<!-- CyberShield Custom Rules                      -->
<!-- Proyecto TFG - Detección de ataques de red    -->
<!-- ============================================= -->

<group name="cybershield,attack,">

  <!-- Regla base: cualquier evento SEC_VIOLATION de CyberShield -->
  <rule id="100100" level="10">
    <decoded_as>cybershield</decoded_as>
    <match>SEC_VIOLATION</match>
    <description>CyberShield: Security violation detected - $(attack_type)</description>
    <options>no_full_log</options>
    <group>cybershield,network_attack,</group>
  </rule>

  <!-- MAC Flooding específico — Nivel 14 (crítico) -->
  <rule id="100101" level="14">
    <if_sid>100100</if_sid>
    <match>MAC Flooding</match>
    <description>CyberShield CRITICAL: MAC Flooding Attack - CAM Table Overflow on $(interface) - $(packet_count) packets sent via $(port_info)</description>
    <mitre>
      <id>T1557</id>
    </mitre>
    <group>cybershield,mac_flooding,critical,</group>
  </rule>

  <!-- ARP Spoofing — para futuros módulos -->
  <rule id="100102" level="13">
    <if_sid>100100</if_sid>
    <match>ARP Spoofing</match>
    <description>CyberShield HIGH: ARP Spoofing Attack detected on $(interface)</description>
    <mitre>
      <id>T1557.002</id>
    </mitre>
    <group>cybershield,arp_spoofing,high,</group>
  </rule>

  <!-- VLAN Hopping — para futuros módulos -->
  <rule id="100103" level="13">
    <if_sid>100100</if_sid>
    <match>VLAN Hopping</match>
    <description>CyberShield HIGH: VLAN Hopping Attack detected on $(interface)</description>
    <mitre>
      <id>T1599.001</id>
    </mitre>
    <group>cybershield,vlan_hopping,high,</group>
  </rule>

  <!-- Alerta de frecuencia: múltiples ataques en poco tiempo -->
  <rule id="100110" level="15" frequency="3" timeframe="300">
    <if_matched_group>cybershield</if_matched_group>
    <description>CyberShield ALERT: Multiple attack events detected in 5 minutes - Possible active penetration test</description>
    <group>cybershield,multiple_attacks,critical,</group>
  </rule>

</group>
EOF
```

### 5.3 Validar y aplicar

```bash
# 1. Testear que los decoders y rules son válidos
sudo /var/ossec/bin/wazuh-logtest

# Pegar esta línea de test:
# May 14 09:00:00 kali CyberShield: SEC_VIOLATION: MAC Flooding detected on Port 1 - Interface eth0 - 5000 packets sent - CAM Table Overflow confirmed - MITRE:T1557

# Resultado esperado:
# **Phase 1: Completed pre-decoding.
# **Phase 2: Completed decoding.
#    name: 'cybershield-sec-violation'
#    attack_type: 'MAC Flooding'
#    interface: 'eth0'
#    packet_count: '5000'
# **Phase 3: Completed filtering (rules).
#    id: '100101'
#    level: '14'
#    description: 'CyberShield CRITICAL: MAC Flooding Attack...'

# 2. Si todo OK, reiniciar el Manager
sudo systemctl restart wazuh-manager

# 3. Verificar que las reglas se cargaron
sudo cat /var/ossec/logs/ossec.log | grep -i "rule 100101"
```

---

## 6. Flujo Completo de Ataque + Detección

### El pipeline end-to-end:

```
Tu PC (Windows)                    Kali (VirtualBox)              Red Empresa (VPN)
─────────────                      ─────────────────              ─────────────────
                                                                  
[Lovable Dashboard]                                               
     │ Click "Ejecutar"                                           
     ▼                                                            
[n8n Webhook]                                                     
     │ POST /webhook/attack                                       
     ▼                                                            
[n8n SSH Node #1]  ──SSH:2222──▶  [macof -i eth0 -n 5000]        
     │                                 │                          
     │                                 ├── Tramas L2 ──▶ Switch ──▶ CAM Overflow
     │                                 │                          
     ▼                                 │                          
[n8n SSH Node #2]  ──SSH:2222──▶  [logger → syslog]              
     │                                 │                          
     │                                 ▼                          
     │                            [Wazuh Agent]                   
     │                                 │ (lee /var/log/syslog)    
     │                                 │                          
     │                                 │───VPN Tunnel───▶ [Wazuh Manager]
     │                                                        │
     │                                                   Rule 100101
     │                                                   Level 14
     │                                                        │
     ▼                                                        ▼
[n8n MongoDB Node]                                    [Dashboard Wazuh]
     │ Guardar log                                    Alerta visible!
     ▼                                                        │
[Lovable Dashboard]                                           │
     │ Mostrar resultado    ◀──── API Wazuh (opcional) ───────┘
     ▼
"Ataque completado + Alerta generada en Wazuh"
```

### Comando final para disparar todo:

```bash
# === COMANDO COMPLETO: ATAQUE + NOTIFICACIÓN WAZUH ===
# Ejecutar en Kali (o via n8n SSH)

# Paso 1: Ataque
sudo macof -i eth0 -n 5000

# Paso 2: Notificar a Wazuh (el agente lo recoge de syslog)
logger -t CyberShield -p local0.alert \
  "SEC_VIOLATION: MAC Flooding detected on Port 1 - Interface eth0 - 5000 packets sent - CAM Table Overflow confirmed - MITRE:T1557"

# Paso 3: Verificar que llegó (esperar ~10 seg para que el agente envíe)
sleep 10
sudo tail -20 /var/ossec/logs/ossec.log | grep -i "cybershield"
```

---

## 7. Verificación en el Dashboard de Wazuh

### 7.1 Acceder al Dashboard

```
URL: https://<IP_WAZUH_MANAGER>:443
User: wazuh-wui (o el que te proporcione la empresa)
Pass: (proporcionada por la empresa)
```

### 7.2 Buscar la alerta

1. Ir a **Security Events** (menú lateral)
2. En el buscador, filtrar por:
   ```
   rule.groups: "cybershield"
   ```
   o
   ```
   rule.id: "100101"
   ```
3. Debería aparecer la alerta con:
   - **Rule ID:** 100101
   - **Level:** 14
   - **Description:** CyberShield CRITICAL: MAC Flooding Attack...
   - **MITRE:** T1557
   - **Agent:** kali-cybershield

### 7.3 Screenshot para el TFG

Capturar pantalla del Dashboard mostrando:
- ✅ La alerta con nivel 14 (barra roja)
- ✅ El agente `kali-cybershield` como origen
- ✅ El mapeo MITRE ATT&CK T1557
- ✅ El timestamp coincidiendo con la ejecución del ataque

---

## 8. Troubleshooting

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| `ping` al Manager falla | VPN no conectada o firewall | Verificar `ip route`, revisar reglas del firewall empresa |
| Agent no conecta (port 1514) | Puerto bloqueado | Pedir al admin que abra TCP 1514 para tu IP VPN |
| Agent registrado pero no activo | Clave incorrecta | Re-importar clave con `manage_agents -i` |
| Logger no genera alerta | Decoder no cargado | Ejecutar `wazuh-logtest` en el Manager y verificar |
| Dashboard no muestra alertas | Delay de indexación | Esperar 30s, refrescar, verificar Elasticsearch |
| `tun0` no llega a red interna | Routing VPN | `ip route show` — verificar que rango empresa va por tun0 |

---

## 9. Consideraciones de Seguridad para el TFG

> **⚠️ Checklist legal obligatorio:**

- [ ] Autorización escrita del responsable de la empresa
- [ ] Alcance definido: solo IPs autorizadas
- [ ] Ventana temporal acordada para los ataques
- [ ] Contacto de emergencia del equipo IT de la empresa
- [ ] Acuerdo de confidencialidad (NDA) firmado
- [ ] Plan de reversión documentado
- [ ] Seguro de responsabilidad civil (recomendado)

**Incluir en el TFG como Anexo:** Copia de la autorización firmada y el alcance del pentesting.

---

## 10. Resumen de IPs y Puertos

| Servicio | IP | Puerto | Protocolo | Dirección |
|----------|-----|--------|-----------|-----------|
| VPN Gateway | Proporcionada | 1194 (OpenVPN) / 51820 (WG) | UDP | Kali → Empresa |
| Wazuh Manager (registro) | 192.168.1.50* | 1514 | TCP | Agent → Manager |
| Wazuh Manager (enrollment) | 192.168.1.50* | 1515 | TCP | Agent → Manager |
| Wazuh API | 192.168.1.50* | 55000 | HTTPS | API queries |
| Wazuh Dashboard | 192.168.1.50* | 443 | HTTPS | Browser |
| n8n | localhost | 5678 | HTTP | Local |
| Kali SSH | localhost | 2222 | TCP | n8n → Kali |

*Sustituir por la IP real del Wazuh Manager de la empresa.
