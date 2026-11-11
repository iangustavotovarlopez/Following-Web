import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorState,
  type CreateCollaboratorRequest,
} from '../../infrastructure/api';
import { StateBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { CollaboratorDetailsPage } from './collaborator-details-page';

const initialForm: CreateCollaboratorRequest = {
  code: '',
  name: '',
  secondName: '',
  thirdName: '',
  lastname: '',
  secondLastname: '',
  thirdLastname: '',
  company: { id: 0 },
  state: { id: 0 },
  hireDate: '',
  separationDate: '',
};

const fullName = (item: Collaborator) => [
  item.name,
  item.secondName,
  item.thirdName,
  item.lastname,
  item.secondLastname,
  item.thirdLastname,
].filter(Boolean).join(' ');

export function CollaboratorsSection() {
  const { companies, selectedCompanyId, loading: companiesLoading } = useGlobalCompany();
  const [filterDraft, setFilterDraft] = useState({ code: '', name: '', stateId: '' });
  const [filters, setFilters] = useState(filterDraft);
  const [filterError, setFilterError] = useState<string | null>(null);
  const load = useCallback(
    () => collaboratorsApi.listCollaborators({
      page: 1,
      pageSize: 100,
      code: filters.code || undefined,
      name: filters.name || undefined,
      'company.id': selectedCompanyId,
      'state.id': filters.stateId ? Number(filters.stateId) : undefined,
    }),
    [filters, selectedCompanyId],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const visibleCollaborators = selectedCompanyId
    ? data.filter((collaborator) => collaborator.company.id === selectedCompanyId)
    : data;
  const [states, setStates] = useState<CollaboratorState[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stateName, setStateName] = useState('');
  const [stateSaving, setStateSaving] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [expandedCollaborators, setExpandedCollaborators] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setExpandedCollaborators(new Set());
  }, [selectedCompanyId, filters]);

  function toggleDetails(collaboratorId: number) {
    setExpandedCollaborators((current) => {
      const next = new Set(current);
      if (next.has(collaboratorId)) next.delete(collaboratorId);
      else next.add(collaboratorId);
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    collaboratorsApi.listStates({ page: 1, pageSize: 100 }).then((stateResponse) => {
      if (!active) return;
      setStates(stateResponse?.content ?? []);
    }).catch((cause: Error) => {
      if (active) setReferencesError(cause.message);
    }).finally(() => {
      if (active) setReferencesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editingCollaborator) {
      setForm((current) => ({ ...current, company: { id: selectedCompanyId ?? 0 } }));
    }
  }, [editingCollaborator, selectedCompanyId]);

  const columns: TableColumn<Collaborator>[] = [
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: fullName },
    { key: 'company', label: 'Compañía', render: (item) => item.company.name },
    { key: 'state', label: 'Estado', render: (item) => <StateBadge name={item.state.name} /> },
    { key: 'hireDate', label: 'Contratación', render: (item) => item.hireDate },
    {
      key: 'actions',
      label: 'Acciones',
      render: (item) => (
        <RowActions
          className="collaborator-row-actions"
          onEdit={() => openModal(item)}
          onDelete={() => void deleteCollaborator(item)}
        >
          <button
            aria-label={`${expandedCollaborators.has(item.id) ? 'Ocultar' : 'Mostrar'} detalles de ${fullName(item)}`}
            aria-expanded={expandedCollaborators.has(item.id)}
            aria-controls={expandedCollaborators.has(item.id) ? `collaborator-details-${item.id}` : undefined}
            className="row-action-button details"
            onClick={() => toggleDetails(item.id)}
            title={expandedCollaborators.has(item.id) ? 'Ocultar detalles' : 'Mostrar roles, especialidades y tecnologías'}
            type="button"
          >
            <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 9v12" />
              <path d={expandedCollaborators.has(item.id) ? 'm12 16 3-3 3 3' : 'm12 14 3 3 3-3'} />
            </svg>
          </button>
        </RowActions>
      ),
    },
  ];

  function openModal(collaborator?: Collaborator) {
    setEditingCollaborator(collaborator ?? null);
    setForm(collaborator ? {
      code: collaborator.code,
      name: collaborator.name,
      secondName: collaborator.secondName ?? '',
      thirdName: collaborator.thirdName ?? '',
      lastname: collaborator.lastname,
      secondLastname: collaborator.secondLastname ?? '',
      thirdLastname: collaborator.thirdLastname ?? '',
      company: { id: collaborator.company.id },
      state: { id: collaborator.state.id },
      hireDate: collaborator.hireDate,
      separationDate: collaborator.separationDate ?? '',
    } : { ...initialForm, company: { id: selectedCompanyId ?? 0 } });
    setFormError(null);
    setActionError(null);
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.company.id || !form.state.id) {
      setFormError('Selecciona una compañía y un estado.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const body = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      secondName: form.secondName?.trim() || undefined,
      thirdName: form.thirdName?.trim() || undefined,
      lastname: form.lastname.trim(),
      secondLastname: form.secondLastname?.trim() || undefined,
      thirdLastname: form.thirdLastname?.trim() || undefined,
      separationDate: form.separationDate || undefined,
    };
    try {
      if (editingCollaborator) {
        await collaboratorsApi.patchCollaborator(editingCollaborator.id, body);
      } else {
        await collaboratorsApi.createCollaborator(body);
      }
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el colaborador.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollaborator(collaborator: Collaborator) {
    if (!window.confirm(`¿Deseas desactivar al colaborador "${fullName(collaborator)}"?`)) return;
    setActionError(null);
    try {
      await collaboratorsApi.deleteCollaborator(collaborator.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el colaborador.');
    }
  }

  async function submitState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStateSaving(true);
    setStateError(null);
    try {
      const state = await collaboratorsApi.createState({ name: stateName.trim() });
      if (state) setStates((current) => [...current, state]);
      setStateName('');
    } catch (cause) {
      setStateError(cause instanceof Error ? cause.message : 'No se pudo crear el estado.');
    } finally {
      setStateSaving(false);
    }
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

  function clearFilters() {
    const empty = { code: '', name: '', stateId: '' };
    setFilterDraft(empty);
    setFilters(empty);
    setFilterError(null);
  }

  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h3>Collaborators</h3>
          <p className="muted">Consulta, filtra y administra los colaboradores registrados.</p>
        </div>
        <button className="button primary" onClick={() => openModal()} type="button">Nuevo +</button>
      </div>
      <form className="management-filters" onSubmit={(event) => void applyFilters(event)}>
        <Field label="Código" value={filterDraft.code} onChange={(event) => setFilterDraft({ ...filterDraft, code: event.target.value })} />
        <Field label="Nombre" value={filterDraft.name} onChange={(event) => setFilterDraft({ ...filterDraft, name: event.target.value })} />
        <SelectField
          label="Estado"
          value={filterDraft.stateId}
          options={states.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(event) => setFilterDraft({ ...filterDraft, stateId: event.target.value })}
        />
        <div className="management-filter-actions">
          <button className="button primary" type="submit">Filtrar</button>
          <button className="button secondary" onClick={clearFilters} type="button">Limpiar</button>
        </div>
      </form>
      {filterError && <div className="alert error">{filterError}</div>}
      {actionError && <div className="alert error">{actionError}</div>}
      {referencesError && <div className="alert error">No se pudieron cargar los estados: {referencesError}</div>}
      <ManagementTable
        columns={columns}
        emptyMessage="No hay colaboradores para mostrar."
        loading={loading}
        error={error}
        rows={visibleCollaborators}
        rowKey={(item) => item.id}
        renderExpandedRow={(item) => expandedCollaborators.has(item.id) ? (
          <div id={`collaborator-details-${item.id}`}>
            <CollaboratorDetailsPage
              collaboratorId={item.id}
              collaboratorCode={item.code}
              inlineCollaborator={item}
            />
          </div>
        ) : null}
      />

      <details className="state-catalog-tools">
        <summary>Administrar estados de colaboradores</summary>
        <form className="management-form" onSubmit={(event) => void submitState(event)}>
          <Field label="Nuevo estado" value={stateName} onChange={(event) => setStateName(event.target.value)} required />
          <SubmitButton loading={stateSaving}>Crear estado</SubmitButton>
          {stateError && <div className="alert error">{stateError}</div>}
        </form>
      </details>

      <ResourceModal
        open={modalOpen}
        title={editingCollaborator ? 'Editar colaborador' : 'Nuevo colaborador'}
        onClose={() => setModalOpen(false)}
      >
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
          <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <Field label="Segundo nombre" value={form.secondName ?? ''} onChange={(event) => setForm({ ...form, secondName: event.target.value })} />
          <Field label="Tercer nombre" value={form.thirdName ?? ''} onChange={(event) => setForm({ ...form, thirdName: event.target.value })} />
          <Field label="Apellido" value={form.lastname} onChange={(event) => setForm({ ...form, lastname: event.target.value })} required />
          <Field label="Segundo apellido" value={form.secondLastname ?? ''} onChange={(event) => setForm({ ...form, secondLastname: event.target.value })} />
          <Field label="Tercer apellido" value={form.thirdLastname ?? ''} onChange={(event) => setForm({ ...form, thirdLastname: event.target.value })} />
          <SelectField
            label="Compañía"
            value={form.company.id || ''}
            options={companies.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(event) => setForm({ ...form, company: { id: Number(event.target.value) } })}
            disabled={referencesLoading || companiesLoading || companies.length === 0}
            required
          />
          <SelectField
            label="Estado"
            value={form.state.id || ''}
            options={states.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(event) => setForm({ ...form, state: { id: Number(event.target.value) } })}
            disabled={referencesLoading || states.length === 0}
            required
          />
          <Field label="Fecha de contratación" type="date" value={form.hireDate} onChange={(event) => setForm({ ...form, hireDate: event.target.value })} required />
          <Field label="Fecha de baja" type="date" value={form.separationDate ?? ''} onChange={(event) => setForm({ ...form, separationDate: event.target.value })} />
          {referencesError && <div className="alert error">{referencesError}</div>}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={editingCollaborator ? 'Guardar cambios' : 'Crear colaborador'}
          />
        </form>
      </ResourceModal>
    </div>
  );
}
