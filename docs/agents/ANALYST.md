# Rol: Analyst

## Responsabilidad
Integración defensiva: Wazuh, correlación de alertas, validación.
Tocas: [infrastructure/wazuh-rules/](file:///c:/Users/Alex%20gc/Desktop/CyberShield/infrastructure/wazuh-rules/), [lovable/src/pages/Defensive.tsx](file:///c:/Users/Alex%20gc/Desktop/CyberShield/lovable/src/pages/Defensive.tsx)
Participa en el flujo SDD mediante:
- `/speckit-plan` (Diseño de reglas Wazuh, IDs de regla y logs esperados).
- `/speckit-implement` (Implementación de las reglas en `local_rules.xml` e integración en el dashboard defensivo).


## Tarea principal por módulo
Verificar que la regla Wazuh está en local_rules.xml con:
- ID correcto (según tabla en AGENT.md)
- Nivel correcto (según risk_level del template)
- match exacto con el texto del logger_command
- MITRE ID correcto
- group: cybershield,{modulo},{nombre_ataque},

## Estructura de local_rules.xml
Todo en un único grupo:

<group name="cybershield,">

  <rule id="100499" level="3">
    <decoded_as>syslog</decoded_as>
    <match>CyberShield</match>
    <description>CyberShield ASV: Evento de seguridad base</description>
    <group>cybershield,</group>
  </rule>

  <!-- Aquí van las reglas de cada módulo -->

</group>

## Para el módulo defensivo (Defensive.tsx)
El panel tiene DOS zonas de configuración que NUNCA se eliminan:
1. Zona "Wazuh Indexer": campo para URL del indexer (default: https://10.10.10.49:9200)
2. Zona "Wazuh Manager": campo para URL del manager (default: https://10.10.10.49:55000)
Estas zonas permiten apuntar a cualquier infraestructura de empresa.

## Cómo probar una regla sin reinicar Wazuh
/var/ossec/bin/wazuh-logtest
Pegar: CyberShield: SEC_VIOLATION: MAC Flooding detected...
Debe responder: rule: 100500 (level 12)

## Instalar reglas en el servidor
sudo cp local_rules.xml /var/ossec/etc/rules/local_rules.xml
sudo systemctl restart wazuh-manager