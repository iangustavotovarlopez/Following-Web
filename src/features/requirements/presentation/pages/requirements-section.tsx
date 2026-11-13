import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, formatStateName, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { projectsApi } from '../../../projects/infrastructure/api';
import { collaboratorsApi } from '../../../collaborators/infrastructure/api';
import { DeliverablesSection } from '../../../companies/presentation/pages/nested-resource-management';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { requirementPath, requirementsApi, type Requirement, type StaffingOption } from '../../infrastructure/api/requirements-api';
import { useRequirementCatalog, useRequirementMounted } from '../use-requirement-catalog';
import { RequirementModal } from './requirement-modal';
import { RequirementScopesTab } from './requirement-scopes-tab';
import { RequirementScopeLinksTable } from './requirement-scope-links-table';

export function RequirementsSection() {
  const { selectedCompanyId: companyId, selectedBranchId: branchId } = useGlobalCompany();
  const [tab, setTab] = useState<'requirements' | 'scopes' | 'deliverables'>('requirements');
  const tabs = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'scopes', label: 'Scopes' },
    { id: 'deliverables', label: 'Entregables' },
  ] as const;
  return (
    <section className="resource-section companies-management">
      <div className="section-heading"><div><p className="eyebrow">Gestión</p><h2>Requirements</h2>
        <p className="muted">Requerimientos de la compañía y Branch, alcances reutilizables y entregables por tecnología.</p></div></div>
      <div className="management-tabs" role="tablist" aria-label="Requirements">
        {tabs.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={tab === id}
          className={tab === id ? 'management-tab active' : 'management-tab'} onClick={() => setTab(id)}>
          {label}</button>)}
      </div>
      <div className="management-tab-content" role="tabpanel">
        {tab === 'requirements' && (companyId && branchId
          ? <RequirementsTab key={`${companyId}:${branchId}`} companyId={companyId} branchId={branchId} />
          : <div className="empty-state">Selecciona compañía y Branch en la barra superior.</div>)}
        {tab === 'scopes' && <RequirementScopesTab key={`${companyId}:${branchId}`} companyId={companyId} branchId={branchId} />}
        {tab === 'deliverables' && (companyId && branchId
          ? <DeliverablesSection key={`deliverables:${companyId}:${branchId}`} />
          : <div className="empty-state">Selecciona compañía y Branch en la barra superior.</div>)}
      </div>
    </section>
  );
}

function RequirementsTab({ companyId, branchId }: { companyId: number; branchId: number }) {
  const [draft, setDraft] = useState({ projectId: '', serviceCode: '', collaboratorId: '' });
  const [filters, setFilters] = useState(draft);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ record?: Requirement } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);
  const mounted = useRequirementMounted();
  const path = requirementPath(companyId, branchId);
  const list = useRequirementCatalog(`${path}:${JSON.stringify(filters)}`, true,
    (page) => requirementsApi.list(companyId, branchId, { page, pageSize: 100, projectId: filters.projectId ? Number(filters.projectId) : undefined,
      'service.code': filters.serviceCode || undefined, collaborator_id: filters.collaboratorId ? Number(filters.collaboratorId) : undefined }), [path, '/projects/v0/projects']);
  const projects = useRequirementCatalog(`requirement-projects:${companyId}`, true,
    (page) => projectsApi.listProjects({ 'company.id': companyId, page, pageSize: 100 }), ['/projects/v0/projects']);
  const people = useRequirementCatalog(`requirement-people:${companyId}`, true,
    (page) => collaboratorsApi.listCollaborators({ 'company.id': companyId, page, pageSize: 100 }), ['/collaborators/v0/collaborators']);
  useEffect(() => {
    function onScopeMutation(event: Event) {
      const mutation = (event as CustomEvent<ApiMutationDetail>).detail.path;
      if (mutation.startsWith(`${path}/`) && /^\d+\/scopes\/\d+(?:\/(?:complete|assignments|state))?$/.test(mutation.slice(path.length + 1))) list.refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onScopeMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onScopeMutation);
  }, [path, list.refresh]);

  async function remove(item: Requirement) {
    if (deleting !== null || !window.confirm(`¿Deseas desactivar el requerimiento #${item.id}?`)) return;
    setDeleting(item.id); setActionError(null);
    try { await requirementsApi.delete(companyId, branchId, item.id); }
    catch (cause) { if (mounted.current) setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el requerimiento.'); }
    finally { if (mounted.current) setDeleting(null); }
  }
  const columns: TableColumn<Requirement>[] = [
    { key: 'id', label: 'ID', render: (v) => v.id },
    { key: 'project', label: 'Proyecto', render: (v) => `${v.project.code} · ${v.project.name}` },
    { key: 'description', label: 'Descripción', render: (v) => v.description },
    { key: 'current-stage', label: 'Etapa Actual', render: (v) => v.currentStage?.name || 'Sin etapa iniciada' },
    { key: 'service', label: 'Servicio', render: (v) => v.service ? `${v.service.code} · ${v.service.name}` : 'No relacionado' },
    { key: 'state', label: 'Estado', render: (v) => formatStateName(v.state.name) },
    { key: 'complexity', label: 'Complejidad', render: (v) => v.complexity.name },
    { key: 'registered', label: 'Registro', render: (v) => v.registeredDate },
    { key: 'completion', label: 'Finalización', render: (v) => v.completionDate || 'Pendiente' },
    { key: 'active', label: 'Activo', render: (v) => <ActiveBadge active={v.isActive} /> },
    { key: 'actions', label: 'Acciones', render: (v) => <RowActions onEdit={() => setModal({ record: v })}
      onDelete={() => void remove(v)} deleteDisabled={!v.isActive || deleting !== null}>
      <button className="row-action-button details" type="button" title="Más detalles" aria-label={`Detalles del requerimiento ${v.id}`}
        aria-expanded={expanded.has(v.id)} aria-controls={`requirement-${v.id}-details`} onClick={() => setExpanded((current) => {
          const next = new Set(current); if (next.has(v.id)) next.delete(v.id); else next.add(v.id); return next;
        })}><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M3 4h18v13H3zM3 9h18M9 4v13M16 20l3-3 3 3" /></svg></button>
    </RowActions> },
  ];
  return <div className="management-panel">
    <div className="management-panel-heading"><div><h3>Requirements</h3><p className="muted">Nuevo + permite seleccionar alcances incluso sin personas asignadas.</p></div>
      <button className="button primary" type="button" onClick={() => setModal({})}>Nuevo +</button></div>
    <form className="management-filters" onSubmit={(event) => {
      event.preventDefault();
      if (draft.serviceCode.trim() && draft.serviceCode.trim().length < 3) { setFilterError('El filtro service.code requiere al menos tres caracteres.'); return; }
      setFilterError(null); setFilters({ ...draft, serviceCode: draft.serviceCode.trim() }); setExpanded(new Set()); list.refresh();
    }}>
      <SelectField label="Proyecto" value={draft.projectId} disabled={projects.loading} options={projects.items.map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))}
        onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} />
      <Field label="service.code" maxLength={100} value={draft.serviceCode} onChange={(e) => setDraft({ ...draft, serviceCode: e.target.value })} />
      <SelectField label="Persona asignada a un alcance" value={draft.collaboratorId} disabled={people.loading}
        options={people.items.map((v) => ({ value: v.id, label: `${v.code} · ${collaboratorFullName(v)}` }))}
        onChange={(e) => setDraft({ ...draft, collaboratorId: e.target.value })} />
      <div className="management-filter-actions"><button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={() => { const empty = { projectId: '', serviceCode: '', collaboratorId: '' };
          setDraft(empty); setFilters(empty); setFilterError(null); setExpanded(new Set()); list.refresh(); }}>Limpiar</button>
        {(list.error || projects.error || people.error) && <button className="button secondary" type="button"
          onClick={() => { list.refresh(); projects.refresh(); people.refresh(); }}>Reintentar</button>}</div>
    </form>
    {[filterError, actionError, projects.error, people.error].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
    <ManagementTable columns={columns} rows={list.items} loading={list.loading} error={list.error} rowKey={(v) => v.id}
      emptyMessage="No hay requerimientos para estos filtros." renderExpandedRow={(v) => expanded.has(v.id) ? <RequirementDetails requirement={v} companyId={companyId} branchId={branchId} /> : null} />
    {modal && createPortal(<RequirementModal key={modal.record?.id ?? 'new'} companyId={companyId} branchId={branchId}
      editing={modal.record} onClose={() => setModal(null)} />, document.body)}
  </div>;
}

function RequirementDetails({ requirement: r, companyId, branchId }: { requirement: Requirement; companyId: number; branchId: number }) {
  const path = requirementPath(companyId, branchId);
  const staffing = useRequirementCatalog(`${path}/${r.id}/staffing_assignments`, true,
    (page) => requirementsApi.staffing(companyId, branchId, r.id, { page, pageSize: 100 }),
    ['/staffing/v0/staffing', '/projects/v0/projects', '/collaborators/v0/collaborators']);
  const staffingColumns: TableColumn<StaffingOption>[] = [
    { key: 'id', label: 'Asignación de staffing', render: (v) => v.id },
    { key: 'period', label: 'Periodo', render: (v) => v.periodCode },
    { key: 'request', label: 'Solicitud', render: (v) => v.request },
    { key: 'person', label: 'Colaborador', render: (v) => collaboratorFullName(v.collaborator) },
    { key: 'active', label: 'Estado de asignación', render: (v) => <ActiveBadge active={v.isActive} /> },
  ];
  return <div className="team-inline-details" id={`requirement-${r.id}-details`}>
    <section className="resource-section">
      <RequirementScopeLinksTable companyId={companyId} branchId={branchId} requirement={r} />
      <div className="section-heading"><h3>Historial de staffing</h3>
        {staffing.error && <button className="button secondary" type="button" onClick={staffing.refresh}>Reintentar</button>}</div>
      <ManagementTable columns={staffingColumns} rows={staffing.items} loading={staffing.loading} error={staffing.error}
        rowKey={(v) => v.id} emptyMessage="Este requerimiento se creó con proyecto y todavía no tiene staffing relacionado." />
    </section></div>;
}
