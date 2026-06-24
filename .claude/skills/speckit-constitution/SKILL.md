---
name: "speckit-constitution"
description: "Crea o actualiza la constitución del proyecto a partir de principios interactivos o provistos, asegurando que todas las plantillas dependientes se mantengan sincronizadas."
argument-hint: "Principios o valores para la constitución del proyecto"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/constitution.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de actualizar la constitución)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_constitution`.
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

Estás actualizando la constitución del proyecto en `.specify/memory/constitution.md`. Este archivo es una PLANTILLA que contiene marcadores de posición entre corchetes (por ejemplo, `[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`). Tu trabajo es (a) recopilar/derivar valores concretos, (b) rellenar la plantilla con precisión y (c) propagar cualquier enmienda en los artefactos dependientes.

**Nota**: Si `.specify/memory/constitution.md` aún no existe, debería haberse inicializado a partir de `.specify/templates/constitution-template.md` durante la configuración del proyecto. Si falta, copia la plantilla primero.

Sigue este flujo de ejecución:

1. Carga la constitución existente en `.specify/memory/constitution.md`.
   - Identifica cada marcador de posición con el formato `[IDENTIFICADOR_EN_MAYUSCULAS]`.
   **IMPORTANTE**: El usuario puede requerir menos o más principios que los utilizados en la plantilla. Si se especifica un número, respétalo y sigue la plantilla general. Actualizarás el documento en consecuencia.

2. Recopila/deriva valores para los marcadores de posición:
   - Si la entrada del usuario (conversación) proporciona un valor, úsalo.
   - De lo contrario, infiérelo a partir del contexto del repositorio (README, docs, versiones previas de la constitución si están integradas).
   - Para las fechas de gobernanza: `RATIFICATION_DATE` is the original adoption date (if unknown ask or mark TODO), `LAST_AMENDED_DATE` es hoy si se realizan cambios; de lo contrario, mantén la anterior.
   - `CONSTITUTION_VERSION` debe incrementarse según las reglas de versionado semántico:
     - MAJOR: Cambios incompatibles hacia atrás en la gobernanza o eliminación/redistribución de principios.
     - MINOR: Nuevo principio o sección añadida, o guía materialmente ampliada.
     - PATCH: Aclaraciones, redacción, corrección de errores tipográficos, mejoras no semánticas.
   - Si el tipo de incremento de versión es ambiguo, propón el razonamiento antes de finalizar.

3. Redacta el contenido actualizado de la constitución:
   - Reemplaza cada marcador de posición con texto concreto (no deben quedar corchetes de marcadores, excepto las ranuras de plantilla retenidas intencionadamente que el proyecto ha decidido no definir aún; justifica explícitamente cualquiera que se deje).
   - Preserva la jerarquía de encabezados; los comentarios se pueden eliminar una vez reemplazados, a menos que sigan aportando guías aclaratorias.
   - Asegúrate de que cada sección de Principio tenga: nombre corto en una línea, párrafo (o lista con viñetas) que capture las reglas no negociables y justificación explícita si no es obvia.
   - Asegúrate de que la sección de Gobernanza enumere el procedimiento de enmienda, la política de versionado y las expectativas de revisión de cumplimiento.

4. Lista de comprobación de propagación de consistencia (valida activamente):
   - Lee `.specify/templates/plan-template.md` y asegúrate de que cualquier "Comprobación de la Constitución" o regla se alinee con los principios actualizados.
   - Lee `.specify/templates/spec-template.md` para el alinemento de alcance/requisitos; actualízalo si la constitución añade o elimina secciones obligatorias o restricciones.
   - Lee `.specify/templates/tasks-template.md` y asegúrate de que la categorización de tareas refleje los tipos de tareas impulsados por principios nuevos o eliminados (por ejemplo, observabilidad, versionado, disciplina de pruebas).
   - Lee cada archivo de comando en `.specify/templates/commands/*.md` (incluyendo este) para verificar que no queden referencias obsoletas.
   - Lee cualquier documento de guía en tiempo de ejecución (por ejemplo, `README.md`, `docs/quickstart.md`, etc.). Actualiza las referencias a los principios que hayan cambiado.

5. Produce un Reporte de Impacto de Sincronización (Sync Impact Report) (agrégalo como un comentario HTML al principio del archivo de la constitución después de la actualización):
   - Cambio de versión: versión_anterior → versión_nueva
   - Lista de principios modificados (título anterior → título nuevo si se cambió de nombre)
   - Secciones añadidas
   - Secciones eliminadas
   - Plantillas que requieren actualizaciones (✅ actualizada / ⚠ pendiente) con rutas de archivo
   - Tareas de seguimiento (TODOs) si se aplazó intencionadamente algún marcador de posición.

6. Validación antes de la salida final:
   - No quedan corchetes de marcadores sin explicar.
   - La línea de versión coincide con la del reporte.
   - Fechas en formato ISO YYYY-MM-DD.
   - Los principios son declarativos, comprobables y libres de lenguaje vago (reemplazar "debería" por "DEBE/DEBERÍA" con su justificación correspondiente).

7. Escribe la constitución completada de nuevo en `.specify/memory/constitution.md` (sobrescribir).

8. Muestra un resumen final al usuario con:
   - Nueva versión y justificación del incremento.
   - Cualquier archivo marcado para seguimiento manual.
   - Mensaje de commit sugerido (ej. `docs: amend constitution to vX.Y.Z (principle additions + governance update)`).

Requisitos de Formato y Estilo:
- Usa los encabezados de Markdown exactamente como están en la plantilla (no alteres los niveles de título).
- Mantén una sola línea en blanco entre secciones y evita espacios en blanco al final de las líneas.

Si el usuario proporciona actualizaciones parciales (por ejemplo, solo la revisión de un principio), realiza igualmente los pasos de validación y decisión de versión.

Si falta información crítica (por ejemplo, la fecha de ratificación se desconoce), inserta `TODO(<FIELD_NAME>): explicación` e inclúyelo en el Reporte de Impacto de Sincronización.

No crees una nueva plantilla; opera siempre sobre el archivo existente `.specify/memory/constitution.md`.

## Comprobaciones Posteriores a la Ejecución

**Comprobar hooks de extensión (después de actualizar la constitución)**:
Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_constitution`.
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

    **Hook Opcional**: {extension}
    Comando: `/{command}`
    Descripción: {description}

    Prompt: {prompt}
    Para ejecutar: `/{command}`
    ```
  - **Hook obligatorio** (`optional: false`):
    ```
    ## Extension Hooks

    **Hook Automático**: {extension}
    Ejecutando: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.
