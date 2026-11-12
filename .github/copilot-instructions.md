# Following: end-to-end development

The Following system consists of three sibling projects:

- `Following`: backend API.
- `Following.Web`: web application.
- `Following.Android`: Android application.

Both applications consume the endpoints exposed by `Following`.

For changes to shared features, endpoints, request/response contracts, or
business behavior, consider the complete flow across all three projects.
Inspect the impact and make the necessary changes in the backend and both
clients to preserve compatibility and intended behavior.

Do not treat a shared feature as complete after updating only Web or only
Android when the other client is also affected. Platform-specific presentation
may differ; do not make unrelated changes to an unaffected client.

Validate the affected flow using each project's existing checks and update
directly related documentation. Report unavailable projects or blocked
validation explicitly rather than claiming the complete flow was verified.

## Documentation

Read `README.md` for Web workflows and catalog standards, and the relevant
sections of `..\Following\README.md` for authoritative business rules and API
contracts. Keep full schemas and endpoint examples in those documents.
Do not assume that a schema table or planned flow has an implemented endpoint.
If documentation and implementation conflict, verify the intended behavior
before changing it.

## Shared business rules

- Respect complete ownership chains: company -> branch -> speciality -> team,
  company -> branch -> technology -> skill -> level, and company -> period ->
  subperiod -> section -> fraction. Specialities/technologies assigned to a
  collaborator must belong to that collaborator's company.
- Preserve unique codes and reject duplicate active relationships. Supported
  reactivation flows reuse inactive relationships instead of creating another
  record. Logical deletion preserves entities, dates, and relationship history.
- Companies, collaborators, and projects use `Inactivo` for deactivation.
  Catalog/relationship logical deletions follow the API's `isActive` contract.
  The collaborator state `Inactivo` cannot be renamed or deactivated; project
  deletion requires an active `Inactivo` project state.
- Dates use `YYYY-MM-DD`. End dates cannot precede start dates; documented
  last-update/completion dates cannot precede registration. Preserve optional
  dates and do not invent missing dates or skill levels.
- A project has at most one active planning, with historical plannings retained.
  Its periods belong to the same company. Initial periods are not additional;
  planning creation/addition materializes active descendants. Deleting a
  planning level logically deactivates its descendants, not source catalogs.
  Never replace an active planning automatically after a conflict.
- Project editing supports only code, name, and state; keep company read-only.
- Keep all six collaborator name/surname fields separate in API models.
  Concatenate only for presentation, trimming and omitting null/blank parts.
- Skills belong to technologies, not specialities. Technology assignment
  initializes skill relationships without a level; speciality assignment does
  not initialize skills. Selected levels must belong to the selected skill.
  Role assignment requires an active collaborator and role and is not staffing.
- Team assignment/reactivation requires an active team and a non-inactive
  collaborator from its company. Active duplicates are rejected; inactive
  membership can be reactivated. Member PATCH edits only `joinDate`/`isActive`;
  date correction and deactivation do not require reactivation eligibility.
- A new membership POST without a date uses database today. Reactivating without
  a date preserves the previous one. DELETE preserves the collaborator and
  date. GET is active-only unless `includeInactive=true` is requested.
- Service environment/metadata assignments support reactivation without
  duplicates; metadata reactivation updates `detail`. Staffing validates all
  references and the full period hierarchy; combined filters use AND and
  creation state IDs come from the staffing-state catalog.
- Staffing requests are grouping records without request text/project/capacity. Company
  comes from the period and branch from the speciality. Each assignment
  requires non-blank request text, project and technology: project/collaborator from that company,
  technology from that company and speciality branch. Identity includes both
  new references; reactivate exact inactive relationships without duplicates.
- Filter assignment technology choices by the selected collaborator's active
  technology relationships and staffing branch, loading all pages. Clear the
  selection when collaborator changes; block saving without an eligible
  relationship. Creation/reactivation/active-reference or technology changes
  also validate that relationship in backend; never create it automatically.
- Assignment capacity is manual, greater than zero and at most 100, minimum
  0.01 with up to two decimals. Reject zero in frontend and backend. Its active
  aggregate is at most 100 per collaborator/request across all projects and
  technologies, not per project or derived from the type. Presentation filters
  must not hide assignments from this calculation. Preserve history and
  omitted PATCH fields; collaborator/parent staffing cannot change. Request
  text is editable and non-blank. Text/capacity-only corrections and
  deactivation preserve historical references without reactivation eligibility.
- Preserve documented requirement/scope/assignment links and optional
  references. Do not invent capacity, percentage, or transition rules from
  examples or apply a generic inactive-state rule to every resource.

## API consumption

- Use the shared API client and configured `/following/api` base, not new
  per-component HTTP clients or duplicated base prefixes.
- Send related IDs as nested request references. Public activity uses
  `isActive`; null response properties can be absent. Preserve endpoint-specific
  response shapes and omitted PATCH values.
- Treat `204 No Content` as an empty result where documented, not a failure.
  Do not turn real errors or missing required write responses into success.
  Display stable `ProblemDetail` errors and provide appropriate retry paths.
- Pagination is 1-based, default size 20, maximum 100. Load all pages for
  selectors/searches that need complete catalogs; do not assume page one is
  complete. Use `loadCatalogPages` rather than duplicating pagination logic.
- Partial text filters require three characters and ignore case. Respect
  optional registered `includes`, their response shape and `hasMoreData`;
  a limited expansion is not a complete catalog.
- Refresh affected lists/details after mutations using the existing shared
  invalidation/event mechanisms. Prevent stale responses from mixing scopes.

## Company/branch context and presentation

- Preserve global company/branch selection and the required initial selection
  flow. A company with branches requires a branch; no-branch/no-company
  bootstrap allows creating missing catalogs. Load failures are not empty
  catalogs. Keep both selectors visible while scrolling and do not persist
  selection across reloads without an explicit requirement.
- Changing company clears branch; context changes reset dependent filters,
  forms, selections, and expanded details. Company-scoped projects/planning
  must not acquire an unnecessary branch dependency. Branch-scoped catalogs
  and assignments use the global branch within the correct company.
- Standalone detail pages retain their own scoped selectors and must not
  require the dashboard's context provider. Staffing request creation uses
  global company/branch without a project selector; assignment dialogs use
  the actual request's company/branch and require project/technology.
- Preserve tabs, compact filters, `Nuevo +`, create/edit modals, edit/delete
  icons and deletion confirmation. Use `ManagementTable`, `RowActions`,
  `ResourceModal`, `ModalActions`, `Field`, `SelectField`, and `SubmitButton`.
- Collaborator/team/project/technology details expand under the selected row instead of
  opening another window. Relationship addition remains available for empty
  tables and refreshes details without closing the row. Exclude ineligible
  inactive collaborators/teams from new-assignment flows.
- In Companies -> Technologies, skills expand under their technology and
  levels under their skill. Keep Nuevo + and create modals available for
  empty catalogs. Keep edit modals and confirmed logical DELETE actions on
  technologies, skills and levels, using scoped PATCH/DELETE endpoints. Skills
  edit name/description/activity; levels edit name/non-negative number/activity.
  Preserve parents and inactive history; do not cascade catalog deactivation.
  Load all detail pages. Refresh only the mutated collection (including its
  direct item PATCH/DELETE paths, not descendant collections) so a level mutation does
  not close its parent skill. Do not restore standalone skills/levels panels.
- Display state names with an initial capital per word and spaces, preserving
  IDs. Display branch from relation responses without fetching every catalog.
  Missing dates/branch information is shown explicitly, not fabricated.
- Keep the existing feature/layer structure under `src` (`app`, `features`,
  `routes`, `shared`). Use `npm run build` for TypeScript/build checks; do not
  introduce a new test runner merely for an unrelated change.
