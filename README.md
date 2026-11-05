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

También incluye operaciones relacionadas con selectores alimentados desde la
API para:

- Periods, subperiods, sections y fractions.
- Branches, specialities, skills, skill levels, teams y deliverables.
- Specialities y niveles de skills de colaboradores.
- Planning de proyectos.
- Ambientes y metadata asignados a servicios.

## Estándar de formularios

Los formularios del proyecto deben conservar el patrón visual de la sección
Collaborators: campos etiquetados con `Field` o `SelectField`, botón
`SubmitButton`, distribución horizontal con ajuste automático de línea y
espaciado uniforme. Los formularios de operaciones anidadas pueden usar
`operation-form` para adaptarse al ancho de su tarjeta, pero comparten la misma
distribución y controles. Los errores y resultados deben mostrarse dentro del
formulario con los estilos compartidos existentes.

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
