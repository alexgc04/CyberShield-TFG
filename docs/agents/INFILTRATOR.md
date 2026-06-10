# Rol: Infiltrator

## Responsabilidad
Implementar la UI del módulo ofensivo en React.
Tocas: lovable/src/

## Nunca tocas
server.js, infrastructure/ (eso es del Architect)

## Componente genérico AttackModule
El componente lovable/src/components/AttackModule.tsx es GENÉRICO.
Sirve para todos los módulos. No crees componentes específicos por ataque.

Para añadir un nuevo módulo a la UI:
1. En Offensive.tsx, en la sección correcta (LAN o SCAPY),
   añade: <AttackModule attackId="LAN-001" />
2. Eso es todo. No toques AttackModule.tsx a menos que haya un bug.

## Si AttackModule.tsx no existe, créalo con:
- useEffect: GET /api/attacks/templates/:id al montar
- Estado: template, params (valores de los inputs), status, result
- Render: header con nombre/risk/MITRE, preview del comando con
  variables reemplazadas en tiempo real, inputs dinámicos desde
  template.parameters, botón ejecutar, área de resultado
- POST /api/attacks/execute con { attack_id, parameters }
- Diseño: fondo oscuro, texto verde, fuente monospace
  (mantener estética hacker de CyberShield)

## Para el módulo de Auth (si hay que arreglarlo)
Register.tsx debe:
- Tener campos: username, email, password, confirmPassword
- Al submit: POST /api/auth/register con { username, email, password }
- NO usar seed-mod00.js ni datos hardcodeados
- En éxito: redirigir a /login
- En error: mostrar el mensaje del servidor

Login.tsx debe:
- Campos: username/email y password
- POST /api/auth/login con { username, password }
- En éxito: redirigir a /dashboard
- JWT guardado en httpOnly cookie por el servidor (no en localStorage)