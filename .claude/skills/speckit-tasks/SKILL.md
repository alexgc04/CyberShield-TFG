---
name: "speckit-tasks"
description: "Genera un archivo tasks.md ordenado por dependencias y accionable para la característica basándose en los artefactos de diseño disponibles."
argument-hint: "Restricciones opcionales para la generación de tareas"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/tasks.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la generación de tareas)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_tasks`.
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

1. **Configuración**: Ejecuta `.specify/scripts/powershell/setup-tasks.ps1 -Json` desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_DIR`, `TASKS_TEMPLATE` y la lista `AVAILABLE_DOCS`. `FEATURE_DIR` y `TASKS_TEMPLATE` deben ser rutas absolutas cuando se proporcionen. `AVAILABLE_DOCS` es una lista de nombres de documentos/rutas relativas disponibles bajo `FEATURE_DIR` (por ejemplo, `research.md` o `contracts/`). Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

2. **Cargar documentos de diseño**: Lee desde `FEATURE_DIR`:
   - **Requeridos**: `plan.md` (stack tecnológico, bibliotecas, estructura), `spec.md` (historias de usuario con prioridades).
   - **Opcionales**: `data-model.md` (entidades), `contracts/` (contratos de interfaz), `research.md` (decisiones), `quickstart.md` (escenarios de prueba).
   - **SI EXISTE**: Lee `.specify/memory/constitution.md` para los principios del proyecto y restricciones de gobernanza.
   - Nota: No todos los proyectos tienen todos los documentos. Genera las tareas basándote en lo que esté disponible.

3. **Ejecutar flujo de generación de tareas**:
   - Carga `plan.md` y extrae el stack tecnológico, las bibliotecas y la estructura del proyecto.
   - Carga `spec.md` y extrae las historias de usuario con sus prioridades (P1, P2, P3, etc.).
   - Si existe `data-model.md`: Extrae las entidades y mapéalas con las historias de usuario.
   - Si existe `contracts/`: Mapea los contratos de interfaz con las historias de usuario.
   - Si existe `research.md`: Extrae las decisiones para las tareas de configuración.
   - Genera las tareas organizadas por historia de usuario (ver Reglas de Generación de Tareas abajo).
   - Genera el grafo de dependencias mostrando el orden de finalización de las historias de usuario.
   - Crea ejemplos de ejecución en paralelo para cada historia de usuario.
   - Valida la integridad de las tareas (cada historia de usuario tiene todas las tareas necesarias y es comprobable de forma independiente).

4. **Generar tasks.md**: Lee la plantilla de tareas desde `TASKS_TEMPLATE` (de la salida JSON anterior) y úsala como estructura. Si `TASKS_TEMPLATE` está vacía, recurre a `.specify/templates/tasks-template.md`. Rellena con:
   - Nombre correcto de la característica obtenido de `plan.md`.
   - Fase 1: Tareas de configuración (inicialización del proyecto).
   - Fase 2: Tareas fundacionales (prerrequisitos bloqueantes para todas las historias de usuario).
   - Fase 3+: Una fase por cada historia de usuario (en orden de prioridad obtenido de `spec.md`).
   - Cada fase incluye: objetivo de la historia, criterios de prueba independientes, pruebas (si se solicitaron) y tareas de implementación.
   - Fase Final: Pulido y aspectos transversales (cross-cutting concerns).
   - Todas las tareas deben seguir el formato estricto de lista de comprobación (ver Reglas de Generación de Tareas abajo).
   - Ruta de archivo clara para cada tarea.
   - Sección de dependencias que muestre el orden de finalización de las historias.
   - Ejemplos de ejecución en paralelo por cada historia.
   - Sección de estrategia de implementación (MVP primero, entrega incremental).

## Hooks Obligatorios Posteriores a la Ejecución

**DEBES completar esta sección antes de informar la finalización al usuario.**

Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si no existe, o no hay hooks registrados bajo `hooks.after_tasks`, salta al Reporte de Finalización.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_tasks`.
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

Muestra la ruta al archivo `tasks.md` generado y un resumen con:
- Cantidad total de tareas.
- Cantidad de tareas por historia de usuario.
- Oportunidades de paralelización identificadas.
- Criterios de prueba independientes para cada historia.
- Alcance sugerido del MVP (normalmente solo la Historia de Usuario 1).
- Validación de formato: Confirma que TODAS las tareas siguen el formato de lista de comprobación (casilla, ID, etiquetas, rutas de archivo).

Contexto para la generación de tareas: $ARGUMENTS

El archivo `tasks.md` debe ser inmediatamente ejecutable: cada tarea debe ser lo suficientemente específica como para que un LLM pueda completarla sin contexto adicional.

## Reglas de Generación de Tareas

**CRÍTICO**: Las tareas DEBEN organizarse por historia de usuario para permitir la implementación y las pruebas independientes.

**Las pruebas son OPCIONALES**: Solo genera tareas de prueba si se solicita explícitamente en la especificación de la característica o si el usuario solicita un enfoque TDD.

### Formato de Lista de Comprobación (REQUERIDO)

Cada tarea DEBE seguir estrictamente este formato:
```text
- [ ] [TaskID] [P?] [Story?] Descripción con ruta de archivo
```

**Componentes del formato**:
1. **Casilla de verificación**: Empieza SIEMPRE con `- [ ]` (casilla de markdown).
2. **ID de Tarea**: Número secuencial (T001, T002, T003...) en orden de ejecución.
3. **Marcador [P]**: Inclúyelo ÚNICAMENTE si la tarea es paralelizable (archivos diferentes, sin dependencias de tareas incompletas).
4. **Etiqueta [Story]**: REQUERIDA solo para las tareas de la fase de historias de usuario.
   - Formato: [US1], [US2], [US3], etc. (mapea con las historias de usuario de `spec.md`).
   - Fase de Configuración: SIN etiqueta de historia.
   - Fase Fundacional: SIN etiqueta de historia.
   - Fases de Historias de Usuario: DEBE tener etiqueta de historia.
   - Fase de Pulido: SIN etiqueta de historia.
5. **Descripción**: Acción clara con la ruta exacta del archivo.

**Ejemplos**:
- ✅ CORRECTO: `- [ ] T001 Crear estructura del proyecto según el plan de implementación`
- ✅ CORRECTO: `- [ ] T005 [P] Implementar middleware de autenticación en src/middleware/auth.py`
- ✅ CORRECTO: `- [ ] T012 [P] [US1] Crear modelo de Usuario en src/models/user.py`
- ✅ CORRECTO: `- [ ] T014 [US1] Implementar UserService en src/services/user_service.py`
- ❌ INCORRECTO: `- [ ] Crear modelo de Usuario` (falta ID y etiqueta de historia)
- ❌ INCORRECTO: `T001 [US1] Crear modelo` (falta la casilla de verificación)
- ❌ INCORRECTO: `- [ ] [US1] Crear modelo` (falta el ID de la tarea)
- ❌ INCORRECTO: `- [ ] T001 [US1] Crear modelo` (falta la ruta del archivo)

### Organización de Tareas

1. **Desde Historias de Usuario (spec.md)** - ORGANIZACIÓN PRINCIPAL:
   - Cada historia de usuario (P1, P2, P3...) tiene su propia fase.
   - Mapea todos los componentes relacionados con su historia:
     - Modelos necesarios para esa historia.
     - Servicios necesarios para esa historia.
     - Interfaces/UI necesarias para esa historia.
     - Si se solicitaron pruebas: Pruebas específicas para esa historia.
   - Marca las dependencias entre historias (la mayoría de las historias deberían ser independientes).

2. **Desde Contratos**:
   - Mapea cada contrato de interfaz → a la historia de usuario a la que sirve.
   - Si se solicitaron pruebas: Cada contrato de interfaz → tarea de prueba de contrato [P] antes de la implementación en la fase de esa historia.

3. **Desde el Modelo de Datos**:
   - Mapea cada entidad con la historia o historias de usuario que la necesitan.
   - Si una entidad sirve a múltiples historias: Colócala en la historia más temprana o en la fase de Configuración.
   - Relaciones → tareas de la capa de servicio en la fase de la historia correspondiente.

4. **Desde Configuración/Infraestructura**:
   - Infraestructura compartida → Fase de Configuración (Fase 1).
   - Tareas fundacionales/bloqueantes → Fase Fundacional (Fase 2).
   - Configuración específica de la historia → dentro de la fase de esa historia.

### Estructura de Fases

- **Fase 1**: Configuración (inicialización del proyecto).
- **Fase 2**: Fundacional (prerrequisitos bloqueantes - DEBEN completarse antes de las historias de usuario).
- **Fase 3+**: Historias de usuario en orden de prioridad (P1, P2, P3...).
  - Dentro de cada historia: Pruebas (si se solicitaron) → Modelos → Servicios → Endpoints → Integración.
  - Cada fase debe ser un incremento completo y comprobable de forma independiente.
- **Fase Final**: Pulido y Aspectos Transversales.

## Listo Cuando

- [ ] `tasks.md` generado con todas las fases, IDs de tareas y rutas de archivo.
- [ ] Hooks de extensión despachados o ignorados de acuerdo con las reglas de Hooks Obligatorios anteriores.
- [ ] Se informa de la finalización al usuario mostrando el conteo de tareas, el desglose por historias y el alcance del MVP.
