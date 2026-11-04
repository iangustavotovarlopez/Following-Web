import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorState,
  type CreateCollaboratorRequest,
} from '../../infrastructure/api';
import { ApiSection, ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { companiesApi, type Company } from '../../../companies/infrastructure/api';

const columns: TableColumn<Collaborator>[] = [
  { key: 'code', label: 'Código', render: (item) => item.code },
  { key: 'name', label: 'Nombre', render: (item) => `${item.name} ${item.lastname}` },
  { key: 'company', label: 'Compañía', render: (item) => item.company.name },
  { key: 'state', label: 'Estado', render: (item) => <ActiveBadge active={item.state.isActive} /> },
  { key: 'hireDate', label: 'Contratación', render: (item) => item.hireDate },
];

const initialForm: CreateCollaboratorRequest = {
  code: '',
  name: '',
  lastname: '',
  company: { id: 1 },
  state: { id: 1 },
  hireDate: '',
};

export function CollaboratorsSection() {
  const load = useCallback(
    () => collaboratorsApi.listCollaborators({ page: 1, pageSize: 20 }),
    [],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [states, setStates] = useState<CollaboratorState[]>([]);
  const [form, setForm] = useState<CreateCollaboratorRequest>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      companiesApi.listCompanies({ page: 1, pageSize: 100 }),
      collaboratorsApi.listStates({ page: 1, pageSize: 100 }),
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
      await collaboratorsApi.createCollaborator(form);
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
      <Field label="Apellido" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} required />
      <Field label="Hire date" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} required />
      <SelectField label="Compañía" value={form.company.id} options={companies.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))} onChange={(e) => setForm({ ...form, company: { id: Number(e.target.value) } })} required />
      <SelectField label="Estado" value={form.state.id} options={states.map((item) => ({ value: item.id, label: `${item.id} — ${item.name}` }))} onChange={(e) => setForm({ ...form, state: { id: Number(e.target.value) } })} required />
      <SubmitButton loading={saving}>Crear</SubmitButton>
      {formError && <span className="form-error">{formError}</span>}
    </form>
  );

  return (
    <ApiSection
      title="Collaborators"
      description="Consulta y alta de colaboradores."
      columns={columns}
      rows={data}
      loading={loading}
      error={error}
      form={formView}
    />
  );
}
