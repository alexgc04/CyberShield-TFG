# Ataque MAC Flooding — Módulo 1

## Descripción Técnica

El ataque MAC Flooding constituye una técnica de explotación dirigida contra dispositivos de red de capa 2 (switches Ethernet), cuyo objetivo es degradar su funcionamiento lógico hasta convertirlos en dispositivos de difusión equivalentes a un hub. Este módulo implementa dicho ataque mediante la herramienta `macof`, perteneciente a la suite de auditoría de red *dsniff*, ampliamente reconocida en el ámbito de la seguridad ofensiva.

El fundamento técnico del ataque reside en la explotación de las limitaciones físicas de la tabla CAM (*Content Addressable Memory*) del switch. En condiciones normales de operación, el switch mantiene una asociación dinámica entre las direcciones MAC de origen observadas en cada trama Ethernet y el puerto físico por el que fueron recibidas. Esta tabla permite al switch reenviar las tramas únicamente al puerto de destino correspondiente, optimizando así el ancho de banda de la red y proporcionando un aislamiento básico del tráfico entre puertos.

El ataque MAC Flooding consiste en la inundación masiva de la tabla CAM mediante el envío de un volumen elevado de tramas Ethernet, cada una de las cuales porta una dirección MAC de origen única y generada aleatoriamente. Cuando el número de entradas en la tabla CAM supera la capacidad máxima de almacenamiento del switch —que varía según el modelo y fabricante, oscilando típicamente entre 4.096 y 131.072 entradas—, el dispositivo entra en un estado conocido como *fail-open*. En este estado, el switch es incapaz de resolver la asociación MAC-puerto para las nuevas tramas entrantes y, como mecanismo de contingencia, recurre al reenvío por difusión (*flooding*) de dichas tramas a todos los puertos activos.

Esta degradación del comportamiento del switch tiene implicaciones directas en la confidencialidad de las comunicaciones de red, ya que un atacante posicionado en cualquier puerto del switch puede capturar tráfico que, en condiciones normales, no estaría destinado a su segmento. De este modo, el ataque MAC Flooding habilita la captura pasiva (*sniffing*) de todo el tráfico de la red local, incluyendo credenciales transmitidas en texto plano, sesiones no cifradas y metadatos de comunicación.

Desde la perspectiva del marco de referencia MITRE ATT&CK, esta técnica se clasifica bajo el identificador **T1557 — Adversary-in-the-Middle**, dado que la degradación del switch facilita la interceptación del tráfico de red por parte del adversario, constituyendo una fase preparatoria para ataques de intermediación más sofisticados como el envenenamiento ARP o el secuestro de sesiones.

---

## Comando Ejecutado

El comando empleado para la ejecución del ataque MAC Flooding dentro de la plataforma CyberShield es el siguiente:

```bash
sudo macof -i {{interface}} -d {{target}} -n {{count}}
```

A continuación se detalla la función de cada parámetro configurable:

| Parámetro | Descripción |
|-----------|-------------|
| `-i {{interface}}` | Especifica la interfaz de red de capa 2 a través de la cual se transmitirán las tramas falsificadas. Debe corresponder a una interfaz Ethernet activa en la máquina atacante (por ejemplo, `eth0`). La selección de la interfaz correcta es esencial, ya que las tramas generadas operan exclusivamente en el nivel de enlace de datos del modelo OSI. |
| `-d {{target}}` | Define la dirección IP de destino que se incluirá en las cabeceras de los paquetes generados. Aunque el objetivo real del ataque es el switch de capa 2 y no un host específico, este parámetro permite dirigir las tramas hacia un segmento de red concreto, incrementando la eficacia del ataque en entornos segmentados. |
| `-n {{count}}` | Establece el número total de paquetes falsificados que se enviarán durante la ejecución del ataque. Este parámetro permite controlar la intensidad y duración del ataque, siendo configurable por el usuario a través de la interfaz web de CyberShield. Un valor típico de validación se sitúa en torno a los 5.000 paquetes, suficiente para saturar la tabla CAM de la mayoría de switches de gama baja y media. |

La ejecución del comando requiere privilegios de superusuario (`sudo`), dado que la generación de tramas Ethernet con direcciones MAC arbitrarias exige acceso directo al *raw socket* de la interfaz de red, una operación restringida a nivel de kernel en sistemas GNU/Linux.

---

## Flujo de Ejecución Automatizado

La ejecución del ataque MAC Flooding se encuentra completamente automatizada mediante la orquestación de múltiples componentes de la arquitectura CyberShield. El flujo completo, desde la solicitud del usuario hasta la entrega del informe de resultados, sigue la siguiente secuencia:

1. **Interfaz Web (React + Vite)**: El usuario configura los parámetros del ataque —interfaz de red, dirección IP de destino y número de paquetes— a través del formulario correspondiente en la aplicación web. Al confirmar la ejecución, el frontend envía una petición HTTP `POST` al webhook de n8n con los parámetros seleccionados en formato JSON.

2. **Webhook de n8n**: El workflow de n8n recibe la petición entrante a través de un nodo *Webhook* configurado para aceptar solicitudes POST. Este nodo actúa como punto de entrada del flujo de automatización y extrae los parámetros del cuerpo de la petición.

3. **Consulta a MongoDB (Find Template)**: El workflow ejecuta una consulta a la base de datos MongoDB para recuperar la plantilla de comando asociada al ataque MAC Flooding. Esta aproximación basada en plantillas permite mantener los comandos de ataque centralizados y versionados en la base de datos, facilitando su mantenimiento y actualización sin necesidad de modificar el workflow.

4. **Nodo de Código (Build Command)**: Un nodo de tipo *Code* procesa la plantilla recuperada de MongoDB y sustituye los marcadores de posición (`{{interface}}`, `{{target}}`, `{{count}}`) por los valores concretos proporcionados por el usuario, construyendo así el comando ejecutable final.

5. **Conexión SSH a Kali Linux**: El workflow establece una conexión SSH autenticada con la máquina Kali Linux que actúa como plataforma de ataque. Esta conexión utiliza autenticación basada en credenciales almacenadas de forma segura en las variables de entorno de n8n.

6. **Ejecución de macof**: A través de la sesión SSH establecida, se ejecuta el comando `macof` construido en el paso anterior. La herramienta comienza a generar y transmitir tramas Ethernet con direcciones MAC aleatorias a la velocidad máxima permitida por la interfaz de red.

7. **Post-procesamiento de la salida**: Una vez finalizada la ejecución del comando, el workflow captura la salida estándar y la salida de error del proceso, procesándolas mediante un nodo de código que extrae las métricas relevantes: número de paquetes enviados, duración del ataque e interfaz utilizada.

8. **Generación del informe PDF**: Los resultados procesados se envían al servicio de generación de informes (`report-server.js`), que construye un documento PDF estructurado con los detalles técnicos del ataque, los resultados obtenidos y las recomendaciones de remediación.

9. **Respuesta al frontend**: Finalmente, el workflow responde a la petición HTTP original con los resultados del ataque y la referencia al informe PDF generado, que se presenta al usuario a través de la interfaz web para su descarga y revisión.

---

## Integración Defensiva con Wazuh

Dado que los switches estándar de capa 2 no admiten la instalación interna de agentes de monitorización host, la integración con el SIEM se resolvió mediante la simulación avanzada de eventos Syslog corporativos. El flujo de n8n encadena un segundo nodo de ejecución SSH encargado de escribir una traza estándar en el registro del sistema de la Kali, que cuenta con el agente Wazuh en ejecución activa:

```bash
logger -t CyberShield -p local0.alert "SEC_VIOLATION: MAC Flooding detected on Port 1 - Interface eth0 - 5000 packets sent - CAM Table Overflow confirmed - MITRE:T1557"
```

Esta traza es capturada por el agente Wazuh instalado en la máquina Kali Linux, que monitoriza el fichero `/var/log/syslog`. El agente reenvía el evento al Wazuh Manager, donde se procesa mediante un decoder personalizado (`cybershield`) que extrae los campos relevantes: tipo de ataque, interfaz afectada, número de paquetes y referencia MITRE.

En el Wazuh Manager, se implementó una regla de correlación de eventos personalizada en el fichero `local_rules.xml`, utilizando el identificador exclusivo 100502 para procesar la traza:

```xml
<rule id="100502" level="12">
    <if_sid>100500</if_sid>
    <match>MAC Flooding</match>
    <description>CyberShield: Ataque MAC Flooding detectado - $(attack_type) en $(interface)</description>
    <mitre>
      <id>T1557</id>
    </mitre>
    <group>cybershield,mac_flooding,critical,</group>
</rule>
```

La alerta generada por esta regla aparece automáticamente en el dashboard de Wazuh con nivel de severidad 12 (High), permitiendo al equipo de seguridad visualizar el evento en tiempo real junto con su mapeo MITRE ATT&CK correspondiente.

---

## Resultados de la Validación

La validación de la correcta ejecución del ataque se realizó mediante la captura simultánea del tráfico de red con la herramienta `tcpdump` durante todo el ciclo de vida del ataque. La ejecución de `sudo tcpdump -i eth0` durante el ataque revela dos tipos de tráfico claramente diferenciados:

### 1. Tramas generadas por macof

Se observaron paquetes con direcciones IP de origen y destino completamente aleatorias, generadas de forma pseudoaleatoria por la herramienta `macof`. Entre los ejemplos reales capturados durante la validación se encuentran:

- `101.172.193.90 > 64.30.198.90`
- `236.49.165.109 > 19.197.58.28`
- `254.195.127.117 > 251.130.13.58`

Todos los paquetes presentaban el flag `[tcp]`, correspondiente a segmentos TCP sintéticos sin establecimiento previo de conexión. Estas tramas constituyen el vector de ataque propiamente dicho, ya que cada una porta una dirección MAC de origen única y aleatoria. La inyección masiva de estas direcciones MAC ficticias es la responsable de saturar la tabla CAM del switch, forzando su degradación al modo de difusión.

### 2. Tráfico legítimo SSH

Simultáneamente, se observó un flujo bidireccional entre las direcciones `10.0.2.15:22` y `10.0.2.2:63159`, con los siguientes flags TCP:

- `[P.]` (*Push + ACK*): indica la transmisión activa de datos dentro de la sesión SSH, correspondiente a los comandos enviados por n8n y las respuestas recibidas desde la Kali.
- `[.]` (*ACK*): confirmaciones de recepción dentro del flujo TCP establecido.

Este tráfico corresponde a la sesión SSH que el workflow de n8n utiliza para controlar remotamente la máquina Kali Linux durante la ejecución del ataque. La continuidad de este flujo durante toda la duración del ataque demuestra que las conexiones TCP previamente establecidas no se ven interrumpidas por la inundación de la tabla CAM, al estar sus asociaciones MAC-puerto ya registradas en el switch antes del inicio del ataque.

### Confirmación de la ejecución exitosa

La coexistencia de ambos tipos de tráfico confirma la ejecución exitosa del ataque: `macof` inunda la interfaz de capa 2 con miles de tramas falsificadas mientras las conexiones legítimas preexistentes se mantienen operativas. La observación de los flags `[F.]` (*FIN + ACK*) al final de la captura indica el cierre ordenado de la sesión SSH, señalando la finalización controlada del ataque y la correcta terminación de la conexión de gestión remota.

---

## Remediación

La protección eficaz contra ataques de tipo MAC Flooding requiere la implementación de un conjunto de contramedidas complementarias que abarcan tanto la configuración de los dispositivos de red como el despliegue de sistemas de detección. A continuación se detallan las medidas de remediación recomendadas:

### 1. Port Security en switches gestionados

La contramedida más directa y efectiva consiste en la activación de la funcionalidad *Port Security* en todos los puertos de acceso del switch. Esta característica permite limitar el número máximo de direcciones MAC que un puerto puede aprender dinámicamente. La configuración recomendada establece un máximo de **2 direcciones MAC por puerto**, con una acción de violación configurada en modo **shutdown**, que desactiva automáticamente el puerto ante la detección de una dirección MAC no autorizada:

```
switchport port-security
switchport port-security maximum 2
switchport port-security violation shutdown
switchport port-security aging time 60
```

Esta configuración neutraliza completamente el ataque MAC Flooding, ya que el switch rechazará las tramas con direcciones MAC aleatorias una vez alcanzado el límite establecido, impidiendo la saturación de la tabla CAM.

### 2. Dynamic ARP Inspection (DAI)

La activación de *Dynamic ARP Inspection* proporciona una capa adicional de protección al validar los paquetes ARP contra la tabla de asociaciones DHCP Snooping. Aunque DAI está diseñado primariamente para prevenir ataques de envenenamiento ARP, su implementación complementa la defensa contra MAC Flooding al restringir las asociaciones IP-MAC válidas dentro de la VLAN, dificultando la explotación posterior del estado *fail-open* del switch.

### 3. Monitorización de la capacidad de la tabla CAM

Se recomienda implementar una monitorización proactiva del nivel de ocupación de la tabla CAM mediante el protocolo SNMP (*Simple Network Management Protocol*). La configuración de alertas que se activen cuando la ocupación de la tabla supere un umbral predefinido —típicamente el 80% de su capacidad máxima— permite detectar intentos de saturación antes de que el switch degrade su comportamiento. Esta monitorización puede integrarse con el SIEM corporativo para correlacionar eventos de saturación de tabla CAM con otros indicadores de compromiso.

### 4. Despliegue de NIDS (Suricata) integrado con Wazuh

La implementación de un Sistema de Detección de Intrusiones de Red (*Network Intrusion Detection System*) basado en Suricata, posicionado en un puerto de espejo (*SPAN port*) del switch, permite la detección en tiempo real de patrones de tráfico anómalos asociados al MAC Flooding. Suricata puede configurarse con reglas específicas que detecten la generación masiva de tramas con direcciones MAC aleatorias, generando alertas que se integran directamente con el Wazuh Manager a través del módulo de integración nativa, proporcionando así una visibilidad completa del ataque dentro del ecosistema SIEM.

### 5. Implementación de autenticación de puerto 802.1X

El protocolo IEEE 802.1X proporciona un mecanismo de autenticación a nivel de puerto que exige la validación de credenciales antes de conceder acceso a la red. Mediante la integración con un servidor RADIUS (*Remote Authentication Dial-In User Service*), cada dispositivo que se conecta a un puerto del switch debe autenticarse satisfactoriamente antes de que el puerto se active y permita el tránsito de tramas. Esta medida elimina la posibilidad de que un atacante no autenticado pueda inyectar tramas con direcciones MAC falsificadas, neutralizando el vector de ataque MAC Flooding desde su origen.
