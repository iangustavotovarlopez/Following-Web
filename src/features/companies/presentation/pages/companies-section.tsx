import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  companiesApi,
  type Company,
  type CompanyCreateRequest,
  type CompanyState,
} from '../../infrastructure/api';
import { ApiSection, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';

export function CompaniesSection() {
  const load = useCallback(
    () => companiesApi.listCompanies({ page: 1, pageSize: 20 }),
    [],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [states, setStates] = useState<CompanyState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState<string | null>(null);
  const columns: TableColumn<Company>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    {
      key: 'state',
      label: 'Estado',
      render: (item) => item.state.name,
    },
  ];
  const [form, setForm] = useState<CompanyCreateRequest>({
    code: '',
    name: '',
    description: '',
    state: { id: 0 },
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    companiesApi.listCompanyStates({ page: 1, pageSize: 100 })
      .then((response) => setStates(response?.content ?? []))
      .catch((cause: Error) => setStatesError(cause.message))
      .finally(() => setStatesLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.state.id) {
      setFormError('Selecciona un estado.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await companiesApi.createCompany(form);
      setForm({ code: '', name: '', description: '', state: { id: 0 } });
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const formView = (
    <form className="inline-form" onSubmit={submit}>
      <Field
        label="Código"
        value={form.code}
        onChange={(event) => setForm({ ...form, code: event.target.value })}
        required
      />
      <Field
        label="Nombre"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        required
      />
      <Field
        label="Descripción"
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
      />
      <SelectField
        label="Estado"
        value={form.state.id || ''}
        options={states.map((state) => ({ value: state.id, label: state.name }))}
        onChange={(event) => setForm({ ...form, state: { id: Number(event.target.value) } })}
        disabled={statesLoading || states.length === 0}
        required
      />
      <SubmitButton loading={saving}>Crear</SubmitButton>
      {statesError && <span className="form-error">No se pudieron cargar los estados: {statesError}</span>}
      {formError && <span className="form-error">{formError}</span>}
    </form>
  );

  return (
    <ApiSection
      title="Companies"
      description="Consulta y alta de compañías."
      columns={columns}
      rows={data}
      loading={loading}
      error={error}
      form={formView}
    />
  );
}
