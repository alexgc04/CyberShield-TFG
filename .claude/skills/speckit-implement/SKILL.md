---
name: "speckit-implement"
description: "Ejecuta el plan de implementación procesando y completando todas las tareas definidas en tasks.md"
argument-hint: "Guía opcional de implementación o filtro de tareas"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/implement.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la implementación)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_implement`.
- Si el YAML no se puede analizar o no es válido, omite la comprobación de hooks silenciosamente y continúa normalmente.
- Filtra los hooks donde `enabled` sea explícitamente `false`. Trata los hooks sin campo `enabled` como habilitados por defecto.
- Para cada hook restante, **no** intentes interpretar o evaluar las expresiones `condition` del hook:
  - Si el hook no tiene el campo `condition`, o está nulo/vacío, trata el hook como ejecutable.
  - Si el hook define una condición no vacía, omite el hook y deja la evaluación de la condición a la implementación del HookExecutor.
- Al construir comandos de tipo slash a partir de los nombres de comando de hooks, reemplaza los puntos (`.`) con guiones (`-`). Por ejemplo, `speckit.git.commit` → `/speckit-git-commit`.
- Para cada hook ejecutable, muestra lo siguiente según su indicador `optional`:
  - **Hook opcional** (`optional: true`):
    ```
    ## Extension Hooks

    **Pre-Hook Opcional**: {extension}
    Comando: `/{command}`
    Descripción: {description}

    Prompt: {prompt}
    Para ejecutar: `/{command}`
    ```
  - **Hook obligatorio** (`optional: false`):
    ```
    ## Extension Hooks

    **Pre-Hook Automático**: {extension}
    Ejecutando: `/{command}`
    EXECUTE_COMMAND: {command}
    
    Espera el resultado del comando del hook antes de proceder al Esquema (Outline).
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.

## Esquema (Outline)

1. Ejecuta `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_DIR` y la lista `AVAILABLE_DOCS`. Todas las rutas deben ser absolutas. Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

2. **Comprobar el estado de las listas de control** (si existe `FEATURE_DIR/checklists/`):
   - Escanea todos los archivos de listas de control en el directorio `checklists/`.
   - Para cada lista de control, cuenta:
     - Elementos totales: Todas las líneas que coinciden con `- [ ]` o `- [X]` o `- [x]`.
     - Elementos completados: Líneas que coinciden con `- [X]` o `- [x]`.
     - Elementos incompletos: Líneas que coinciden con `- [ ]`.
   - Crea una tabla de estado:
     ```text
     | Lista de Control | Total | Completados | Incompletos | Estado |
     |------------------|-------|-------------|-------------|--------|
     | ux.md            | 12    | 12          | 0           | ✓ PASS |
     | test.md          | 8     | 5           | 3           | ✗ FAIL |
     | security.md      | 6     | 6           | 0           | ✓ PASS |
     ```
   - Calcula el estado general:
     - **PASS**: Todas las listas de control tienen 0 elementos incompletos.
     - **FAIL**: Una o más listas de control tienen elementos incompletos.
   - **Si alguna lista de control está incompleta**:
     - Muestra la tabla con el conteo de elementos incompletos.
     - **DETENTE** y pregunta: "Algunas listas de control están incompletas. ¿Deseas proceder con la implementación de todos modos? (sí/no)"
     - Espera la respuesta del usuario antes de continuar.
     - Si el usuario dice "no", "espera" o "detente", detén la ejecución.
     - Si el usuario dice "sí", "proceder" o "continuar", procede al paso 3.
   - **Si todas las listas de control están completas**:
     - Muestra la tabla indicando que todas las listas de control pasaron.
     - Procede automáticamente al paso 3.

3. Carga y analiza el contexto de implementación:
   - **REQUERIDO**: Lee `tasks.md` para obtener la lista completa de tareas y el plan de ejecución.
   - **REQUERIDO**: Lee `plan.md` para obtener el stack tecnológico, la arquitectura y la estructura de archivos.
   - **SI EXISTE**: Lee `data-model.md` para entidades y relaciones.
   - **SI EXISTE**: Lee `contracts/` para especificaciones de API y requisitos de prueba.
   - **SI EXISTE**: Lee `research.md` para decisiones técnicas y restricciones.
   - **SI EXISTE**: Lee `.specify/memory/constitution.md` para restricciones de gobernanza.
   - **SI EXISTE**: Lee `quickstart.md` para escenarios de integración.

4. **Verificación de la Configuración del Proyecto**:
   - **REQUERIDO**: Crea/verifica archivos de exclusión basados en la configuración real del proyecto:
   
   **Lógica de Detección y Creación**:
   - Comprueba si el siguiente comando tiene éxito para determinar si el repositorio es un repo git (crea/verifica `.gitignore` si es así):
     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```
   - Comprueba si existe `Dockerfile*` o Docker en `plan.md` → crea/verifica `.dockerignore`.
   - Comprueba si existe `.eslintrc*` → crea/verifica `.eslintignore`.
   - Comprueba si existe `eslint.config.*` → asegúrate de que las entradas de `ignores` cubran los patrones requeridos.
   - Comprueba si existe `.prettierrc*` → crea/verifica `.prettierignore`.
   - Comprueba si existe `.npmrc` o `package.json` → crea/verifica `.npmignore` (si se va a publicar).
   - Comprueba si existen archivos de terraform (`*.tf`) → crea/verifica `.terraformignore`.
   - Comprueba si se necesita `.helmignore` (charts de helm presentes) → crea/verifica `.helmignore`.

   **Si el archivo de exclusión ya existe**: Verifica que contenga los patrones esenciales y añade únicamente los patrones críticos faltantes.
   **Si falta el archivo de exclusión**: Créalo con el conjunto completo de patrones para la tecnología detectada.

   **Patrones Comunes por Tecnología** (según el stack de `plan.md`):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `*.dll`, `autom4te.cache/`, `config.status`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

   **Patrones Específicos por Herramienta**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

5. Analiza la estructura de `tasks.md` y extrae:
   - **Fases de tareas**: Configuración, Pruebas, Core, Integración, Pulido.
   - **Dependencias de tareas**: Reglas de ejecución secuencial vs. paralela.
   - **Detalles de tareas**: ID, descripción, rutas de archivos, marcadores de paralelo [P].
   - **Flujo de ejecución**: Orden y requisitos de dependencias.

6. Ejecuta la implementación siguiendo el plan de tareas:
   - **Ejecución fase por fase**: Completa cada fase antes de pasar a la siguiente.
   - **Respeta las dependencias**: Ejecuta las tareas secuenciales en orden; las tareas paralelas [P] pueden ejecutarse juntas.
   - **Sigue el enfoque TDD**: Ejecuta las tareas de prueba antes de sus tareas de implementación correspondientes.
   - **Coordinación basada en archivos**: Las tareas que afectan a los mismos archivos deben ejecutarse secuencialmente.
   - **Puntos de control de validación**: Verifica la finalización de cada fase antes de proceder.

7. Reglas de ejecución de la implementación:
   - **Configuración primero**: Inicializa la estructura del proyecto, dependencias y configuración.
   - **Pruebas antes del código**: Si es necesario, escribe pruebas para contratos, entidades y escenarios de integración.
   - **Desarrollo del Core**: Implementa modelos, servicios, comandos CLI y endpoints.
   - **Trabajo de integración**: Conexiones de base de datos, middleware, logging y servicios externos.
   - **Pulido y validación**: Pruebas unitarias, optimización del rendimiento y documentación.

8. Seguimiento del progreso y manejo de errores:
   - Informa del progreso después de cada tarea completada.
   - Detén la ejecución si alguna tarea no paralela falla.
   - Para tareas paralelas [P], continúa con las tareas exitosas e informa las fallidas.
   - Proporciona mensajes de error claros con contexto para depuración.
   - Sugiere los siguientes pasos si la implementación no puede continuar.
   - **IMPORTANTE**: Para las tareas completadas, asegúrate de marcarlas como completadas `[X]` en el archivo de tareas.

9. Validación de finalización:
   - Verifica que todas las tareas requeridas estén completadas.
   - Comprueba que las características implementadas coincidan con la especificación original.
   - Valida que las pruebas pasen y que la cobertura cumpla con los requisitos.
   - Confirma que la implementación siga el plan técnico.

Nota: Este comando asume que existe un desglose completo de tareas en `tasks.md`. Si las tareas están incompletas o faltan, sugiere ejecutar `/speckit-tasks` primero para regenerar la lista de tareas.

## Hooks Obligatorios Posteriores a la Ejecución

**DEBES completar esta sección antes de informar la finalización al usuario.**

Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si no existe, o no hay hooks registrados bajo `hooks.after_implement`, salta al Reporte de Finalización.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_implement`.
- Si el YAML no se puede analizar o no es válido, omite la comprobación de hooks silenciosamente y continúa al Reporte de Finalización.
- Filtra los hooks donde `enabled` sea explícitamente `false`. Trata los hooks sin campo `enabled` como habilitados por defecto.
- Para cada hook restante, **no** intentes interpretar o evaluar las expresiones `condition` del hook:
  - Si el hook no tiene el campo `condition`, o está nulo/vacío, trata el hook como ejecutable.
  - Si el hook define una condición no vacía, omite el hook y deja la evaluación de la condición a la implementación del HookExecutor.
- Al construir comandos de tipo slash a partir de los nombres de comando de hooks, reemplaza los puntos (`.`) con guiones (`-`). Por ejemplo, `speckit.git.commit` → `/speckit-git-commit`.
- Para cada hook ejecutable, muestra lo siguiente según su indicador `optional`:
  - **Hook obligatorio** (`optional: false`) — **DEBES emitir `EXECUTE_COMMAND:` para cada hook obligatorio**:
    ```
    ## Extension Hooks

    **Hook Automático**: {extension}
    Ejecutando: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
  - **Hook opcional** (`optional: true`):
    ```
    ## Extension Hooks

    **Hook Opcional**: {extension}
    Comando: `/{command}`
    Descripción: {description}

    Prompt: {prompt}
    Para ejecutar: `/{command}`
    ```

## Reporte de Finalización

Informa el estado final junto con un resumen del trabajo completado.

## Listo Cuando

- [ ] Todas las tareas en `tasks.md` están completadas y marcadas como `[X]`.
- [ ] La implementación fue validada contra la especificación, el plan y la cobertura de pruebas.
- [ ] Hooks de extensión despachados o ignorados de acuerdo con las reglas de Hooks Obligatorios anteriores.
- [ ] Se informa de la finalización al usuario mostrando el resumen del trabajo completado.
