import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  companiesApi,
  type Branch,
  type BranchCreateRequest,
  type BranchPatchRequest,
  type Company,
  type CompanyCreateRequest,
  type CompanyPatchRequest,
  type CompanyState,
  type CompanyStatePatchRequest,
  type Technology,
  type TechnologyCreateRequest,
  type TechnologyPatchRequest,
} from '../../infrastructure/api';
import { ActiveBadge, StateBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';

const pagination = { page: 1, pageSize: 100 };
type ResourceTab = 'companies' | 'branches' | 'technologies';

export function CompaniesSection() {
  const [activeTab, setActiveTab] = useState<ResourceTab>('companies');
  const tabs: { id: ResourceTab; label: string }[] = [
    { id: 'companies', label: 'Companies' },
    { id: 'branches', label: 'Branches' },
    { id: 'technologies', label: 'Technologies' },
  ];

  return (
    <section className="resource-section companies-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogos</p>
          <h2>Companies</h2>
          <p className="muted">Administra compañías, branches y technologies.</p>
        </div>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Catálogos de compañías">
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
        {activeTab === 'companies' && <CompaniesTab />}
        {activeTab === 'branches' && <BranchesTab />}
        {activeTab === 'technologies' && <TechnologiesTab />}
      </div>
    </section>
  );
}

function CompaniesTab() {
  const [filterDraft, setFilterDraft] = useState({ code: '', name: '', stateId: '' });
  const [filters, setFilters] = useState(filterDraft);
  const load = useCallback(
    () => companiesApi.listCompanies({
      ...pagination,
      code: filters.code || undefined,
      name: filters.name || undefined,
      'state.id': filters.stateId ? Number(filters.stateId) : undefined,
    }),
    [filters],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [states, setStates] = useState<CompanyState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [newStateName, setNewStateName] = useState('');
  const [editingStateId, setEditingStateId] = useState('');
  const [editingState, setEditingState] = useState<CompanyStatePatchRequest>({});
  const [stateActionError, setStateActionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyDraft, setCompanyDraft] = useState({
    code: '',
    name: '',
    description: '',
    stateId: 0,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    companiesApi.listCompanyStates(pagination)
      .then((response) => {
        if (active) setStates(response?.content ?? []);
      })
      .catch((cause: Error) => {
        if (active) setStatesError(cause.message);
      })
      .finally(() => {
        if (active) setStatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const columns: TableColumn<Company>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description || '—' },
    { key: 'state', label: 'Estado', render: (item) => <StateBadge name={item.state.name} /> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          onDelete={() => void deleteCompany(item)}
          onEdit={() => openCompanyModal(item)}
        />
      ),
    },
  ];

  function openCompanyModal(company?: Company) {
    setEditingCompany(company ?? null);
    setCompanyDraft(company
      ? {
          code: company.code,
          name: company.name,
          description: company.description ?? '',
          stateId: company.state.id,
        }
      : { code: '', name: '', description: '', stateId: 0 });
    setFormError(null);
    setCompanyModalOpen(true);
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyDraft.stateId) {
      setFormError('Selecciona un estado.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        code: companyDraft.code.trim(),
        name: companyDraft.name.trim(),
        description: companyDraft.description,
        state: { id: companyDraft.stateId },
      };
      if (editingCompany) {
        const patch: CompanyPatchRequest = body;
        await companiesApi.patchCompany(editingCompany.id, patch);
      } else {
        const create: CompanyCreateRequest = body;
        await companiesApi.createCompany(create);
      }
      setCompanyModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la compañía.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(company: Company) {
    if (!window.confirm(`¿Deseas desactivar la compañía "${company.name}"?`)) return;
    setActionError(null);
    try {
      await companiesApi.deleteCompany(company.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar la compañía.');
    }
  }

  async function createState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStateActionError(null);
    try {
      const state = await companiesApi.createCompanyState({ name: newStateName.trim() });
      if (state) setStates((current) => [...current, state]);
      setNewStateName('');
    } catch (cause) {
      setStateActionError(cause instanceof Error ? cause.message : 'No se pudo crear el estado.');
    }
  }

  async function patchState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingStateId) return;
    setStateActionError(null);
    try {
      const state = await companiesApi.patchCompanyState(Number(editingStateId), editingState);
      if (state) {
        setStates((current) => current.map((item) => item.id === state.id ? state : item));
        refresh();
      }
    } catch (cause) {
      setStateActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.');
    }
  }

  return (
    <div className="management-panel">
      <TabHeading
        title="Companies"
        description="Consulta, filtra y administra las compañías registradas."
        onCreate={() => openCompanyModal()}
      />
      <form
        className="management-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const code = filterDraft.code.trim();
          const name = filterDraft.name.trim();
          if ((code && code.length < 3) || (name && name.length < 3)) {
            setFilterError('Los filtros de código y nombre requieren al menos 3 caracteres.');
            return;
          }
          setFilterError(null);
          setFilters({ ...filterDraft, code, name });
        }}
      >
        <Field label="Código" value={filterDraft.code} onChange={(event) => setFilterDraft({ ...filterDraft, code: event.target.value })} />
        <Field label="Nombre" value={filterDraft.name} onChange={(event) => setFilterDraft({ ...filterDraft, name: event.target.value })} />
        <SelectField
          label="Estado"
          value={filterDraft.stateId}
          options={states.map((state) => ({ value: state.id, label: state.name }))}
          onChange={(event) => setFilterDraft({ ...filterDraft, stateId: event.target.value })}
        />
        <div className="management-filter-actions">
          <button className="button primary" type="submit">Filtrar</button>
          <button className="button secondary" type="button" onClick={() => {
            const emptyFilters = { code: '', name: '', stateId: '' };
            setFilterDraft(emptyFilters);
            setFilters(emptyFilters);
            setFilterError(null);
          }}>Limpiar</button>
        </div>
      </form>
      {filterError && <div className="alert error">{filterError}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      {statesError && <div className="alert error">No se pudieron cargar los estados: {statesError}</div>}
      <ManagementTable columns={columns} emptyMessage="No hay compañías para mostrar." loading={loading} error={error} rows={data} rowKey={(item) => item.id} />

      <details className="state-catalog-tools">
        <summary>Administrar estados de compañías</summary>
        <div className="state-catalog-grid">
          <form className="management-form" onSubmit={(event) => void createState(event)}>
            <Field label="Nuevo estado" value={newStateName} onChange={(event) => setNewStateName(event.target.value)} required />
            <SubmitButton disabled={statesLoading}>Crear estado</SubmitButton>
          </form>
          <form className="management-form" onSubmit={(event) => void patchState(event)}>
            <SelectField
              label="Estado"
              value={editingStateId}
              options={states.map((state) => ({ value: state.id, label: state.name }))}
              onChange={(event) => {
                const state = states.find((item) => item.id === Number(event.target.value));
                setEditingStateId(event.target.value);
                setEditingState(state ? { name: state.name, isActive: state.isActive } : {});
              }}
            />
            <Field label="Nombre" value={editingState.name ?? ''} onChange={(event) => setEditingState({ ...editingState, name: event.target.value })} />
            <SelectField
              label="Activo"
              value={editingState.isActive === undefined ? '' : String(editingState.isActive)}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setEditingState({ ...editingState, isActive: event.target.value === 'true' })}
            />
            <SubmitButton disabled={!editingStateId || statesLoading}>Actualizar estado</SubmitButton>
          </form>
        </div>
        {stateActionError && <div className="alert error">{stateActionError}</div>}
      </details>

      <ResourceModal
        open={companyModalOpen}
        title={editingCompany ? 'Editar compañía' : 'Nueva compañía'}
        onClose={() => setCompanyModalOpen(false)}
      >
        <form className="modal-form" onSubmit={(event) => void submitCompany(event)}>
          <Field label="Código" value={companyDraft.code} onChange={(event) => setCompanyDraft({ ...companyDraft, code: event.target.value })} required />
          <Field label="Nombre" value={companyDraft.name} onChange={(event) => setCompanyDraft({ ...companyDraft, name: event.target.value })} required />
          <Field label="Descripción" value={companyDraft.description} onChange={(event) => setCompanyDraft({ ...companyDraft, description: event.target.value })} />
          <SelectField
            label="Estado"
            value={companyDraft.stateId || ''}
            options={states.map((state) => ({ value: state.id, label: state.name }))}
            onChange={(event) => setCompanyDraft({ ...companyDraft, stateId: Number(event.target.value) })}
            disabled={statesLoading || states.length === 0}
            required
          />
          {statesError && <div className="alert error">No se pudieron cargar los estados: {statesError}</div>}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions onCancel={() => setCompanyModalOpen(false)} saving={saving} submitLabel={editingCompany ? 'Guardar cambios' : 'Crear compañía'} />
        </form>
      </ResourceModal>
    </div>
  );
}

function BranchesTab() {
  const loadCompanies = useCallback(() => companiesApi.listCompanies(pagination), []);
  const companyList = useApiList(loadCompanies);
  const [companyId, setCompanyId] = useState<number>();
  const [nameDraft, setNameDraft] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const load = useCallback(
    () => companyId
      ? companiesApi.listBranches(companyId, { ...pagination, name: nameFilter || undefined })
      : Promise.resolve(null),
    [companyId, nameFilter],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: TableColumn<Branch>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description || '—' },
    { key: 'state', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          onDelete={() => void deleteBranch(item)}
          onEdit={() => openBranchModal(item)}
        />
      ),
    },
  ];

  function openBranchModal(branch?: Branch) {
    setEditingBranch(branch ?? null);
    setDraft(branch
      ? { name: branch.name, description: branch.description ?? '', isActive: branch.isActive }
      : { name: '', description: '', isActive: true });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editingBranch) {
        const patch: BranchPatchRequest = draft;
        await companiesApi.patchBranch(companyId, editingBranch.id, patch);
      } else {
        const create: BranchCreateRequest = {
          name: draft.name.trim(),
          description: draft.description || undefined,
        };
        await companiesApi.createBranch(companyId, create);
      }
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la branch.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteBranch(branch: Branch) {
    if (!companyId || !window.confirm(`¿Deseas desactivar la branch "${branch.name}"?`)) return;
    setActionError(null);
    try {
      await companiesApi.deleteBranch(companyId, branch.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar la branch.');
    }
  }

  return (
    <div className="management-panel">
      <TabHeading
        title="Branches"
        description="Consulta y administra las branches de una compañía."
        disabled={!companyId}
        onCreate={() => openBranchModal()}
      />
      <form className="management-filters" onSubmit={(event) => {
        event.preventDefault();
        setNameFilter(nameDraft.trim());
      }}>
        <SelectField
          label="Compañía"
          value={companyId ?? ''}
          options={companyList.data.map((company) => ({ value: company.id, label: company.name }))}
          onChange={(event) => {
            setCompanyId(event.target.value ? Number(event.target.value) : undefined);
            setNameDraft('');
            setNameFilter('');
          }}
          disabled={companyList.loading || companyList.data.length === 0}
          required
        />
        <Field label="Nombre" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
        <div className="management-filter-actions">
          <button className="button primary" type="submit" disabled={!companyId}>Filtrar</button>
          <button className="button secondary" type="button" onClick={() => {
            setNameDraft('');
            setNameFilter('');
          }}>Limpiar</button>
        </div>
      </form>
      {companyList.error && <div className="alert error">No se pudieron cargar las compañías: {companyList.error}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable
        columns={columns}
        emptyMessage={companyId ? 'No hay branches para mostrar.' : 'Selecciona una compañía para consultar sus branches.'}
        loading={loading}
        error={error}
        rows={data}
        rowKey={(item) => item.id}
      />
      <ResourceModal open={modalOpen} title={editingBranch ? 'Editar branch' : 'Nueva branch'} onClose={() => setModalOpen(false)}>
        <form className="modal-form" onSubmit={(event) => void submitBranch(event)}>
          <Field label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
          <Field label="Descripción" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          {editingBranch && (
            <SelectField
              label="Estado"
              value={String(draft.isActive)}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })}
            />
          )}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions onCancel={() => setModalOpen(false)} saving={saving} submitLabel={editingBranch ? 'Guardar cambios' : 'Crear branch'} />
        </form>
      </ResourceModal>
    </div>
  );
}

function TechnologiesTab() {
  const loadCompanies = useCallback(() => companiesApi.listCompanies(pagination), []);
  const companyList = useApiList(loadCompanies);
  const [companyId, setCompanyId] = useState<number>();
  const [branchId, setBranchId] = useState<number>();
  const loadBranches = useCallback(
    () => companyId ? companiesApi.listBranches(companyId, pagination) : Promise.resolve(null),
    [companyId],
  );
  const branchList = useApiList(loadBranches);
  const [filterDraft, setFilterDraft] = useState({ code: '', name: '' });
  const [filters, setFilters] = useState(filterDraft);
  const load = useCallback(
    () => companyId && branchId
      ? companiesApi.listTechnologies(companyId, branchId, {
          ...pagination,
          code: filters.code || undefined,
          name: filters.name || undefined,
        })
      : Promise.resolve(null),
    [companyId, branchId, filters],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTechnology, setEditingTechnology] = useState<Technology | null>(null);
  const [draft, setDraft] = useState({ code: '', name: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: TableColumn<Technology>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'state', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          onDelete={() => void deleteTechnology(item)}
          onEdit={() => openTechnologyModal(item)}
        />
      ),
    },
  ];

  function openTechnologyModal(technology?: Technology) {
    setEditingTechnology(technology ?? null);
    setDraft(technology
      ? { code: technology.code, name: technology.name, isActive: technology.isActive }
      : { code: '', name: '', isActive: true });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitTechnology(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !branchId) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editingTechnology) {
        const patch: TechnologyPatchRequest = draft;
        await companiesApi.patchTechnology(companyId, branchId, editingTechnology.id, patch);
      } else {
        const create: TechnologyCreateRequest = {
          code: draft.code.trim(),
          name: draft.name.trim(),
        };
        await companiesApi.createTechnology(companyId, branchId, create);
      }
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la technology.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTechnology(technology: Technology) {
    if (!companyId || !branchId
        || !window.confirm(`¿Deseas desactivar la technology "${technology.name}"?`)) return;
    setActionError(null);
    try {
      await companiesApi.deleteTechnology(companyId, branchId, technology.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar la technology.');
    }
  }

  return (
    <div className="management-panel">
      <TabHeading
        title="Technologies"
        description="Consulta y administra las technologies de una branch."
        disabled={!companyId || !branchId}
        onCreate={() => openTechnologyModal()}
      />
      <form className="management-filters" onSubmit={(event) => {
        event.preventDefault();
        setFilters({ code: filterDraft.code.trim(), name: filterDraft.name.trim() });
      }}>
        <SelectField
          label="Compañía"
          value={companyId ?? ''}
          options={companyList.data.map((company) => ({ value: company.id, label: company.name }))}
          onChange={(event) => {
            setCompanyId(event.target.value ? Number(event.target.value) : undefined);
            setBranchId(undefined);
            setFilters({ code: '', name: '' });
            setFilterDraft({ code: '', name: '' });
          }}
          disabled={companyList.loading || companyList.data.length === 0}
          required
        />
        <SelectField
          label="Branch"
          value={branchId ?? ''}
          options={branchList.data.map((branch) => ({ value: branch.id, label: branch.name }))}
          onChange={(event) => setBranchId(event.target.value ? Number(event.target.value) : undefined)}
          disabled={!companyId || branchList.loading || branchList.data.length === 0}
          required
        />
        <Field label="Código" value={filterDraft.code} onChange={(event) => setFilterDraft({ ...filterDraft, code: event.target.value })} />
        <Field label="Nombre" value={filterDraft.name} onChange={(event) => setFilterDraft({ ...filterDraft, name: event.target.value })} />
        <div className="management-filter-actions">
          <button className="button primary" type="submit" disabled={!companyId || !branchId}>Filtrar</button>
          <button className="button secondary" type="button" onClick={() => {
            setFilterDraft({ code: '', name: '' });
            setFilters({ code: '', name: '' });
          }}>Limpiar</button>
        </div>
      </form>
      {companyList.error && <div className="alert error">No se pudieron cargar las compañías: {companyList.error}</div>}
      {branchList.error && <div className="alert error">No se pudieron cargar las branches: {branchList.error}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable
        columns={columns}
        emptyMessage={companyId && branchId
          ? 'No hay technologies para mostrar.'
          : 'Selecciona una compañía y una branch para consultar sus technologies.'}
        loading={loading}
        error={error}
        rows={data}
        rowKey={(item) => item.id}
      />
      <ResourceModal open={modalOpen} title={editingTechnology ? 'Editar technology' : 'Nueva technology'} onClose={() => setModalOpen(false)}>
        <form className="modal-form" onSubmit={(event) => void submitTechnology(event)}>
          <Field label="Código" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} required />
          <Field label="Nombre" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
          {editingTechnology && (
            <SelectField
              label="Estado"
              value={String(draft.isActive)}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })}
            />
          )}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions onCancel={() => setModalOpen(false)} saving={saving} submitLabel={editingTechnology ? 'Guardar cambios' : 'Crear technology'} />
        </form>
      </ResourceModal>
    </div>
  );
}

function TabHeading({
  title,
  description,
  onCreate,
  disabled = false,
}: {
  title: string;
  description: string;
  onCreate: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="management-panel-heading">
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      <button className="button primary" type="button" disabled={disabled} onClick={onCreate}>
        Nuevo +
      </button>
    </div>
  );
}
