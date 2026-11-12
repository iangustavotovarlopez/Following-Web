import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { collaboratorsApi, type Collaborator, type CollaboratorRole, type CollaboratorTechnology } from '../../../collaborators/infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { projectsApi, type Project } from '../../../projects/infrastructure/api';
import {
  staffingApi, type PatchStaffingAssignmentRequest, type Staffing, type StaffingAssignment, type StaffingAssignmentType,
} from '../../infrastructure/api/staffing-api';
import { useStaffingCatalog } from '../use-staffing-catalog';

export function StaffingAssignmentsTable({ staffing }: { staffing: Staffing }) {
  const hasScope = Boolean(staffing.company?.id && staffing.branch?.id);
  const assignments = useStaffingCatalog<StaffingAssignment>(`staffing-assignments:${staffing.id}`, hasScope,
    (page) => staffingApi.listAssignments(staffing.id, { page, pageSize: 100, includeInactive: true }));
  const [editing, setEditing] = useState<StaffingAssignment | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ projectId: '', technologyId: '', includeInactive: true });
  const mounted = useRef(true);
  const path = `/staffing/v0/staffing/${staffing.id}/assignments`;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    function onMutation(event: Event) {
      const { path: changedPath } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (changedPath === path || changedPath.startsWith(`${path}/`)) assignments.refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, [path, assignments.refresh]);

  if (!hasScope) {
    return <div className="alert warning">Actualiza la API y las rutinas V1 para consultar la compañía y branch de esta solicitud antes de asignar.</div>;
  }

  const completeContract = assignments.items.every((item) => item.project && item.technology && typeof item.request === 'string');
  const projectOptions = [...new Map(assignments.items.filter((item) => item.project)
    .map((item) => [item.project.id, item.project])).values()]
    .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  const technologyOptions = [...new Map(assignments.items.filter((item) => item.technology)
    .map((item) => [item.technology.id, item.technology])).values()]
    .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  const rows = assignments.items.filter((item) => (filters.includeInactive || item.isActive)
    && (!filters.projectId || String(item.project?.id) === filters.projectId)
    && (!filters.technologyId || String(item.technology?.id) === filters.technologyId));

  async function remove(item: StaffingAssignment) {
    if (deletingId !== null || !item.isActive
      || !window.confirm(`¿Deseas desactivar la asignación de "${collaboratorFullName(item.collaborator)}"?`)) return;
    setDeletingId(item.id);
    setActionError(null);
    try {
      await staffingApi.deleteAssignment(staffing.id, item.id);
    } catch (cause) {
      if (mounted.current) setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar la asignación.');
    } finally {
      if (mounted.current) setDeletingId(null);
    }
  }

  const columns: TableColumn<StaffingAssignment>[] = [
    { key: 'code', label: 'Código', render: (item) => item.collaborator.code },
    { key: 'collaborator', label: 'Colaborador', render: (item) => collaboratorFullName(item.collaborator) },
    { key: 'project', label: 'Proyecto', render: (item) => item.project ? `${item.project.code} · ${item.project.name}` : 'No informado' },
    { key: 'branch', label: 'Branch', render: (item) => item.technology?.branch?.name ?? 'No informado' },
    { key: 'technology', label: 'Tecnología', render: (item) => item.technology ? `${item.technology.code} · ${item.technology.name}` : 'No informado' },
    { key: 'type', label: 'Tipo de asignación', render: (item) => item.assignmentType.name },
    { key: 'role', label: 'Rol', render: (item) => `${item.role.code} · ${item.role.name}` },
    { key: 'request', label: 'Solicitud', render: (item) => item.request ?? 'No informada' },
    { key: 'capacity', label: 'Capacidad', render: (item) => `${item.capacity.toFixed(2)}%` },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    {
      key: 'actions', label: 'Acciones', render: (item) => (
        <RowActions onEdit={() => {
          if (!completeContract) {
            setActionError('Actualiza la API: todas las asignaciones deben informar proyecto, tecnología y solicitud antes de editar.');
            return;
          }
          setEditing(item);
        }} onDelete={() => void remove(item)} deleteDisabled={!item.isActive || deletingId !== null} />
      ),
    },
  ];

  return (
    <div className="team-inline-details" id={`staffing-assignments-${staffing.id}`}>
      <section className="resource-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detalle de la solicitud #{staffing.id}</p>
            <h2>Asignaciones de staffing</h2>
            <p className="muted">{staffing.company.name} · {staffing.branch.name}. La capacidad activa del mismo colaborador se suma en toda la solicitud, no por proyecto o tecnología.</p>
          </div>
          <div className="management-filter-actions">
            {assignments.error && <button className="button secondary" type="button" onClick={assignments.refresh}>Reintentar</button>}
            <button className="button primary" type="button"
              disabled={!staffing.isActive || assignments.loading || Boolean(assignments.error) || !completeContract}
              onClick={() => setAdding(true)}>Añadir +</button>
          </div>
        </div>
        {!staffing.isActive && <div className="company-scope-hint">La solicitud está inactiva: permite corregir capacidad o desactivar, pero no añadir ni reactivar asignaciones.</div>}
        {!completeContract && <div className="alert warning">Hay asignaciones sin proyecto, tecnología o solicitud. Actualiza backend y ambas migraciones V1.</div>}
        {assignments.items.some((item) => item.capacity <= 0) && (
          <div className="alert warning">Hay asignaciones con capacidad cero o negativa. Corrige su porcentaje; no se permiten nuevas asignaciones ni ediciones con esos valores.</div>
        )}
        <div className="management-filter-actions">
          <SelectField label="Proyecto" value={filters.projectId} options={projectOptions}
            onChange={(event) => setFilters({ ...filters, projectId: event.target.value })} />
          <SelectField label="Tecnología" value={filters.technologyId} options={technologyOptions}
            onChange={(event) => setFilters({ ...filters, technologyId: event.target.value })} />
          <label><input type="checkbox" checked={filters.includeInactive}
            onChange={(event) => setFilters({ ...filters, includeInactive: event.target.checked })} /> Mostrar inactivas</label>
          <button className="button secondary" type="button"
            onClick={() => setFilters({ projectId: '', technologyId: '', includeInactive: true })}>Limpiar filtros</button>
        </div>
        {actionError && <div className="alert error">{actionError}</div>}
        <ManagementTable columns={columns} rows={rows} loading={assignments.loading} error={assignments.error}
          rowKey={(item) => item.id} emptyMessage="Esta solicitud aún no tiene asignaciones para mostrar." />
      </section>
      {(adding || editing) && createPortal(
        <StaffingAssignmentModal key={editing?.id ?? 'new'} staffing={staffing} editing={editing}
          assignments={assignments.items} assignmentsLoading={assignments.loading} assignmentsError={assignments.error}
          onClose={() => { setAdding(false); setEditing(null); }} />,
        document.body,
      )}
    </div>
  );
}

interface CatalogOption {
  id: number;
  code?: string;
  name: string;
  isActive?: boolean;
}

function optionsWithCurrent(items: CatalogOption[], current: CatalogOption | undefined, activeOnly: boolean) {
  const available = items.filter((item) => !activeOnly || item.isActive !== false);
  if (current && !available.some((item) => item.id === current.id)) available.push(current);
  return available.map((item) => ({ value: item.id,
    label: `${item.code ? `${item.code} · ` : ''}${item.name}${item.isActive === false ? ' (Inactivo)' : ''}` }));
}

function StaffingAssignmentModal({ staffing, editing, assignments, assignmentsLoading, assignmentsError, onClose }: {
  staffing: Staffing;
  editing: StaffingAssignment | null;
  assignments: StaffingAssignment[];
  assignmentsLoading: boolean;
  assignmentsError: string | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => ({
    collaboratorId: editing ? String(editing.collaborator.id) : '',
    projectId: editing ? String(editing.project.id) : '',
    technologyId: editing ? String(editing.technology.id) : '',
    assignmentTypeId: editing ? String(editing.assignmentType.id) : '',
    roleId: editing ? String(editing.role.id) : '',
    request: editing?.request ?? '',
    capacity: editing ? editing.capacity.toFixed(2) : '',
    isActive: editing?.isActive ?? true,
  }));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const mounted = useRef(true);
  const companyId = staffing.company.id;
  const branchId = staffing.branch.id;
  const collaboratorId = Number(draft.collaboratorId);
  const projectId = Number(draft.projectId);
  const technologyId = Number(draft.technologyId);
  const typeId = Number(draft.assignmentTypeId);
  const roleId = Number(draft.roleId);
  const referencesChanged = !editing || projectId !== editing.project.id || technologyId !== editing.technology.id
    || typeId !== editing.assignmentType.id || roleId !== editing.role.id;
  const requiresEligibility = draft.isActive && (!editing || !editing.isActive || referencesChanged);
  const requiresAssignedTechnology = !editing || requiresEligibility || technologyId !== editing.technology.id;
  const needsCatalogs = !editing || referencesChanged || requiresEligibility;
  const collaborators = useStaffingCatalog<Collaborator>(`staffing-people:${companyId}:${catalogRevision}`,
    !editing || requiresEligibility,
    (page) => collaboratorsApi.listCollaborators({ 'company.id': companyId, page, pageSize: 100 }));
  const projects = useStaffingCatalog<Project>(`staffing-projects:${companyId}:${catalogRevision}`, true,
    (page) => projectsApi.listProjects({ 'company.id': companyId, page, pageSize: 100 }));
  const technologies = useStaffingCatalog<CollaboratorTechnology>(
    `staffing-person-technologies:${companyId}:${branchId}:${collaboratorId}:${catalogRevision}`, collaboratorId > 0,
    (page) => collaboratorsApi.listTechnologies(collaboratorId, { page, pageSize: 100 }));
  const types = useStaffingCatalog<StaffingAssignmentType>(`staffing-types:${catalogRevision}`, true,
    (page) => staffingApi.listAssignmentTypes({ page, pageSize: 100 }));
  const roles = useStaffingCatalog<CollaboratorRole>(`staffing-roles:${catalogRevision}`, true,
    (page) => collaboratorsApi.listRoles({ page, pageSize: 100 }));
  const catalogs = [collaborators, projects, technologies, types, roles];
  const loading = catalogs.some((catalog) => catalog.loading);
  const catalogErrors = catalogs.map((catalog) => catalog.error).filter((value): value is string => value !== null);
  const normalizedSearch = search.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const availableCollaborators = collaborators.items.filter((item) => item.company.id === companyId
    && item.state.isActive && item.state.name.trim().toUpperCase() !== 'INACTIVO');
  const matches = normalizedSearch.length < 3 ? [] : availableCollaborators.filter((item) =>
    item.code.toLocaleLowerCase('es').includes(normalizedSearch)
    || collaboratorFullName(item).toLocaleLowerCase('es').includes(normalizedSearch));
  const selectedCollaborator = availableCollaborators.find((item) => item.id === collaboratorId);
  const companyProjects = projects.items.filter((item) => item.company.id === companyId);
  const assignedTechnologies = technologies.items
    .filter((item) => item.isActive && item.technology.branch?.id === branchId)
    .map((item) => item.technology);
  const hasEligibleTechnology = assignedTechnologies.some((item) => !draft.isActive || item.isActive);
  const usedCents = assignments.filter((item) => item.id !== editing?.id && item.isActive && item.collaborator.id === collaboratorId)
    .reduce((total, item) => total + Math.round(item.capacity * 100), 0);
  const duplicate = assignments.find((item) => item.id !== editing?.id && item.collaborator.id === collaboratorId
    && item.project.id === projectId && item.technology.id === technologyId
    && item.assignmentType.id === typeId && item.role.id === roleId);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    function onMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path.startsWith('/collaborators/v0/') || path.startsWith('/projects/v0/')
        || path.startsWith('/companies/v0/') || path === '/staffing/v0/assignment_types') {
        setCatalogRevision((value) => value + 1);
      }
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (assignmentsLoading || assignmentsError || (needsCatalogs && (loading || catalogErrors.length))) {
      setError('Espera a que terminen las consultas o reintenta los errores antes de guardar.');
      return;
    }
    if (!collaboratorId || !projectId || !technologyId || !typeId || !roleId || !draft.request.trim()
      || !/^\d+(?:\.\d{1,2})?$/.test(draft.capacity) || Number(draft.capacity) <= 0 || Number(draft.capacity) > 100) {
      setError('Completa la solicitud, proyecto, tecnología, tipo y rol, e indica capacidad mayor que 0 y hasta 100 con hasta dos decimales.');
      return;
    }
    if (needsCatalogs && (!companyProjects.some((item) => item.id === projectId)
      || !types.items.some((item) => item.id === typeId) || !roles.items.some((item) => item.id === roleId))) {
      setError('Selecciona proyecto, tipo y rol válidos para esta asignación.');
      return;
    }
    if (requiresAssignedTechnology && !assignedTechnologies.some((item) => item.id === technologyId)) {
      setError('El colaborador debe tener asignada activamente la tecnología en la compañía y branch de este staffing.');
      return;
    }
    if (requiresEligibility && (!staffing.isActive || !selectedCollaborator
      || !assignedTechnologies.some((item) => item.id === technologyId && item.isActive)
      || !types.items.some((item) => item.id === typeId && item.isActive)
      || !roles.items.some((item) => item.id === roleId && item.isActive))) {
      setError('Para añadir, reactivar o cambiar referencias activas, la solicitud, el colaborador y los catálogos deben estar habilitados.');
      return;
    }
    if (duplicate && (editing || duplicate.isActive)) {
      setError('Ya existe esta combinación de colaborador, proyecto, tecnología, tipo y rol. No se duplican ni fusionan asignaciones.');
      return;
    }
    if (draft.isActive && usedCents + Math.round(Number(draft.capacity) * 100) > 10000) {
      setError('La capacidad activa del colaborador en toda esta solicitud no puede superar 100%.');
      return;
    }
    const body: PatchStaffingAssignmentRequest = {};
    if (editing) {
      if (projectId !== editing.project.id) body.project = { id: projectId };
      if (technologyId !== editing.technology.id) body.technology = { id: technologyId };
      if (typeId !== editing.assignmentType.id) body.assignmentType = { id: typeId };
      if (roleId !== editing.role.id) body.role = { id: roleId };
      if (draft.request.trim() !== editing.request) body.request = draft.request.trim();
      if (Number(draft.capacity) !== editing.capacity) body.capacity = Number(draft.capacity);
      if (draft.isActive !== editing.isActive) body.isActive = draft.isActive;
      if (Object.keys(body).length === 0) {
        setError('No hay cambios para guardar.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const saved = editing
        ? await staffingApi.patchAssignment(staffing.id, editing.id, body)
        : await staffingApi.createAssignment(staffing.id, {
          collaborator: { id: collaboratorId }, project: { id: projectId }, technology: { id: technologyId },
          assignmentType: { id: typeId }, role: { id: roleId }, request: draft.request.trim(), capacity: Number(draft.capacity),
        });
      if (!saved) throw new Error('La API no devolvió la asignación guardada.');
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar la asignación.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  const activeOnly = !editing || draft.isActive;
  return (
    <ResourceModal open title={editing ? 'Editar asignación de staffing' : 'Añadir asignación de staffing'}
      dismissible={!saving} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <p className="muted">{staffing.company.name} · {staffing.branch.name}. Proyecto y tecnología son obligatorios.</p>
        {editing ? (
          <p>Colaborador: {editing.collaborator.code} · {collaboratorFullName(editing.collaborator)}. No se puede cambiar.</p>
        ) : (
          <>
            <Field label="Buscar colaborador por código o nombre" value={search} disabled={saving}
              onChange={(event) => setSearch(event.target.value)} />
            {normalizedSearch.length < 3 && <span className="muted">Escribe al menos tres caracteres.</span>}
            <SelectField label="Colaborador" required value={draft.collaboratorId} disabled={saving || collaborators.loading}
              options={[...new Map([...matches, ...(selectedCollaborator ? [selectedCollaborator] : [])]
                .map((item) => [item.id, item])).values()].map((item) => ({
                value: item.id, label: `${item.code} · ${collaboratorFullName(item)}`,
              }))}
              onChange={(event) => setDraft({ ...draft, collaboratorId: event.target.value, technologyId: '' })} />
          </>
        )}
        <SelectField label="Proyecto" required value={draft.projectId} disabled={saving || projects.loading}
          options={optionsWithCurrent(companyProjects, editing?.project, false)}
          onChange={(event) => setDraft({ ...draft, projectId: event.target.value })} />
        <SelectField label="Tecnología del colaborador" required value={draft.technologyId}
          disabled={saving || !collaboratorId || technologies.loading}
          options={optionsWithCurrent(assignedTechnologies, requiresAssignedTechnology ? undefined : editing?.technology, activeOnly)}
          onChange={(event) => setDraft({ ...draft, technologyId: event.target.value })} />
        <span className="muted">Se muestran las tecnologías asignadas al colaborador en la branch de este staffing.</span>
        <SelectField label="Tipo de asignación" required value={draft.assignmentTypeId} disabled={saving || types.loading}
          options={optionsWithCurrent(types.items, editing?.assignmentType, activeOnly)}
          onChange={(event) => setDraft({ ...draft, assignmentTypeId: event.target.value })} />
        <SelectField label="Rol" required value={draft.roleId} disabled={saving || roles.loading}
          options={optionsWithCurrent(roles.items, editing?.role, activeOnly)}
          onChange={(event) => setDraft({ ...draft, roleId: event.target.value })} />
        <Field label="Solicitud" required value={draft.request} disabled={saving}
          onChange={(event) => setDraft({ ...draft, request: event.target.value })} />
        <Field label="Capacidad (%)" type="number" min="0.01" max="100" step="0.01" required value={draft.capacity} disabled={saving}
          onChange={(event) => setDraft({ ...draft, capacity: event.target.value })} />
        {collaboratorId > 0 && !assignmentsLoading && !assignmentsError && (
          <span className="muted">Disponible en esta solicitud: {((10000 - usedCents) / 100).toFixed(2)}%. El tipo no establece la capacidad automáticamente.</span>
        )}
        {editing && <SelectField label="Estado" value={String(draft.isActive)} disabled={saving}
          options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
          onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })} />}
        {!editing && duplicate && !duplicate.isActive && <div className="alert warning">Se reactivará la asignación #{duplicate.id} con la capacidad indicada, sin crear otra fila.</div>}
        {collaboratorId > 0 && requiresAssignedTechnology && !technologies.loading && !technologies.error && !hasEligibleTechnology && (
          <div className="company-scope-hint">El colaborador no tiene tecnologías elegibles asignadas en esta branch. Asígnale una tecnología activa desde People antes de añadir o reactivar esta asignación.</div>
        )}
        {catalogErrors.map((message, index) => <div className="alert error" key={index}>{message}</div>)}
        {catalogErrors.length > 0 && <button className="button secondary" type="button"
          onClick={() => catalogs.forEach((catalog) => catalog.refresh())}>Reintentar catálogos</button>}
        {assignmentsError && <div className="alert error">{assignmentsError}</div>}
        {error && <div className="alert error">{error}</div>}
        <ModalActions onCancel={() => { if (!saving) onClose(); }} saving={saving}
          submitLabel={editing ? 'Guardar cambios' : 'Añadir asignación'}
          submitDisabled={assignmentsLoading || Boolean(assignmentsError) || (needsCatalogs && (loading || catalogErrors.length > 0))
            || (requiresAssignedTechnology && !hasEligibleTechnology)} />
      </form>
    </ResourceModal>
  );
}
