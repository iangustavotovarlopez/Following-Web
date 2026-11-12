import { useState, type FormEvent } from 'react';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { Field } from '../../../../shared/components/field';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { formatStateName } from '../../../../shared/components/api-section';
import { projectsApi } from '../../../projects/infrastructure/api';
import { servicesApi } from '../../../services/infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { requirementsApi, type Requirement, type Reference, type RequirementCatalog } from '../../infrastructure/api/requirements-api';
import { useRequirementCatalog, useRequirementMounted } from '../use-requirement-catalog';

const options = (rows: Reference[]) => rows.map((v) => ({ value: v.id, label: `${v.code ? `${v.code} · ` : ''}${v.name}` }));
function localDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
function withCurrent(rows: Reference[], current: Reference | undefined) {
  return current && !rows.some((v) => v.id === current.id) ? [...rows, current] : rows;
}

export function RequirementModal({ companyId, branchId, editing, onClose }: {
  companyId: number; branchId: number; editing?: Requirement; onClose: () => void;
}) {
  const { companies, branches } = useGlobalCompany();
  const contextLabel = `${companies.find((v) => v.id === companyId)?.name ?? `Compañía #${companyId}`} · ${branches.find((v) => v.id === branchId)?.name ?? `Branch #${branchId}`}`;
  const [draft, setDraft] = useState(() => ({ description: editing?.description ?? '',
    registeredDate: editing?.registeredDate ?? localDate(),
    completionDate: editing?.completionDate ?? '', projectId: editing ? String(editing.project.id) : '',
    stateId: editing ? String(editing.state.id) : '', complexityId: editing ? String(editing.complexity.id) : '',
    serviceId: editing?.service ? String(editing.service.id) : '', isActive: String(editing?.isActive ?? true) }));
  const [selectedScopes, setSelectedScopes] = useState<Set<number>>(new Set());
  const [selectedStaffing, setSelectedStaffing] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const projects = useRequirementCatalog(`requirement-create-projects:${companyId}`, true,
    (page) => projectsApi.listProjects({ 'company.id': companyId, page, pageSize: 100 }));
  const states = useRequirementCatalog('requirement-states', true, (page) => requirementsApi.states({ page, pageSize: 100 }));
  const complexities = useRequirementCatalog('requirement-complexities', true, (page) => requirementsApi.complexities({ page, pageSize: 100 }));
  const services = useRequirementCatalog('requirement-services', true, (page) => servicesApi.listServices({ page, pageSize: 100 }));
  const scopes = useRequirementCatalog(`requirement-scope-options:${companyId}:${branchId}`, true,
    (page) => requirementsApi.listScopes({ companyId, branchId, isActive: true, page, pageSize: 100 }), ['/requirements/v0/scopes']);
  const staffing = useRequirementCatalog(`requirement-staffing-options:${companyId}:${branchId}`, true,
    (page) => requirementsApi.staffingOptions(companyId, branchId, { page, pageSize: 100 }), ['/staffing/v0/staffing']);
  const currentScopes = useRequirementCatalog(`requirement-current-scopes:${editing?.id}`, Boolean(editing),
    (page) => editing ? requirementsApi.scopes(companyId, branchId, editing.id, { page, pageSize: 100 }) : Promise.resolve(null));
  const currentStaffing = useRequirementCatalog(`requirement-current-staffing:${editing?.id}`, Boolean(editing),
    (page) => editing ? requirementsApi.staffing(companyId, branchId, editing.id, { page, pageSize: 100 }) : Promise.resolve(null));
  const catalogs = [projects, states, complexities, services, scopes, staffing, currentScopes, currentStaffing];
  const loading = catalogs.some((v) => v.loading);
  const errors = catalogs.map((v) => v.error).filter((v): v is string => v !== null);
  const existingScopeIds = new Set(currentScopes.items.map((v) => v.scope.id));
  const existingStaffingIds = new Set(currentStaffing.items.map((v) => v.id));
  const availableScopes = [...scopes.items, ...currentScopes.items.map((v) => v.scope).filter((v) => !scopes.items.some((s) => s.id === v.id))];
  const projectId = Number(draft.projectId);
  const availableStaffing = [...staffing.items, ...currentStaffing.items.filter((v) => !staffing.items.some((s) => s.id === v.id))]
    .filter((v) => !projectId || v.project.id === projectId);
  const activeCatalog = (rows: RequirementCatalog[], current?: RequirementCatalog) =>
    withCurrent(rows.filter((v) => v.isActive), current).map((v) => ({ value: v.id, label: formatStateName(v.name) }));
  const close = () => { if (!saving) onClose(); };

  function toggleScope(id: number) {
    setSelectedScopes((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleStaffing(id: number) {
    const option = staffing.items.find((v) => v.id === id);
    if (!option) { setError('La asignación ya no está disponible. Reintenta los catálogos.'); return; }
    setSelectedStaffing((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    if (!editing) setDraft((current) => ({ ...current, projectId: String(option.project.id) }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (loading || errors.length || !draft.description.trim() || !draft.registeredDate
        || !projectId || !withCurrent(projects.items, editing?.project).some((v) => v.id === projectId)
        || !withCurrent(states.items.filter((v) => v.isActive), editing?.state).some((v) => v.id === Number(draft.stateId))
        || !withCurrent(complexities.items.filter((v) => v.isActive), editing?.complexity).some((v) => v.id === Number(draft.complexityId))
        || (draft.serviceId && !withCurrent(services.items, editing?.service).some((v) => v.id === Number(draft.serviceId)))
        || [...selectedStaffing].some((id) => !staffing.items.some((v) => v.id === id && v.project.id === projectId))
        || [...selectedScopes].some((id) => !scopes.items.some((v) => v.id === id))
        || !['true', 'false'].includes(draft.isActive)) {
      setError('Completa el formulario usando los catálogos del contexto seleccionado.'); return;
    }
    if (draft.completionDate && draft.completionDate < draft.registeredDate) { setError('La finalización no puede ser anterior al registro.'); return; }
    if (editing?.completionDate && !draft.completionDate) { setError('Si deseas corregir la fecha de finalización, selecciona su nuevo valor; omitirla conserva la actual.'); return; }
    if (draft.isActive === 'false' && (selectedScopes.size || selectedStaffing.size)) { setError('Desmarca las relaciones nuevas antes de desactivar el requerimiento. Las relaciones existentes se conservan.'); return; }
    setSaving(true); setError(null);
    try {
      const body = { description: draft.description.trim(), registeredDate: draft.registeredDate, completionDate: draft.completionDate || undefined,
        state: { id: Number(draft.stateId) }, complexity: { id: Number(draft.complexityId) },
        scopes: [...selectedScopes].map((id) => ({ id })), staffingAssignments: [...selectedStaffing].map((id) => ({ id })) };
      const result = editing
        ? await requirementsApi.patch(companyId, branchId, editing.id, { ...body, isActive: draft.isActive === 'true',
            service: { id: draft.serviceId ? Number(draft.serviceId) : null } })
        : await requirementsApi.create(companyId, branchId, { ...body,
            project: selectedStaffing.size ? undefined : { id: projectId }, service: draft.serviceId ? { id: Number(draft.serviceId) } : undefined });
      if (!result) throw new Error('La API no devolvió el requerimiento guardado.');
      if (mounted.current) onClose();
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el requerimiento.'); }
    finally { if (mounted.current) setSaving(false); }
  }

  return <ResourceModal open title={editing ? 'Editar requerimiento' : 'Nuevo requerimiento'} dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted">{contextLabel}. Si eliges staffing, el proyecto se obtiene de esas asignaciones.</p>
      <SelectField label="Proyecto" value={draft.projectId} required disabled={saving || loading || Boolean(editing) || selectedStaffing.size > 0}
        options={options(withCurrent(projects.items, editing?.project))} onChange={(e) => { setDraft({ ...draft, projectId: e.target.value }); setSelectedStaffing(new Set()); }} />
      <label className="field"><span>Descripción</span><textarea required rows={3} value={draft.description} disabled={saving}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <Field label="Fecha de registro" type="date" required value={draft.registeredDate} disabled={saving}
        onChange={(e) => setDraft({ ...draft, registeredDate: e.target.value })} />
      <Field label="Fecha de finalización" type="date" min={draft.registeredDate} value={draft.completionDate} disabled={saving}
        onChange={(e) => setDraft({ ...draft, completionDate: e.target.value })} />
      <SelectField label="Estado" required value={draft.stateId} disabled={saving || states.loading}
        options={activeCatalog(states.items, editing?.state)} onChange={(e) => setDraft({ ...draft, stateId: e.target.value })} />
      <SelectField label="Complejidad" required value={draft.complexityId} disabled={saving || complexities.loading}
        options={activeCatalog(complexities.items, editing?.complexity)} onChange={(e) => setDraft({ ...draft, complexityId: e.target.value })} />
      <SelectField label="Servicio (opcional)" value={draft.serviceId} disabled={saving || services.loading}
        options={options(withCurrent(services.items, editing?.service))} onChange={(e) => setDraft({ ...draft, serviceId: e.target.value })} />
      {editing && <SelectField label="Actividad" required value={draft.isActive} disabled={saving} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
        onChange={(e) => setDraft({ ...draft, isActive: e.target.value })} />}
      <fieldset className="requirements-checklist" disabled={saving || loading}><legend>Alcances</legend>
        <p className="muted">Se crea cada alcance seleccionado sin asignar todavía personas. Los alcances existentes conservan su historial.</p>
        {availableScopes.map((v) => <label key={v.id}><input type="checkbox" checked={selectedScopes.has(v.id) || existingScopeIds.has(v.id)}
          disabled={existingScopeIds.has(v.id) || (draft.isActive === 'false' && !selectedScopes.has(v.id))} onChange={() => toggleScope(v.id)} /> {v.sequence}. {v.name}</label>)}
        {!loading && !scopes.error && !currentScopes.error && !availableScopes.length && <p className="muted">No hay alcances elegibles. Puedes crearlos en la pestaña Scopes o guardar sin alcances.</p>}
      </fieldset>
      <fieldset className="requirements-checklist" disabled={saving || loading}><legend>Asignaciones de staffing (opcionales)</legend>
        {availableStaffing.map((v) => <label key={v.id}><input type="checkbox" checked={selectedStaffing.has(v.id) || existingStaffingIds.has(v.id)}
          disabled={existingStaffingIds.has(v.id) || (draft.isActive === 'false' && !selectedStaffing.has(v.id))} onChange={() => toggleStaffing(v.id)} />
          #{v.id} · {v.project.code} · {v.periodCode} · {collaboratorFullName(v.collaborator)} · {v.request}</label>)}
        {!loading && !staffing.error && !currentStaffing.error && !availableStaffing.length && <p className="muted">Sin staffing disponible para este proyecto; selecciona el proyecto para crear el requerimiento sin staffing.</p>}
        <p className="muted">Las relaciones históricas se conservan; editar permite añadir asignaciones posteriores del mismo proyecto.</p>
      </fieldset>
      {(selectedScopes.size > 0 || selectedStaffing.size > 0) && <button className="button secondary" type="button" disabled={saving || loading}
        onClick={() => { setSelectedScopes(new Set()); setSelectedStaffing(new Set()); setError(null); }}>Limpiar nuevas selecciones de alcances y staffing</button>}
      {errors.map((message, i) => <div key={i} className="alert error">{message}</div>)}
      {(errors.length > 0 || error) && <button className="button secondary" type="button" disabled={saving || loading}
        onClick={() => catalogs.forEach((v) => v.refresh())}>Reintentar catálogos</button>}
      {error && <div className="alert error">{error}</div>}
      <ModalActions onCancel={close} saving={saving} submitLabel={editing ? 'Guardar cambios' : 'Crear requerimiento'} submitDisabled={loading || errors.length > 0} />
    </form></ResourceModal>;
}
