import { useEffect, useState, type FormEvent } from 'react';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { API_MUTATION_EVENT, loadCatalogPages, type ApiMutationDetail } from '../../../../shared/api';
import { StateBadge, formatStateName, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { projectsApi, type CreateProjectRequest, type Project, type ProjectState } from '../../infrastructure/api';
import { ProjectPlanningTable } from './project-planning-table';
import { ProjectPlanningTab } from './project-planning-tab';

export function ProjectsSection() {
  const { selectedCompanyId } = useGlobalCompany();
  const [activeTab, setActiveTab] = useState<'projects' | 'planning'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedCompanyId, setLoadedCompanyId] = useState<number>();
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectRevision, setProjectRevision] = useState(0);
  const [states, setStates] = useState<ProjectState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [stateRevision, setStateRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setProjectsLoading(true);
    setProjectsError(null);
    void loadCatalogPages((page) => projectsApi.listProjects({
      'company.id': selectedCompanyId, page, pageSize: 100,
    })).then((items) => {
      if (active) { setProjects(items); setLoadedCompanyId(selectedCompanyId); }
    }).catch((cause) => {
      if (active) {
        setProjects([]); setLoadedCompanyId(selectedCompanyId);
        setProjectsError(cause instanceof Error ? cause.message : 'No se pudieron consultar los proyectos.');
      }
    }).finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [selectedCompanyId, projectRevision]);

  useEffect(() => {
    let active = true;
    setStatesLoading(true);
    setStatesError(null);
    void loadCatalogPages((page) => projectsApi.listStates({ page, pageSize: 100 }))
      .then((items) => { if (active) setStates(items); }).catch((cause) => {
        if (active) setStatesError(cause instanceof Error ? cause.message : 'No se pudieron consultar los estados.');
      }).finally(() => { if (active) setStatesLoading(false); });
    return () => { active = false; };
  }, [stateRevision]);

  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (/^\/projects\/v0\/projects(?:\/\d+)?$/.test(path)) setProjectRevision((current) => current + 1);
      if (/^\/projects\/v0\/states(?:\/\d+)?$/.test(path)) setStateRevision((current) => current + 1);
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, []);
  const scopeMatches = loadedCompanyId === selectedCompanyId;
  const visibleProjects = scopeMatches ? projects : [];
  const scopedLoading = projectsLoading || !scopeMatches;
  const scopedError = scopeMatches ? projectsError : null;

  return (
    <section className="resource-section companies-management projects-management">
      <div className="section-heading">
        <div><p className="eyebrow">Gestión</p><h2>Proyectos</h2><p className="muted">Administra proyectos y consulta su planificación.</p></div>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Gestión de proyectos">
        {[{ id: 'projects' as const, label: 'Proyectos' }, { id: 'planning' as const, label: 'Planning' }].map((tab) => (
          <button key={tab.id} role="tab" type="button" aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'management-tab active' : 'management-tab'}
            onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <div className="management-tab-content" role="tabpanel">
        {scopedError && <button className="button secondary" type="button"
          onClick={() => setProjectRevision((current) => current + 1)}>Reintentar proyectos</button>}
        {activeTab === 'projects' ? (
          <ProjectsTab key={selectedCompanyId ?? 'all'} projects={visibleProjects} loading={scopedLoading} error={scopedError}
            states={states} statesLoading={statesLoading} statesError={statesError}
            reloadStates={() => setStateRevision((current) => current + 1)} />
        ) : (
          <ProjectPlanningTab key={selectedCompanyId ?? 'all'} projects={visibleProjects}
            projectsLoading={scopedLoading} projectsError={scopedError} />
        )}
      </div>
    </section>
  );
}

function ProjectsTab({ projects, loading, error, states, statesLoading, statesError, reloadStates }: {
  projects: Project[];
  loading: boolean;
  error: string | null;
  states: ProjectState[];
  statesLoading: boolean;
  statesError: string | null;
  reloadStates: () => void;
}) {
  const { companies, selectedCompanyId, loading: companiesLoading, error: companiesError } = useGlobalCompany();
  const [filterDraft, setFilterDraft] = useState({ code: '', name: '', stateId: '' });
  const [filters, setFilters] = useState(filterDraft);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [statesModalOpen, setStatesModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<CreateProjectRequest>({ code: '', name: '', company: { id: 0 }, state: { id: 0 } });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const activeStates = states.filter((state) => state.isActive);
  const formStates = states.filter((state) => state.isActive || (editing && state.id === editing.state.id));
  const stateName = (project: Project) => states.find((state) => state.id === project.state.id)?.name ?? project.state.name;
  const rows = projects.filter((project) => project.code.toLocaleLowerCase('es').includes(filters.code.toLocaleLowerCase('es'))
    && project.name.toLocaleLowerCase('es').includes(filters.name.toLocaleLowerCase('es'))
    && (!filters.stateId || project.state.id === Number(filters.stateId)));
  useEffect(() => { setExpanded(new Set()); }, [filters]);

  function openModal(project?: Project) {
    setEditing(project ?? null);
    const defaultState = activeStates.find((state) => state.name.trim().toUpperCase() === 'ACTIVO') ?? activeStates[0];
    setForm(project ? {
      code: project.code, name: project.name, company: { id: project.company.id }, state: { id: project.state.id },
    } : { code: '', name: '', company: { id: selectedCompanyId ?? 0 }, state: { id: defaultState?.id ?? 0 } });
    setFormError(null);
    setModalOpen(true);
  }
  function closeModal() { if (!saving) setModalOpen(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!form.code.trim() || !form.name.trim() || !form.company.id || !form.state.id
      || statesLoading || statesError || companiesLoading || companiesError
      || !formStates.some((state) => state.id === form.state.id)
      || !companies.some((company) => company.id === form.company.id)) {
      setFormError('Completa código, nombre, compañía y un estado disponible.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const fields = { code: form.code.trim(), name: form.name.trim(), state: form.state };
      const result = editing ? await projectsApi.patchProject(editing.id, fields)
        : await projectsApi.createProject({ ...fields, company: form.company });
      if (!result) throw new Error('La API no devolvió el proyecto guardado.');
      setModalOpen(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el proyecto.');
    } finally { setSaving(false); }
  }
  async function remove(project: Project) {
    if (deletingId !== null || !window.confirm(`¿Deseas desactivar el proyecto "${project.name}"? Su planificación se conservará.`)) return;
    setDeletingId(project.id);
    setActionError(null);
    try { await projectsApi.deleteProject(project.id); } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el proyecto.');
    } finally { setDeletingId(null); }
  }
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = filterDraft.code.trim();
    const name = filterDraft.name.trim();
    if ((code && code.length < 3) || (name && name.length < 3)) {
      setFilterError('Los filtros de código y nombre requieren al menos 3 caracteres.');
      return;
    }
    setFilterError(null);
    setFilters({ ...filterDraft, code, name });
  }
  const columns: TableColumn<Project>[] = [
    { key: 'code', label: 'Código', render: (project) => project.code },
    { key: 'name', label: 'Nombre', render: (project) => project.name },
    { key: 'company', label: 'Compañía', render: (project) => companies.find((company) => company.id === project.company.id)?.name ?? project.company.name ?? `#${project.company.id}` },
    { key: 'state', label: 'Estado', render: (project) => {
      const name = stateName(project);
      return name ? <StateBadge name={name} /> : `#${project.state.id}`;
    } },
    { key: 'actions', label: 'Acciones', render: (project) => (
      <RowActions onEdit={() => openModal(project)} onDelete={() => void remove(project)}
        deleteDisabled={deletingId !== null || stateName(project)?.trim().toUpperCase() === 'INACTIVO'}>
        <button className="row-action-button details" type="button"
          aria-expanded={expanded.has(project.id)}
          aria-controls={expanded.has(project.id) ? `project-planning-${project.id}` : undefined}
          aria-label={`${expanded.has(project.id) ? 'Ocultar' : 'Mostrar'} planificación de ${project.name}`}
          title={expanded.has(project.id) ? 'Ocultar planificación' : 'Mostrar planificación'}
          onClick={() => setExpanded((current) => {
            const next = new Set(current);
            if (next.has(project.id)) next.delete(project.id); else next.add(project.id);
            return next;
          })}>
          <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" />
            <path d={expanded.has(project.id) ? 'm12 16 3-3 3 3' : 'm12 14 3 3 3-3'} />
          </svg>
        </button>
      </RowActions>
    ) },
  ];
  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div><h3>Proyectos</h3><p className="muted">Consulta, filtra y administra los proyectos registrados.</p></div>
        <div className="management-filter-actions">
          <button className="button secondary" type="button" onClick={() => setStatesModalOpen(true)}>Administrar estados</button>
          <button className="button primary" type="button"
            disabled={statesLoading || Boolean(statesError) || companiesLoading || Boolean(companiesError) || companies.length === 0 || activeStates.length === 0}
            onClick={() => openModal()}>Nuevo +</button>
        </div>
      </div>
      <form className="management-filters" onSubmit={applyFilters}>
        <Field label="Código" value={filterDraft.code} onChange={(event) => setFilterDraft({ ...filterDraft, code: event.target.value })} />
        <Field label="Nombre" value={filterDraft.name} onChange={(event) => setFilterDraft({ ...filterDraft, name: event.target.value })} />
        <SelectField label="Estado" value={filterDraft.stateId}
          options={states.map((state) => ({ value: state.id, label: formatStateName(state.name) }))}
          onChange={(event) => setFilterDraft({ ...filterDraft, stateId: event.target.value })} />
        <div className="management-filter-actions">
          <button className="button primary" type="submit">Filtrar</button>
          <button className="button secondary" type="button" onClick={() => {
            const empty = { code: '', name: '', stateId: '' };
            setFilterDraft(empty); setFilters(empty); setFilterError(null);
          }}>Limpiar</button>
        </div>
      </form>
      {filterError && <div className="alert error">{filterError}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      {statesError && <div className="alert error">{statesError}<button className="button secondary" type="button" onClick={reloadStates}>Reintentar estados</button></div>}
      <ManagementTable columns={columns} rows={rows} loading={loading} error={error} rowKey={(project) => project.id}
        emptyMessage="No hay proyectos que coincidan con los filtros."
        renderExpandedRow={(project) => expanded.has(project.id)
          ? <ProjectPlanningTable projectId={project.id} projectName={project.name} /> : null} />
      <ResourceModal open={modalOpen} title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={closeModal}>
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          <Field label="Código" value={form.code} maxLength={100} required disabled={saving}
            onChange={(event) => setForm({ ...form, code: event.target.value })} />
          <Field label="Nombre" value={form.name} maxLength={255} required disabled={saving}
            onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <SelectField label="Compañía" value={form.company.id || ''} required disabled={saving || companiesLoading || Boolean(editing)}
            options={companies.map((company) => ({ value: company.id, label: company.name }))}
            onChange={(event) => setForm({ ...form, company: { id: Number(event.target.value) } })} />
          {editing && <span className="muted">La compañía del proyecto no se modifica para conservar la jerarquía de su planificación.</span>}
          <SelectField label="Estado" value={form.state.id || ''} required disabled={saving || statesLoading}
            options={formStates.map((state) => ({ value: state.id, label: formatStateName(state.name) }))}
            onChange={(event) => setForm({ ...form, state: { id: Number(event.target.value) } })} />
          {formError && <div className="alert error">{formError}</div>}
          {statesError && <div className="alert error">{statesError}
            <button className="button secondary" type="button" onClick={reloadStates}>Reintentar estados</button>
          </div>}
          {companiesError && <div className="alert error">{companiesError}</div>}
          <ModalActions onCancel={closeModal} saving={saving} submitLabel={editing ? 'Guardar cambios' : 'Crear proyecto'}
            submitDisabled={statesLoading || Boolean(statesError) || companiesLoading || Boolean(companiesError)} />
        </form>
      </ResourceModal>
      {statesModalOpen && <ProjectStatesModal states={states} loading={statesLoading} error={statesError}
        reload={reloadStates} onClose={() => setStatesModalOpen(false)} />}
    </div>
  );
}

function ProjectStatesModal({ states, loading, error, reload, onClose }: {
  states: ProjectState[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number>();
  const [draft, setDraft] = useState({ name: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>, edit: boolean) {
    event.preventDefault();
    if (saving) return;
    const name = (edit ? draft.name : newName).trim();
    if (!name || (edit && !editingId)) { setFormError('Selecciona el estado e indica su nombre.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const result = edit && editingId ? await projectsApi.patchState(editingId, { name, isActive: draft.isActive })
        : await projectsApi.createState({ name });
      if (!result) throw new Error('La API no devolvió el estado guardado.');
      if (!edit) setNewName('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el estado.');
    } finally { setSaving(false); }
  }
  return (
    <ResourceModal open title="Administrar estados de proyectos" onClose={() => { if (!saving) onClose(); }}>
      <div>
        <form className="modal-form" onSubmit={(event) => void submit(event, false)}>
          <Field label="Nuevo estado" value={newName} maxLength={100} required disabled={saving}
            onChange={(event) => setNewName(event.target.value)} />
          <SubmitButton loading={saving} disabled={loading || Boolean(error)}>Crear estado</SubmitButton>
        </form>
        <form className="modal-form" onSubmit={(event) => void submit(event, true)}>
          <SelectField label="Estado a editar" value={editingId ?? ''} disabled={saving || loading} required
            options={states.map((state) => ({ value: state.id, label: formatStateName(state.name) }))}
            onChange={(event) => {
              const state = states.find((item) => item.id === Number(event.target.value));
              setEditingId(state?.id); setDraft(state ? { name: formatStateName(state.name), isActive: state.isActive } : { name: '', isActive: true });
              setFormError(null);
            }} />
          <Field label="Nombre" value={draft.name} maxLength={100} required disabled={!editingId || saving}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <SelectField label="Activo" value={String(draft.isActive)} disabled={!editingId || saving}
            options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
            onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })} />
          <SubmitButton loading={saving} disabled={!editingId || loading || Boolean(error)}>Actualizar estado</SubmitButton>
        </form>
        <div className="modal-form">
          <p className="muted">Para dar de baja proyectos debe existir un estado llamado Inactivo con Activo habilitado.</p>
          {error && <div className="alert error">{error}<button className="button secondary" type="button" onClick={reload}>Reintentar</button></div>}
          {formError && <div className="alert error">{formError}</div>}
        </div>
      </div>
    </ResourceModal>
  );
}
