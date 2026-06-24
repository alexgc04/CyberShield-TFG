---
name: "speckit-taskstoissues"
description: "Convierte tareas existentes en issues de GitHub accionables y ordenados por dependencias para la característica basándose en los artefactos de diseño disponibles."
argument-hint: "Filtro o etiqueta opcional para los issues de GitHub"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/taskstoissues.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la conversión de tareas a issues)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_taskstoissues`.
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
1. **SI EXISTE**: Carga `.specify/memory/constitution.md` para los principios del proyecto y restricciones de gobernanza.
1. A partir del script ejecutado, extrae la ruta a **tasks**.
1. Obtén el remoto de Git ejecutando:
   ```bash
   git config --get remote.origin.url
   ```

> [!CAUTION]
> PROCEDE CON LOS SIGUIENTES PASOS ÚNICAMENTE SI EL REMOTO ES UNA URL DE GITHUB

1. **Obtener issues existentes para deduplicación**: Antes de crear nada, construye el conjunto de IDs de tareas que vas a procesar a partir de `tasks.md` (cada uno es una `T` seguida de tres dígitos, ej. `T001`). Luego, usa la herramienta `list_issues` del servidor MCP de GitHub para buscar issues que ya cubran esos IDs. No pases el valor `state`, ya que al omitirlo la herramienta devolverá tanto issues abiertos como cerrados. Solicita `perPage: 100` para reducir el número de llamadas, y dado que la herramienta usa paginación basada en cursor, solicita páginas con el parámetro `after` (utilizando el `endCursor` de la respuesta anterior). Para cada título de issue, compáralo con el patrón de ID de tarea `\bT\d{3}\b` (límites de palabra para evitar coincidencias erróneas con tokens como `ST001` o `T0010`; esto también reconocerá títulos escritos como `T001 ...`, `T001: ...` o `[T001] ...`) y, cuando coincida con uno de tus IDs de tarea, marca ese ID como que ya tiene un issue creado. Deja de paginar tan pronto como cada ID de tarea se haya emparejado, o cuando no queden más páginas. Esto limita la cantidad de llamadas en repositorios con historiales de issues grandes y previene duplicados cuando el comando se vuelve a ejecutar tras regenerar `tasks.md` o volver a invocar la habilidad.
1. Para cada tarea de la lista, usa el servidor MCP de GitHub para crear un nuevo issue en el repositorio que represente al remoto de Git. Las líneas de tareas en `tasks.md` comienzan con una casilla de verificación markdown, por lo que primero elimina el prefijo `- [ ]` (y cualquier marcador `[P]` / `[US#]`) para recuperar el ID de la tarea y su descripción. Crea el issue con un único título canónico con el formato `T001: <descripción>`, con el ID escrito una vez seguido de la descripción de la tarea (por ejemplo, la línea `- [ ] T001 Crear estructura de carpetas` se convierte en el título `T001: Crear estructura de carpetas`).
   - **Omite** cualquier tarea cuyo ID ya esté presente en el conjunto de issues existentes del paso anterior e infórmalo (por ejemplo, `T001 ya tiene un issue, omitiendo`).
   - Solo crea issues para tareas que aún no tengan un issue coincidente.

> [!CAUTION]
> BAJO NINGUNA CIRCUNSTANCIA CREES ISSUES EN REPOSITORIOS QUE NO COINCIDAN CON LA URL DEL REMOTO DE GIT

## Comprobaciones Posteriores a la Ejecución

**Comprobar hooks de extensión (después de la conversión de tareas a issues)**:
Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_taskstoissues`.
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
