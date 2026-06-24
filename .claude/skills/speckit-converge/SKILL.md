---
name: "speckit-converge"
description: "Evalúa el estado actual del código frente a la especificación, el plan y las tareas, y añade el trabajo pendiente restante como nuevas tareas en tasks.md para que implement pueda completarlo."
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/converge.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la convergencia)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_converge`.
- Si el YAML no se puede analizar o no es válido, omite la comprobación de hooks silenciosamente y continúa normalmente.
- Filtra los hooks donde `enabled` sea explícitamente `false`. Trata los hooks sin campo `enabled` como habilitados por defecto.
- Para cada hook restante, **no** intentes interpretar o evaluar las expresiones `condition` del hook:
  - Si el hook no tiene el campo `condition`, o está nulo/vacío, trata el hook como ejecutable.
  - Si el hook define una condición no vacía, omite el hook y deja la evaluación de la condición a la implementación del HookExecutor.
- Al construir comandos de tipo slash a partir de los nombres de comando de hooks, reemplaza los puntos (`.`) con guiones (`-`). Por ejemplo, `speckit.git.commit` → `/speckit-git-commit`.
- Para cada hook ejecutable, muestra lo siguiente según su indicador `optional`:
  - **Hook opcional** (`optional: true`):
    ```text
    ## Extension Hooks

    **Pre-Hook Opcional**: {extension}
    Comando: `/{command}`
    Descripción: {description}

    Prompt: {prompt}
    Para ejecutar: `/{command}`
    ```
  - **Hook obligatorio** (`optional: false`):
    ```text
    ## Extension Hooks

    **Pre-Hook Automático**: {extension}
    Ejecutando: `/{command}`
    EXECUTE_COMMAND: {command}

    Espera el resultado del comando del hook antes de proceder al Objetivo (Goal).
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.

## Objetivo (Goal)

Cerrar la brecha entre lo que requieren la especificación, el plan y las tareas de la característica y lo que el código implementa actualmente. Lee `spec.md`, `plan.md` y `tasks.md` como la **única fuente de intención** (con la constitución como restricción de gobernanza), evalúa el estado actual del código, determina qué requisitos, criterios de aceptación, decisiones del plan y tareas existentes no se han cumplido o solo se han satisfecho parcialmente, y **añade cada tarea pendiente al final de tasks.md** de modo que `/speckit-implement` pueda completarlas. Este comando DEBE ejecutarse únicamente después de que `/speckit-implement` haya corrido sobre el `tasks.md` actual y después de que `/speckit-tasks` haya producido un `tasks.md` completo.

Esta **no** es una herramienta de diff y **no** realiza un seguimiento de los cambios históricos. Evalúa el estado presente del código en relación con los artefactos de la característica (sin git, sin comparación de ramas y sin historial).

## Restricciones Operativas

**SOLO AÑADIR, NUNCA REESCRIBIR**: El **único** cambio de escritura permitido para este comando es añadir una nueva sección `## Phase N: Convergence` al final de `tasks.md`. Bajo ninguna circunstancia se debe:
- modificar `spec.md` o `plan.md` de ninguna forma;
- reescribir, renumerar, reordenar o eliminar ninguna tarea existente (incluidas las tareas de una fase de convergencia previa);
- modificar, crear o eliminar código de la aplicación (completar las tareas añadidas es trabajo de `/speckit-implement`).

Cuando la base de código ya satisfaga todo lo requerido, el comando DEBE dejar `tasks.md` **intacto byte a byte** (sin añadir un encabezado de convergencia vacío) e informar de un resultado limpio.

**Autoridad de la Constitución**: La constitución del proyecto (`.specify/memory/constitution.md`) es **no negociable**. El código que viole un principio "DEBE" (MUST) se considera un hallazgo de severidad máxima y producirá su correspondiente tarea de remediación. Si la constitución es una plantilla vacía, omite estas comprobaciones con gracia en lugar de fallar.

## Pasos de Ejecución

### 1. Inicializar el Contexto de Convergencia

Ejecuta `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` una vez desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_DIR` y `AVAILABLE_DOCS`. Deriva las rutas absolutas:
- SPEC = `FEATURE_DIR/spec.md`
- PLAN = `FEATURE_DIR/plan.md`
- TASKS = `FEATURE_DIR/tasks.md`
- CONSTITUTION = `.specify/memory/constitution.md` (si está presente)

Si falta alguno de estos archivos (`spec.md`, `plan.md` o `tasks.md`), DETENTE con un mensaje claro e indicando el comando que se debe ejecutar previamente (`/speckit-specify` para una especificación faltante, `/speckit-plan` para un plan faltante o `/speckit-tasks` para tareas faltantes). No produzcas resultados parciales.
Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

### 2. Cargar los Artefactos (Carga Progresiva)

Carga únicamente el contexto mínimo necesario de cada artefacto:

**Desde spec.md:**
- Requisitos Funcionales (FR-###).
- Criterios de Éxito (SC-###) — incluye únicamente los elementos que requieran trabajo de desarrollo; excluye métricas de resultados post-lanzamiento y KPIs de negocio.
- Historias de Usuario y sus Escenarios de Aceptación.
- Casos extremos (si están presentes).

**Desde plan.md:**
- Opciones de arquitectura/stack y decisiones técnicas.
- Referencias del Modelo de Datos.
- Fases y puntos de contacto nombrados (archivos/componentes que el plan indica que serán creados o editados).
- Restricciones técnicas.

**Desde tasks.md:**
- IDs de tareas (para calcular el siguiente ID y número de fase).
- Descripciones, agrupación de fases y rutas de archivos referenciadas.

**Desde la constitución (si no es una plantilla vacía):**
- Nombres de los principios y declaraciones normativas DEBE/DEBERÍA.

### 3. Construir el Inventario de Intenciones

Crea un modelo interno (sin repetir textualmente los artefactos completos):
- **Inventario de requisitos**: una clave única y estable por cada FR-### / SC-### / escenario de aceptación de historia de usuario (ej. `US1/AC2`), además de las decisiones del plan y principios constitucionales que impongan obligaciones de desarrollo.
- **Mapa de alcance del código**: a partir de las rutas de archivos nombradas en `plan.md` y `tasks.md`, junto con una búsqueda de palabras clave de los conceptos que describe cada requisito, deriva el conjunto de archivos fuente y componentes dentro del alcance de la evaluación. Limita la inspección únicamente a estos elementos (no infieras alcance más allá de lo definido en los artefactos).

### 4. Evaluar la Base de Código y Clasificar los Hallazgos

Para cada elemento del inventario de intenciones, inspecciona el código actual dentro del alcance y produce un `Hallazgo` (Finding) solo donde exista una brecha. Clasifica cada hallazgo según el **tipo de brecha**:
- **`missing`**: el trabajo requerido está ausente del código por completo.
- **`partial`**: el trabajo existe pero aún no satisface completamente el requisito / criterio de aceptación / decisión del plan.
- **`contradicts`**: el código hace algo que entra en conflicto con la intención declarada o con un principio fundamental "DEBE" de la constitución.
- **`unrequested`**: el código contiene trabajo que no fue solicitado por la especificación, el plan o las tareas (se muestra solo para información; la convergencia no elimina código, solo añade una tarea para revisar, justificar o remover dicho trabajo).

Cada `Hallazgo` registra: un ID estable, su `source-ref` de procedencia, su `gap-type`, su severidad y una breve descripción en lenguaje humano junto con la evidencia (el archivo/área observado).

**Casos extremos**:
- **Poco o ningún código implementado**: trata todo el alcance especificado como `missing` (trabajo pendiente) en lugar de fallar.
- **Sin brechas detectadas**: produce cero hallazgos y sigue la rama de convergencia del paso 7.

### 5. Asignar Severidad

- **CRITICAL**: viola un principio "DEBE" de la constitución, o es una brecha de tipo `missing`/`contradicts` que bloquea la funcionalidad básica de una historia de usuario P1.
- **HIGH**: una brecha `missing` o `partial` en un requisito funcional o criterio de aceptación principal.
- **MEDIUM**: una brecha `partial` en un requisito secundario, o una adición de tipo `unrequested` con justificación poco clara.
- **LOW**: brechas parciales menores, pulido o adiciones `unrequested` de bajo riesgo.

### 6. Presentar el Resumen de Hallazgos en Sesión

Antes de realizar ninguna escritura en disco, muestra un resumen compacto clasificado por severidad:

## Hallazgos de Convergencia

| ID | Tipo Brecha | Severidad | Origen | Evidencia | Trabajo Pendiente |
|----|-------------|-----------|--------|-----------|-------------------|
| F1 | missing     | HIGH      | FR-008 | Ejemplo: no se detectó guarda de adición en ruta/al/modulo.py al escribir tasks.md | Añadir validación de adición |

**Métricas del resumen**:
- Requisitos / escenarios de aceptación comprobados.
- Decisiones del plan comprobadas.
- Principios de la constitución comprobados (o "omitidos — plantilla").
- Hallazgos por tipo de brecha (missing / partial / contradicts / unrequested).
- Hallazgos por severidad.

### 7. Añadir Tareas de Convergencia (o reportar convergencia)

**Si existen uno o más hallazgos accionables** (resultado `tasks_appended`):
Añade al **final** de `tasks.md`, respetando el contrato de adición:
1. Escanea todos los IDs de tareas existentes; sea `M` el ID máximo encontrado. Determina el siguiente número de fase `N` (fase existente más alta + 1).
2. Escribe una única cabecera de sección `## Phase N: Convergence`.
3. Emite un elemento de lista por cada hallazgo accionable, ordenando por severidad CRITICAL/HIGH primero, asignando IDs autocompletados con ceros `T{M+1:03d}, T{M+2:03d}, …`:
   ```markdown
   - [ ] T042 <descripción imperativa> según <source-ref> (<gap-type>)
   ```
   `<source-ref>` rastrea el origen de la tarea (ej. `FR-003`, `SC-002`, `US1/AC2`, `plan: storage decision`, `Constitution II`).
   
   `<gap-type>` es uno de los siguientes: `missing`, `partial`, `contradicts`, `unrequested`.
   
   Las tareas de violación constitucional DEBEN emitirse en primer lugar y describirse como `CRÍTICAS`.
4. Nunca reutilices ni renumeres IDs existentes. Si ya existe una fase de convergencia previa, añade la nueva fase numerada debajo de ella sin alterar la anterior.

**Si no existen hallazgos accionables** (resultado `converged`):
- **No** modifiques `tasks.md` en absoluto (no añadas cabeceras de fase vacías).
- Informa: **"✅ Convergencia alcanzada — la implementación satisface por completo la especificación, el plan y las tareas."**
- Incluye el conteo resumido de los elementos revisados.

### 8. Proporcionar Siguientes Acciones (Handoff)

- En `tasks_appended`: indica cuántas tareas se añadieron y bajo qué fase, y recomienda ejecutar `/speckit-implement` para completarlas; señala que una ejecución posterior de converge encontrará menos o ningún elemento restante.
- En `converged`: recomienda proceder a la revisión de código o a abrir un Pull Request. No se requiere ninguna ejecución posterior de implement para el alcance especificado de esta característica.

### 9. Comprobar Hooks de Extensión Posterior

Tras generar el resultado, comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_converge`.
- Si el YAML no se puede analizar o no es válido, omite la comprobación de hooks silenciosamente y continúa normalmente.
- Filtra los hooks donde `enabled` sea explícitamente `false`. Trata los hooks sin campo `enabled` como habilitados por defecto.
- Reporta el resultado de la convergencia (`converged` o `tasks_appended`) en la sesión antes de listar los hooks, para que los usuarios decidan si ejecutar comandos opcionales de seguimiento.
- Al construir comandos de tipo slash a partir de los nombres de comando de hooks, reemplaza los puntos (`.`) con guiones (`-`). Por ejemplo, `speckit.git.commit` → `/speckit-git-commit`.
- Para cada hook ejecutable, muestra lo siguiente según su indicador `optional`:
  - **Hook opcional** (`optional: true`):
    ```text
    ## Extension Hooks

    **Hook Opcional**: {extension}
    Comando: `/{command}`
    Descripción: {description}

    Prompt: {prompt}
    Para ejecutar: `/{command}`
    ```
  - **Hook obligatorio** (`optional: false`):
    ```text
    ## Extension Hooks

    **Hook Automático**: {extension}
    Ejecutando: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.
