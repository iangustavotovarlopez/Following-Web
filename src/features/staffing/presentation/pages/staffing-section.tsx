import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PageResponse } from '../../../../shared/api';
import { ActiveBadge, formatStateName } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiAction } from '../../../../shared/hooks/use-api-action';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import {
  companiesApi,
  type Fraction,
  type Period,
  type Section,
  type Speciality,
  type Subperiod,
} from '../../../companies/infrastructure/api';
import { projectsApi, type Project } from '../../../projects/infrastructure/api';
import {
  staffingApi,
  type CreateStaffingRequest,
  type Staffing,
  type StaffingQuery,
  type StaffingState,
} from '../../infrastructure/api/staffing-api';
import { useGlobalCompany } from '../../../../app/providers/company-context';

const pagination = { page: 1, pageSize: 100 };

interface CatalogState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

interface StaffingFormState {
  projectId: string;
  periodId: string;
  subperiodId: string;
  sectionId: string;
  fractionId: string;
  specialityId: string;
  capacity: string;
  request: string;
  staffingStateId: string;
  registeredDate: string;
}

type StaffingFilterForm = Record<
  | 'projectId'
  | 'periodId'
  | 'subperiodId'
  | 'sectionId'
  | 'fractionId'
  | 'specialityId'
  | 'staffingStateId',
  string
>;

const emptyStaffingFilters: StaffingFilterForm = {
  projectId: '',
  periodId: '',
  subperiodId: '',
  sectionId: '',
  fractionId: '',
  specialityId: '',
  staffingStateId: '',
};

function newStaffingForm(): StaffingFormState {
  const today = new Date();
  const registeredDate = [today.getFullYear(), `${today.getMonth() + 1}`.padStart(2, '0'), `${today.getDate()}`.padStart(2, '0')].join('-');
  return {
    projectId: '',
    periodId: '',
    subperiodId: '',
    sectionId: '',
    fractionId: '',
    specialityId: '',
    capacity: '',
    request: '',
    staffingStateId: '',
    registeredDate,
  };
}

function useCatalog<T>(
  key: string,
  enabled: boolean,
  request: () => Promise<PageResponse<T> | null>,
): CatalogState<T> {
  const requestRef = useRef(request);
  requestRef.current = request;
  const load = useCallback(() => requestRef.current(), [key, enabled]);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setItems([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }

    setItems([]);
    setLoading(true);
    setError(null);
    load()
      .then((response) => { if (active) setItems(response?.content ?? []); })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [enabled, load]);

  return { items, loading, error };
}

function optionsOf<T extends { id: number }>(items: T[], label: (item: T) => string) {
  return items.map((item) => ({ value: item.id, label: label(item) }));
}

function referenceId(value: string) {
  return value ? Number(value) : undefined;
}

export function StaffingSection() {
  const { selectedCompanyId, selectedBranchId } = useGlobalCompany();
  const [filterForm, setFilterForm] = useState<StaffingFilterForm>(emptyStaffingFilters);
  const [filters, setFilters] = useState<StaffingFilterForm>(emptyStaffingFilters);
  const loadStaffing = useCallback(() => {
    const query: StaffingQuery = {
      projectId: referenceId(filters.projectId),
      periodId: referenceId(filters.periodId),
      subperiodId: referenceId(filters.subperiodId),
      sectionId: referenceId(filters.sectionId),
      fractionId: referenceId(filters.fractionId),
      specialityId: referenceId(filters.specialityId),
      staffingStateId: referenceId(filters.staffingStateId),
      ...pagination,
    };
    return staffingApi.listStaffing(query);
  }, [filters]);
  const staffing = useApiList(loadStaffing);
  const loadProjects = useCallback(
    () => projectsApi.listProjects({ ...pagination, 'company.id': selectedCompanyId }),
    [selectedCompanyId],
  );
  const projects = useApiList(loadProjects);
  const action = useApiAction<Staffing>();
  const [form, setForm] = useState<StaffingFormState>(newStaffingForm);
  const staffingStates = useCatalog<StaffingState>(
    'staffing-states',
    true,
    () => staffingApi.listStates({ ...pagination }),
  );
  const activeStaffingStates = staffingStates.items.filter((state) => state.isActive);
  const projectIds = new Set(
    projects.data
      .filter((project) => project.company.id === selectedCompanyId)
      .map((project) => project.id),
  );
  const staffingRows = selectedCompanyId
    ? staffing.data.filter((item) => projectIds.has(item.project.id))
    : staffing.data;

  const selectedProject = projects.data.find((project) => String(project.id) === form.projectId);
  const companyId = selectedProject?.company.id;
  const periodId = referenceId(form.periodId);
  const subperiodId = referenceId(form.subperiodId);
  const sectionId = referenceId(form.sectionId);
  const branchId = companyId === selectedCompanyId ? selectedBranchId : undefined;

  useEffect(() => {
    setForm(newStaffingForm());
    setFilterForm(emptyStaffingFilters);
    setFilters(emptyStaffingFilters);
  }, [selectedCompanyId]);

  useEffect(() => {
    setForm((current) => ({ ...current, specialityId: '' }));
    setFilterForm((current) => ({ ...current, specialityId: '' }));
    setFilters((current) => ({ ...current, specialityId: '' }));
  }, [selectedBranchId]);

  const periods = useCatalog<Period>(
    `staffing-periods:${companyId}`,
    Boolean(companyId),
    () => companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const subperiods = useCatalog<Subperiod>(
    `staffing-subperiods:${companyId}:${periodId}`,
    Boolean(companyId && periodId),
    () => companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
  );
  const sections = useCatalog<Section>(
    `staffing-sections:${companyId}:${periodId}:${subperiodId}`,
    Boolean(companyId && periodId && subperiodId),
    () => companyId && periodId && subperiodId
      ? companiesApi.listSections(companyId, periodId, subperiodId, pagination)
      : Promise.resolve(null),
  );
  const fractions = useCatalog<Fraction>(
    `staffing-fractions:${companyId}:${periodId}:${subperiodId}:${sectionId}`,
    Boolean(companyId && periodId && subperiodId && sectionId),
    () => companyId && periodId && subperiodId && sectionId
      ? companiesApi.listFractions(companyId, periodId, subperiodId, sectionId, pagination)
      : Promise.resolve(null),
  );
  const specialities = useCatalog<Speciality>(
    `staffing-specialities:${companyId}:${branchId}`,
    Boolean(companyId && branchId),
    () => companyId && branchId
      ? companiesApi.listSpecialities(companyId, branchId, pagination)
      : Promise.resolve(null),
  );
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { setFormError(null); }, [selectedCompanyId, selectedBranchId, form.projectId]);

  function updateField(key: keyof StaffingFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const project = selectedProject;
    const projectId = referenceId(form.projectId);
    const selectedPeriodId = referenceId(form.periodId);
    const selectedSubperiodId = referenceId(form.subperiodId);
    const selectedSectionId = referenceId(form.sectionId);
    const selectedFractionId = referenceId(form.fractionId);
    const specialityId = referenceId(form.specialityId);
    const staffingStateId = referenceId(form.staffingStateId);
    if (!project || !companyId || !projectId || !selectedPeriodId || !selectedSubperiodId || !selectedSectionId || !selectedFractionId || !specialityId || !staffingStateId
      || !branchId || specialities.loading || specialities.error
      || !specialities.items.some((item) => item.id === specialityId)) {
      setFormError('Selecciona compañía y branch globales, un proyecto de esa compañía y los campos requeridos.');
      return;
    }
    setFormError(null);

    const body: CreateStaffingRequest = {
      project: { id: projectId },
      period: { id: selectedPeriodId },
      subperiod: { id: selectedSubperiodId },
      section: { id: selectedSectionId },
      fraction: { id: selectedFractionId },
      speciality: { id: specialityId },
      capacity: Number(form.capacity),
      request: form.request.trim(),
      state: { id: staffingStateId },
      registeredDate: form.registeredDate,
    };

    void action.execute(() => staffingApi.createStaffing(body))
      .then(() => {
        setForm(newStaffingForm());
        staffing.refresh();
      })
      .catch(() => undefined);
  }

  const columns = [
    { key: 'project', label: 'Proyecto', render: (item: Staffing) => projects.data.find((project) => project.id === item.project.id)?.name ?? `#${item.project.id}` },
    { key: 'period', label: 'Periodo', render: (item: Staffing) => `#${item.period.id}` },
    { key: 'subperiod', label: 'Subperiodo', render: (item: Staffing) => `#${item.subperiod.id}` },
    { key: 'section', label: 'Sección', render: (item: Staffing) => `#${item.section.id}` },
    { key: 'fraction', label: 'Fracción', render: (item: Staffing) => `#${item.fraction.id}` },
    { key: 'speciality', label: 'Especialidad', render: (item: Staffing) => `#${item.speciality.id}` },
    { key: 'capacity', label: 'Capacidad', render: (item: Staffing) => item.capacity },
    { key: 'request', label: 'Solicitud', render: (item: Staffing) => item.request || '—' },
    { key: 'state', label: 'Estado', render: (item: Staffing) => formatStateName(item.staffingState.name) },
    { key: 'registeredDate', label: 'Fecha', render: (item: Staffing) => item.registeredDate },
    { key: 'active', label: 'Estado', render: (item: Staffing) => <ActiveBadge active={item.isActive} /> },
  ];
  const catalogErrors = [periods.error, subperiods.error, sections.error, fractions.error, specialities.error, staffingStates.error].filter((error): error is string => Boolean(error));

  return (
    <section className="resource-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Staffing</p>
          <h2>Solicitudes de staffing</h2>
          <p className="muted">Consulta las solicitudes registradas y crea una nueva.</p>
        </div>
      </div>

      <form className="staffing-form" onSubmit={submit}>
        <SelectField label="Proyecto" value={form.projectId} options={optionsOf(projects.data, (project) => `${project.code} · ${project.name}`)} onChange={(event) => {
          setForm((current) => ({ ...current, projectId: event.target.value, periodId: '', subperiodId: '', sectionId: '', fractionId: '', specialityId: '' }));
        }} disabled={projects.loading} required />
        <SelectField label="Periodo" value={form.periodId} options={optionsOf(periods.items, (item) => `${item.name} · ${item.code}`)} onChange={(event) => {
          setForm((current) => ({ ...current, periodId: event.target.value, subperiodId: '', sectionId: '', fractionId: '' }));
        }} disabled={!companyId || periods.loading} required />
        <SelectField label="Subperiodo" value={form.subperiodId} options={optionsOf(subperiods.items, (item) => `${item.name} · ${item.code}`)} onChange={(event) => {
          setForm((current) => ({ ...current, subperiodId: event.target.value, sectionId: '', fractionId: '' }));
        }} disabled={!periodId || subperiods.loading} required />
        <SelectField label="Sección" value={form.sectionId} options={optionsOf(sections.items, (item) => `${item.name} · ${item.code}`)} onChange={(event) => {
          setForm((current) => ({ ...current, sectionId: event.target.value, fractionId: '' }));
        }} disabled={!subperiodId || sections.loading} required />
        <SelectField label="Fracción" value={form.fractionId} options={optionsOf(fractions.items, (item) => `${item.name} · ${item.code}`)} onChange={(event) => updateField('fractionId', event.target.value)} disabled={!sectionId || fractions.loading} required />
        <SelectField label="Especialidad" value={form.specialityId} options={optionsOf(specialities.items, (item) => `${item.code} · ${item.name}`)} onChange={(event) => updateField('specialityId', event.target.value)} disabled={!branchId || specialities.loading} required />
        <Field label="Capacidad" type="number" min="0" step="any" value={form.capacity} onChange={(event) => updateField('capacity', event.target.value)} required />
        <Field label="Solicitud" value={form.request} onChange={(event) => updateField('request', event.target.value)} required />
        <SelectField label="Estado de staffing" value={form.staffingStateId} options={optionsOf(activeStaffingStates, (state) => formatStateName(state.name))} onChange={(event) => updateField('staffingStateId', event.target.value)} disabled={staffingStates.loading} required />
        <Field label="Fecha de registro" type="date" value={form.registeredDate} onChange={(event) => updateField('registeredDate', event.target.value)} required />
        <SubmitButton loading={action.loading} disabled={projects.loading || !branchId || specialities.loading || Boolean(specialities.error)}>Crear staffing</SubmitButton>
        {!selectedBranchId && <span className="muted">Selecciona una branch en la barra superior para crear staffing.</span>}
        {companyId && companyId !== selectedCompanyId && <span className="form-error">El proyecto debe pertenecer a la compañía global seleccionada.</span>}
        {formError && <span className="form-error">{formError}</span>}
        {projects.error && <span className="form-error">No se pudieron cargar los proyectos: {projects.error}</span>}
        {catalogErrors.map((error) => <span className="form-error" key={error}>{error}</span>)}
        {action.error && <span className="form-error">{action.error}</span>}
      </form>

      <form
        className="staffing-filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters(filterForm);
        }}
      >
        <Field label="ID de proyecto" type="number" min="1" step="1" value={filterForm.projectId} onChange={(event) => setFilterForm((current) => ({ ...current, projectId: event.target.value }))} />
        <Field label="ID de periodo" type="number" min="1" step="1" value={filterForm.periodId} onChange={(event) => setFilterForm((current) => ({ ...current, periodId: event.target.value }))} />
        <Field label="ID de subperiodo" type="number" min="1" step="1" value={filterForm.subperiodId} onChange={(event) => setFilterForm((current) => ({ ...current, subperiodId: event.target.value }))} />
        <Field label="ID de sección" type="number" min="1" step="1" value={filterForm.sectionId} onChange={(event) => setFilterForm((current) => ({ ...current, sectionId: event.target.value }))} />
        <Field label="ID de fracción" type="number" min="1" step="1" value={filterForm.fractionId} onChange={(event) => setFilterForm((current) => ({ ...current, fractionId: event.target.value }))} />
        <Field label="ID de especialidad" type="number" min="1" step="1" value={filterForm.specialityId} onChange={(event) => setFilterForm((current) => ({ ...current, specialityId: event.target.value }))} />
        <SelectField label="Filtrar por estado" value={filterForm.staffingStateId} options={optionsOf(staffingStates.items, (state) => formatStateName(state.name))} onChange={(event) => setFilterForm((current) => ({ ...current, staffingStateId: event.target.value }))} disabled={staffingStates.loading} />
        <button className="button primary" type="submit">Filtrar</button>
        <button
          className="button"
          type="button"
          onClick={() => {
            setFilterForm(emptyStaffingFilters);
            setFilters(emptyStaffingFilters);
          }}
        >
          Limpiar filtros
        </button>
      </form>

      {staffing.error && <div className="alert error">{staffing.error}</div>}
      {staffing.loading ? (
        <div className="empty-state">Consultando API...</div>
      ) : staffingRows.length === 0 ? (
        <div className="empty-state">No hay solicitudes de staffing para mostrar.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>{staffingRows.map((item) => (
              <tr key={item.id}>{columns.map((column) => <td key={column.key}>{column.render(item)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}