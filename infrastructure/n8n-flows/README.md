# Importar flujo en n8n

1. Abre n8n en http://localhost:5678
2. Ve a Workflows → Import from File
3. Selecciona: infrastructure/n8n-flows/attack-executor.json
4. Configura las credenciales:
   - "MongoDB Atlas": Connection String de tu .env MONGODB_URI
   - "Kali Linux SSH": Host=SSH_HOST, User=SSH_USER, Pass=SSH_PASS
5. Activa el workflow (toggle ON)
6. Verifica que el webhook escucha en /webhook/attack-execute
