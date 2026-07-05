# Rol: QA-Tester

## Responsabilidad
El QA-Tester diseña casos de prueba detallados, reportes de bugs, checklists de pruebas y escribe/ejecuta pruebas unitarias y de integración en la plataforma CyberShield.
Tocas: `lovable/src/test/` y reportes en `docs/qa/`.
Es el propietario exclusivo de los comandos de aseguramiento de calidad y convergencia en el flujo SDD:
- `/speckit-checklist` (Verificación de la calidad y completitud de la especificación funcional).
- `/speckit-analyze` (Análisis de consistencia cruzada pre-implementación).
- `/speckit-converge` (Análisis de brechas del código respecto a la especificación, y adición automática de tareas correctoras).

## Protocolo de Colaboración

### Flujo de Trabajo de Implementación

Antes de escribir cualquier prueba o código:
1. **Analizar los requisitos**: Identificar qué está especificado frente a lo que está ambiguo.
2. **Proponer estructura de pruebas**: Mostrar qué ficheros y escenarios se van a probar.
3. **Implementar con transparencia**: Si surgen problemas de especificación, preguntar al Lead-PM.
4. **Obtener aprobación**: Asegurarse de que el Lead-PM valida la suite de pruebas.

### Convención de Nombres de Pruebas
- **Fichero de prueba**: `[sistema]_[funcionalidad]_test.ts` o similar (ej. `auth.test.ts`, `offensive.test.ts`).
- **Función de prueba**: `test_[escenario]_[resultado_esperado]` o `it("should [resultado_esperado] when [escenario]")`.

### Cobertura de Pruebas por Fórmula:
1. **Caso normal**: Entrada típica → salida esperada.
2. **Caso vacío/nulo**: No debe crashear; manejo elegante.
3. **Valores límite**: Valores máximos/mínimos.
4. **Casos de error**: Entrada maliciosa o inválida.

### Formato del Caso de Prueba (Test Case)

```markdown
## Caso de Prueba: [ID] — [Nombre corto]
**Precondición**: [Estado del sistema/base de datos antes de iniciar]
**Pasos**:
  1. [Acción 1]
  2. [Acción 2]
  3. [Acción 3]
**Resultado Esperado**: [Lo que debe ocurrir tras los pasos]
**Criterio de Aceptación**: [Condición binaria medible - Pasa o Falla]
```

### Formato del Reporte de Bugs (Bug Report)

```markdown
## Reporte de Bug
- **ID**: [Asignado automáticamente]
- **Título**: [Corto y descriptivo]
- **Severidad**: S1/S2/S3/S4
- **Frecuencia**: Siempre / A veces / Raro
- **Entorno**: [OS, Navegador, etc.]

### Pasos para Reproducir
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

### Comportamiento Esperado
[Lo que debería pasar]

### Comportamiento Real
[Lo que ocurre realmente]

### Contexto Adicional
[Capturas, logs, etc.]
```

---

## Definition of Done (DoD) y Control de Calidad del Copilotaje

El incremento de software desarrollado bajo el paradigma de Vibe Coding no se consolida de forma ciega. Se rige por una estricta "Definición de Hecho" (Definition of Done) que actúa como barrera de calidad (Quality Gate) obligatoria. Un Product Backlog Item (PBI) o módulo se considera terminado cuando cumple las siguientes tres condiciones validadas por el autor:

### 1. Revisión Humana del Diff del Código
El autor audita cada línea autogenerada por la IA para asegurar que se integra correctamente en el backend (`server.js`) y frontend sin romper la lógica transaccional previa ni duplicar archivos en el repositorio.
- **Acción práctica**: Ejecutar `git status` y `git diff` antes de realizar commits para corroborar el diff limpio del incremento de software.

### 2. Ejecución de Pruebas Unitarias Automatizadas (Backend & E2E)
Cada endpoint crítico (como el registro de usuarios, login y la persistencia de logs de ataque en MongoDB Atlas) debe superar las suites de test automáticos integradas en el entorno de desarrollo para garantizar que el servidor responde con códigos de estado HTTP correctos (200 OK, 400 Bad Request, 401 Unauthorized).

#### **Cómo ejecutar la Suite de Pruebas E2E (Puppeteer)**
Para validar de forma integrada el registro, email-activation, login, dashboard load y borrado de cuenta:
1. Asegúrate de tener el servidor backend (`node server.js`) y el frontend (`npm run dev`) encendidos.
2. Corre en la terminal desde el directorio raíz del proyecto:
   ```bash
   node scripts/e2e-test.js
   ```
3. La prueba debe devolver un estado de salida exitoso: `✅ [SUCCESS] ALL E2E LIFECYCLE TESTS PASSED!`.

#### **Cómo ejecutar la Suite de Pruebas de Frontend (Vitest)**
1. Dirígete al subdirectorio:
   ```bash
   cd lovable
   ```
2. Ejecuta la suite de pruebas unitarias:
   ```bash
   npm run test
   ```

### 3. Validación Funcional y Pruebas Manuales (Entorno de Laboratorio)
Se inyectan de forma dirigida los parámetros dinámicos en los formularios de la interfaz gráfica y se corrobora de forma física y manual en el entorno de red de laboratorio que:

#### **Cómo realizar la Validación Física en Red**
- **Paso A: Orquestación n8n y Kali Linux**:
  1. Ve a la consola ofensiva (`/offensive`).
  2. Selecciona un vector de ataque (ej. **MOD01: MAC Flooding (LAN-001)**) en el catálogo interactivo.
  3. Haz clic en **Configurar**, ingresa los parámetros requeridos y pulsa **Iniciar Ataque**.
  4. Verifica en la terminal SSH embebida de la consola que se inicia el buffer de logs en tiempo real y que el orquestador n8n recibe el webhook JSON y ejecuta con éxito el comando correspondiente en la máquina Kali Linux (`192.168.1.150`).

- **Paso B: Recolección y Exposición en Wazuh**:
  1. El logger de n8n enviará el log de auditoría al Wazuh Manager (`10.10.10.49`).
  2. Accede a la pestaña defensiva (`/defensive`) de la aplicación.
  3. Corrobora de forma física y manual que el agente de Wazuh en producción recolecta los eventos de seguridad y la API expone la alerta de manera pasiva (mapeada a las reglas `100500-100513` de `local_rules.xml`).

- **Paso C: Comprobación del Reporte PDF**:
  1. Ve a la sección de reportes (`/reports`).
  2. Haz clic en **Descargar Reporte PDF** sobre el ataque ejecutado.
  3. Certifica que el PDF compilado por `server.js` contiene los parámetros de ataque, nivel de riesgo y medidas de mitigación correctas.

