import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  projectsApi,
  type CreateProjectRequest,
  type PatchProjectRequest,
  type Project,
  type ProjectState,
} from '../../infrastructure/api';
import { ApiSection, StateBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { useGlobalCompany } from '../../../../app/providers/company-context';

const initialForm = (companyId?: number): CreateProjectRequest => ({
  code: '',
  name: '',
  company: { id: companyId ?? 0 },
  state: { id: 1 },
});

export function ProjectsSection() {
  const { companies, selectedCompanyId } = useGlobalCompany();
  const load = useCallback(
    () => projectsApi.listProjects({
      page: 1,
      pageSize: 20,
      'company.id': selectedCompanyId,
    }),
    [selectedCompanyId],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const visibleProjects = selectedCompanyId
    ? data.filter((project) => project.company.id === selectedCompanyId)
    : data;
  const [states, setStates] = useState<ProjectState[]>([]);
  const [newStateName, setNewStateName] = useState('');
  const [editingStateId, setEditingStateId] = useState(0);
  const [editingState, setEditingState] = useState<{ name?: string; isActive?: boolean }>({});
  const [editingProjectId, setEditingProjectId] = useState(0);
  const [editingProject, setEditingProject] = useState<PatchProjectRequest>({});
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
      render: (item) => {
        const state = states.find((candidate) => candidate.id === item.state.id);
        return state ? <StateBadge name={state.name} /> : '—';
      },
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <a
          className="button primary details-link"
          href={`/?projectId=${item.id}&projectCode=${encodeURIComponent(item.code)}&projectName=${encodeURIComponent(item.name)}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver detalles
        </a>
      ),
    },
  ];
  const [form, setForm] = useState<CreateProjectRequest>(() => initialForm(selectedCompanyId));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    projectsApi.listStates({ page: 1, pageSize: 100 }).then((stateResponse) => {
      setStates(stateResponse?.content ?? []);
    });
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, company: { id: selectedCompanyId ?? 0 } }));
    setEditingProjectId(0);
    setEditingProject({});
  }, [selectedCompanyId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await projectsApi.createProject(form);
      setForm(initialForm(selectedCompanyId));
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
      const state = await projectsApi.createState({ name: newStateName });
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
      const state = await projectsApi.patchState(editingStateId, editingState);
      if (state) setStates((current) => current.map((item) => item.id === state.id ? state : item));
      setEditingState({});
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado');
    }
  }

  async function submitProjectPatch(event: FormEvent) {
    event.preventDefault();
    if (!editingProjectId) return;
    setFormError(null);
    try {
      await projectsApi.patchProject(editingProjectId, editingProject);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo actualizar el proyecto');
    }
  }

  const formView = (
    <div className="form-stack">
      <form className="inline-form" onSubmit={submit}>
        <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <SelectField label="Compañía" value={form.company.id || ''} options={companies.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => setForm({ ...form, company: { id: Number(e.target.value) } })} required />
        <SelectField label="Estado" value={form.state.id} options={states.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => setForm({ ...form, state: { id: Number(e.target.value) } })} required />
        <SubmitButton loading={saving}>Crear proyecto</SubmitButton>
      </form>
      <form className="inline-form" onSubmit={submitStateCreate}>
        <Field label="Nuevo estado" value={newStateName} onChange={(e) => setNewStateName(e.target.value)} required />
        <SubmitButton>Crear estado</SubmitButton>
      </form>
      <form className="inline-form" onSubmit={submitStatePatch}>
        <SelectField label="Editar estado" value={editingStateId || ''} options={states.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
          const id = Number(e.target.value);
          const state = states.find((item) => item.id === id);
          setEditingStateId(id);
          setEditingState(state ? { name: state.name, isActive: state.isActive } : {});
        }} required />
        <Field label="Nombre" value={editingState.name ?? ''} onChange={(e) => setEditingState({ ...editingState, name: e.target.value })} />
        <SelectField label="Activo" value={editingState.isActive === undefined ? '' : String(editingState.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setEditingState({ ...editingState, isActive: e.target.value === 'true' })} />
        <SubmitButton>Actualizar estado</SubmitButton>
      </form>
      <form className="inline-form" onSubmit={submitProjectPatch}>
        <SelectField label="Editar proyecto" value={editingProjectId || ''} options={visibleProjects.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
          const id = Number(e.target.value);
          const project = visibleProjects.find((item) => item.id === id);
          setEditingProjectId(id);
          setEditingProject(project ? { code: project.code, name: project.name, company: { id: project.company.id }, state: { id: project.state.id } } : {});
        }} required />
        <Field label="Código" value={editingProject.code ?? ''} onChange={(e) => setEditingProject({ ...editingProject, code: e.target.value })} />
        <Field label="Nombre" value={editingProject.name ?? ''} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} />
        <SelectField label="Compañía" value={editingProject.company?.id ?? ''} options={companies.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => setEditingProject({ ...editingProject, company: { id: Number(e.target.value) } })} />
        <SelectField label="Estado" value={editingProject.state?.id ?? ''} options={states.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => setEditingProject({ ...editingProject, state: { id: Number(e.target.value) } })} />
        <SubmitButton>Actualizar proyecto</SubmitButton>
      </form>
      {formError && <span className="form-error">{formError}</span>}
    </div>
  );

  return (
    <ApiSection
      title="Projects"
      description="Consulta y alta de proyectos."
      columns={columns}
      rows={visibleProjects}
      loading={loading}
      error={error}
      form={formView}
    />
  );
}
