---
name: "speckit-plan"
description: "Ejecuta el flujo de trabajo de planificación de la implementación utilizando la plantilla de plan para generar artefactos de diseño."
argument-hint: "Guía opcional para la fase de planificación"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/plan.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de planificar)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_plan`.
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

1. **Configuración**: Ejecuta `.specify/scripts/powershell/setup-plan.ps1 -Json` desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_SPEC`, `IMPL_PLAN`, `SPECS_DIR`, y `BRANCH`. Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

2. **Cargar contexto**: Lee `FEATURE_SPEC` y `.specify/memory/constitution.md`. Carga la plantilla `IMPL_PLAN` (que ya debe estar copiada).

3. **Ejecutar flujo de planificación**: Sigue la estructura de la plantilla de `IMPL_PLAN` para:
   - Rellenar el Contexto Técnico (marca lo desconocido como "NEEDS CLARIFICATION").
   - Rellenar la sección Comprobación de la Constitución a partir de la constitución.
   - Evaluar las compuertas de calidad (califica como ERROR si las violaciones no están justificadas).
   - Fase 0: Generar `research.md` (resuelve todos los marcadores NEEDS CLARIFICATION).
   - Fase 1: Generar `data-model.md`, `contracts/`, y `quickstart.md`.
   - Fase 1: Actualizar el contexto del agente ejecutando el script del agente.
   - Volver a evaluar la sección Comprobación de la Constitución post-diseño.

## Hooks Obligatorios Posteriores a la Ejecución

**DEBES completar esta sección antes de informar la finalización al usuario.**

Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si no existe, o no hay hooks registrados bajo `hooks.after_plan`, salta al Reporte de Finalización.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_plan`.
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

El comando finaliza después de la planificación de la Fase 2. Informa de la rama, la ruta de `IMPL_PLAN` y los artefactos generados.

## Fases

### Fase 0: Esquema e Investigación (Outline & Research)

1. **Extrae lo desconocido del Contexto Técnico** anterior:
   - Para cada NEEDS CLARIFICATION → tarea de investigación.
   - Para cada dependencia → tarea de mejores prácticas.
   - Para cada integración → tarea de patrones de diseño.

2. **Genera y despacha agentes de investigación**:
   ```text
   Para cada incógnita en el Contexto Técnico:
     Tarea: "Investigar {unknown} para el contexto de la característica"
   Para cada elección tecnológica:
     Tarea: "Buscar mejores prácticas para {tech} en {domain}"
   ```

3. **Consolida los hallazgos** en `research.md` usando el formato:
   - Decisión: [qué se eligió]
   - Justificación: [por qué se eligió]
   - Alternativas consideradas: [qué más se evaluó]

**Resultado**: `research.md` con todos los marcadores NEEDS CLARIFICATION resueltos.

### Fase 1: Diseño y Contratos

**Prerrequisitos:** `research.md` completado.

1. **Extrae las entidades de la especificación de la característica** → `data-model.md`:
   - Nombre de la entidad, campos, relaciones.
   - Reglas de validación a partir de los requisitos.
   - Transiciones de estado si aplica.

2. **Define los contratos de interfaz** (si el proyecto expone interfaces externas) → `/contracts/`:
   - Identifica qué interfaces expone el proyecto a los usuarios o a otros sistemas.
   - Documenta el formato del contrato según el tipo de proyecto.
   - Ejemplos: APIs públicas para bibliotecas, esquemas de comandos para herramientas CLI, endpoints para servicios web, gramáticas para analizadores, contratos de UI para aplicaciones.
   - Salta este paso si el proyecto es puramente interno (scripts de construcción, herramientas de un solo uso, etc.).

3. **Crea la guía de validación de inicio rápido** → `quickstart.md`:
   - Documenta escenarios de validación ejecutables que demuestren que la característica funciona de extremo a extremo.
   - Incluye prerrequisitos, comandos de configuración, comandos de ejecución/prueba y los resultados esperados.
   - Usa enlaces o referencias a los detalles de los contratos y del modelo de datos en lugar de duplicarlos.
   - No incluyas código de implementación completo, cuerpos de modelos/servicios/controladores, migraciones ni suites de pruebas completas.
   - Mantén este artefacto como una guía de validación/ejecución; los detalles de la implementación pertenecen a `tasks.md` y a la fase de implementación.

4. **Actualización del contexto del agente**:
   - Actualiza la referencia del plan entre los marcadores `<!-- SPECKIT START -->` y `<!-- SPECKIT END -->` en `CLAUDE.md` para que apunte al archivo del plan creado en el paso 1 (la ruta de `IMPL_PLAN`).

**Resultados**: `data-model.md`, `/contracts/*`, `quickstart.md`, archivo de contexto del agente actualizado.

## Reglas clave

- Usa rutas absolutas para las operaciones del sistema de archivos; usa rutas relativas al proyecto para las referencias en la documentación y los archivos de contexto de los agentes.
- Lanza un ERROR en caso de fallos en las compuertas de calidad o aclaraciones sin resolver.

## Listo Cuando

- [ ] Flujo de planificación ejecutado y artefactos de diseño generados.
- [ ] Hooks de extensión despachados o ignorados de acuerdo con las reglas de Hooks Obligatorios anteriores.
- [ ] Se informa de la finalización al usuario indicando la rama, la ruta del plan y los artefactos generados.
