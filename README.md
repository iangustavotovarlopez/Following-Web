# Following Web

Aplicación frontend independiente para consumir la API de Following.

## Desarrollo

Instala dependencias y levanta la aplicación:

```bash
npm install
npm run dev
```

La aplicación utiliza por defecto la API relativa:

```text
/following/api
```

En desarrollo, Vite redirige esa ruta hacia:

```text
http://localhost:8080
```

La vista inicial incluye tablas y formularios de alta para:

- Companies.
- Collaborators.
- Projects.
- Services y sus catálogos.
- Requirements, Scopes y Entregables.

Companies, Services, People, Proyectos y Requirements organizan sus catálogos en pestañas. En esas
secciones, los filtros se muestran sobre la tabla, y las altas y ediciones se
realizan desde modales con acciones por fila para editar o desactivar.

También incluye operaciones relacionadas con selectores alimentados desde la
API para:

- Periods, subperiods, sections y fractions.
- Branches, specialities, skills, skill levels, teams y deliverables.
- Specialities y niveles de skills de colaboradores.
- Planning de proyectos.
- Ambientes y metadata asignados a servicios.

La sección de staffing carga los estados desde `/staffing/v0/states` para el
selector de alta y permite filtrar las solicitudes por periodo, subperiodo,
sección, fracción, especialidad y estado, dentro de la compañía y branch
globales. **Nuevo +** abre el modal del agrupador sin texto de solicitud,
proyecto ni capacidad.
La vista de
detalle de proyecto consume las fechas que devuelve la API dentro de la
planeación, sin volver a consultar cada catálogo de periodos y secciones.

Al entrar al panel aparece un modal para seleccionar **compañía y branch**.
Si la compañía tiene branches, debe elegirse una para continuar; si no tiene,
se permite continuar y crearla desde Companies → Branches. Si la base está
vacía, se permite entrar para crear la primera compañía. Un error de carga no
se interpreta como un catálogo vacío y ofrece reintentar.

Ambos selectores globales permanecen visibles en la barra superior al hacer
scroll, también en pantallas pequeñas. Cambiar la compañía limpia la branch
anterior y carga únicamente sus branches. Los selectores consultan todas las
páginas y se actualizan tras crear, editar o eliminar compañías y branches.
La selección no se guarda entre recargas del panel.

Las consultas de colaboradores, proyectos, staffing, branches y planeación
usan la compañía global. Technologies, especialidades, skills, niveles,
equipos, entregables y sus relaciones usan también la branch global, sin
selectores locales duplicados. Cambiar ese contexto reinicia los filtros,
formularios y selecciones dependientes para evitar mezclar registros.
El alta de staffing consulta los periodos de la compañía y las especialidades
de la branch global, sin depender de seleccionar un proyecto. El API filtra
compañía y branch antes de paginar; no se filtra una página usando un catálogo
parcial de proyectos.
Los catálogos independientes de branch conservan su ámbito original y los
campos de compañía en formularios de alta/edición siguen permitiendo asignar o
cambiar la relación del registro, salvo la compañía de un proyecto existente,
que es de solo lectura porque su API no permite cambiarla. Después de la selección inicial, limpiar la
compañía permite los listados globales que ya admitían esa consulta.

Proyectos tiene las pestañas **Proyectos** y **Planning**, ambas independientes
de branch y limitadas por la compañía global. Proyectos muestra filtros de
código, nombre y estado, el botón **Nuevo +**, y acciones por fila para editar,
dar de baja y desplegar detalles. Las altas, ediciones y la administración de
estados se realizan en modales. La baja asigna el estado Inactivo y conserva la
planeación; requiere un estado Inactivo con `isActive=true` en el API.

El icono de detalles muestra debajo del proyecto su planeación activa en una
tabla con periodos, subperiodos, secciones y fracciones, sus fechas y estados,
sin abrir otra ventana. La pestaña Planning permite seleccionar un proyecto,
consultar sus planeaciones y expandir su jerarquía. **Nuevo +** abre el modal
para crear una planeación a partir de un periodo activo de la compañía del
proyecto. Esta creación se trasladó desde Relaciones avanzadas; las demás
asignaciones de planeación permanecen allí y se actualizan tras las mutaciones.
El API sigue permitiendo una sola planeación activa por proyecto y sus errores
se muestran sin reemplazar automáticamente la existente.

En Collaborators, el icono de tabla en la columna de acciones permite desplegar
y contraer los roles, especialidades y tecnologías debajo de la misma fila.
Las tablas anidadas consultan la API al abrirse, muestran estados de carga,
errores y relaciones vacías, y no abren otra ventana. Cambiar la compañía o
aplicar filtros cierra los detalles desplegados.

En Companies → Technologies, el botón **Más detalles** de cada tecnología
despliega una tabla de sus **Habilidades**, con nombre, descripción y estado.
Cada habilidad tiene su propio botón de detalles para mostrar una segunda
tabla anidada de **Niveles de habilidad**, con nombre, número y estado.
Las consultas cargan todas las páginas del catálogo al abrir el detalle,
muestran errores con opción de reintentar y distinguen un resultado vacío.

**Nuevo +** permite crear habilidades y niveles desde sus respectivas tablas,
también cuando están vacías. Los formularios usan modales y conservan la
compañía, branch, tecnología y habilidad de la fila seleccionada, sin pedir
selectores adicionales. Los modales se muestran mediante portal y las
respuestas de un contexto anterior no alteran el nuevo contexto.
Tecnologías, habilidades y niveles incluyen acciones de **Editar** y
**Eliminar**. La edición abre un modal precargado: nombre, descripción y estado
para habilidades; nombre, número y estado para niveles. Los padres se conservan.
Eliminar pide confirmación y realiza una baja lógica (`isActive=false`), sin
borrar descendientes ni asignaciones personales. Los inactivos siguen visibles,
con eliminar deshabilitado en habilidades/niveles y opción de reactivar al editar.
El número de nivel sigue aceptando cero y exige un entero no negativo; al editar
otro campo no se reenvía un número que no cambió.
Crear, editar o desactivar una habilidad recarga solo sus habilidades; las
mutaciones de un nivel recargan solo los niveles de esa habilidad, sin cerrar
sus detalles. Cambiar compañía,
branch o filtros de tecnologías cierra los detalles desplegados.
Estos catálogos se trasladaron desde **Additional catalogs**, que conserva
entregables y asignación de miembros; no se duplican los formularios.
Se reutilizan los GET/POST existentes y se añaden PATCH/DELETE de skills y levels.
Las rutinas de escritura correspondientes se incluyen en ambos V1 del backend
y deben estar instaladas antes de utilizar estas acciones. Los contratos que
consume Android no cambian; su interfaz actual no administra estos catálogos.

Cada tabla de detalle incluye **Añadir**, que abre un modal para asignar un rol,
una especialidad o una tecnología al colaborador de esa fila. El modal muestra
opciones activas no asignadas; especialidades y tecnologías se consultan por
la branch global dentro de la compañía del colaborador. La página independiente
de detalle conserva su selector de branch de esa compañía, sin depender del
contexto del panel. Al guardar se actualizan las
tablas sin cerrar la fila. Los colaboradores inactivos no permiten nuevas
asignaciones desde este flujo.

Las consultas paginadas de los modales interpretan `204 No Content` como un
catálogo vacío, no como un error. La tabla de tecnologías usa el código y nombre
incluidos en la respuesta de relaciones del colaborador, sin consultar los
catálogos de todas las branches. Los errores reales de la API siguen mostrándose.

En People → Teams, el icono de tabla de cada equipo carga sus miembros debajo
de la fila, sin abrir otra página. La tabla anidada muestra código, colaborador,
fecha de ingreso y estado, incluyendo integrantes inactivos mediante
`includeInactive=true`. Consulta todas las páginas y permite reintentar errores.
La aplicación concatena `name`, `secondName`, `thirdName`, `lastname`,
`secondLastname` y `thirdLastname` para mostrar el nombre completo en la tabla,
el modal de edición y la confirmación de baja. Omite partes nulas o vacías y
espacios sobrantes en sus extremos. El API conserva cada campo por separado;
no devuelve un nombre concatenado.
El botón **Añadir +** está disponible también cuando el equipo no tiene
integrantes y abre un modal de asignación. La búsqueda en la aplicación acepta
código, nombres o apellidos a partir de tres caracteres, sobre todas las
páginas de colaboradores de la compañía del equipo. Excluye colaboradores
inactivos y relaciones ya activas; una relación inactiva puede reactivarse,
sin duplicar registros. La fecha de ingreso inicia con el día actual y puede
cambiarse antes de guardar. La asignación utiliza el POST de miembros existente
y actualiza la tabla sin cerrar el detalle. Los equipos inactivos no permiten
añadir integrantes.
Cambiar compañía, branch, especialidad o filtros cierra los detalles desplegados.

El lápiz abre un modal que permite editar únicamente la fecha de ingreso
(`joinDate`) y Activo/Inactivo. El bote rojo confirma la baja lógica de la
relación; no borra al colaborador ni su fecha, y los integrantes inactivos
siguen visibles para poder reactivarlos. Las operaciones recargan los miembros
sin cerrar el detalle del equipo, también cuando se asignan desde Additional
catalogs. Las reactivaciones respetan las validaciones de equipo y colaborador
del backend.

El formulario existente de asignación de miembros admite una fecha opcional:
para relaciones nuevas se utiliza hoy si se omite; al reactivar se conserva la
fecha existente cuando no se indica otra. Se requiere el backend y los V1
actualizados de MySQL/PostgreSQL. Con una respuesta antigua sin `joinDate`, la
tabla muestra `No informado` y un aviso, sin inventar una fecha de ingreso.

Las tablas anidadas de especialidades y tecnologías muestran **Branch** como
primera columna. El nombre proviene de `speciality.branch` o `technology.branch`
en la respuesta de la API, sin consultas adicionales de catálogos.
Si la API desplegada todavía no incluye la branch, el detalle sigue mostrándose:
la celda indica `No informado` y un aviso explica que se deben actualizar el
backend y las rutinas V1. Este aviso no bloquea las asignaciones.

## Requirements, Scopes y Entregables

**Requirements → Requirements** permite crear con **Nuevo +**, editar desde
un modal precargado y eliminar con confirmación mediante baja lógica. El
listado usa compañía/Branch globales y filtros combinados por proyecto,
`service.code` parcial (mínimo tres caracteres) y persona asignada a un alcance
(`requirement_assignments.collaborator_id` activo), no al staffing.
La tabla siempre muestra el proyecto, además de descripción, servicio, estado,
complejidad, fechas y actividad.
**Etapa Actual** muestra el único alcance activo En Progreso o, si no hay
ninguno, el último Finalizado por secuencia. Diseño Finalizado y Metadata
Asignado siguen mostrando Diseño hasta iniciar Metadata. Sin etapas
iniciadas muestra **Sin etapa iniciada**; no se calcula desde las fechas ni
se cambia automáticamente el estado general del requerimiento.

El alta permite marcar alcances mediante checkboxes y seleccionar varias
asignaciones de staffing elegibles del contexto. Si se selecciona staffing,
el proyecto se obtiene de esas asignaciones; sin staffing debe elegirse un
proyecto de la compañía. El API guarda siempre el proyecto canónico. La
creación del requerimiento, sus alcances y sus relaciones de staffing es
atómica. Marcar alcances crea `requirements_requirement_scopes` **sin**
crear asignaciones personales ni inventar colaboradores o roles. También
puede guardarse sin alcances y sin staffing indicando el proyecto.

Editar mantiene compañía/Branch/proyecto de solo lectura, permite modificar
los campos del requerimiento, reactivar y añadir scopes/staffing posteriores.
Los vínculos existentes se muestran marcados y de solo lectura para conservar
el historial; no se eliminan por desmarcar ni por enviar arrays vacíos.
El servicio puede quitarse. La fecha de finalización puede corregirse, pero
el contrato PATCH actual no permite borrar una fecha existente con `null`.
El icono de **Más detalles** despliega debajo de la fila los alcances, incluidos
los que muestran **Sin asignación**, y el historial de staffing.

Cada fila de **Alcances del requerimiento** incluye editar, eliminar,
asignar colaborador, cambiar estado, marcar como finalizado, guardar la URL
del entregable y **Ver historial de asignaciones**, este último en Acciones.
**Personas asignadas** muestra el nombre compuesto del responsable vigente,
no un contador ni un botón. Sin responsable muestra Sin asignación.
Editar corrige fechas, URL y actividad solo del vínculo, sin renombrar el
scope global. Eliminar solicita confirmación y desactiva únicamente el
vínculo, conservando catálogo y asignaciones. Los inactivos se pueden
consultar y reactivar desde edición si sus padres siguen siendo elegibles.
Finalizar cambia a Finalizado el alcance y solo su asignación personal
activa, registra ambas finalizaciones internamente cuando no existen y
conserva las fechas ya registradas. El responsable finalizado sigue activo;
el historial inactivo no cambia.
Guardar entregable registra `requirements_requirement_scopes.deliverable_url`
mediante `deliverableUrl`; acepta URL HTTP/HTTPS de hasta 2048 caracteres.
La tabla ofrece **Abrir entregable**. Omitir fechas o URL en PATCH las
conserva; el formulario no presenta `null` como borrado.

Asignar muestra colaboradores no inactivos de la compañía y roles activos.
Solo envía referencias de colaborador/rol: el servidor registra internamente
la fecha y resuelve Asignado desde su catálogo, sin ID fijo; una persona
nueva de un alcance En Progreso/Bloqueado hereda ese estado.
Se rechaza el duplicado activo; reactivar una asignación inactiva conserva
ID, fechas y estado. Solo puede existir una asignación activa por alcance:
reasignar desactiva la anterior en la misma transacción. **Ver historial de
asignaciones** despliega las personas, roles,
estados, fecha de asignación (`assignedDate`), registro y finalización,
incluida historia inactiva. La fecha pertenece a cada asignación, no al
alcance entero. No se crean relaciones de rol/tecnología ni se exige staffing.
**Cambiar estado** obtiene Sin Asignar, Asignado, En Progreso, Bloqueado y
Finalizado del catálogo del servidor, sin IDs fijos. Sin Asignar requiere
confirmación para enviar al historial al responsable vigente; los demás
estados sincronizan solo esa asignación. Se impide iniciar un segundo
alcance En Progreso mientras otro lo esté; no se modifica el anterior.
Las acciones refrescan el detalle y la Etapa Actual del listado raíz,
también cuando no existe filtro por persona. El API y las rutinas deben
desplegarse junto con estos contratos nuevos.

**Requirements → Scopes** administra el catálogo global `requirement_scopes`,
con filtro por nombre, **Nuevo +**, edición y baja lógica confirmada.
El modal contiene nombre, descripción, secuencia entera positiva y entregable
opcional. Tecnología solo filtra el selector de entregables del contexto
global; no es una nueva columna del scope. Un entregable histórico fuera del
Branch actual puede conservarse o quitarse. Para elegir otro, se usa el
contexto de su compañía/Branch. El API impide referencias incompatibles con
requerimientos que ya utilizan el alcance.

**Requirements → Entregables** reúne la vista existente de consulta, alta y
edición de entregables, con selección de tecnología de la compañía/Branch
globales. Conserva nombre, descripción, secuencia y actividad, y refresca el
listado después de guardar. Cambiar el contexto reinicia la tecnología y los
formularios. Ya no se muestra en **Additional catalogs**, que conserva la
gestión de miembros de equipos. La ubicación en Requirements no cambia los
endpoints ni el ownership del recurso: sigue consumiendo `companiesApi` y la
jerarquía compañía → Branch → tecnología → entregable.

Los selectores cargan todas las páginas, muestran errores y permiten
reintentar; no se interpretan fallos como catálogos vacíos. Los estados y
complejidades se consultan desde Requirements y las referencias de servicios
desde `servicesApi.listServices`, sin trasladar su ownership a Requirements.
Las mutaciones refrescan la colección afectada, conservando detalles cuando
corresponde; cambiar contexto o filtros reinicia las selecciones dependientes.

Los endpoints y ambos V1 del backend deben estar instalados antes de usar el
flujo. Para datos existentes, el antiguo FK directo de staffing debe copiarse
a `requirements_staffing_assignments` y derivarse compañía/Branch/proyecto
antes de eliminarlo; modificar V1 no actualiza automáticamente la base.
El servidor también debe tener las columnas `is_active` del vínculo y
`assigned_date` de la asignación, con backfill histórico explícito si ya hay
datos; no rellenar fechas antiguas con el día del despliegue.
Android todavía no tiene interfaz de Requirements y sus contratos actuales no
cambian; estas operaciones son aditivas.

## Estándar de catálogos

Administrar estados de colaboradores permite crear estados y actualizar su
nombre y campo Activo, igual que la administración de estados de compañías.
Las actualizaciones refrescan el catálogo y el listado de colaboradores.
Inactivo está protegido frente a cambios de nombre y desactivación, tanto en
la interfaz como en la base de datos, porque se utiliza para dar de baja colaboradores.

Las etiquetas de estados se muestran con la inicial de cada palabra en
mayúscula y espacios (`Activo`, `Inactivo`, `Por Iniciar`, `En Progreso`), en
tablas, filtros, selectores y editores. También se formatean las respuestas de
APIs que todavía envían nombres en mayúsculas, sin cambiar los IDs ni las
comparaciones de actividad.

Companies incluye las pestañas Companies, Branches, Technologies y
Especialidades. Especialidades se administra aquí, no en Additional catalogs:
usa la compañía global y una branch, filtros por código y nombre (mínimo tres
caracteres), alta/edición en modal y acciones de editar o desactivar. El listado
muestra Branch, Código, Nombre, Descripción, Estado y Acciones.

Las secciones de administración de catálogos siguen el patrón de Companies:

- Organizar catálogos relacionados en pestañas y mostrar en cada pestaña los
  filtros aplicables en la parte superior de la tabla.
- Mantener los filtros compactos; los filtros de texto requieren al menos tres
  caracteres antes de consultar la API.
- Mostrar el botón **Nuevo +** en la esquina superior derecha. El alta se hace
  en un modal; la edición reutiliza el mismo modal con los datos del registro.
- Incluir una columna de acciones al final de cada fila: lápiz amarillo para
  editar y bote rojo para eliminar. La eliminación solicita confirmación y
  respeta la baja lógica definida por la API.
- Mostrar errores de consulta y de operación de forma visible, sin ocultar los
  datos ni mostrar resultados de éxito cuando la operación falla.
- Conservar las herramientas de asignación de relaciones fuera del CRUD del
  catálogo cuando sean flujos independientes.

Los componentes compartidos `ManagementTable`, `RowActions`, `ResourceModal` y
`ModalActions` mantienen la tabla, los iconos y los formularios modales con el
mismo comportamiento. Los formularios usan `Field`, `SelectField` y
`SubmitButton`; las operaciones anidadas pueden conservar `operation-form`
cuando corresponda.

## Solicitudes y asignaciones de staffing

La solicitud es el agrupador: contiene la jerarquía temporal, especialidad,
estado y fecha de registro. El texto de solicitud pertenece a cada asignación.
La compañía se obtiene del periodo y la
branch de la especialidad. El icono de asignaciones despliega debajo de la fila
una tabla con historial, proyectos, tecnologías, tipos, roles y capacidad.
**Añadir +** está disponible también cuando no existen asignaciones.

Cada asignación exige colaborador, proyecto, tecnología, tipo, rol, solicitud
no vacía y capacidad manual **mayor que cero** (mínimo `0.01`, máximo `100`,
hasta dos decimales). Los colaboradores y proyectos se consultan por la compañía
del agrupador. Después de seleccionar colaborador, se recorren todas las páginas
de sus tecnologías asignadas y se muestran solo sus relaciones activas de la
branch del staffing; para altas y reactivaciones la tecnología también debe
estar activa. Cambiar colaborador limpia la tecnología anterior. Sin una
relación elegible, el formulario informa el motivo y no permite guardar.
El backend vuelve a validar esa relación: no basta con modificar el selector.
La búsqueda del colaborador es local por código o nombre completo desde tres
caracteres, recorriendo todas las páginas. Los nombres siguen separados en API.
Los catálogos no dependen de un proyecto previamente elegido.

Las asignaciones pueden filtrarse por proyecto y tecnología y ocultar inactivas.
La tabla carga el historial completo; los filtros de presentación no reducen
los datos usados para validar la capacidad. El límite de 100% es por
colaborador y solicitud, incluyendo todos los proyectos y tecnologías.
No se divide por proyecto ni se calcula a partir de la capacidad del tipo.
La API vuelve a validar la suma bajo bloqueo de la solicitud para concurrencia.

El lápiz abre un modal de edición; solicitud, proyecto, tecnología, tipo, rol,
capacidad y actividad son editables. Colaborador y staffing padre permanecen inmutables.
PATCH envía solo los campos realmente cambiados. Corregir capacidad o desactivar
no exige elegibilidad de reactivación; reactivar o cambiar referencias activas sí.
Cambiar la tecnología también exige su relación personal activa, incluso
en una asignación inactiva. La referencia histórica puede mantenerse para
corregir texto/capacidad o desactivar sin cambiar referencias.
La relación completa incluye proyecto y tecnología: los duplicados activos
se rechazan y POST reutiliza una relación inactiva exacta con la nueva capacidad.
No se fusionan asignaciones distintas mediante PATCH.

La baja se confirma y es lógica. Mutaciones exitosas refrescan el detalle sin
cerrar la fila, mediante los eventos existentes del cliente HTTP. Los modales
de asignación usan portal para no quedar atrapados en la tabla anidada.
Cambiar compañía/branch cierra los formularios y detalles del ámbito anterior;
las respuestas antiguas no actualizan el nuevo contexto.

Se requieren backend y V1 de MySQL/PostgreSQL actualizados junto con Web.
Una API antigua sin la compañía/branch de la solicitud muestra un aviso y no
permite asignar. Los V1 modificados no actualizan una base ya creada: preservar
datos antes de cualquier recreación y no inventar tecnologías para migrar historia.
Al conservar una base existente, trasladar el texto del agrupador a sus
asignaciones y corregir explícitamente los porcentajes cero antes de aplicar
las nuevas restricciones; no sustituirlos automáticamente por `0.01`.

La estructura está organizada por funcionalidades y capas:

```text
src/
├── app/
├── features/
├── routes/
└── shared/
```

Inicializa este directorio como un repositorio Git independiente:

```bash
cd Following.Web
git init
```
