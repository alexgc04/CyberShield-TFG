---
name: "speckit-clarify"
description: "Identifica áreas subespecificadas en la especificación actual haciendo hasta 5 preguntas de aclaración muy dirigidas e incorporando las respuestas en la especificación."
argument-hint: "Áreas opcionales a aclarar en la especificación"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/clarify.md"
user-invocable: true
disable-model-invocation: false
---


## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de la aclaración)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_clarify`.
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

Objetivo: Detectar y reducir la ambigüedad o los puntos de decisión faltantes en la especificación activa de la característica y registrar las aclaraciones directamente en el archivo de especificación.

Nota: Se espera que este flujo de trabajo de aclaración se ejecute (y complete) ANTES de invocar `/speckit-plan`. Si el usuario indica explícitamente que se salta la aclaración, puedes continuar, pero debes advertir que aumenta el riesgo de tener que rehacer trabajo técnico posteriormente.

Pasos de ejecución:

1. Ejecuta `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` desde la raíz del repositorio **una vez** (modo combinado `-Json -PathsOnly`). Analiza los campos mínimos JSON:
   - `FEATURE_DIR`
   - `FEATURE_SPEC`
   - Si el análisis JSON falla, aborta e instruye al usuario para que vuelva a ejecutar `/speckit-specify` o verifique el entorno de la rama de la característica.
   - Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

2. **SI EXISTE**: Carga `.specify/memory/constitution.md` para los principios del proyecto y restricciones de gobernanza.

3. Carga el archivo de especificación actual. Realiza un escaneo estructurado de ambigüedades y cobertura utilizando esta taxonomía. Para cada categoría, marca el estado como: Claro (Clear) / Parcial (Partial) / Faltante (Missing). Produce un mapa interno de cobertura que usarás para priorizar (no muestres el mapa crudo en la salida a menos que no se vayan a hacer preguntas).

   Alcance Funcional y Comportamiento:
   - Objetivos principales del usuario y criterios de éxito.
   - Declaraciones explícitas de fuera de alcance.
   - Diferenciación de roles de usuario / personas.

   Dominio y Modelo de Datos:
   - Entidades, atributos, relaciones.
   - Reglas de identidad y unicidad.
   - Ciclo de vida / transiciones de estado.
   - Suposiciones de volumen / escala de datos.

   Interacción y Flujo de UX:
   - Viajes/secuencias críticas de usuario.
   - Estados de error/vacío/carga.
   - Notas de accesibilidad o localización.

   Atributos de Calidad No Funcionales:
   - Rendimiento (latencia, objetivos de rendimiento).
   - Escalabilidad (límites de escalado horizontal/vertical).
   - Fiabilidad y disponibilidad (tiempo de actividad, expectativas de recuperación).
   - Observabilidad (señales de logging, métricas y trazabilidad).
   - Seguridad y privacidad (autenticación/autorización, protección de datos, amenazas supuestas).
   - Cumplimiento normativo / restricciones legales (si las hay).

   Integración y Dependencias Externas:
   - Servicios/APIs externos y sus modos de fallo.
   - Formatos de importación/exportación de datos.
   - Suposiciones de protocolo/versión.

   Casos Extremos y Manejo de Fallos:
   - Escenarios negativos.
   - Limitación de tasa / estrangulamiento (throttling).
   - Resolución de conflictos (ej. ediciones concurrentes).

   Restricciones y Compensaciones (Tradeoffs):
   - Restricciones técnicas (lenguaje, almacenamiento, alojamiento).
   - Compensaciones explícitas o alternativas rechazadas.

   Terminología y Consistencia:
   - Términos del glosario canónico.
   - Sinónimos evitados / términos obsoletos.

   Señales de Finalización:
   - Comprobabilidad de los criterios de aceptación.
   - Indicadores medibles del estilo Definición de Hecho (DoD).

   Marcadores de Posición / Varios:
   - Marcadores TODO / decisiones sin resolver.
   - Adjetivos ambiguos ("robusto", "intuitivo") que carecen de cuantificación.

   Para cada categoría con estado Parcial o Faltante, añade una oportunidad de pregunta candidata a menos que:
   - La aclaración no cambie materialmente la implementación o la estrategia de validación.
   - Sea mejor aplazar la información a la fase de planificación (anótalo internamente).

4. Genera (internamente) una cola priorizada de preguntas de aclaración candidatas (máximo 5). NO las muestres todas a la vez. Aplica estas restricciones:
   - Máximo de 5 preguntas en total durante toda la sesión.
   - Cada pregunta debe responderse con:
     - Una selección corta de opción múltiple (2 a 5 opciones distintas y mutuamente excluyentes), O
     - Una respuesta corta de una palabra / frase corta (restringida explícitamente: "Responde en <=5 palabras").
   - Solo incluye preguntas cuyas respuestas afecten materialmente la arquitectura, el modelado de datos, el desglose de tareas, el diseño de pruebas, el comportamiento de UX, la preparación operativa o la validación de cumplimiento.
   - Asegura el equilibrio en la cobertura de categorías: intenta cubrir primero las categorías no resueltas de mayor impacto.
   - Excluye preguntas ya respondidas, preferencias estilísticas triviales o detalles de nivel de ejecución del plan.
   - Si quedan más de 5 categorías sin resolver, selecciona las 5 principales mediante la heurística (Impacto * Incertidumbre).

5. Bucle de preguntas secuenciales (interactivo):
   - Presenta EXACTAMENTE UNA pregunta a la vez.
   - Para preguntas de opción múltiple:
     - **Analiza todas las opciones** y determina la **opción más adecuada** basándote en mejores prácticas del proyecto, patrones comunes, reducción de riesgos y alineación con los objetivos del spec.
     - Presenta tu **opción recomendada de manera prominente** arriba con un razonamiento claro (1-2 frases explicando por qué es la mejor opción).
     - Formato: `**Recomendado:** Opción [X] - <razonamiento>`.
     - Luego muestra todas las opciones en una tabla markdown:
       | Opción | Descripción |
       |--------|-------------|
       | A | <Descripción opción A> |
       | B | <Descripción opción B> |
       | C | <Descripción opción C> |
     - Después de la tabla, añade: `Puedes responder con la letra de la opción (ej. "A"), aceptar la recomendación escribiendo "sí" o "recomendado", o proporcionar tu propia respuesta corta.`
   - Para el estilo de respuesta corta (sin opciones discretas significativas):
     - Proporciona tu **respuesta sugerida** basada en mejores prácticas y contexto.
     - Formato: `**Sugerido:** <tu respuesta propuesta> - <breve razonamiento>`.
     - Luego muestra: `Formato: Respuesta corta (<=5 palabras). Puedes aceptar la sugerencia respondiendo "sí" o "sugerido", o proporcionar tu propia respuesta.`
   - Después de que el usuario responda:
     - Si responde "sí", "recomendado" o "sugerido", usa tu recomendación/sugerencia previamente declarada como la respuesta.
     - De lo contrario, valida que la respuesta se mapee con una opción o cumpla con el límite de <=5 palabras.
     - Si es ambigua, pide una aclaración rápida (cuenta como la misma pregunta, no avances la cola).
     - Una vez satisfactoria, regístrala en la memoria de trabajo (no la escribas en disco todavía) y avanza a la siguiente pregunta de la cola.
   - Deja de hacer preguntas cuando:
     - Todas las ambigüedades críticas se resuelvan antes de tiempo, O
     - El usuario indique la finalización ("listo", "suficiente", "no más"), O
     - Llegues a las 5 preguntas formuladas.
   - Nunca reveles preguntas futuras de la cola con anticipación.
   - Si no existen preguntas válidas al inicio, reporta inmediatamente que no hay ambigüedades críticas.

6. Integración después de CADA respuesta aceptada:
   - Mantén en memoria la representación del spec cargado al inicio junto con el contenido del archivo.
   - Para la primera respuesta integrada de la sesión:
     - Asegúrate de que exista una sección `## Aclaraciones` (o `## Clarifications`) (créala justo después de la sección de descripción general si falta).
     - Bajo ella, crea una subcabecera `### Sesión YYYY-MM-DD` con la fecha de hoy.
   - Añade una línea de punto de viñeta inmediatamente después de la aceptación: `- Q: <pregunta> → A: <respuesta final>`.
   - Luego, aplica inmediatamente la aclaración en la sección o secciones más apropiadas:
     - Ambigüedad funcional → Actualiza o añade un punto en Requisitos Funcionales.
     - Interacción del usuario / distinción de actores → Actualiza Historias de Usuario o Actores.
     - Datos / entidades → Actualiza el Modelo de Datos (añade campos, tipos, relaciones).
     - Restricción no funcional → Añade/modifica criterios medibles en Criterios de Éxito.
     - Caso extremo / flujo negativo → Añade una nueva viñeta en Casos Extremos / Manejo de Errores.
     - Conflicto de terminología → Normaliza el término en la especificación.
   - Si la aclaración invalida una declaración ambigua anterior, reemplaza dicha declaración; no dejes texto contradictorio obsoleto.
   - Guarda el archivo de especificación DESPUÉS de cada integración para minimizar el riesgo de pérdida de contexto (escritura atómica).
   - Preserva el formato y mantén cada aclaración insertada minimal y comprobable.

7. Validación (después de cada escritura y pasada final):
   - La sesión de aclaraciones contiene exactamente un punto por respuesta aceptada (sin duplicados).
   - Total de preguntas formuladas y aceptadas ≤ 5.
   - Las secciones actualizadas no contienen marcadores de posición vagos que la nueva respuesta debía resolver.
   - No quedan declaraciones contradictorias anteriores.
   - La estructura de Markdown es válida.

8. Escribe la especificación actualizada de nuevo en `FEATURE_SPEC`.

9. **Re-validar la Lista de Control de Calidad de la Espec.** (si existe):
   - Comprueba si existe `FEATURE_DIR/checklists/requirements.md`.
   - Si no existe, omite este paso silenciosamente.
   - Si existe:
     1. Lee el archivo de la lista de control.
     2. Identifica todas las líneas de casillas de verificación (`- [ ]`, `- [x]`, `- [X]`) fuera de bloques de código.
     3. Registra el estado actual de cada casilla en una lista de instantánea inicial.
     4. Vuelve a evaluar cada elemento de la lista contra la especificación actualizada.
     5. Actualiza solo las casillas de verificación cuyo estado de aprobación cambie:
        - Si pasa y estaba desmarcado: cambia `[ ]` a `[x]`.
        - Si falla y estaba marcado: cambia `[x]`/`[X]` a `[ ]`.
     6. Guarda el archivo de la lista de control actualizada preservando el resto del contenido del archivo intacto.
     7. Compara el estado anterior y el actual para calcular las listas del reporte:
        - **Nuevos aprobados**: elementos que pasaron de desmarcados a marcados.
        - **Regresiones**: elementos que pasaron de marcados a desmarcados.
        - **Siguen desmarcados**: elementos que permanecen desmarcados.
     8. Registra el conteo de aprobación antes/después (ej. "Lista de Calidad: 12/16 → 15/16 elementos aprobados").

Reglas de comportamiento:
- Si no se encuentran ambigüedades significativas, responde: "No se detectaron ambigüedades críticas que requieran aclaración formal." y sugiere proceder.
- Si falta el archivo de especificación, instruye al usuario para que ejecute primero `/speckit-specify` (no crees una especificación nueva aquí).
- Nunca excedas las 5 preguntas formuladas en total.
- Respeta las señales del usuario para terminar antes de tiempo ("detente", "listo", "proceder").

## Hooks Obligatorios Posteriores a la Ejecución

**DEBES completar esta sección antes de informar la finalización al usuario.**

Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si no existe, o no hay hooks registrados bajo `hooks.after_clarify`, salta al Reporte de Finalización.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_clarify`.
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

Informa de la finalización al usuario mostrando:
- Número de preguntas formuladas y respondidas.
- Ruta de la especificación actualizada.
- Secciones modificadas (lista de nombres).
- Estado de la lista de calidad de la especificación (si se revalidó): muestra el conteo de elementos aprobados antes/después y los detalles de cambios de estado o elementos pendientes.
- Tabla de resumen de cobertura que liste cada categoría de la taxonomía con su Estado: Resuelto (addressed), Aplazado (Deferred), Claro (Clear) o Pendiente (Outstanding).
- Sugerencia del siguiente comando.
