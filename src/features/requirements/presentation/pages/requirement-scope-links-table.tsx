import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ActiveBadge, formatStateName, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { collaboratorsApi } from '../../../collaborators/infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { requirementPath, requirementsApi, type Requirement, type RequirementScopeLink, type ScopeAssignment } from '../../infrastructure/api/requirements-api';
import { useRequirementCatalog, useRequirementMounted } from '../use-requirement-catalog';
import { validDeliverableUrl as validUrl } from '../requirement-form-utils';
import { ServiceDeliverableModal } from './service-deliverable-modal';

interface Context { companyId: number; branchId: number; requirement: Requirement }
type Modal = { kind: 'edit' | 'url' | 'assign' | 'state' | 'service'; row: RequirementScopeLink };
const normalizedState = (name: string) => name.trim().toLowerCase();
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.';
function Action({ label, disabled, onClick, children, expanded, controls }: {
  label: string; disabled?: boolean; onClick: () => void; children: ReactNode; expanded?: boolean; controls?: string;
}) {
  return <button className="row-action-button details" type="button" title={label} aria-label={label}
    aria-expanded={expanded} aria-controls={controls} disabled={disabled} onClick={onClick}><svg aria-hidden="true" fill="none" viewBox="0 0 24 24">{children}</svg></button>;
}

export function RequirementScopeLinksTable({ companyId, branchId, requirement }: Context) {
  const collection = `${requirementPath(companyId, branchId)}/${requirement.id}/scopes`;
  const scopes = useRequirementCatalog(collection, true,
    (page) => requirementsApi.scopes(companyId, branchId, requirement.id, { page, pageSize: 100 }),
    [collection, '/requirements/v0/scopes', '/collaborators/v0/collaborators', '/collaborators/v0/roles']);
  const [modal, setModal] = useState<Modal | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const expand = (id: number) => setExpanded((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  async function act(row: RequirementScopeLink, operation: 'delete' | 'complete') {
    if (busy !== null) return;
    if (operation === 'complete' && row.scope.deliverable && typeof row.scope.deliverable.generatesService !== 'boolean') {
      setError('La API no informa generatesService. Actualiza el backend y las rutinas antes de finalizar este entregable.'); return;
    }
    if (operation === 'complete' && row.scope.deliverable?.generatesService) { setModal({ kind: 'service', row }); return; }
    if (busy !== null || !window.confirm(operation === 'delete'
      ? `¿Desactivar "${row.scope.name}" solo en este requerimiento? Se conservarán el catálogo y las asignaciones.`
      : `¿Finalizar "${row.scope.name}" y su asignación vigente? Se registrará la finalización sin modificar las asignaciones inactivas.`)) return;
    setBusy(row.id); setError(null);
    try {
      if (operation === 'delete') await requirementsApi.deleteScopeLink(companyId, branchId, requirement.id, row.id);
      else if (!await requirementsApi.completeScopeLink(companyId, branchId, requirement.id, row.id)) {
        throw new Error('La API no devolvió el alcance finalizado.');
      }
      if (mounted.current) scopes.refresh();
    } catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { if (mounted.current) setBusy(null); }
  }
  const columns: TableColumn<RequirementScopeLink>[] = [
    { key: 'name', label: 'Alcance', render: (v) => v.scope.name },
    { key: 'sequence', label: 'Secuencia', render: (v) => v.scope.sequence },
    { key: 'active', label: 'Estado del vínculo', render: (v) => <ActiveBadge active={v.isActive} /> },
    { key: 'state', label: 'Estado del alcance', render: (v) => formatStateName(v.state.name) },
    { key: 'people', label: 'Personas asignadas', render: (v) => v.currentAssignment
      ? collaboratorFullName(v.currentAssignment.collaborator) : 'Sin asignación' },
    { key: 'registered', label: 'Registro', render: (v) => v.registeredDate },
    { key: 'completed', label: 'Finalización', render: (v) => v.completionDate || 'Pendiente' },
    { key: 'deliverable', label: 'Entregable', render: (v) => v.scope.deliverable?.name || 'No relacionado' },
    { key: 'url', label: 'URL del entregable', render: (v) => v.deliverableUrl
      ? validUrl(v.deliverableUrl) ? <a href={v.deliverableUrl} target="_blank" rel="noopener noreferrer">Abrir entregable</a> : v.deliverableUrl
      : 'Sin guardar' },
    { key: 'actions', label: 'Acciones', render: (v) => <RowActions onEdit={() => { if (busy === null) setModal({ kind: 'edit', row: v }); }}
      onDelete={() => void act(v, 'delete')} deleteDisabled={!v.isActive || busy !== null}>
      <Action label={`Asignar colaborador a ${v.scope.name}`} disabled={busy !== null || !requirement.isActive || !v.isActive || !v.scope.isActive}
        onClick={() => setModal({ kind: 'assign', row: v })}><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M19 8v6M16 11h6" /></Action>
      <Action label={`Cambiar estado de ${v.scope.name}`} disabled={busy !== null || !requirement.isActive || !v.isActive || !v.scope.isActive}
        onClick={() => setModal({ kind: 'state', row: v })}><path d="M4 7h16M4 12h16M4 17h16M8 4v6M16 9v6M10 14v6" /></Action>
      <Action label={`Marcar ${v.scope.name} como finalizado`} disabled={busy !== null || !requirement.isActive || !v.isActive || !v.scope.isActive || normalizedState(v.state.name) === 'finalizado'}
        onClick={() => void act(v, 'complete')}><path d="m5 12 4 4L19 6" /></Action>
      <Action label={`Guardar URL del entregable de ${v.scope.name}`} disabled={busy !== null}
        onClick={() => setModal({ kind: 'url', row: v })}><path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M14 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></Action>
      <Action label={`Ver historial de asignaciones de ${v.scope.name}`} expanded={expanded.has(v.id)} controls={`scope-${v.id}-assignments`}
        onClick={() => expand(v.id)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Action>
    </RowActions> },
  ];
  return <>
    <div className="section-heading"><h3>Alcances del requerimiento #{requirement.id}</h3>
      {(scopes.error || error) && <button className="button secondary" type="button" disabled={busy !== null} onClick={scopes.refresh}>Reintentar</button>}</div>
    {error && <div className="alert error">{error}</div>}
    <ManagementTable columns={columns} rows={scopes.items} loading={scopes.loading} error={scopes.error} rowKey={(v) => v.id}
      emptyMessage="Este requerimiento todavía no tiene alcances." renderExpandedRow={(v) => expanded.has(v.id)
        ? <ScopeAssignments key={v.id} companyId={companyId} branchId={branchId} requirement={requirement} row={v} /> : null} />
    {modal && createPortal(modal.kind === 'assign'
      ? <AssignScopeModal companyId={companyId} branchId={branchId} requirement={requirement} row={modal.row} onClose={() => setModal(null)}
          onSaved={() => { setExpanded((current) => new Set(current).add(modal.row.id)); setModal(null); scopes.refresh(); }} />
      : modal.kind === 'state' ? <ScopeStateModal companyId={companyId} branchId={branchId} requirement={requirement} row={modal.row}
          otherProgress={scopes.items.find((v) => v.id !== modal.row.id && v.isActive && normalizedState(v.state.name) === 'en progreso')?.scope.name}
          onCompleteService={() => setModal({ kind: 'service', row: modal.row })}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); scopes.refresh(); }} />
      : modal.kind === 'service' ? <ServiceDeliverableModal companyId={companyId} branchId={branchId} requirement={requirement} row={modal.row}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); scopes.refresh(); }} />
      : <ScopeLinkModal companyId={companyId} branchId={branchId} requirement={requirement} row={modal.row} kind={modal.kind}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); scopes.refresh(); }} />, document.body)}
  </>;
}

function ScopeAssignments({ companyId, branchId, requirement, row }: Context & { row: RequirementScopeLink }) {
  const path = `${requirementPath(companyId, branchId)}/${requirement.id}/scopes/${row.id}/assignments`;
  const list = useRequirementCatalog(path, true,
    (page) => requirementsApi.scopeAssignments(companyId, branchId, requirement.id, row.id, { page, pageSize: 100 }),
    [path, '/collaborators/v0/collaborators', '/collaborators/v0/roles']);
  const columns: TableColumn<ScopeAssignment>[] = [
    { key: 'person', label: 'Colaborador', render: (v) => `${v.collaborator.code} · ${collaboratorFullName(v.collaborator)}` },
    { key: 'role', label: 'Rol', render: (v) => `${v.role.code} · ${v.role.name}` },
    { key: 'state', label: 'Estado personal', render: (v) => formatStateName(v.state.name) },
    { key: 'assigned', label: 'Fecha de asignación', render: (v) => v.assignedDate },
    { key: 'registered', label: 'Registro', render: (v) => v.registeredDate },
    { key: 'completed', label: 'Finalización personal', render: (v) => v.completionDate || 'Pendiente' },
    { key: 'active', label: 'Activo', render: (v) => <ActiveBadge active={v.isActive} /> },
  ];
  return <div className="team-inline-details" id={`scope-${row.id}-assignments`}>
    <div className="section-heading"><h4>Asignaciones de {row.scope.name}</h4>
      {list.error && <button className="button secondary" type="button" onClick={list.refresh}>Reintentar</button>}</div>
    <p className="muted">La fecha de asignación es interna. El historial inactivo conserva sus fechas y estados.</p>
    <ManagementTable columns={columns} rows={list.items} loading={list.loading} error={list.error} rowKey={(v) => v.id}
      emptyMessage="Este alcance todavía no tiene personas asignadas." />
  </div>;
}

function ScopeLinkModal({ companyId, branchId, requirement, row, kind, onClose, onSaved }: Context & {
  row: RequirementScopeLink; kind: 'edit' | 'url'; onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState({ registeredDate: row.registeredDate, completionDate: row.completionDate || '',
    url: row.deliverableUrl || '', isActive: String(row.isActive) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const close = () => { if (!saving) onClose(); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    const url = draft.url.trim();
    if ((kind === 'url' && !url) || (url && !validUrl(url))) { setError('Indica una URL HTTP o HTTPS absoluta, de hasta 2048 caracteres.'); return; }
    if (!url && row.deliverableUrl) { setError('Omitir la URL conserva la actual. Para corregirla, indica su nuevo valor.'); return; }
    if (kind === 'edit' && (!draft.registeredDate || !['true', 'false'].includes(draft.isActive)
      || (draft.completionDate && draft.completionDate < draft.registeredDate))) { setError('Revisa la fecha de registro, finalización y actividad.'); return; }
    if (kind === 'edit' && row.completionDate && !draft.completionDate) { setError('La fecha de finalización puede corregirse, pero no borrarse con este PATCH.'); return; }
    if (kind === 'edit' && !row.isActive && draft.isActive === 'true' && (!requirement.isActive || !row.scope.isActive)) {
      setError('Reactivar requiere un requerimiento y un scope del catálogo activos.'); return;
    }
    setSaving(true); setError(null);
    try {
      const result = await requirementsApi.patchScopeLink(companyId, branchId, requirement.id, row.id,
        kind === 'url' ? { deliverableUrl: url } : { registeredDate: draft.registeredDate,
          completionDate: draft.completionDate || undefined, deliverableUrl: url || undefined, isActive: draft.isActive === 'true' });
      if (!result) throw new Error('La API no devolvió el alcance guardado.');
      if (mounted.current) onSaved();
    } catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { if (mounted.current) setSaving(false); }
  }
  return <ResourceModal open title={kind === 'url' ? 'Guardar entregable' : 'Editar alcance del requerimiento'}
    dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted">{row.scope.name}. Solo se modifica este vínculo; el catálogo global no cambia.</p>
      {kind === 'edit' && <>
        <Field label="Fecha de registro" type="date" required value={draft.registeredDate} disabled={saving} onChange={(e) => setDraft({ ...draft, registeredDate: e.target.value })} />
        <Field label="Fecha de finalización" type="date" min={draft.registeredDate} value={draft.completionDate} disabled={saving} onChange={(e) => setDraft({ ...draft, completionDate: e.target.value })} />
        <SelectField label="Actividad del vínculo" required value={draft.isActive} disabled={saving}
          options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setDraft({ ...draft, isActive: e.target.value })} />
      </>}
      <Field label="URL del entregable" type="url" required={kind === 'url'} maxLength={2048} value={draft.url} disabled={saving}
        onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
      {error && <div className="alert error">{error}</div>}
      <ModalActions onCancel={close} saving={saving} submitLabel="Guardar cambios" />
    </form>
  </ResourceModal>;
}

function AssignScopeModal({ companyId, branchId, requirement, row, onClose, onSaved }: Context & {
  row: RequirementScopeLink; onClose: () => void; onSaved: () => void;
}) {
  const [personId, setPersonId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const close = () => { if (!saving) onClose(); };
  const people = useRequirementCatalog(`scope-people:${companyId}`, true,
    (page) => collaboratorsApi.listCollaborators({ 'company.id': companyId, page, pageSize: 100 }), ['/collaborators/v0/collaborators']);
  const roles = useRequirementCatalog('scope-personal-roles', true,
    (page) => collaboratorsApi.listRoles({ page, pageSize: 100 }), ['/collaborators/v0/roles']);
  const assignments = useRequirementCatalog(`scope-current-assignments:${row.id}`, true,
    (page) => requirementsApi.scopeAssignments(companyId, branchId, requirement.id, row.id, { page, pageSize: 100 }));
  const catalogs = [people, roles, assignments];
  const loading = catalogs.some((v) => v.loading);
  const errors = catalogs.map((v) => v.error).filter((v): v is string => v !== null);
  const eligiblePeople = people.items.filter((v) => v.state.isActive && v.state.name.trim().toLowerCase() !== 'inactivo');
  const eligibleRoles = roles.items.filter((v) => v.isActive);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    if (loading || errors.length || !eligiblePeople.some((v) => v.id === Number(personId))
      || !eligibleRoles.some((v) => v.id === Number(roleId))) { setError('Selecciona un colaborador y rol activos del catálogo.'); return; }
    if (assignments.items.some((v) => v.isActive && v.collaborator.id === Number(personId) && v.role.id === Number(roleId))) {
      setError('Ese colaborador y rol ya tienen una asignación activa en este alcance.'); return;
    }
    setSaving(true); setError(null);
    try {
      const result = await requirementsApi.assignScope(companyId, branchId, requirement.id, row.id,
        { collaborator: { id: Number(personId) }, role: { id: Number(roleId) } });
      if (!result) throw new Error('La API no devolvió la asignación guardada.');
      if (mounted.current) onSaved();
    } catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { if (mounted.current) setSaving(false); }
  }
  return <ResourceModal open title={`Asignar colaborador · ${row.scope.name}`} dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted">Solo puede existir una asignación activa por alcance. Cambiar de persona o rol envía la anterior al historial.
        Asignar o reactivar cambia automáticamente el alcance y la persona a Asignado, conservando las fechas históricas.</p>
      {row.currentAssignment && <p className="muted">Responsable vigente: {collaboratorFullName(row.currentAssignment.collaborator)}.</p>}
      <SelectField label="Colaborador" required disabled={saving || loading} value={personId}
        options={eligiblePeople.map((v) => ({ value: v.id, label: `${v.code} · ${collaboratorFullName(v)}` }))} onChange={(e) => setPersonId(e.target.value)} />
      <SelectField label="Rol" required disabled={saving || loading} value={roleId}
        options={eligibleRoles.map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))} onChange={(e) => setRoleId(e.target.value)} />
      {[...errors, error].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
      {(errors.length > 0 || error) && <button className="button secondary" type="button" disabled={saving || loading}
        onClick={() => catalogs.forEach((v) => v.refresh())}>Reintentar catálogos</button>}
      <ModalActions onCancel={close} saving={saving} submitDisabled={loading || errors.length > 0} submitLabel="Asignar colaborador" />
    </form>
  </ResourceModal>;
}

function ScopeStateModal({ companyId, branchId, requirement, row, otherProgress, onClose, onSaved, onCompleteService }: Context & {
  row: RequirementScopeLink; otherProgress?: string; onClose: () => void; onSaved: () => void; onCompleteService: () => void;
}) {
  const [stateId, setStateId] = useState(String(row.state.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const close = () => { if (!saving) onClose(); };
  const states = useRequirementCatalog('requirement-scope-workflow-states', true,
    (page) => requirementsApi.scopeStates({ isActive: true, page, pageSize: 100 }), ['/requirements/v0/scope_states']);
  const selectedState = states.items.find((v) => v.id === Number(stateId));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    if (states.loading || states.error || !selectedState?.isActive) { setError('Selecciona un estado activo del catálogo.'); return; }
    if (normalizedState(selectedState.name) === 'en progreso' && otherProgress) {
      setError(`"${otherProgress}" ya está En Progreso. Cambia su estado antes de iniciar otro alcance.`); return;
    }
    if (normalizedState(selectedState.name) === 'sin asignar' && row.currentAssignment
      && !window.confirm('La asignación vigente se desactivará y quedará en el historial. ¿Continuar?')) return;
    if (normalizedState(selectedState.name) === 'finalizado' && row.scope.deliverable
      && typeof row.scope.deliverable.generatesService !== 'boolean') {
      setError('La API no informa generatesService. Actualiza el backend y las rutinas antes de finalizar este entregable.'); return;
    }
    if (normalizedState(selectedState.name) === 'finalizado' && normalizedState(row.state.name) !== 'finalizado'
      && row.scope.deliverable?.generatesService) { onCompleteService(); return; }
    if (normalizedState(selectedState.name) === 'finalizado'
      && !window.confirm('Se finalizarán el alcance y únicamente su asignación vigente. ¿Continuar?')) return;
    setSaving(true); setError(null);
    try {
      const result = await requirementsApi.changeScopeState(companyId, branchId, requirement.id, row.id, selectedState.id);
      if (!result) throw new Error('La API no devolvió el estado guardado.');
      if (mounted.current) onSaved();
    } catch (cause) { if (mounted.current) setError(errorMessage(cause)); }
    finally { if (mounted.current) setSaving(false); }
  }
  return <ResourceModal open title={`Cambiar estado · ${row.scope.name}`} dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted">El estado pertenece a este alcance y se sincroniza con la asignación vigente, conservando el historial.
        El estado general del requerimiento se recalcula automáticamente.</p>
      <SelectField label="Estado del alcance" required disabled={saving || states.loading} value={stateId}
        options={states.items.map((v) => ({ value: v.id, label: formatStateName(v.name) }))} onChange={(e) => setStateId(e.target.value)} />
      {otherProgress && <p className="muted">Etapa En Progreso: {otherProgress}. Solo se permite una por requerimiento.</p>}
      {[states.error, error].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
      {states.error && <button className="button secondary" type="button" disabled={saving || states.loading} onClick={states.refresh}>Reintentar catálogo</button>}
      <ModalActions onCancel={close} saving={saving} submitDisabled={states.loading || Boolean(states.error)} submitLabel="Guardar estado" />
    </form>
  </ResourceModal>;
}
