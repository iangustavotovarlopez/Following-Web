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

Companies, Services y People organizan sus catálogos en pestañas. En esas
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
selector de alta y permite filtrar las solicitudes por los IDs de proyecto,
periodo, subperiodo, sección, fracción, especialidad y estado. La vista de
detalle de proyecto consume las fechas que devuelve la API dentro de la
planeación, sin volver a consultar cada catálogo de periodos y secciones.

El panel incluye un selector global de compañía en una barra superior que
permanece visible al hacer scroll, también en pantallas pequeñas. Al elegir
una compañía, las consultas de colaboradores, proyectos, staffing, branches,
technologies, planeación, especialidades, skills, equipos y relaciones usan esa
compañía. Si no se selecciona una, los listados que admiten consulta global
muestran todas; los catálogos anidados esperan una compañía. Los campos de
compañía en formularios de alta/edición siguen permitiendo asignar o cambiar la
relación del registro.

En Collaborators, el icono de tabla en la columna de acciones permite desplegar
y contraer los roles, especialidades y tecnologías debajo de la misma fila.
Las tablas anidadas consultan la API al abrirse, muestran estados de carga,
errores y relaciones vacías, y no abren otra ventana. Cambiar la compañía o
aplicar filtros cierra los detalles desplegados.

Cada tabla de detalle incluye **Añadir**, que abre un modal para asignar un rol,
una especialidad o una tecnología al colaborador de esa fila. El modal muestra
opciones activas no asignadas; especialidades y tecnologías se consultan por
branch dentro de la compañía del colaborador. Al guardar se actualizan las
tablas sin cerrar la fila. Los colaboradores inactivos no permiten nuevas
asignaciones desde este flujo.

Las consultas paginadas de los modales interpretan `204 No Content` como un
catálogo vacío, no como un error. La tabla de tecnologías usa el código y nombre
incluidos en la respuesta de relaciones del colaborador, sin consultar los
catálogos de todas las branches. Los errores reales de la API siguen mostrándose.

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
