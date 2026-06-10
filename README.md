# CyberShield-TFG
# Proyecto CyberShield: SIEM Wazuh & Seguridad Defensiva

## Descripción
Este proyecto de **Fin de Grado** consiste en el despliegue de una infraestructura de seguridad basada en **Wazuh** para la monitorización, detección y respuesta ante incidentes en entornos híbridos (Linux/Windows).

## Escenario de Pruebas
* **SIEM:** Wazuh Manager v4.14 (Debian 13).
* **Atacante:** Kali Linux.
* **Víctima:** Windows, Linux...

## Puntos Clave del Proyecto
1. **Infraestructura Wazuh:** Implementación en Proxmox y despliegue de agentes.
2. **Bloque Ofensivo:** Simulación de ataques.
3. **App Cybershield:** App para probar sistemas con distintos ataques comprobando las respuestas con Wazuh.
4. **Documentación:** Manuales técnicos y cumplimiento normativo.

## 🛡️ Ataques Documentados

## Arquitectura de Producción y HTTPS
Para el entorno de desarrollo local (localhost), la plataforma funciona sobre HTTP para agilizar la construcción y las pruebas. Las cookies de autenticación (`cybershield_token`) están configuradas con `secure: false` temporalmente durante el desarrollo para permitir un flujo de sesiones funcional.

Para el despliegue en producción, se documentará y utilizará la siguiente arquitectura:
* **Reverse Proxy:** **Caddy Server** o **Cloudflared**.
* **Certificados SSL:** Autogenerados por Caddy mediante Let's Encrypt o delegados en el túnel de Cloudflare.
* **Seguridad de Cookies:** En producción, las cookies JWT pasarán a modo estricto (`secure: true`, `SameSite: strict`) asegurando el tráfico cifrado de extremo a extremo y evitando ataques Man-in-the-Middle (MitM).
