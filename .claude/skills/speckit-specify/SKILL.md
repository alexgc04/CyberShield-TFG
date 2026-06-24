---
name: "speckit-specify"
description: "Crea o actualiza la especificación de una característica a partir de una descripción en lenguaje natural."
argument-hint: "Describe la característica que deseas especificar"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/specify.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la especificación)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_specify`.
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

El texto que el usuario escribió después de `/speckit-specify` en el mensaje desencadenante **es** la descripción de la característica. Asume que siempre lo tienes disponible en esta conversación, incluso si `$ARGUMENTS` aparece literalmente abajo. No le pidas al usuario que lo repita a menos que haya proporcionado un comando vacío.

Dada la descripción de la característica, realiza lo siguiente:

1. **Genera un nombre corto y conciso** (2-4 palabras) para la característica:
   - Analiza la descripción de la característica y extrae las palabras clave más significativas.
   - Crea un nombre corto de 2 a 4 palabras que capture la esencia de la característica.
   - Usa el formato verbo-sustantivo cuando sea posible (ej. "user-auth", "fix-payment-bug").
   - Preserva los términos técnicos y acrónimos (OAuth2, API, JWT, etc.).
   - Manténlo conciso pero lo suficientemente descriptivo para entender la característica de un vistazo.
   - Ejemplos:
     - "Quiero añadir autenticación de usuarios" → "user-auth"
     - "Implementar la integración de OAuth2 para la API" → "oauth2-api-integration"
     - "Crear un panel para análisis estadístico" → "analytics-dashboard"
     - "Corregir el error de timeout en el procesamiento de pagos" → "fix-payment-timeout"

2. **Creación de ramas** (opcional, vía hook):
   Si un hook `before_specify` se ejecutó con éxito en las Comprobaciones Previas anteriores, habrá creado/cambiado a una rama git y devuelto un JSON con `BRANCH_NAME` y `FEATURE_NUM`. Anota estos valores para referencia, pero el nombre de la rama **no** dicta el nombre del directorio de la especificación.
   Si el usuario proporcionó explícitamente `GIT_BRANCH_NAME`, pásalo al hook para que el script de la rama use ese valor exacto (omitiendo toda generación de prefijos/sufijos).

3. **Crea el directorio de la característica de especificación**:
   Las especificaciones viven bajo el directorio por defecto `specs/`, a menos que el usuario proporcione explícitamente `SPECIFY_FEATURE_DIRECTORY`.

   **Orden de resolución para `SPECIFY_FEATURE_DIRECTORY`**:
   1. Si el usuario proporcionó explícitamente `SPECIFY_FEATURE_DIRECTORY` (ej. vía variable de entorno, argumento o configuración), úsalo tal cual.
   2. De lo contrario, auto-genéralo bajo `specs/`:
      - Comprueba `.specify/init-options.json` buscando `feature_numbering` (preferido) o `branch_numbering` (obsoleto, solo migración — se eliminará en una versión futura).
      - Si es `"timestamp"`: el prefijo es `YYYYMMDD-HHMMSS` (marca de tiempo actual).
      - Si es `"sequential"` o no está presente: el prefijo es `NNN` (siguiente número de 3 dígitos disponible tras escanear directorios existentes en `specs/`).
      - Construye el nombre del directorio: `<prefijo>-<nombre-corto>` (ej. `003-user-auth` o `20260319-143022-user-auth`).
      - Establece `SPECIFY_FEATURE_DIRECTORY` como `specs/<nombre-directorio>`.
      - Si se usó `branch_numbering` (y faltaba `feature_numbering`), muestra una advertencia de una línea: "⚠️ `branch_numbering` en init-options.json está obsoleto. Renómbralo a `feature_numbering`."

   **Crea el directorio y el archivo de especificación**:
   - `mkdir -p SPECIFY_FEATURE_DIRECTORY`
   - Resuelve la plantilla activa de especificación `spec-template` mediante la pila de resolución de plantillas de Spec Kit.
   - Copia el archivo resuelto `spec-template` a `SPECIFY_FEATURE_DIRECTORY/spec.md` como punto de partida.
   - Establece `SPEC_FILE` como `SPECIFY_FEATURE_DIRECTORY/spec.md`.
   - Persiste la ruta resuelta en `.specify/feature.json`:
     ```json
     {
       "feature_directory": "<resolved feature dir>"
     }
     ```
     Escribe la ruta real del directorio resuelto (por ejemplo, `specs/003-user-auth`), no la cadena literal `SPECIFY_FEATURE_DIRECTORY`. Esto permite que los comandos posteriores (`/speckit-plan`, `/speckit-tasks`, etc.) localicen el directorio de la característica sin depender de las convenciones de nombres de ramas git.

   **IMPORTANTE**:
   - Solo debes crear una característica por cada invocación de `/speckit-specify`.
   - El nombre del directorio de especificación y el nombre de la rama git son independientes (pueden coincidir, pero es elección del usuario).
   - El directorio y archivo de especificación siempre son creados por este comando, nunca por el hook.

4. Carga el archivo de plantilla de especificación resuelto para comprender las secciones requeridas.

5. **SI EXISTE**: Carga `.specify/memory/constitution.md` para los principios del proyecto y restricciones de gobernanza.

6. Sigue este flujo de ejecución:
   1. Analiza la descripción del usuario a partir de los argumentos.
      Si está vacía: ERROR "No se proporcionó descripción de la característica"
   2. Extrae conceptos clave de la descripción.
      Identifica: actores, acciones, datos, restricciones.
   3. Para aspectos poco claros:
      - Realiza suposiciones fundamentadas basadas en el contexto y los estándares de la industria.
      - Solo marca con `[NEEDS CLARIFICATION: pregunta específica]` si:
        - La elección afecta significativamente al alcance de la característica o a la experiencia del usuario.
        - Existen múltiples interpretaciones razonables con diferentes implicaciones.
        - No existe un valor predeterminado razonable.
      - **LÍMITE: Máximo 3 marcadores [NEEDS CLARIFICATION] en total**
      - Prioriza las aclaraciones por impacto: alcance > seguridad/privacidad > experiencia de usuario > detalles técnicos.
   4. Rellena la sección de Escenarios de Usuario y Pruebas.
      Si no hay un flujo de usuario claro: ERROR "No se pueden determinar los escenarios de usuario".
   5. Genera los Requisitos Funcionales.
      Cada requisito debe ser comprobable. Usa valores predeterminados razonables para los detalles no especificados (documenta las suposiciones en la sección Suposiciones).
   6. Define los Criterios de Éxito.
      Crea resultados medibles y agnósticos respecto a la tecnología. Incluye tanto métricas cuantitativas (tiempo, rendimiento, volumen) como medidas cualitativas (satisfacción del usuario, finalización de tareas). Cada criterio debe ser verificable sin detalles de implementación.
   7. Identifica las Entidades Clave (si hay datos involucrados).
   8. Devuelve: ÉXITO (especificación lista para la planificación).

6. Escribe la especificación en `SPEC_FILE` usando la estructura de la plantilla, reemplazando los marcadores de posición con detalles concretos derivados de la descripción de la característica (argumentos) mientras preservas el orden de las secciones y los encabezados.

7. **Validación de Calidad de la Especificación**: Después de escribir la especificación inicial, valídala contra los criterios de calidad:

   a. **Crear Lista de Control de Calidad de la Espec.**: Genera un archivo de lista de control en `SPECIFY_FEATURE_DIRECTORY/checklists/requirements.md` utilizando la estructura de la plantilla de lista de control con estos elementos de validación:

      ```markdown
      # Lista de Control de Calidad de la Especificación: [NOMBRE CARACTERÍSTICA]
      
      **Propósito**: Validar la integridad y calidad de la especificación antes de proceder a la planificación
      **Creado**: [FECHA]
      **Característica**: [Enlace a spec.md]
      
      ## Calidad del Contenido
      
      - [ ] Sin detalles de implementación (lenguajes, frameworks, APIs)
      - [ ] Enfocado en el valor para el usuario y necesidades de negocio
      - [ ] Escrito para partes interesadas no técnicas
      - [ ] Todas las secciones obligatorias completadas
      
      ## Integridad de Requisitos
      
      - [ ] No quedan marcadores [NEEDS CLARIFICATION]
      - [ ] Los requisitos son comprobables y no ambiguos
      - [ ] Los criterios de éxito son medibles
      - [ ] Los criterios de éxito son agnósticos a la tecnología (sin detalles de implementación)
      - [ ] Todos los escenarios de aceptación están definidos
      - [ ] Se identifican los casos extremos (edge cases)
      - [ ] El alcance está claramente acotado
      - [ ] Dependencias y suposiciones identificadas
      
      ## Preparación de la Característica
      
      - [ ] Todos los requisitos funcionales tienen criterios de aceptación claros
      - [ ] Los escenarios de usuario cubren los flujos primarios
      - [ ] La característica cumple con los resultados medibles definidos en los Criterios de Éxito
      - [ ] No se filtran detalles de implementación en la especificación
      
      ## Notas
      
      - Los elementos marcados como incompletos requieren actualizaciones de la especificación antes de `/speckit-clarify` o `/speckit-plan`
      ```

   b. **Ejecutar Comprobación de Validación**: Revisa la especificación contra cada elemento de la lista de control:
      - Para cada elemento, determina si pasa o falla.
      - Documenta los problemas específicos encontrados (cita las secciones relevantes de la especificación).

   c. **Manejar Resultados de Validación**:
      - **Si todos los elementos pasan**: Marca la lista de control como completa y procede a la sección de Hooks Obligatorios Posteriores a la Ejecución.
      - **Si fallan elementos (excluyendo [NEEDS CLARIFICATION])**:
        1. Enumera los elementos fallidos y los problemas específicos.
        2. Actualiza la especificación para abordar cada problema.
        3. Vuelve a ejecutar la validación hasta que todos los elementos pasen (máximo 3 iteraciones).
        4. Si sigue fallando después de 3 iteraciones, documenta los problemas restantes en las notas de la lista de control y advierte al usuario.
      - **Si quedan marcadores [NEEDS CLARIFICATION]**:
        1. Extrae todos los marcadores `[NEEDS CLARIFICATION: ...]` de la especificación.
        2. **COMPROBACIÓN DE LÍMITE**: Si existen más de 3 marcadores, conserva solo los 3 más críticos (por impacto de alcance/seguridad/experiencia de usuario) y realiza suposiciones fundamentadas para el resto.
        3. Para cada aclaración necesaria (máximo 3), presenta las opciones al usuario en este formato:

           ```markdown
           ## Pregunta [N]: [Tema]
           
           **Contexto**: [Cita la sección relevante de la especificación]
           
           **Lo que necesitamos saber**: [Pregunta específica del marcador de posición]
           
           **Respuestas sugeridas**:
           
           | Opción | Respuesta | Implicaciones |
           |--------|-----------|---------------|
           | A      | [Primera respuesta sugerida] | [Qué significa para la característica] |
           | B      | [Segunda respuesta sugerida] | [Qué significa para la característica] |
           | C      | [Tercera respuesta sugerida] | [Qué significa para la característica] |
           | Custom | Proporciona tu propia respuesta | [Explica cómo proporcionar entrada personalizada] |
           
           **Tu elección**: _[Espera respuesta del usuario]_
           ```

        4. **CRÍTICO - Formato de Tablas**: Asegúrate de que las tablas de markdown estén formateadas correctamente:
           - Usa un espaciado consistente con las barras verticales (`|`) alineadas.
           - Cada celda debe tener espacios alrededor del contenido: `| Contenido |` y no `|Contenido|`.
           - El separador de encabezado debe tener al menos 3 guiones: `|--------|`.
           - Comprueba que la tabla se renderiza correctamente en la vista previa de markdown.
        5. Numera las preguntas secuencialmente (Pregunta 1, Pregunta 2, Pregunta 3 — máximo 3 en total).
        6. Presenta todas las preguntas juntas antes de esperar respuestas.
        7. Espera a que el usuario responda con sus elecciones para todas las preguntas (ej. "Q1: A, Q2: Personalizado - [detalles], Q3: B").
        8. Actualiza la especificación reemplazando cada marcador `[NEEDS CLARIFICATION]` con la respuesta seleccionada o proporcionada por el usuario.
        9. Vuelve a ejecutar la validación después de que se resuelvan todas las aclaraciones.

   d. **Actualizar Lista de Control**: Después de cada iteración de validación, actualiza el archivo de la lista de control con el estado actual de aprobado/fallado.

## Hooks Obligatorios Posteriores a la Ejecución

**DEBES completar esta sección antes de informar la finalización al usuario.**

Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si no existe, o no hay hooks registrados bajo `hooks.after_specify`, salta al Reporte de Finalización.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_specify`.
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

Informa de la finalización al usuario con:
- `SPECIFY_FEATURE_DIRECTORY` — la ruta del directorio de la característica.
- `SPEC_FILE` — la ruta del archivo de especificación.
- Resumen de resultados de la lista de control de calidad.
- Preparación para la siguiente fase (`/speckit-clarify` o `/speckit-plan`).

**NOTA:** La creación de la rama git es manejada por el hook `before_specify` (extensión de git). La creación del directorio y del archivo de la especificación son siempre manejados por este comando principal.

## Directrices Rápidas

- Concéntrate en **QUÉ** necesitan los usuarios y **POR QUÉ**.
- Evita el **CÓMO** implementar (sin stack tecnológico, APIs o estructura de código).
- Escrito para partes interesadas del negocio, no para desarrolladores.
- **NO** crees listas de comprobación que estén incrustadas en la especificación. Eso será un comando separado.

### Requisitos de Sección

- **Secciones obligatorias**: Deben completarse para cada característica.
- **Secciones opcionales**: Inclúyelas solo cuando sean relevantes para la característica.
- Cuando una sección no aplique, elimínala por completo (no la dejes como "N/A").

### Para Generación de IA

Al crear esta especificación a partir de un prompt del usuario:

1. **Haz suposiciones fundamentadas**: Usa el contexto, los estándares de la industria y los patrones comunes para llenar vacíos.
2. **Documenta las suposiciones**: Registra los valores predeterminados razonables en la sección Suposiciones.
3. **Limita las aclaraciones**: Máximo 3 marcadores `[NEEDS CLARIFICATION]` — úsalos solo para decisiones críticas que afecten significativamente el alcance de la característica, tengan múltiples interpretaciones o carezcan de un valor por defecto razonable.
4. **Prioriza las aclaraciones**: alcance > seguridad/privacidad > experiencia del usuario > detalles técnicos.
5. **Piensa como un tester**: Cualquier requisito vago debe fallar en el elemento de la lista de comprobación de "requisito comprobable y no ambiguo".
6. **Áreas comunes que necesitan aclaración** (solo si no existe un valor predeterminado razonable):
   - Alcance y límites de la característica (incluir/excluir casos de uso específicos).
   - Tipos de usuario y permisos (si son posibles múltiples interpretaciones conflictivas).
   - Requisitos de seguridad/cumplimiento normativo (cuando sean legal o financieramente significativos).

**Ejemplos de valores predeterminados razonables** (no preguntes sobre estos):
- Retención de datos: Prácticas estándar de la industria para el dominio.
- Objetivos de rendimiento: Expectativas estándar para aplicaciones web/móviles a menos que se especifique lo contrario.
- Manejo de errores: Mensajes amigables para el usuario con alternativas adecuadas.
- Método de autenticación: Inicio de sesión estándar basado en sesiones o OAuth2 para aplicaciones web.
- Patrones de integración: Usa los patrones apropiados del proyecto (REST/GraphQL para servicios web, llamadas a funciones para bibliotecas, argumentos de CLI para herramientas, etc.).

### Pautas para Criterios de Éxito

Los criterios de éxito deben ser:
1. **Medibles**: Incluir métricas específicas (tiempo, porcentaje, cantidad, tasa).
2. **Agnósticos a la tecnología**: Sin mencionar frameworks, lenguajes, bases de datos ni herramientas.
3. **Enfocados en el usuario**: Describir los resultados desde la perspectiva del usuario o del negocio, no los internos del sistema.
4. **Verificables**: Que puedan ser probados/validados sin conocer los detalles de implementación.

**Buenos ejemplos**:
- "Los usuarios pueden completar el pago en menos de 3 minutos".
- "El sistema soporta 10,000 usuarios concurrentes".
- "El 95% de las búsquedas devuelven resultados en menos de 1 segundo".
- "La tasa de finalización de tareas mejora en un 40%".

**Malos ejemplos** (enfocados en la implementación):
- "El tiempo de respuesta de la API es inferior a 200ms" (demasiado técnico, usa "Los usuarios ven los resultados al instante").
- "La base de datos puede manejar 1000 TPS" (detalle de implementación, usa una métrica orientada al usuario).
- "Los componentes de React se renderizan eficientemente" (específico del framework).
- "Tasa de aciertos de caché de Redis superior al 80%" (específico de la tecnología).

## Listo Cuando

- [ ] La especificación está escrita en `SPEC_FILE` y validada contra la lista de control de calidad.
- [ ] Los hooks de extensión fueron despachados o ignorados de acuerdo con las reglas de Hooks Obligatorios anteriores.
- [ ] Se informa de la finalización al usuario mostrando el directorio de la característica, la ruta del archivo de especificación y los resultados de la lista de control.
