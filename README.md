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

Companies, Services, People y Proyectos organizan sus catálogos en pestañas. En esas
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
selector de alta y permite filtrar las solicitudes mediante selectores de proyecto,
periodo, subperiodo, sección, fracción, especialidad y estado. Los filtros se
combinan con AND en el API, incluida la compañía global antes de paginar.
La vista de
detalle de proyecto consume las fechas que devuelve la API dentro de la
planeación, sin volver a consultar cada catálogo de periodos y secciones.

### Solicitudes y asignaciones de staffing

Solicitudes de staffing utiliza filtros compactos sobre `ManagementTable`,
paginación de 20 solicitudes y **Nuevo +** para abrir un `ResourceModal` de alta.
No existe un formulario de creación permanente junto al listado. El modal usa
`StaffingScopeFields`, compartido con los filtros, para seleccionar la jerarquía
completa y la especialidad de la branch global. Los catálogos se cargan con
`loadCatalogPages`, no sólo su primera página.

Las columnas Proyecto, Periodo, Subperiodo, Sección, Fracción y Especialidad
muestran **código · nombre** incluidos por el API, no IDs de llaves foráneas ni
consultas por fila para reconstruir nombres. Los estados y catálogos sin código
muestran su nombre real. Referencias antiguas incompletas tienen aviso visible
y `No informado` si no contienen datos de presentación.

La solicitud no pide ni muestra capacidad. Su botón de detalles despliega
debajo de la misma fila una tabla de **asignaciones activas e inactivas**, con
colaborador (código · nombre compuesto en el cliente), tipo, rol, capacidad
porcentual, actividad y `RowActions` para editar o dar de baja. **Añadir +** está
disponible también cuando no hay asignaciones. Alta y edición usan modales;
eliminar solicita confirmación y realiza baja lógica, conservando el historial.
Las mutaciones actualizan la tabla sin cerrar el detalle y no anuncian éxito
si falta la respuesta requerida o falla el API.

El modal de alta busca localmente por código o nombre completo desde tres
caracteres, en todas las páginas de colaboradores de la compañía del proyecto.
Selecciona tipo y rol desde sus catálogos reales. Excluye duplicados del mismo
colaborador/tipo/rol; una relación inactiva con esa combinación se reactiva.
Los roles de staffing son independientes de los roles personales asignados.

La capacidad se introduce libremente con hasta dos decimales y accesos rápidos
**25%, 35%, 50% y 100%**. No se restringe a esas opciones ni se calcula desde el
tipo. La suma de asignaciones activas del mismo colaborador **en esa solicitud**
no puede superar 100%; la interfaz muestra el disponible y el API comprueba el
límite concurrentemente. Edición permite capacidad, tipo, rol y actividad;
colaborador y solicitud permanecen fijos. PATCH envía únicamente cambios.

Cambiar compañía o branch reinicia filtros, páginas, modales y detalles, y
descarta respuestas anteriores. Los contratos y ejemplos HTTP completos están
en el README del backend. Requiere backend y ambas V1 actualizados: editar V1
no actualiza una base ya creada; no se recrean bases existentes automáticamente.
Este flujo afecta Web y backend; no agrega pantallas de staffing a Android.

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
El alta de staffing consulta las especialidades de la branch global únicamente
cuando el proyecto pertenece a la compañía seleccionada; su listado conserva
los filtros propios de solicitudes y el ámbito de compañía.
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
