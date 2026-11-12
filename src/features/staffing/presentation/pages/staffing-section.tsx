import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, formatStateName, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { companiesApi, type Fraction, type Period, type Section, type Speciality, type Subperiod } from '../../../companies/infrastructure/api';
import { staffingApi, type Staffing, type StaffingCatalogReference, type StaffingQuery } from '../../infrastructure/api/staffing-api';
import { useStaffingCatalog } from '../use-staffing-catalog';
import { StaffingAssignmentsTable } from './staffing-assignments-table';

type FilterForm = Record<'periodId' | 'subperiodId' | 'sectionId' | 'fractionId' | 'specialityId' | 'staffingStateId', string>;
const emptyFilters: FilterForm = { periodId: '', subperiodId: '', sectionId: '', fractionId: '', specialityId: '', staffingStateId: '' };

function referenceId(value: string) {
  return value ? Number(value) : undefined;
}

function catalogLabel(value: StaffingCatalogReference) {
  return value.code ? `${value.code} · ${value.name}` : value.name;
}

export function StaffingSection() {
  const { selectedCompanyId, selectedBranchId } = useGlobalCompany();
  const [filterForm, setFilterForm] = useState<FilterForm>(emptyFilters);
  const [filters, setFilters] = useState<FilterForm>(emptyFilters);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const query: StaffingQuery = {
    companyId: selectedCompanyId,
    branchId: selectedBranchId,
    periodId: referenceId(filters.periodId),
    subperiodId: referenceId(filters.subperiodId),
    sectionId: referenceId(filters.sectionId),
    fractionId: referenceId(filters.fractionId),
    specialityId: referenceId(filters.specialityId),
    staffingStateId: referenceId(filters.staffingStateId),
  };
  const requests = useStaffingCatalog<Staffing>(`staffing:${JSON.stringify(query)}`, true,
    (page) => staffingApi.listStaffing({ ...query, page, pageSize: 100 }));
  const states = useStaffingCatalog('staffing-states', true,
    (page) => staffingApi.listStates({ page, pageSize: 100 }));

  useEffect(() => {
    setCreating(false);
    setExpanded(new Set());
    setFilterForm(emptyFilters);
    setFilters(emptyFilters);
  }, [selectedCompanyId, selectedBranchId]);

  useEffect(() => {
    function onMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path === '/staffing/v0/staffing') requests.refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, [requests.refresh]);

  function toggleDetails(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columns: TableColumn<Staffing>[] = [
    { key: 'id', label: 'ID', render: (item) => item.id },
    { key: 'company', label: 'Compañía', render: (item) => item.company?.name ?? 'No informado' },
    { key: 'branch', label: 'Branch', render: (item) => item.branch?.name ?? 'No informado' },
    { key: 'period', label: 'Periodo', render: (item) => catalogLabel(item.period) },
    { key: 'subperiod', label: 'Subperiodo', render: (item) => catalogLabel(item.subperiod) },
    { key: 'section', label: 'Sección', render: (item) => catalogLabel(item.section) },
    { key: 'fraction', label: 'Fracción', render: (item) => catalogLabel(item.fraction) },
    { key: 'speciality', label: 'Especialidad', render: (item) => catalogLabel(item.speciality) },
    { key: 'state', label: 'Estado de staffing', render: (item) => formatStateName(item.staffingState.name) },
    { key: 'date', label: 'Fecha', render: (item) => item.registeredDate },
    { key: 'active', label: 'Activo', render: (item) => <ActiveBadge active={item.isActive} /> },
    {
      key: 'assignments', label: 'Asignaciones', render: (item) => (
        <button className="row-action-button details" type="button" aria-expanded={expanded.has(item.id)}
          aria-label={expanded.has(item.id) ? 'Ocultar asignaciones' : 'Ver asignaciones'}
          aria-controls={`staffing-assignments-${item.id}`} title="Asignaciones de staffing"
          onClick={() => toggleDetails(item.id)}>
          <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
            <path d="M3 4h18v13H3zM3 9h18M9 4v13M16 20l3-3 3 3" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <section className="resource-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Staffing</p>
          <h2>Solicitudes de staffing</h2>
          <p className="muted">El staffing agrupa las asignaciones. La solicitud, el proyecto, la tecnología y la capacidad se indican en cada asignación.</p>
        </div>
        <button className="button primary" type="button" disabled={!selectedCompanyId || !selectedBranchId}
          onClick={() => setCreating(true)}>Nuevo +</button>
      </div>
      {(!selectedCompanyId || !selectedBranchId) && (
        <div className="company-scope-hint">Selecciona compañía y branch en la barra superior para crear solicitudes.</div>
      )}
      <form className="staffing-filter-form" onSubmit={(event) => {
        event.preventDefault();
        setFilters(filterForm);
        setExpanded(new Set());
        requests.refresh();
      }}>
        {([
          ['periodId', 'ID de periodo'], ['subperiodId', 'ID de subperiodo'], ['sectionId', 'ID de sección'],
          ['fractionId', 'ID de fracción'], ['specialityId', 'ID de especialidad'],
        ] as const).map(([key, label]) => (
          <Field key={key} label={label} type="number" min="1" step="1" value={filterForm[key]}
            onChange={(event) => setFilterForm({ ...filterForm, [key]: event.target.value })} />
        ))}
        <SelectField label="Estado de staffing" value={filterForm.staffingStateId} disabled={states.loading}
          options={states.items.map((state) => ({ value: state.id, label: formatStateName(state.name) }))}
          onChange={(event) => setFilterForm({ ...filterForm, staffingStateId: event.target.value })} />
        <button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={() => {
          setFilterForm(emptyFilters);
          setFilters(emptyFilters);
          setExpanded(new Set());
          requests.refresh();
        }}>Limpiar filtros</button>
        {(requests.error || states.error) && <button className="button secondary" type="button"
          onClick={() => { requests.refresh(); states.refresh(); }}>Reintentar</button>}
      </form>
      {states.error && <div className="alert error">{states.error}</div>}
      {requests.items.some((item) => !item.company || !item.branch) && (
        <div className="alert warning">Actualiza la API y ambos V1: la solicitud debe devolver compañía y branch, no proyecto.</div>
      )}
      <ManagementTable columns={columns} rows={requests.items} loading={requests.loading} error={requests.error}
        rowKey={(item) => item.id} emptyMessage="No hay solicitudes de staffing para mostrar."
        renderExpandedRow={(item) => expanded.has(item.id) ? <StaffingAssignmentsTable staffing={item} /> : null} />
      {creating && selectedCompanyId && selectedBranchId && (
        <StaffingRequestModal companyId={selectedCompanyId} branchId={selectedBranchId} onClose={() => setCreating(false)} />
      )}
    </section>
  );
}

function StaffingRequestModal({ companyId, branchId, onClose }: {
  companyId: number;
  branchId: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => {
    const today = new Date();
    return {
      periodId: '', subperiodId: '', sectionId: '', fractionId: '', specialityId: '', staffingStateId: '',
      registeredDate: [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')].join('-'),
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const periodId = referenceId(draft.periodId);
  const subperiodId = referenceId(draft.subperiodId);
  const sectionId = referenceId(draft.sectionId);
  const periods = useStaffingCatalog<Period>(`staffing-periods:${companyId}`, true,
    (page) => companiesApi.listPeriods(companyId, { page, pageSize: 100 }));
  const subperiods = useStaffingCatalog<Subperiod>(`staffing-subperiods:${companyId}:${periodId}`, Boolean(periodId),
    (page) => periodId ? companiesApi.listSubperiods(companyId, periodId, { page, pageSize: 100 }) : Promise.resolve(null));
  const sections = useStaffingCatalog<Section>(`staffing-sections:${companyId}:${periodId}:${subperiodId}`,
    Boolean(periodId && subperiodId), (page) => periodId && subperiodId
      ? companiesApi.listSections(companyId, periodId, subperiodId, { page, pageSize: 100 }) : Promise.resolve(null));
  const fractions = useStaffingCatalog<Fraction>(`staffing-fractions:${companyId}:${periodId}:${subperiodId}:${sectionId}`,
    Boolean(periodId && subperiodId && sectionId), (page) => periodId && subperiodId && sectionId
      ? companiesApi.listFractions(companyId, periodId, subperiodId, sectionId, { page, pageSize: 100 }) : Promise.resolve(null));
  const specialities = useStaffingCatalog<Speciality>(`staffing-specialities:${companyId}:${branchId}`, true,
    (page) => companiesApi.listSpecialities(companyId, branchId, { page, pageSize: 100 }));
  const states = useStaffingCatalog('staffing-create-states', true,
    (page) => staffingApi.listStates({ isActive: true, page, pageSize: 100 }));
  const catalogs = [periods, subperiods, sections, fractions, specialities, states];
  const loading = catalogs.some((catalog) => catalog.loading);
  const errors = catalogs.map((catalog) => catalog.error).filter((value): value is string => value !== null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (loading || errors.length || !draft.registeredDate
      || !periods.items.some((item) => item.id === periodId)
      || !subperiods.items.some((item) => item.id === subperiodId)
      || !sections.items.some((item) => item.id === sectionId)
      || !fractions.items.some((item) => item.id === Number(draft.fractionId))
      || !specialities.items.some((item) => item.id === Number(draft.specialityId))
      || !states.items.some((item) => item.id === Number(draft.staffingStateId))) {
      setError('Completa los campos usando los catálogos de la compañía y branch seleccionadas.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await staffingApi.createStaffing({
        period: { id: Number(draft.periodId) }, subperiod: { id: Number(draft.subperiodId) },
        section: { id: Number(draft.sectionId) }, fraction: { id: Number(draft.fractionId) },
        speciality: { id: Number(draft.specialityId) },
        state: { id: Number(draft.staffingStateId) }, registeredDate: draft.registeredDate,
      });
      if (!created) throw new Error('La API no devolvió la solicitud creada.');
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo crear la solicitud.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  const options = (items: { id: number; code?: string; name: string }[]) =>
    items.map((item) => ({ value: item.id, label: item.code ? `${item.code} · ${item.name}` : item.name }));

  return (
    <ResourceModal open title="Nueva solicitud de staffing" dismissible={!saving} onClose={onClose}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <p className="muted">Compañía y branch globales. La solicitud y el proyecto se indicarán al añadir una asignación.</p>
        <SelectField label="Periodo" required value={draft.periodId} options={options(periods.items)} disabled={saving || periods.loading}
          onChange={(event) => setDraft({ ...draft, periodId: event.target.value, subperiodId: '', sectionId: '', fractionId: '' })} />
        <SelectField label="Subperiodo" required value={draft.subperiodId} options={options(subperiods.items)} disabled={saving || !periodId || subperiods.loading}
          onChange={(event) => setDraft({ ...draft, subperiodId: event.target.value, sectionId: '', fractionId: '' })} />
        <SelectField label="Sección" required value={draft.sectionId} options={options(sections.items)} disabled={saving || !subperiodId || sections.loading}
          onChange={(event) => setDraft({ ...draft, sectionId: event.target.value, fractionId: '' })} />
        <SelectField label="Fracción" required value={draft.fractionId} options={options(fractions.items)} disabled={saving || !sectionId || fractions.loading}
          onChange={(event) => setDraft({ ...draft, fractionId: event.target.value })} />
        <SelectField label="Especialidad" required value={draft.specialityId} options={options(specialities.items)} disabled={saving || specialities.loading}
          onChange={(event) => setDraft({ ...draft, specialityId: event.target.value })} />
        <SelectField label="Estado de staffing" required value={draft.staffingStateId} disabled={saving || states.loading}
          options={states.items.map((state) => ({ value: state.id, label: formatStateName(state.name) }))}
          onChange={(event) => setDraft({ ...draft, staffingStateId: event.target.value })} />
        <Field label="Fecha de registro" type="date" required value={draft.registeredDate} disabled={saving}
          onChange={(event) => setDraft({ ...draft, registeredDate: event.target.value })} />
        {errors.map((message, index) => <div key={index} className="alert error">{message}</div>)}
        {errors.length > 0 && <button className="button secondary" type="button"
          onClick={() => catalogs.forEach((catalog) => catalog.refresh())}>Reintentar catálogos</button>}
        {error && <div className="alert error">{error}</div>}
        <ModalActions onCancel={() => { if (!saving) onClose(); }} saving={saving} submitLabel="Crear solicitud"
          submitDisabled={loading || errors.length > 0} />
      </form>
    </ResourceModal>
  );
}
