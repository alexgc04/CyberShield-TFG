---
name: "speckit-checklist"
description: "Genera una lista de control (checklist) personalizada para la característica actual basada en los requisitos del usuario."
argument-hint: "Dominio o área de enfoque para la lista de control"
compatibility: "Requiere la estructura de proyecto spec-kit con el directorio .specify/"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/checklist.md"
user-invocable: true
disable-model-invocation: false
---


## Propósito de la Lista de Control: "Pruebas Unitarias para el Español"

**CONCEPTO CRÍTICO**: Las listas de control son **PRUEBAS UNITARIAS PARA LA REDACCIÓN DE REQUISITOS** - validan la calidad, claridad e integridad de los requisitos en un dominio determinado.

**NO para verificación/pruebas de código**:
- ❌ NO "Verificar que el botón hace clic correctamente"
- ❌ NO "Probar que el manejo de errores funciona"
- ❌ NO "Confirmar que la API devuelve 200"
- ❌ NO comprobar si el código/implementación coincide con la especificación

**SÍ para la validación de calidad de requisitos**:
- ✅ "¿Están definidos los requisitos de jerarquía visual para todos los tipos de tarjetas?" (integridad)
- ✅ "¿Se cuantifica la 'visualización prominente' con dimensiones/posicionamiento específicos?" (claridad)
- ✅ "¿Son consistentes los requisitos de estado hover en todos los elementos interactivos?" (consistencia)
- ✅ "¿Se definen requisitos de accesibilidad para la navegación por teclado?" (cobertura)
- ✅ "¿Define la especificación qué sucede cuando la imagen del logotipo no se carga?" (casos extremos)

**Metáfora**: Si tu especificación fuera código escrito en español, la lista de control sería su suite de pruebas unitarias. Estás probando si los requisitos están bien escritos, completos, sin ambigüedades y listos para la implementación - NO si la implementación funciona.

## Entrada del Usuario

```text
$ARGUMENTS
```

**DEBES** considerar la entrada del usuario antes de proceder (si no está vacía).

## Comprobaciones Previas a la Ejecución

**Comprobar hooks de extensión (antes de generar la lista de control)**:
- Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.before_checklist`.
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

    Espera el resultado del comando del hook antes de proceder a los Pasos de Ejecución.
    ```
- Si no hay hooks registrados o `.specify/extensions.yml` no existe, omítelo silenciosamente.

## Pasos de Ejecución

1. **Configuración**: Ejecuta `.specify/scripts/powershell/check-prerequisites.ps1 -Json` desde la raíz del repositorio y analiza la salida JSON para obtener `FEATURE_DIR` y la lista `AVAILABLE_DOCS`.
   - Todas las rutas de archivos deben ser absolutas.
   - Para comillas simples en los argumentos como "I'm Groot", usa la sintaxis de escape: ej. 'I'\''m Groot' (o comillas dobles si es posible: "I'm Groot").

2. **SI EXISTE**: Carga `.specify/memory/constitution.md` para los principios del proyecto y restricciones de gobernanza.

3. **Aclarar intención (dinámica)**: Deriva hasta TRES preguntas aclaratorias iniciales contextuales (sin catálogo preestablecido). Estas DEBEN:
   - Ser generadas a partir de la frase del usuario + señales extraídas de spec/plan/tasks.
   - Preguntar únicamente sobre información que cambie materialmente el contenido de la lista de control.
   - Omitirse individualmente si ya no hay ambigüedad en `$ARGUMENTS`.
   - Preferir la precisión sobre la amplitud.

   Algoritmo de generación:
   1. Extrae señales: palabras clave del dominio (ej. autenticación, latencia, UX, API), indicadores de riesgo ("crítico", "debe", "cumplimiento"), pistas sobre las partes interesadas ("QA", "revisión", "equipo de seguridad") y entregables explícitos ("accesibilidad", "rollback", "contratos").
   2. Agrupa señales en áreas de enfoque candidatas (máximo 4) clasificadas por relevancia.
   3. Identifica la audiencia probable y el momento (autor, revisor, QA, lanzamiento) si no es explícito.
   4. Detecta dimensiones faltantes: amplitud de alcance, profundidad/rigor, énfasis en riesgos, límites de exclusión, criterios de aceptación medibles.
   5. Formula preguntas elegidas a partir de estos arquetipos:
      - Refinamiento de alcance (ej. "¿Debería esto incluir puntos de contacto de integración con X e Y o limitarse a la corrección del módulo local?")
      - Priorización de riesgos (ej. "¿Cuál de estas áreas de riesgo potencial debería recibir comprobaciones de control obligatorias?")
      - Calibración de profundidad (ej. "¿Es esta una lista de control ligera previa al commit o una puerta de control formal de lanzamiento?")
      - Enfoque de audiencia (ej. "¿Será usada únicamente por el autor o por los compañeros durante la revisión del PR?")
      - Exclusión de límites (ej. "¿Deberíamos excluir explícitamente los elementos de optimización de rendimiento en esta ronda?")
      - Brecha de clase de escenario (ej. "No se detectaron flujos de recuperación—¿están en alcance las rutas de rollback o de fallo parcial?")

   Reglas de formato de preguntas:
   - Si presentas opciones, genera una tabla compacta con las columnas: Opción | Candidata | Por qué importa.
   - Limita de A a E opciones como máximo; omite la tabla si una respuesta libre es más clara.
   - Nunca le pidas al usuario que repita lo que ya ha dicho.
   - Evita categorías especulativas (sin alucinaciones). Si no estás seguro, pregunta explícitamente: "Confirma si X pertenece al alcance".

   Valores por defecto si no es posible la interacción:
   - Profundidad: Estándar
   - Audiencia: Revisor (PR) si está relacionado con el código; Autor en caso contrario.
   - Enfoque: Los 2 grupos de señales más relevantes.

   Muestra las preguntas (etiquetadas como Q1/Q2/Q3). Tras las respuestas: si ≥2 clases de escenario (Flujo Alternativo / Excepción / Recuperación / dominio No Funcional) siguen sin estar claras, PUEDES hacer hasta DOS preguntas de seguimiento más dirigidas (Q4/Q5) con una justificación de una línea cada una (ej. "Riesgo de ruta de recuperación sin resolver"). No excedas de cinco preguntas en total. Salta este paso si el usuario declina explícitamente más interacción.

4. **Comprender solicitud del usuario**: Combina `$ARGUMENTS` + respuestas aclaratorias:
   - Deriva el tema de la lista de control (ej. seguridad, revisión, despliegue, ux).
   - Consolida los elementos obligatorios explícitos mencionados por el usuario.
   - Mapea las selecciones de enfoque al andamiaje de categorías.
   - Infiere cualquier contexto faltante de spec/plan/tasks (NO alucines).

5. **Cargar contexto de la característica**: Lee desde `FEATURE_DIR`:
   - `spec.md`: Requisitos y alcance de la característica.
   - `plan.md` (si existe): Detalles técnicos, dependencias.
   - `tasks.md` (si existe): Tareas de implementación.

   Estrategia de carga de contexto:
   - Carga solo las partes necesarias relevantes para las áreas de enfoque activas (evita volcar el archivo completo).
   - Prefiere resumir secciones largas en puntos concisos de escenarios/requisitos.
   - Usa la divulgación progresiva: añade búsquedas de seguimiento solo si se detectan brechas.
   - Si los documentos de origen son grandes, genera resúmenes intermedios en lugar de incrustar texto crudo.

6. **Generar lista de control** - Crea "Pruebas Unitarias para Requisitos":
   - Crea el directorio `FEATURE_DIR/checklists/` si no existe.
   - Genera un nombre de archivo único para la lista de control:
     - Usa un nombre corto y descriptivo basado en el dominio (ej. `ux.md`, `api.md`, `security.md`).
     - Formato: `[dominio].md`.
   - Comportamiento de manejo de archivos:
     - Si el archivo NO existe: Crea un archivo nuevo y numera los elementos empezando desde `CHK001`.
     - Si el archivo existe: Añade los nuevos elementos al final del archivo existente, continuando la numeración del último ID `CHK` (ej. si el último es `CHK015`, empieza en `CHK016`).
     - Nunca elimines ni reemplaces el contenido existente de la lista de control — siempre presérvalo y añádelo al final.

   **PRINCIPIO CLAVE - Prueba los Requisitos, No la Implementación**:
   Cada elemento de la lista de control DEBE evaluar los REQUISITOS MISMOS respecto a:
   - **Integridad**: ¿Están presentes todos los requisitos necesarios?
   - **Claridad**: ¿Los requisitos son específicos y no ambiguos?
   - **Consistencia**: ¿Se alinean los requisitos entre sí?
   - **Medibilidad**: ¿Se pueden verificar los requisitos objetivamente?
   - **Cobertura**: ¿Se abordan todos los escenarios y casos extremos?

   **Estructura de Categorías** - Agrupa los elementos según las dimensiones de calidad de los requisitos:
   - **Integridad de Requisitos** (¿Están documentados todos los requisitos necesarios?)
   - **Claridad de Requisitos** (¿Los requisitos son específicos y no ambiguos?)
   - **Consistencia de Requisitos** (¿Se alinean los requisitos sin conflictos?)
   - **Calidad de Criterios de Aceptación** (¿Son medibles los criterios de éxito?)
   - **Cobertura de Escenarios** (¿Se abordan todos los flujos/casos?)
   - **Cobertura de Casos Extremos** (¿Están definidas las condiciones límite?)
   - **Requisitos No Funcionales** (Rendimiento, Seguridad, Accesibilidad, etc. - ¿están especificados?)
   - **Dependencias y Suposiciones** (¿Están documentadas y validadas?)
   - **Ambigüedades y Conflictos** (¿Qué necesita aclaración?)

   **CÓMO REDACTAR ELEMENTOS DE LA LISTA DE CONTROL - "Pruebas Unitarias para el Español"**:

   ❌ **INCORRECTO** (Prueba de implementación):
   - "Verificar que la página de inicio muestra 3 tarjetas de episodios"
   - "Probar que los estados hover funcionan en escritorio"
   - "Confirmar que al hacer clic en el logotipo se navega al inicio"

   ✅ **CORRECTO** (Prueba de calidad de los requisitos):
   - "¿Están especificados el número exacto y la disposición de los episodios destacados? [Integridad]"
   - "¿Se cuantifica la 'visualización prominente' con dimensiones/posicionamiento específicos? [Claridad]"
   - "¿Son consistentes los requisitos de estado hover en todos los elementos interactivos? [Consistencia]"
   - "¿Se definen los requisitos de navegación por teclado para toda la UI interactiva? [Cobertura]"
   - "¿Está especificado el comportamiento de contingencia cuando la imagen del logotipo no se carga? [Casos Extremos]"
   - "¿Se definen estados de carga para los datos asíncronos de los episodios? [Integridad]"
   - "¿Define la especificación la jerarquía visual para elementos de la UI que compiten entre sí? [Claridad]"

   **ESTRUCTURA DE LOS ELEMENTOS**:
   Cada elemento debe seguir este patrón:
   - Formato de pregunta que indague sobre la calidad del requisito.
   - Enfoque en lo que está ESCRITO (o no escrito) en la especificación/plan.
   - Incluir la dimensión de calidad entre corchetes `[Integridad/Claridad/Consistencia/etc.]`.
   - Referenciar la sección de la especificación `[Spec §X.Y]` al comprobar requisitos existentes.
   - Usar el marcador `[Brecha]` o `[Gap]` al comprobar requisitos faltantes.

   **EJEMPLOS POR DIMENSIÓN DE CALIDAD**:
   
   Integridad:
   - "¿Se definen requisitos de manejo de errores para todos los modos de fallo de la API? [Brecha]"
   - "¿Están especificados los requisitos de accesibilidad para todos los elementos interactivos? [Integridad]"
   - "¿Se definen requisitos de puntos de ruptura móviles para diseños responsivos? [Brecha]"

   Claridad:
   - "¿Se cuantifica la 'carga rápida' con umbrales de tiempo específicos? [Claridad, Spec §NFR-2]"
   - "¿Están definidos explícitamente los criterios de selección de 'episodios relacionados'? [Claridad, Spec §FR-5]"
   - "¿Se define 'prominente' con propiedades visuales medibles? [Ambigüedad, Spec §FR-4]"

   Consistencia:
   - "¿Se alinean los requisitos de navegación en todas las páginas? [Consistencia, Spec §FR-10]"
   - "¿Son consistentes los requisitos del componente de tarjeta entre la página de inicio y la de detalle? [Consistencia]"

   Cobertura:
   - "¿Se definen requisitos para escenarios de estado vacío (sin episodios)? [Cobertura, Caso Extremo]"
   - "¿Se abordan los escenarios de interacción de usuarios concurrentes? [Cobertura, Brecha]"
   - "¿Se especifican requisitos para fallos de carga parcial de datos? [Cobertura, Flujo de Excepción]"

   Medibilidad:
   - "¿Son medibles/comprobables los requisitos de jerarquía visual? [Criterios de Aceptación, Spec §FR-1]"
   - "¿Se puede verificar objetivamente el 'peso visual equilibrado'? [Medibilidad, Spec §FR-2]"

   **Clasificación y Cobertura de Escenarios** (Enfoque en Calidad de Requisitos):
   - Comprueba si existen requisitos para escenarios: Principal, Alternativo, Excepción/Error, Recuperación, No Funcionales.
   - Para cada clase de escenario, pregunta: "¿Son completos, claros y consistentes los requisitos de [tipo de escenario]?"
   - Si falta una clase de escenario: "¿Están los requisitos de [tipo de escenario] omitidos intencionadamente o faltan? [Brecha]"
   - Incluye resiliencia/rollback cuando ocurra mutación de estado: "¿Se definen requisitos de rollback para fallos en las migraciones? [Brecha]"

   **Requisitos de Trazabilidad**:
   - MÍNIMO: El ≥80% de los elementos DEBEN incluir al menos una referencia de trazabilidad.
   - Cada elemento debe referenciar: sección de la especificación `[Spec §X.Y]`, o usar marcadores: `[Brecha]`, `[Ambigüedad]`, `[Conflicto]`, `[Suposición]`.
   - Si no existe un sistema de IDs: "¿Se ha establecido un esquema de IDs para requisitos y criterios de aceptación? [Trazabilidad]"

   **Identificar y Resolver Problemas** (Problemas de Calidad de Requisitos):
   Haz preguntas sobre los requisitos mismos:
   - Ambigüedades: "¿Se cuantifica el término 'rápido' con métricas específicas? [Ambigüedad, Spec §NFR-1]"
   - Conflictos: "¿Entran en conflicto los requisitos de navegación entre §FR-10 y §FR-10a? [Conflicto]"
   - Suposiciones: "¿Está validada la suposición de 'API de podcasts siempre disponible'? [Suposición]"
   - Dependencias: "¿Están documentados los requisitos de la API externa de podcasts? [Dependencia, Brecha]"
   - Definiciones faltantes: "¿Se define la 'jerarquía visual' con criterios medibles? [Brecha]"

   **Consolidación de Contenido**:
   - Límite sugerido: Si los elementos candidatos superan los 40, prioriza por riesgo/impacto.
   - Fusiona duplicados cercanos que comprueben el mismo aspecto del requisito.
   - Si hay >5 casos extremos de bajo impacto, crea un solo elemento: "¿Se abordan los casos extremos X, Y, Z en los requisitos? [Cobertura]"

   **🚫 ABSOLUTAMENTE PROHIBIDO** - Esto haría que fuera una prueba de implementación, no de requisitos:
   - ❌ Cualquier elemento que empiece con "Verificar", "Probar", "Confirmar", "Comprobar" + comportamiento de la implementación.
   - ❌ Referencias a la ejecución de código, acciones del usuario en tiempo de ejecución o comportamiento del sistema instalado.
   - ❌ "Se muestra correctamente", "funciona adecuadamente", "funciona como se espera".
   - ❌ "Hacer clic", "navegar", "renderizar", "cargar", "ejecutar".
   - ❌ Casos de prueba, planes de prueba, procedimientos de QA de código.
   - ❌ Detalles de implementación (frameworks, APIs de código, algoritmos).

   **✅ PATRONES REQUERIDOS** - Estos prueban la calidad de los requisitos:
   - ✅ "¿Están definidos/especificados/documentados los [tipo de requisito] para [escenario]?"
   - ✅ "¿Se cuantifica/aclara [término vago] con criterios específicos?"
   - ✅ "¿Son consistentes los requisitos entre [sección A] y [sección B]?"
   - ✅ "¿Puede el [requisito] medirse/verificarse objetivamente?"
   - ✅ "¿Se abordan [casos extremos/escenarios] en los requisitos?"
   - ✅ "¿Define la especificación [aspecto faltante]?"

7. **Referencia de Estructura**: Genera la lista de control siguiendo la plantilla canónica en `.specify/templates/checklist-template.md` para el título, la sección meta, los encabezados de categoría y el formato de IDs. Si la plantilla no está disponible, usa: título H1, líneas meta de propósito/creación, secciones de categoría `##` que contengan líneas `- [ ] CHK### <elemento de requisito>` con IDs globales incrementales que comiencen en CHK001.

8. **Reporte**: Muestra la ruta completa del archivo de la lista de control, el conteo de elementos y resume si la ejecución creó un nuevo archivo o lo añadió al final de uno existente. Resume:
   - Áreas de enfoque seleccionadas.
   - Nivel de profundidad.
   - Actor/momento de ejecución.
   - Cualquier elemento obligatorio especificado por el usuario que haya sido incorporado.

**Importante**: Cada invocación del comando `/speckit-checklist` utiliza un nombre de archivo corto y descriptivo para la lista de control, y crea un nuevo archivo o añade elementos al final del existente. Esto permite:
- Múltiples listas de control de diferentes tipos (ej. `ux.md`, `test.md`, `security.md`).
- Nombres de archivo simples y memorables que indiquen el propósito de la lista.
- Fácil identificación y navegación en la carpeta `checklists/`.

Para evitar desorden, usa tipos descriptivos y limpia las listas de control obsoletas cuando termines.

## Ejemplos de Tipos de Listas de Control y Elementos de Muestra

**Calidad de Requisitos de UX:** `ux.md`
Elementos de muestra (prueban la calidad de los requisitos, NO la implementación):
- "¿Están definidos los requisitos de jerarquía visual con criterios medibles? [Claridad, Spec §FR-1]"
- "¿Se especifica explícitamente el número y posicionamiento de los elementos de la UI? [Integridad, Spec §FR-1]"
- "¿Están definidos de forma consistente los requisitos de estado de interacción (hover, focus, activo)? [Consistencia]"
- "¿Se especifican requisitos de accesibilidad para todos los elementos interactivos? [Cobertura, Brecha]"
- "¿Está definido el comportamiento de contingencia cuando las imágenes no se cargan? [Caso Extremo, Brecha]"
- "¿Se puede medir objetivamente la 'visualización prominente'? [Medibilidad, Spec §FR-4]"

**Calidad de Requisitos de API:** `api.md`
Elementos de muestra:
- "¿Se especifican formatos de respuesta de error para todos los escenarios de fallo? [Integridad]"
- "¿Se cuantifican los requisitos de limitación de tasa con umbrales específicos? [Claridad]"
- "¿Son consistentes los requisitos de autenticación en todos los endpoints? [Consistencia]"
- "¿Se definen requisitos de reintentos/timeouts para las dependencias externas? [Cobertura, Brecha]"
- "¿Está documentada la estrategia de versionado en los requisitos? [Brecha]"

**Calidad de Requisitos de Rendimiento:** `performance.md`
Elementos de muestra:
- "¿Se cuantifican los requisitos de rendimiento con métricas específicas? [Claridad]"
- "¿Se definen objetivos de rendimiento para todos los viajes críticos del usuario? [Cobertura]"
- "¿Se especifican requisitos de rendimiento bajo diferentes condiciones de carga? [Integridad]"
- "¿Pueden medirse objetivamente los requisitos de rendimiento? [Medibilidad]"
- "¿Se definen requisitos de degradación para escenarios de alta carga? [Caso Extremo, Brecha]"

**Calidad de Requisitos de Seguridad:** `security.md`
Elementos de muestra:
- "¿Se especifican requisitos de autenticación para todos los recursos protegidos? [Cobertura]"
- "¿Se definen requisitos de protección de datos para la información sensible? [Integridad]"
- "¿Está documentado el modelo de amenazas y se alinean los requisitos con él? [Trazabilidad]"
- "¿Son los requisitos de seguridad consistentes con las obligaciones de cumplimiento normativo? [Consistencia]"
- "¿Se definen requisitos de respuesta ante fallos de seguridad/brechas? [Brecha, Flujo de Excepción]"

## Anti-Ejemplos: Lo que NO se debe hacer

**❌ INCORRECTO - Prueban la implementación, no los requisitos:**
```markdown
- [ ] CHK001 - Verificar que la página de inicio muestra 3 tarjetas de episodios [Spec §FR-001]
- [ ] CHK002 - Probar que los estados hover funcionan correctamente en escritorio [Spec §FR-003]
- [ ] CHK003 - Confirmar que al hacer clic en el logotipo se navega a la página de inicio [Spec §FR-010]
- [ ] CHK004 - Comprobar que la sección de episodios relacionados muestra de 3 a 5 elementos [Spec §FR-005]
```

**✅ CORRECTO - Prueban la calidad de los requisitos:**
```markdown
- [ ] CHK001 - ¿Están explícitamente especificados el número y la disposición de los episodios destacados? [Integridad, Spec §FR-001]
- [ ] CHK002 - ¿Están definidos de forma consistente los requisitos de estado hover para todos los elementos interactivos? [Consistencia, Spec §FR-003]
- [ ] CHK003 - ¿Son claros los requisitos de navegación para todos los elementos de marca clickables? [Claridad, Spec §FR-010]
- [ ] CHK004 - ¿Está documentado el criterio de selección de episodios relacionados? [Brecha, Spec §FR-005]
- [ ] CHK005 - ¿Se definen requisitos de estados de carga para los datos asíncronos de los episodios? [Brecha]
- [ ] CHK006 - ¿Pueden medirse objetivamente los requisitos de "jerarquía visual"? [Medibilidad, Spec §FR-001]
```

**Diferencias Clave:**
- Incorrecto: Prueba si el sistema funciona correctamente.
- Correcto: Prueba si los requisitos están escritos correctamente.
- Incorrecto: Verificación del comportamiento en tiempo de ejecución.
- Correcto: Validación de la calidad del requisito escrito.
- Incorrecto: "¿Hace el sistema X?"
- Correcto: "¿Está X claramente especificado?"

## Comprobaciones Posteriores a la Ejecución

**Comprobar hooks de extensión (después de generar la lista de control)**:
Comprueba si `.specify/extensions.yml` existe en la raíz del proyecto.
- Si existe, léelo y busca entradas bajo la clave `hooks.after_checklist`.
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
