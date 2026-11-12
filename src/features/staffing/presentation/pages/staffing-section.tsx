import { useEffect, useState } from 'react';
import { API_MUTATION_EVENT, type ApiMutationDetail, type PageResponse } from '../../../../shared/api';
import { ActiveBadge, formatStateName, type TableColumn } from '../../../../shared/components/api-section';
import { ManagementTable } from '../../../../shared/components/management-table';
import { SelectField } from '../../../../shared/components/select-field';
import { projectsApi } from '../../../projects/infrastructure/api';
import { staffingApi, type Staffing, type StaffingQuery } from '../../infrastructure/api/staffing-api';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { emptySelection, idOf, referenceLabel, StaffingScopeFields, useStaffingCatalog } from '../staffing-fields';
import { StaffingFormModal } from './staffing-form-modal';
import { StaffingAssignmentsTable } from './staffing-assignments-table';

const emptyFilters = { ...emptySelection, staffingStateId: '' };

export function StaffingSection() {
  const { selectedCompanyId, selectedBranchId } = useGlobalCompany();
  return <StaffingWorkspace key={`${selectedCompanyId}:${selectedBranchId}`} companyId={selectedCompanyId} branchId={selectedBranchId} />;
}

function StaffingWorkspace({ companyId, branchId }: { companyId?: number; branchId?: number }) {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<number>();
  const [result, setResult] = useState<PageResponse<Staffing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projects = useStaffingCatalog(`projects:${companyId}`, true,
    (catalogPage) => projectsApi.listProjects({ 'company.id': companyId, page: catalogPage, pageSize: 100 }));
  const states = useStaffingCatalog('staffing-states', true,
    (catalogPage) => staffingApi.listStates({ page: catalogPage, pageSize: 100 }));
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    const query: StaffingQuery = { companyId, projectId: idOf(filters.projectId), periodId: idOf(filters.periodId),
      subperiodId: idOf(filters.subperiodId), sectionId: idOf(filters.sectionId), fractionId: idOf(filters.fractionId),
      specialityId: idOf(filters.specialityId), staffingStateId: idOf(filters.staffingStateId), page, pageSize: 20 };
    void staffingApi.listStaffing(query).then((data) => { if (active) setResult(data); })
      .catch((cause: unknown) => { if (active) { setResult(null); setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las solicitudes.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, filters, page, revision]);
  useEffect(() => {
    const handleMutation = (event: Event) => {
      if ((event as CustomEvent<ApiMutationDetail>).detail.path === '/staffing/v0/staffing') setRevision((value) => value + 1);
    };
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, []);
  const rows = result?.content ?? [];
  const columns: TableColumn<Staffing>[] = [
    { key: 'project', label: 'Proyecto', render: (item) => referenceLabel(item.project) },
    { key: 'period', label: 'Periodo', render: (item) => referenceLabel(item.period) },
    { key: 'subperiod', label: 'Subperiodo', render: (item) => referenceLabel(item.subperiod) },
    { key: 'section', label: 'Sección', render: (item) => referenceLabel(item.section) },
    { key: 'fraction', label: 'Fracción', render: (item) => referenceLabel(item.fraction) },
    { key: 'speciality', label: 'Especialidad', render: (item) => referenceLabel(item.speciality) },
    { key: 'request', label: 'Solicitud', render: (item) => item.request },
    { key: 'state', label: 'Estado', render: (item) => formatStateName(item.staffingState.name) },
    { key: 'date', label: 'Fecha de registro', render: (item) => item.registeredDate },
    { key: 'active', label: 'Actividad', render: (item) => <ActiveBadge active={item.isActive} /> },
    { key: 'actions', label: 'Acciones', render: (item) => <div className="row-actions">
      <button className="row-action-button details" type="button" title="Asignaciones" aria-label="Ver asignaciones" aria-expanded={expanded === item.id}
        aria-controls={`staffing-assignments-${item.id}`} onClick={() => setExpanded(expanded === item.id ? undefined : item.id)}>
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M3 15h18" /></svg>
      </button></div> },
  ];
  return <section className="resource-section">
    <div className="section-heading"><div><p className="eyebrow">Staffing</p><h2>Solicitudes de staffing</h2>
      <p className="muted">Consulta solicitudes y despliega sus asignaciones desde el botón de detalles.</p></div>
      <button className="button primary" type="button" disabled={!companyId || !branchId} onClick={() => setAdding(true)}>Nuevo +</button>
    </div>
    {(!companyId || !branchId) && <p className="company-scope-hint">Selecciona compañía y branch globales para crear una solicitud.</p>}
    <form className="management-filters" onSubmit={(event) => { event.preventDefault(); setFilters(draft); setPage(1); setExpanded(undefined); }}>
      <StaffingScopeFields value={draft} onChange={(selection) => setDraft({ ...selection, staffingStateId: draft.staffingStateId })}
        companyId={companyId} branchId={branchId} projects={projects.items} disabled={projects.loading || !!projects.error} />
      <SelectField label="Estado de staffing" value={draft.staffingStateId} disabled={states.loading || !!states.error}
        options={states.items.map((item) => ({ value: item.id, label: formatStateName(item.name) }))}
        onChange={(event) => setDraft({ ...draft, staffingStateId: event.target.value })} />
      <div className="management-filter-actions"><button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); setExpanded(undefined); }}>Limpiar filtros</button>
        <button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Actualizar</button></div>
    </form>
    {[projects, states].filter((catalog) => catalog.error).map((catalog) => <div className="alert error" key={catalog.key}>{catalog.error}
      <button type="button" className="button secondary" onClick={catalog.refresh}>Reintentar</button></div>)}
    {rows.some((item) => [item.project, item.period, item.subperiod, item.section, item.fraction, item.speciality].some((ref) => !ref.code || !ref.name))
      && <div className="alert warning">Hay referencias incompletas. Actualiza el backend y las rutinas V1; no se reconstruyen nombres mediante consultas por fila.</div>}
    <ManagementTable columns={columns} rows={rows} loading={loading} error={error} rowKey={(item) => item.id}
      emptyMessage="No hay solicitudes de staffing para mostrar."
      renderExpandedRow={(item) => expanded === item.id ? <StaffingAssignmentsTable staffing={item} /> : null} />
    <nav className="management-filter-actions" aria-label="Páginas de solicitudes de staffing">
      <button className="button secondary" type="button" disabled={page <= 1 || loading} onClick={() => { setPage(page - 1); setExpanded(undefined); }}>Anterior</button>
      <span>Página {page}{result ? ` de ${result.pagination.totalPages}` : ''}</span>
      <button className="button secondary" type="button" disabled={loading || !result || page >= result.pagination.totalPages}
        onClick={() => { setPage(page + 1); setExpanded(undefined); }}>Siguiente</button>
    </nav>
    {adding && companyId && branchId && <StaffingFormModal companyId={companyId} branchId={branchId} onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />}
  </section>;
}