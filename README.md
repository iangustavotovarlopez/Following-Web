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

## Estándar de catálogos

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
