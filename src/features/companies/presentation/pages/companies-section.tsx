import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  companiesApi,
  type Company,
  type CompanyCreateRequest,
  type CompanyPatchRequest,
  type CompanyState,
  type CompanyStatePatchRequest,
} from '../../infrastructure/api';
import { ApiSection, StateBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';

export function CompaniesSection() {
  const load = useCallback(
    () => companiesApi.listCompanies({ page: 1, pageSize: 100 }),
    [],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [states, setStates] = useState<CompanyState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [newStateName, setNewStateName] = useState('');
  const [editingState, setEditingState] = useState<CompanyStatePatchRequest>({});
  const [editingStateId, setEditingStateId] = useState(0);
  const [editingCompany, setEditingCompany] = useState<CompanyPatchRequest>({});
  const [editingCompanyId, setEditingCompanyId] = useState(0);
  const columns: TableColumn<Company>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description ?? '—' },
    { key: 'state', label: 'Estado', render: (item) => <StateBadge name={item.state.name} /> },
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

  async function submitStateCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      const state = await companiesApi.createCompanyState({ name: newStateName });
      if (state) setStates((current) => [...current, state]);
      setNewStateName('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo crear el estado');
    }
  }

  async function submitStatePatch(event: FormEvent) {
    event.preventDefault();
    if (!editingStateId) return;
    setFormError(null);
    try {
      const state = await companiesApi.patchCompanyState(editingStateId, editingState);
      if (state) setStates((current) => current.map((item) => item.id === state.id ? state : item));
      setEditingState({});
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado');
    }
  }

  async function submitCompanyPatch(event: FormEvent) {
    event.preventDefault();
    if (!editingCompanyId) return;
    setFormError(null);
    try {
      await companiesApi.patchCompany(editingCompanyId, editingCompany);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo actualizar la compañía');
    }
  }

  const formView = (
    <div className="form-stack">
      <form className="inline-form" onSubmit={submit}>
        <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
        <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Descripción" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <SelectField label="Estado" value={form.state.id || ''} options={states.map((state) => ({ value: state.id, label: state.name }))} onChange={(event) => setForm({ ...form, state: { id: Number(event.target.value) } })} disabled={statesLoading || states.length === 0} required />
        <SubmitButton loading={saving}>Crear compañía</SubmitButton>
        {statesError && <span className="form-error">No se pudieron cargar los estados: {statesError}</span>}
        {formError && <span className="form-error">{formError}</span>}
      </form>
      <form className="inline-form" onSubmit={submitStateCreate}>
        <Field label="Nuevo estado" value={newStateName} onChange={(event) => setNewStateName(event.target.value)} required />
        <SubmitButton>Crear estado</SubmitButton>
      </form>
      <form className="inline-form" onSubmit={submitCompanyPatch}>
        <SelectField label="Editar compañía" value={editingCompanyId || ''} options={data.slice(0, 20).map((item) => ({ value: item.id, label: item.name }))} onChange={(event) => {
          const id = Number(event.target.value);
          const company = data.find((item) => item.id === id);
          setEditingCompanyId(id);
          setEditingCompany(company ? { code: company.code, name: company.name, description: company.description, state: { id: company.state.id } } : {});
        }} required />
        <Field label="Código" value={editingCompany.code ?? ''} onChange={(event) => setEditingCompany({ ...editingCompany, code: event.target.value })} required />
        <Field label="Nombre" value={editingCompany.name ?? ''} onChange={(event) => setEditingCompany({ ...editingCompany, name: event.target.value })} required />
        <Field label="Descripción" value={editingCompany.description ?? ''} onChange={(event) => setEditingCompany({ ...editingCompany, description: event.target.value })} />
        <SelectField label="Estado" value={editingCompany.state?.id ?? ''} options={states.map((state) => ({ value: state.id, label: state.name }))} onChange={(event) => setEditingCompany({ ...editingCompany, state: { id: Number(event.target.value) } })} required />
        <SubmitButton>Actualizar compañía</SubmitButton>
      </form>
      <form className="inline-form" onSubmit={submitStatePatch}>
        <SelectField label="Editar estado" value={editingStateId || ''} options={states.map((item) => ({ value: item.id, label: item.name }))} onChange={(event) => {
          const id = Number(event.target.value);
          const state = states.find((item) => item.id === id);
          setEditingStateId(id);
          setEditingState(state ? { name: state.name, isActive: state.isActive } : {});
        }} required />
        <Field label="Nombre" value={editingState.name ?? ''} onChange={(event) => setEditingState({ ...editingState, name: event.target.value })} />
        <SelectField label="Activo" value={editingState.isActive === undefined ? '' : String(editingState.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(event) => setEditingState({ ...editingState, isActive: event.target.value === 'true' })} />
        <SubmitButton>Actualizar estado</SubmitButton>
        {formError && <span className="form-error">{formError}</span>}
      </form>
    </div>
  );

  return (
    <ApiSection
      title="Companies"
      description="Consulta y alta de compañías."
      columns={columns}
      rows={data.slice(0, 20)}
      loading={loading}
      error={error}
      form={formView}
    />
  );
}
