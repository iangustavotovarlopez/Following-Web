import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  projectsApi,
  type CreateProjectRequest,
  type Project,
  type ProjectState,
} from '../../infrastructure/api';
import { ApiSection, ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { companiesApi, type Company } from '../../../companies/infrastructure/api';

const initialForm: CreateProjectRequest = {
  code: '',
  name: '',
  company: { id: 1 },
  state: { id: 1 },
};

export function ProjectsSection() {
  const load = useCallback(
    () => projectsApi.listProjects({ page: 1, pageSize: 20 }),
    [],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [states, setStates] = useState<ProjectState[]>([]);
  const columns: TableColumn<Project>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    {
      key: 'company',
      label: 'Compañía',
      render: (item) => companies.find((company) => company.id === item.company.id)?.name ?? `#${item.company.id}`,
    },
    {
      key: 'state',
      label: 'Estado',
      render: (item) => states.find((state) => state.id === item.state.id)?.name ?? `#${item.state.id}`,
    },
    {
      key: 'active',
      label: 'Activo',
      render: (item) => {
        const state = states.find((candidate) => candidate.id === item.state.id);
        return state ? <ActiveBadge active={state.isActive} /> : '—';
      },
    },
  ];
  const [form, setForm] = useState<CreateProjectRequest>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      companiesApi.listCompanies({ page: 1, pageSize: 100 }),
      projectsApi.listStates({ page: 1, pageSize: 100 }),
    ]).then(([companyResponse, stateResponse]) => {
      setCompanies(companyResponse?.content ?? []);
      setStates(stateResponse?.content ?? []);
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await projectsApi.createProject(form);
      setForm(initialForm);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const formView = (
    <form className="inline-form" onSubmit={submit}>
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <SelectField label="Compañía" value={form.company.id} options={companies.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))} onChange={(e) => setForm({ ...form, company: { id: Number(e.target.value) } })} required />
      <SelectField label="Estado" value={form.state.id} options={states.map((item) => ({ value: item.id, label: `${item.id} — ${item.name}` }))} onChange={(e) => setForm({ ...form, state: { id: Number(e.target.value) } })} required />
      <SubmitButton loading={saving}>Crear</SubmitButton>
      {formError && <span className="form-error">{formError}</span>}
    </form>
  );

  return (
    <ApiSection
      title="Projects"
      description="Consulta y alta de proyectos."
      columns={columns}
      rows={data}
      loading={loading}
      error={error}
      form={formView}
    />
  );
}
