import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  API_MUTATION_EVENT,
  type ApiMutationDetail,
  type PageResponse,
} from '../../../../shared/api';
import {
  ActiveBadge,
  ApiSection,
  type TableColumn,
} from '../../../../shared/components/api-section';
import { CatalogFilters, type CatalogFilterValues } from '../../../../shared/components/catalog-filters';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiAction } from '../../../../shared/hooks/use-api-action';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import {
  companiesApi,
  type Company,
  type Deliverable,
  type DeliverablePatchRequest,
  type Fraction,
  type Period,
  type PeriodPatchRequest,
  type Section,
  type Skill,
  type SkillLevel,
  type Speciality,
  type Subperiod,
  type Team,
  type TeamPatchRequest,
  type TeamMember,
} from '../../infrastructure/api';
import { collaboratorsApi, type Collaborator } from '../../../collaborators/infrastructure/api';

type Id = number | undefined;
type FormSetter<T> = Dispatch<SetStateAction<T>>;

const pagination = { page: 1, pageSize: 100 };
const idOf = (value: string): Id => value ? Number(value) : undefined;
const optionsOf = <T extends { id: number }>(items: T[], label: (item: T) => string) =>
  items.map((item) => ({ value: item.id, label: label(item) }));
const collaboratorFullName = (item: Collaborator) => [
  item.name,
  item.secondName,
  item.thirdName,
  item.lastname,
  item.secondLastname,
  item.thirdLastname,
].filter(Boolean).join(' ');
const collaboratorLabel = (item: Collaborator) => `${item.code} · ${collaboratorFullName(item)}`;

function useScopedList<T>(
  scopeKey: string,
  request: () => Promise<PageResponse<T> | null>,
) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const load = useCallback(() => requestRef.current(), [scopeKey]);
  return useApiList(load);
}

function useOptions<T>(scopeKey: string, request: () => Promise<PageResponse<T> | null>) {
  return useScopedList(scopeKey, request).data;
}

interface ManagedResourceSectionProps<T, Form> {
  title: string;
  description: string;
  columns: TableColumn<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  enabled: boolean;
  filterFields: ReactNode;
  initialForm: Form;
  renderFields: (form: Form, setForm: FormSetter<Form>) => ReactNode;
  create: (form: Form) => Promise<T | null>;
  onSaved: () => void;
  extraForm?: ReactNode;
}

function ManagedResourceSection<T, Form>({
  title,
  description,
  columns,
  rows,
  loading,
  error,
  enabled,
  filterFields,
  initialForm,
  renderFields,
  create,
  onSaved,
  extraForm,
}: ManagedResourceSectionProps<T, Form>) {
  const [form, setForm] = useState(initialForm);
  const action = useApiAction<T>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    void action.execute(() => create(form)).then((created) => {
      if (!created) return;
      setForm(initialForm);
      onSaved();
    }).catch(() => undefined);
  }

  const formView = (
    <div className="form-stack">
      <form className="form-stack" onSubmit={submit}>
        <div className="inline-form">
          {renderFields(form, setForm)}
          <SubmitButton loading={action.loading} disabled={!enabled}>Crear</SubmitButton>
        </div>
        {action.error && <span className="form-error">{action.error}</span>}
      </form>
      {extraForm}
    </div>
  );

  return (
    <ApiSection
      title={title}
      description={description}
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      form={formView}
      filters={filterFields}
    />
  );
}

export function PlanningSection() {
  const companies = useOptions('planning-companies', () => companiesApi.listCompanies(pagination));
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [activeTab, setActiveTab] = useState('periods');
  const refreshCatalogs = () => setCatalogRevision((revision) => revision + 1);
  const tabs = [
    { id: 'periods', label: 'Periods' },
    { id: 'subperiods', label: 'Subperiods' },
    { id: 'sections', label: 'Sections' },
    { id: 'fractions', label: 'Fractions' },
  ];

  return (
    <section className="resource-section companies-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogos</p>
          <h2>Planning</h2>
          <p className="muted">Administra periodos, subperiodos, secciones y fracciones.</p>
        </div>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Catálogos de planeación">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'management-tab active' : 'management-tab'}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="management-tab-content" role="tabpanel">
        {activeTab === 'periods' && (
          <PeriodsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        )}
        {activeTab === 'subperiods' && (
          <SubperiodsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        )}
        {activeTab === 'sections' && (
          <SectionsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        )}
        {activeTab === 'fractions' && (
          <FractionsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        )}
      </div>
    </section>
  );
}

export function AdditionalCatalogsSection() {
  const companies = useOptions('companies', () => companiesApi.listCompanies(pagination));
  const [catalogRevision, setCatalogRevision] = useState(0);
  const refreshCatalogs = () => setCatalogRevision((revision) => revision + 1);

  return (
    <section className="resource-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogos</p>
          <h2>Additional catalogs</h2>
          <p className="muted">Administra especialidades, skills, entregables y miembros de equipos.</p>
        </div>
      </div>
      <div className="resource-grid additional-catalog-grid">
        <SpecialitiesSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        <SkillsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        <SkillLevelsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        <DeliverablesSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
        <TeamMembersSection
          companies={companies}
          revision={catalogRevision}
          onSaved={refreshCatalogs}
        />
      </div>
    </section>
  );
}

function PeriodsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const load = useScopedList(`periods:${companyId}:${revision}:${JSON.stringify(filters)}`, () =>
    companyId ? companiesApi.listPeriods(companyId, { ...pagination, ...filters }) : Promise.resolve(null),
  );
  const columns: TableColumn<Period>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  const updateForm = (
    <PeriodUpdateForm companyId={companyId} periods={load.data} onSaved={onSaved} />
  );

  return (
    <ManagedResourceSection
      title="Periods"
      description="Consulta y registra periodos para una compañía."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
        }} required />
        <CatalogFilters onApply={setFilters} />
      </>}
      initialForm={{ name: '', code: '', startDate: '', endDate: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Inicio" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
        <Field label="Fin" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
      </>}
      create={(form) => companyId ? companiesApi.createPeriod(companyId, form) : Promise.resolve(null)}
      onSaved={onSaved}
      extraForm={updateForm}
    />
  );
}

function PeriodUpdateForm({ companyId, periods, onSaved }: {
  companyId: Id;
  periods: Period[];
  onSaved: () => void;
}) {
  const action = useApiAction<Period>();
  const [periodId, setPeriodId] = useState<Id>();
  const [form, setForm] = useState<PeriodPatchRequest>({});

  function selectPeriod(value: string) {
    const period = periods.find((item) => item.id === idOf(value));
    setPeriodId(period?.id);
    setForm(period ? {
      name: period.name,
      code: period.code,
      startDate: period.startDate,
      endDate: period.endDate,
      isActive: period.isActive,
    } : {});
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !periodId) return;
    void action.execute(() => companiesApi.patchPeriod(companyId, periodId, form))
      .then((updated) => { if (updated) onSaved(); })
      .catch(() => undefined);
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <SelectField label="Editar periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => selectPeriod(event.target.value)} required />
      <Field label="Nombre" value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Field label="Código" value={form.code ?? ''} onChange={(event) => setForm({ ...form, code: event.target.value })} />
      <Field label="Inicio" type="date" value={form.startDate ?? ''} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
      <Field label="Fin" type="date" value={form.endDate ?? ''} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
      <SelectField label="Activo" value={form.isActive === undefined ? '' : String(form.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })} />
      <SubmitButton loading={action.loading} disabled={!companyId || !periodId}>Actualizar</SubmitButton>
      {action.error && <span className="form-error">{action.error}</span>}
    </form>
  );
}

function SubperiodsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const periods = useOptions(`subperiod-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`subperiods:${companyId}:${periodId}:${revision}:${JSON.stringify(filters)}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, { ...pagination, ...filters }) : Promise.resolve(null),
  );
  const columns: TableColumn<Subperiod>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];

  return (
    <ManagedResourceSection
      title="Subperiods"
      description="Consulta y registra subperiodos dentro de un periodo."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && periodId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setPeriodId(undefined);
        }} required />
        <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => setPeriodId(idOf(event.target.value))} disabled={!companyId} required />
        <CatalogFilters onApply={setFilters} />
      </>}
      initialForm={{ name: '', code: '', startDate: '', endDate: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Inicio" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
        <Field label="Fin" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
      </>}
      create={(form) => companyId && periodId ? companiesApi.createSubperiod(companyId, periodId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function SpecialitiesSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const branches = useOptions(`speciality-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Speciality>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];

  return (
    <ManagedResourceSection
      title="Especialidades"
      description="Consulta y registra especialidades dentro de una branch."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => setBranchId(idOf(event.target.value))} disabled={!companyId} required />
      </>}
      initialForm={{ code: '', name: '', description: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </>}
      create={(form) => companyId && branchId ? companiesApi.createSpeciality(companyId, branchId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function SectionsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [subperiodId, setSubperiodId] = useState<Id>();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const periods = useOptions(`section-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const subperiods = useOptions(`section-subperiods:${companyId}:${periodId}:${revision}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`sections:${companyId}:${periodId}:${subperiodId}:${revision}:${JSON.stringify(filters)}`, () =>
    companyId && periodId && subperiodId ? companiesApi.listSections(companyId, periodId, subperiodId, { ...pagination, ...filters }) : Promise.resolve(null),
  );
  const columns: TableColumn<Section>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
  ];

  return (
    <ManagedResourceSection
      title="Sections"
      description="Consulta y registra secciones dentro de un subperiodo."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && periodId && subperiodId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setPeriodId(undefined);
          setSubperiodId(undefined);
        }} required />
        <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => {
          setPeriodId(idOf(event.target.value));
          setSubperiodId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Subperiodo" value={subperiodId ?? ''} options={optionsOf(subperiods, (item) => item.name)} onChange={(event) => setSubperiodId(idOf(event.target.value))} disabled={!periodId} required />
        <CatalogFilters onApply={setFilters} />
      </>}
      initialForm={{ name: '', code: '', startDate: '', endDate: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Inicio" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
        <Field label="Fin" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
      </>}
      create={(form) => companyId && periodId && subperiodId ? companiesApi.createSection(companyId, periodId, subperiodId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function FractionsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [subperiodId, setSubperiodId] = useState<Id>();
  const [sectionId, setSectionId] = useState<Id>();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const periods = useOptions(`fraction-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const subperiods = useOptions(`fraction-subperiods:${companyId}:${periodId}:${revision}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
  );
  const sections = useOptions(`fraction-sections:${companyId}:${periodId}:${subperiodId}:${revision}`, () =>
    companyId && periodId && subperiodId ? companiesApi.listSections(companyId, periodId, subperiodId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`fractions:${companyId}:${periodId}:${subperiodId}:${sectionId}:${revision}:${JSON.stringify(filters)}`, () =>
    companyId && periodId && subperiodId && sectionId ? companiesApi.listFractions(companyId, periodId, subperiodId, sectionId, { ...pagination, ...filters }) : Promise.resolve(null),
  );
  const columns: TableColumn<Fraction>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
  ];

  return (
    <ManagedResourceSection
      title="Fractions"
      description="Consulta y registra fracciones dentro de una sección."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && periodId && subperiodId && sectionId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setPeriodId(undefined);
          setSubperiodId(undefined);
          setSectionId(undefined);
        }} required />
        <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => {
          setPeriodId(idOf(event.target.value));
          setSubperiodId(undefined);
          setSectionId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Subperiodo" value={subperiodId ?? ''} options={optionsOf(subperiods, (item) => item.name)} onChange={(event) => {
          setSubperiodId(idOf(event.target.value));
          setSectionId(undefined);
        }} disabled={!periodId} required />
        <SelectField label="Sección" value={sectionId ?? ''} options={optionsOf(sections, (item) => item.name)} onChange={(event) => setSectionId(idOf(event.target.value))} disabled={!subperiodId} required />
        <CatalogFilters onApply={setFilters} />
      </>}
      initialForm={{ name: '', code: '', startDate: '', endDate: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Inicio" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
        <Field label="Fin" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
      </>}
      create={(form) => companyId && periodId && subperiodId && sectionId ? companiesApi.createFraction(companyId, periodId, subperiodId, sectionId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function SkillsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [technologyId, setTechnologyId] = useState<Id>();
  const branches = useOptions(`skill-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const technologies = useOptions(`skill-technologies:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listTechnologies(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`skills:${companyId}:${branchId}:${technologyId}:${revision}`, () =>
    companyId && branchId && technologyId ? companiesApi.listSkills(companyId, branchId, technologyId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Skill>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  return (
    <ManagedResourceSection
      title="Habilidades"
      description="Consulta y registra habilidades para una technology."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && technologyId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setTechnologyId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setTechnologyId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Technology" value={technologyId ?? ''} options={optionsOf(technologies, (item) => item.name)} onChange={(event) => setTechnologyId(idOf(event.target.value))} disabled={!branchId} required />
      </>}
      initialForm={{ name: '', description: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </>}
      create={(form) => companyId && branchId && technologyId ? companiesApi.createSkill(companyId, branchId, technologyId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function SkillLevelsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [technologyId, setTechnologyId] = useState<Id>();
  const [skillId, setSkillId] = useState<Id>();
  const branches = useOptions(`level-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const technologies = useOptions(`level-technologies:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listTechnologies(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const skills = useOptions(`level-skills:${companyId}:${branchId}:${technologyId}:${revision}`, () =>
    companyId && branchId && technologyId ? companiesApi.listSkills(companyId, branchId, technologyId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`levels:${companyId}:${branchId}:${technologyId}:${skillId}:${revision}`, () =>
    companyId && branchId && technologyId && skillId ? companiesApi.listSkillLevels(companyId, branchId, technologyId, skillId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<SkillLevel>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'number', label: 'Número', render: (item) => item.number },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  return (
    <ManagedResourceSection
      title="Niveles de habilidad"
      description="Consulta y registra niveles para una habilidad."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && technologyId && skillId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setTechnologyId(undefined);
          setSkillId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setTechnologyId(undefined);
          setSkillId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Technology" value={technologyId ?? ''} options={optionsOf(technologies, (item) => item.name)} onChange={(event) => {
          setTechnologyId(idOf(event.target.value));
          setSkillId(undefined);
        }} disabled={!branchId} required />
        <SelectField label="Habilidad" value={skillId ?? ''} options={optionsOf(skills, (item) => item.name)} onChange={(event) => setSkillId(idOf(event.target.value))} disabled={!technologyId} required />
      </>}
      initialForm={{ name: '', number: 0 }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Número" type="number" min="0" value={form.number} onChange={(event) => setForm({ ...form, number: Number(event.target.value) })} required />
      </>}
      create={(form) => companyId && branchId && technologyId && skillId ? companiesApi.createSkillLevel(companyId, branchId, technologyId, skillId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

export function TeamsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const branches = useOptions(`team-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`team-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`teams:${companyId}:${branchId}:${specialityId}:${revision}:${JSON.stringify(filters)}`, () =>
    companyId && branchId && specialityId ? companiesApi.listTeams(companyId, branchId, specialityId, { ...pagination, ...filters }) : Promise.resolve(null),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openModal(team?: Team) {
    setEditingTeam(team ?? null);
    setForm(team ? { name: team.name, isActive: team.isActive } : { name: '', isActive: true });
    setFormError(null);
    setActionError(null);
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !branchId || !specialityId) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editingTeam) {
        const patch: TeamPatchRequest = { name: form.name.trim(), isActive: form.isActive };
        await companiesApi.patchTeam(companyId, branchId, specialityId, editingTeam.id, patch);
      } else {
        await companiesApi.createTeam(companyId, branchId, specialityId, { name: form.name.trim() });
      }
      setModalOpen(false);
      onSaved();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el equipo.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam(team: Team) {
    if (!companyId || !branchId || !specialityId
      || !window.confirm(`¿Deseas desactivar el equipo "${team.name}"?`)) return;
    setActionError(null);
    try {
      await companiesApi.deleteTeam(companyId, branchId, specialityId, team.id);
      onSaved();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el equipo.');
    }
  }

  const columns: TableColumn<Team>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          onEdit={() => openModal(item)}
          onDelete={() => void deleteTeam(item)}
        />
      ),
    },
  ];

  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h3>Teams</h3>
          <p className="muted">Consulta y administra equipos para una especialidad.</p>
        </div>
        <button
          className="button primary"
          disabled={!companyId || !branchId || !specialityId}
          onClick={() => openModal()}
          type="button"
        >
          Nuevo +
        </button>
      </div>
      <div className="management-filters">
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setSpecialityId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setSpecialityId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Especialidad" value={specialityId ?? ''} options={optionsOf(specialities, (item) => item.name)} onChange={(event) => setSpecialityId(idOf(event.target.value))} disabled={!branchId} required />
        <CatalogFilters showCode={false} onApply={setFilters} />
      </div>
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable
        columns={columns}
        emptyMessage={companyId && branchId && specialityId
          ? 'No hay equipos para mostrar.'
          : 'Selecciona compañía, branch y especialidad para consultar los equipos.'}
        loading={load.loading}
        error={load.error}
        rows={load.data}
        rowKey={(item) => item.id}
      />
      <ResourceModal
        open={modalOpen}
        title={editingTeam ? 'Editar equipo' : 'Nuevo equipo'}
        onClose={() => setModalOpen(false)}
      >
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          {editingTeam && (
            <SelectField
              label="Estado"
              value={String(form.isActive)}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
            />
          )}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={editingTeam ? 'Guardar cambios' : 'Crear equipo'}
          />
        </form>
      </ResourceModal>
    </div>
  );
}

function DeliverablesSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [technologyId, setTechnologyId] = useState<Id>();
  const branches = useOptions(`deliverable-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const technologies = useOptions(`deliverable-technologies:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listTechnologies(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`deliverables:${companyId}:${branchId}:${technologyId}:${revision}`, () =>
    companyId && branchId && technologyId ? companiesApi.listDeliverables(companyId, branchId, technologyId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Deliverable>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description },
    { key: 'sequence', label: 'Secuencia', render: (item) => item.sequence },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  return (
    <ManagedResourceSection
      title="Entregables"
      description="Consulta y registra entregables para una technology."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && technologyId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setTechnologyId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setTechnologyId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Technology" value={technologyId ?? ''} options={optionsOf(technologies, (item) => item.name)} onChange={(event) => setTechnologyId(idOf(event.target.value))} disabled={!branchId} required />
      </>}
      initialForm={{ name: '', description: '', sequence: 1 }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <Field label="Secuencia" type="number" min="1" value={form.sequence} onChange={(event) => setForm({ ...form, sequence: Number(event.target.value) })} required />
      </>}
      create={(form) => companyId && branchId && technologyId ? companiesApi.createDeliverable(companyId, branchId, technologyId, form) : Promise.resolve(null)}
      onSaved={onSaved}
      extraForm={<DeliverableUpdateForm companyId={companyId} branchId={branchId} technologyId={technologyId} deliverables={load.data} onSaved={onSaved} />}
    />
  );
}

function DeliverableUpdateForm({ companyId, branchId, technologyId, deliverables, onSaved }: {
  companyId: Id;
  branchId: Id;
  technologyId: Id;
  deliverables: Deliverable[];
  onSaved: () => void;
}) {
  const action = useApiAction<Deliverable>();
  const [deliverableId, setDeliverableId] = useState<Id>();
  const [form, setForm] = useState<DeliverablePatchRequest>({});
  function selectDeliverable(value: string) {
    const item = deliverables.find((candidate) => candidate.id === idOf(value));
    setDeliverableId(item?.id);
    setForm(item ? {
      name: item.name,
      description: item.description,
      sequence: item.sequence,
      isActive: item.isActive,
    } : {});
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !branchId || !technologyId || !deliverableId) return;
    void action.execute(() => companiesApi.patchDeliverable(companyId, branchId, technologyId, deliverableId, form))
      .then((updated) => { if (updated) onSaved(); })
      .catch(() => undefined);
  }
  return (
    <form className="inline-form" onSubmit={submit}>
      <SelectField label="Editar entregable" value={deliverableId ?? ''} options={optionsOf(deliverables, (item) => item.name)} onChange={(event) => selectDeliverable(event.target.value)} required />
      <Field label="Nombre" value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Field label="Descripción" value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Field label="Secuencia" type="number" min="1" value={form.sequence ?? ''} onChange={(event) => setForm({ ...form, sequence: Number(event.target.value) })} />
      <SelectField label="Activo" value={form.isActive === undefined ? '' : String(form.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })} />
      <SubmitButton loading={action.loading} disabled={!companyId || !branchId || !technologyId || !deliverableId}>Actualizar</SubmitButton>
      {action.error && <span className="form-error">{action.error}</span>}
    </form>
  );
}

function TeamMembersSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const [teamId, setTeamId] = useState<Id>();
  const [collaboratorRevision, setCollaboratorRevision] = useState(0);
  const [form, setForm] = useState<{ collaboratorId: Id }>({ collaboratorId: undefined });
  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path === '/collaborators/v0/collaborators' || /^\/collaborators\/v0\/collaborators\/\d+$/.test(path)) {
        setCollaboratorRevision((current) => current + 1);
      }
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, []);
  const branches = useOptions(`member-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`member-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const teams = useOptions(`member-teams:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listTeams(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
  );
  const selectedTeam = teams.find((team) => team.id === teamId);
  const collaborators = useScopedList(`member-collaborators:${companyId}:${collaboratorRevision}`, () =>
    companyId
      ? collaboratorsApi.listCollaborators({ 'company.id': companyId, ...pagination })
      : Promise.resolve(null),
  );
  const activeCollaborators = collaborators.data.filter(
    (collaborator) => collaborator.state.name.trim().toUpperCase() !== 'INACTIVO',
  );
  const collaboratorsById = new Map(collaborators.data.map((collaborator) => [collaborator.id, collaborator]));
  const load = useScopedList(`members:${companyId}:${branchId}:${specialityId}:${teamId}:${revision}`, () =>
    companyId && branchId && specialityId && teamId ? companiesApi.listTeamMembers(companyId, branchId, specialityId, teamId, pagination) : Promise.resolve(null),
  );
  const action = useApiAction<TeamMember>();
  const columns: TableColumn<TeamMember>[] = [
    { key: 'code', label: 'Código', render: (item) => item.collaborator.code },
    { key: 'name', label: 'Colaborador', render: (item) => {
      const collaborator = collaboratorsById.get(item.collaborator.id);
      return collaborator ? collaboratorFullName(collaborator) : item.collaborator.name;
    } },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !branchId || !specialityId || !teamId || !form.collaboratorId) return;
    void action.execute(() => companiesApi.createTeamMember(companyId, branchId, specialityId, teamId, {
      collaborator: { id: form.collaboratorId! },
    })).then((member) => {
      if (!member) return;
      setForm({ collaboratorId: undefined });
      onSaved();
    }).catch(() => undefined);
  }
  const formView = (
    <form className="form-stack" onSubmit={submit}>
      <div className="inline-form">
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setSpecialityId(undefined);
          setTeamId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setSpecialityId(undefined);
          setTeamId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Especialidad" value={specialityId ?? ''} options={optionsOf(specialities, (item) => item.name)} onChange={(event) => {
          setSpecialityId(idOf(event.target.value));
          setTeamId(undefined);
        }} disabled={!branchId} required />
        <SelectField label="Equipo" value={teamId ?? ''} options={optionsOf(teams, (item) => item.name)} onChange={(event) => setTeamId(idOf(event.target.value))} disabled={!specialityId} required />
      </div>
      <div className="inline-form">
        <SelectField label="Colaborador" value={form.collaboratorId ?? ''} options={optionsOf(activeCollaborators, collaboratorLabel)} onChange={(event) => setForm({ collaboratorId: idOf(event.target.value) })} disabled={!companyId || collaborators.loading} required />
        <SubmitButton loading={action.loading} disabled={!companyId || !branchId || !specialityId || !teamId || !selectedTeam?.isActive || !form.collaboratorId}>Asignar</SubmitButton>
        {selectedTeam && !selectedTeam.isActive && <span className="muted">No se pueden asignar miembros a un equipo inactivo.</span>}
        {collaborators.loading && <span className="muted">Cargando colaboradores...</span>}
        {collaborators.error && <span className="form-error">{collaborators.error}</span>}
        {!collaborators.loading && !collaborators.error && companyId && activeCollaborators.length === 0 && <span className="muted">No hay colaboradores activos para esta compañía.</span>}
        {action.error && <span className="form-error">{action.error}</span>}
      </div>
    </form>
  );
  return (
    <ApiSection
      title="Miembros de equipo"
      description="Consulta y asigna colaboradores a un equipo."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      form={formView}
    />
  );
}