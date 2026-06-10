# CyberShield — Flujos n8n

## Flujo Universal de Ataques (`webhook-universal.json`)

Este flujo orquesta **todos** los ataques de CyberShield desde la web hasta la máquina Kali Linux.

### Arquitectura del Flujo

```
Frontend (Lovable)
    │
    ▼ POST /webhook/ejecutar-ataque
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ Webhook  │───▶│ MongoDB   │───▶│ JS Build │───▶│ SSH Exec  │───▶│ Post-Proc │───▶│ HTTP PDF  │───▶ Respond
│          │    │ (template)│    │ (command) │    │ (Kali)    │    │ (output)  │    │ (report)  │
└──────────┘    └───────────┘    └──────────┘    └───────────┘    └───────────┘    └───────────┘
```

### Nodos

| # | Nodo | Función |
|---|------|---------|
| 1 | **Webhook** | Recibe el POST del frontend con `task_name` y `params` |
| 2 | **MongoDB** | Busca la plantilla del ataque en la colección `attack_templates` |
| 3 | **Code (JS)** | Fusiona los parámetros del usuario con los defaults de la plantilla y construye el comando final |
| 4 | **SSH Execute** | Ejecuta el comando en la máquina Kali Linux vía SSH |
| 5 | **Post-Procesado** | Recoge la salida (stdout/stderr) y calcula la duración |
| 6 | **HTTP Request** | Envía los resultados al `report-server.js` para generar el PDF académico |
| 7 | **Respond Webhook** | Devuelve la respuesta al frontend con el resultado |

### Cómo importar el flujo

1. Abre n8n en tu navegador: `http://localhost:5678`
2. Ve a **Workflows** → **Import from File**
3. Selecciona el archivo `webhook-universal.json`
4. **Configura las credenciales:**
   - **MongoDB**: Crea una credencial de tipo "MongoDB" con tu URI de Atlas
   - **SSH (Kali)**: Crea una credencial de tipo "SSH Password" con `kali` / `kali` y la IP de tu Kali
5. Asigna las credenciales a los nodos **MongoDB** y **Execute a command**
6. **Activa** el workflow con el toggle de arriba a la derecha

### Payload esperado del Frontend

```json
{
  "task_name": "Nmap Host Discovery",
  "params": {
    "target": "192.168.1.0/24",
    "scan_type": "-sS",
    "flags": "-sV -O -F"
  }
}
```

### Colección MongoDB: `attack_templates`

Las plantillas se seedean con `node mongodb/seed_templates.js`. Cada plantilla tiene:

- `name` — Nombre exacto del ataque (debe coincidir con `task_name`)
- `command_base` — Comando con placeholders `{{variable}}`
- `params` — Valores por defecto de cada variable
- `post_attack_notify` — Comando logger para alertar a Wazuh
- `mitre_id` — ID de MITRE ATT&CK
- `severity` — Nivel de severidad (low/medium/high/critical)
