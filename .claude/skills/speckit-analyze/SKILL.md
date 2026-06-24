---
name: "speckit-analyze"
description: "Realiza un análisis no destructivo de calidad y consistencia cruzada entre spec.md, plan.md y tasks.md después de la generación de tareas."
argument-hint: "Áreas de enfoque opcionales para el análisis"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/analyze.md"
user-invocable: true
disable-model-invocation: false
context: fork
agent: general-purpose
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes del análisis)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_analyze`.
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

    Espera el resultado del comando del hook antes de proceder al Objetivo (Goal).
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.

## Objetivo (Goal)

Identificar inconsistencias, duplicaciones, ambigüedades y elementos subespecificados entre los tres artefactos principales (`spec.md`, `plan.md`, `tasks.md`) antes de la implementación. Este comando DEBE ejecutarse únicamente después de que `/speckit-tasks` haya producido con éxito un `tasks.md` completo.

## Restricciones Operativas

**ESTRICTAMENTE SOLO LECTURA**: **No** modifiques ningún archivo. Emite un reporte de análisis estructurado. Ofrece un plan de remediación opcional (el usuario debe aprobar explícitamente antes de que se invoque manualmente cualquier comando de edición de seguimiento).

**Autoridad de la Constitución**: La constitución del proyecto (`.specify/memory/constitution.md`) es **no negociable** dentro del alcance de este análisis. Los conflictos con la constitución son automáticamente CRÍTICOS y requieren el ajuste de la especificación, del plan o de las tareas (nunca la dilución, reinterpretación o el ignorado silencioso del principio). Si un principio en sí necesita cambiar, eso debe ocurrir en una actualización explícita y separada de la constitución fuera de `/speckit-analyze`.

## Pasos de Ejecución

### 1. Inicializar el Contexto de Análisis

Ejecuta `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` una vez desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_DIR` y `AVAILABLE_DOCS`. Deriva las rutas absolutas:
- SPEC = `FEATURE_DIR/spec.md`
- PLAN = `FEATURE_DIR/plan.md`
- TASKS = `FEATURE_DIR/tasks.md`

Detén el flujo con un mensaje de error si falta algún archivo requerido (instruye al usuario para que ejecute el comando prerrequisito faltante).
Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

### 2. Cargar los Artefactos (Carga Progresiva)

Carga únicamente el contexto mínimo necesario de cada artefacto:

**Desde spec.md:**
- Resumen/Contexto.
- Requisitos Funcionales.
- Criterios de Éxito (resultados medibles — ej. rendimiento, seguridad, disponibilidad, éxito del usuario, impacto del negocio).
- Historias de Usuario.
- Casos extremos (si están presentes).

**Desde plan.md:**
- Opciones de arquitectura/stack.
- Referencias del Modelo de Datos.
- Fases.
- Restricciones técnicas.

**Desde tasks.md:**
- IDs de tareas.
- Descripciones.
- Agrupación por fases.
- Marcadores de paralelo [P].
- Rutas de archivos referenciadas.

**Desde la constitución:**
- Lee `.specify/memory/constitution.md` para la validación de principios.

### 3. Construir Modelos Semánticos

Crea representaciones internas (no incluyas artefactos crudos en la salida):
- **Inventario de requisitos**: Para cada Requisito Funcional (FR-###) y Criterio de Éxito (SC-###), registra una clave estable. Usa el identificador explícito FR-/SC- como clave primaria cuando esté presente, y opcionalmente deriva un texto en formato slug imperativo para legibilidad (ej. "El usuario puede subir archivos" → `user-can-upload-file`). Incluye únicamente los elementos de Criterios de Éxito que requieran trabajo de desarrollo (ej. infraestructura de pruebas de carga, herramientas de auditoría de seguridad) y excluye las métricas de resultados post-lanzamiento o KPIs de negocio (ej. "Reducir tickets de soporte en un 50%").
- **Inventario de historias/acciones de usuario**: Acciones discretas de usuario con criterios de aceptación.
- **Mapeo de cobertura de tareas**: Mapea cada tarea con uno o más requisitos o historias (inferencia por palabra clave o patrones de referencia explícitos como IDs o frases clave).
- **Conjunto de reglas de la constitución**: Extrae los nombres de los principios y las declaraciones normativas DEBE/DEBERÍA.

### 4. Pasadas de Detección (Análisis Eficiente)

Enfócate en hallazgos de alta señal. Limita el reporte a un total de 50 hallazgos; agrega el resto en un resumen de desbordamiento.

#### A. Detección de Duplicados
- Identifica requisitos casi duplicados.
- Marca las frases de menor calidad para su consolidación.

#### B. Detección de Ambigüedades
- Marca adjetivos vagos (rápido, escalable, seguro, intuitivo, robusto) que carezcan de criterios medibles.
- Marca marcadores de posición sin resolver (TODO, TKTK, ???, `<placeholder>`, etc.).

#### C. Subespecificación
- Requisitos con verbos pero que carecen de objeto o resultado medible.
- Historias de usuario que carecen de alineación con criterios de aceptación.
- Tareas que referencian archivos o componentes no definidos en la especificación o en el plan.

#### D. Alineación con la Constitución
- Cualquier requisito o elemento del plan que entre en conflicto con un principio "DEBE".
- Falta de secciones obligatorias o compuertas de calidad requeridas por la constitución.

#### E. Brechas de Cobertura
- Requisitos con cero tareas asociadas.
- Tareas sin ningún requisito o historia de usuario mapeada.
- Criterios de éxito que requieren desarrollo (rendimiento, seguridad, disponibilidad) no reflejados en las tareas.

#### F. Inconsistencias
- Desviación de terminología (mismo concepto nombrado de manera diferente en varios archivos).
- Entidades de datos referenciadas en el plan pero ausentes en la especificación (o viceversa).
- Contradicciones en el orden de las tareas (ej. tareas de integración antes de las tareas de configuración fundacionales sin nota de dependencia).
- Requisitos en conflicto (ej. uno requiere Next.js mientras que otro especifica Vue).

### 5. Asignación de Severidad

Usa esta heurística para priorizar los hallazgos:
- **CRITICAL**: Viola un principio "DEBE" de la constitución, falta un artefacto clave de la especificación, o hay un requisito con cobertura cero que bloquea la funcionalidad básica.
- **HIGH**: Requisito duplicado o en conflicto, atributos de seguridad/rendimiento ambiguos, criterios de aceptación no comprobables.
- **MEDIUM**: Desviación de terminología, cobertura de tareas no funcionales faltante, caso extremo subespecificado.
- **LOW**: Mejoras de estilo/redacción, redundancia menor que no afecta el orden de ejecución.

### 6. Producir Reporte de Análisis Compacto

Muestra un reporte en Markdown (sin escribir en disco) con la siguiente estructura:

## Reporte de Análisis de Especificación

| ID | Categoría | Severidad | Ubicación(es) | Resumen | Recomendación |
|----|-----------|-----------|---------------|---------|---------------|
| A1 | Duplicación | HIGH | spec.md:L120-134 | Dos requisitos similares... | Fusionar redacción; mantener versión más clara |

(Añade una fila por hallazgo; genera IDs estables con el prefijo de la inicial de la categoría).

**Tabla de Resumen de Cobertura:**
| Clave Requisito | ¿Tiene Tarea? | IDs de Tareas | Notas |
|-----------------|---------------|---------------|-------|

**Problemas de Alineación con la Constitución:** (si los hay)

**Tareas No Mapeadas:** (si las hay)

**Métricas:**
- Total de Requisitos:
- Total de Tareas:
- % Cobertura (requisitos con >=1 tarea):
- Conteo de Ambigüedades:
- Conteo de Duplicaciones:
- Conteo de Problemas Críticos:

### 7. Proporcionar Siguientes Acciones

Al final del reporte, muestra un bloque conciso de Siguientes Acciones:
- Si existen problemas CRÍTICOS: Recomienda resolverlos antes de `/speckit-implement`.
- Si solo hay problemas LOW/MEDIUM: El usuario puede proceder, pero proporciona sugerencias de mejora.
- Proporciona sugerencias explícitas de comandos: ej. "Ejecuta /speckit-specify con refinamiento", "Ejecuta /speckit-plan para ajustar la arquitectura", "Edita manualmente tasks.md para añadir cobertura para 'métricas-de-rendimiento'".

### 8. Ofrecer Remediación

Pregunta al usuario: "¿Te gustaría que te sugiera ediciones de remediación concretas para los N problemas principales?" (NO las apliques automáticamente).

### 9. Comprobar Hooks de Extensión Posterior

Tras el reporte, comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_analyze`.
- Si el YAML no se puede analizar o no es válido, omite la comprobación de hooks silenciosamente y continúa normalmente.
- Filtra los hooks donde `enabled` sea explícitamente `false`. Trata los hooks sin campo `enabled` como habilitados por defecto.
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

## Principios Operativos

### Eficiencia del Contexto
- **Mínimos tokens de alta señal**: Enfoque en hallazgos accionables, sin documentación exhaustiva.
- **Divulgación progresiva**: Carga los artefactos incrementalmente; no vuelques todo el contenido en el análisis.
- **Salida eficiente en tokens**: Limita la tabla de hallazgos a 50 filas; resume el desbordamiento.
- **Resultados deterministas**: Volver a ejecutar sin cambios debe producir IDs y conteos consistentes.

### Directrices de Análisis
- **NUNCA modifiques archivos** (este es un análisis de solo lectura).
- **NUNCA alucines secciones faltantes** (si están ausentes, repórtalas con precisión).
- **Prioriza las violaciones constitucionales** (estas siempre son CRÍTICAS).
- **Usa ejemplos sobre reglas exhaustivas** (cita instancias específicas, no patrones genéricos).
- **Reporta cero problemas con gracia** (emite un reporte de éxito con estadísticas de cobertura).

## Contexto

$ARGUMENTS
