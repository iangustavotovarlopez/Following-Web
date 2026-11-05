import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PageResponse } from '../../../../shared/api';
import {
  ActiveBadge,
  ApiSection,
  type TableColumn,
} from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiAction } from '../../../../shared/hooks/use-api-action';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import {
  companiesApi,
  type Branch,
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
  type TeamMember,
} from '../../infrastructure/api';
import { collaboratorsApi, type Collaborator } from '../../../collaborators/infrastructure/api';

type Id = number | undefined;
type FormSetter<T> = Dispatch<SetStateAction<T>>;

const pagination = { page: 1, pageSize: 100 };
const idOf = (value: string): Id => value ? Number(value) : undefined;
const optionsOf = <T extends { id: number }>(items: T[], label: (item: T) => string) =>
  items.map((item) => ({ value: item.id, label: label(item) }));

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
        {filterFields && <div className="inline-form">{filterFields}</div>}
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
    />
  );
}

export function NestedResourceManagementSection() {
  const companies = useOptions('companies', () => companiesApi.listCompanies(pagination));
  const collaborators = useOptions('collaborators', () => collaboratorsApi.listCollaborators(pagination));
  const [catalogRevision, setCatalogRevision] = useState(0);
  const refreshCatalogs = () => setCatalogRevision((revision) => revision + 1);

  return (
    <div className="resource-grid">
      <PeriodsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <SubperiodsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <BranchesSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <SpecialitiesSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <SectionsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <FractionsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <SkillsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <SkillLevelsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <TeamsSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <DeliverablesSection companies={companies} revision={catalogRevision} onSaved={refreshCatalogs} />
      <TeamMembersSection
        companies={companies}
        collaborators={collaborators}
        revision={catalogRevision}
        onSaved={refreshCatalogs}
      />
    </div>
  );
}

function PeriodsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const load = useScopedList(`periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
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
      title="Periodos"
      description="Consulta y registra periodos para una compañía."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId)}
      filterFields={(
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
        }} required />
      )}
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
  const periods = useOptions(`subperiod-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`subperiods:${companyId}:${periodId}:${revision}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
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
      title="Subperiodos"
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

function BranchesSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const load = useScopedList(`branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Branch>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];

  return (
    <ManagedResourceSection
      title="Branches"
      description="Consulta y registra branches para una compañía."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId)}
      filterFields={<SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => setCompanyId(idOf(event.target.value))} required />}
      initialForm={{ name: '', description: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </>}
      create={(form) => companyId ? companiesApi.createBranch(companyId, form) : Promise.resolve(null)}
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
  const periods = useOptions(`section-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const subperiods = useOptions(`section-subperiods:${companyId}:${periodId}:${revision}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`sections:${companyId}:${periodId}:${subperiodId}:${revision}`, () =>
    companyId && periodId && subperiodId ? companiesApi.listSections(companyId, periodId, subperiodId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Section>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
  ];

  return (
    <ManagedResourceSection
      title="Secciones"
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
  const periods = useOptions(`fraction-periods:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listPeriods(companyId, pagination) : Promise.resolve(null),
  );
  const subperiods = useOptions(`fraction-subperiods:${companyId}:${periodId}:${revision}`, () =>
    companyId && periodId ? companiesApi.listSubperiods(companyId, periodId, pagination) : Promise.resolve(null),
  );
  const sections = useOptions(`fraction-sections:${companyId}:${periodId}:${subperiodId}:${revision}`, () =>
    companyId && periodId && subperiodId ? companiesApi.listSections(companyId, periodId, subperiodId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`fractions:${companyId}:${periodId}:${subperiodId}:${sectionId}:${revision}`, () =>
    companyId && periodId && subperiodId && sectionId ? companiesApi.listFractions(companyId, periodId, subperiodId, sectionId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Fraction>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'startDate', label: 'Inicio', render: (item) => item.startDate },
    { key: 'endDate', label: 'Fin', render: (item) => item.endDate },
  ];

  return (
    <ManagedResourceSection
      title="Fracciones"
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
  const [specialityId, setSpecialityId] = useState<Id>();
  const branches = useOptions(`skill-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`skill-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`skills:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listSkills(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Skill>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  return (
    <ManagedResourceSection
      title="Habilidades"
      description="Consulta y registra habilidades para una especialidad."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && specialityId)}
      filterFields={<>
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
      </>}
      initialForm={{ code: '', name: '', description: '' }}
      renderFields={(form, setForm) => <>
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </>}
      create={(form) => companyId && branchId && specialityId ? companiesApi.createSkill(companyId, branchId, specialityId, form) : Promise.resolve(null)}
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
  const [specialityId, setSpecialityId] = useState<Id>();
  const [skillId, setSkillId] = useState<Id>();
  const branches = useOptions(`level-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`level-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const skills = useOptions(`level-skills:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listSkills(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`levels:${companyId}:${branchId}:${specialityId}:${skillId}:${revision}`, () =>
    companyId && branchId && specialityId && skillId ? companiesApi.listSkillLevels(companyId, branchId, specialityId, skillId, pagination) : Promise.resolve(null),
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
      enabled={Boolean(companyId && branchId && specialityId && skillId)}
      filterFields={<>
        <SelectField label="Compañía" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(event) => {
          setCompanyId(idOf(event.target.value));
          setBranchId(undefined);
          setSpecialityId(undefined);
          setSkillId(undefined);
        }} required />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(event) => {
          setBranchId(idOf(event.target.value));
          setSpecialityId(undefined);
          setSkillId(undefined);
        }} disabled={!companyId} required />
        <SelectField label="Especialidad" value={specialityId ?? ''} options={optionsOf(specialities, (item) => item.name)} onChange={(event) => {
          setSpecialityId(idOf(event.target.value));
          setSkillId(undefined);
        }} disabled={!branchId} required />
        <SelectField label="Habilidad" value={skillId ?? ''} options={optionsOf(skills, (item) => item.name)} onChange={(event) => setSkillId(idOf(event.target.value))} disabled={!specialityId} required />
      </>}
      initialForm={{ name: '', number: 0 }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Número" type="number" min="0" value={form.number} onChange={(event) => setForm({ ...form, number: Number(event.target.value) })} required />
      </>}
      create={(form) => companyId && branchId && specialityId && skillId ? companiesApi.createSkillLevel(companyId, branchId, specialityId, skillId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function TeamsSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const branches = useOptions(`team-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`team-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`teams:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listTeams(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
  );
  const columns: TableColumn<Team>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];
  return (
    <ManagedResourceSection
      title="Equipos"
      description="Consulta y registra equipos para una especialidad."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && specialityId)}
      filterFields={<>
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
      </>}
      initialForm={{ name: '' }}
      renderFields={(form, setForm) => <Field label="Nombre" value={form.name} onChange={(event) => setForm({ name: event.target.value })} required />}
      create={(form) => companyId && branchId && specialityId ? companiesApi.createTeam(companyId, branchId, specialityId, form) : Promise.resolve(null)}
      onSaved={onSaved}
    />
  );
}

function DeliverablesSection({ companies, revision, onSaved }: {
  companies: Company[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const branches = useOptions(`deliverable-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`deliverable-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`deliverables:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listDeliverables(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
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
      description="Consulta y registra entregables para una especialidad."
      columns={columns}
      rows={load.data}
      loading={load.loading}
      error={load.error}
      enabled={Boolean(companyId && branchId && specialityId)}
      filterFields={<>
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
      </>}
      initialForm={{ name: '', description: '', sequence: 1 }}
      renderFields={(form, setForm) => <>
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <Field label="Secuencia" type="number" min="1" value={form.sequence} onChange={(event) => setForm({ ...form, sequence: Number(event.target.value) })} required />
      </>}
      create={(form) => companyId && branchId && specialityId ? companiesApi.createDeliverable(companyId, branchId, specialityId, form) : Promise.resolve(null)}
      onSaved={onSaved}
      extraForm={<DeliverableUpdateForm companyId={companyId} branchId={branchId} specialityId={specialityId} deliverables={load.data} onSaved={onSaved} />}
    />
  );
}

function DeliverableUpdateForm({ companyId, branchId, specialityId, deliverables, onSaved }: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
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
    if (!companyId || !branchId || !specialityId || !deliverableId) return;
    void action.execute(() => companiesApi.patchDeliverable(companyId, branchId, specialityId, deliverableId, form))
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
      <SubmitButton loading={action.loading} disabled={!companyId || !branchId || !specialityId || !deliverableId}>Actualizar</SubmitButton>
      {action.error && <span className="form-error">{action.error}</span>}
    </form>
  );
}

function TeamMembersSection({ companies, collaborators, revision, onSaved }: {
  companies: Company[];
  collaborators: Collaborator[];
  revision: number;
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const [teamId, setTeamId] = useState<Id>();
  const [form, setForm] = useState<{ collaboratorId: Id }>({ collaboratorId: undefined });
  const branches = useOptions(`member-branches:${companyId}:${revision}`, () =>
    companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
  );
  const specialities = useOptions(`member-specialities:${companyId}:${branchId}:${revision}`, () =>
    companyId && branchId ? companiesApi.listSpecialities(companyId, branchId, pagination) : Promise.resolve(null),
  );
  const teams = useOptions(`member-teams:${companyId}:${branchId}:${specialityId}:${revision}`, () =>
    companyId && branchId && specialityId ? companiesApi.listTeams(companyId, branchId, specialityId, pagination) : Promise.resolve(null),
  );
  const load = useScopedList(`members:${companyId}:${branchId}:${specialityId}:${teamId}:${revision}`, () =>
    companyId && branchId && specialityId && teamId ? companiesApi.listTeamMembers(companyId, branchId, specialityId, teamId, pagination) : Promise.resolve(null),
  );
  const action = useApiAction<TeamMember>();
  const columns: TableColumn<TeamMember>[] = [
    { key: 'code', label: 'Código', render: (item) => item.collaborator.code },
    { key: 'name', label: 'Colaborador', render: (item) => item.collaborator.name },
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
        <SelectField label="Colaborador" value={form.collaboratorId ?? ''} options={optionsOf(collaborators, (item) => `${item.code} · ${item.name} ${item.lastname}`)} onChange={(event) => setForm({ collaboratorId: idOf(event.target.value) })} required />
        <SubmitButton loading={action.loading} disabled={!companyId || !branchId || !specialityId || !teamId || !form.collaboratorId}>Asignar</SubmitButton>
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