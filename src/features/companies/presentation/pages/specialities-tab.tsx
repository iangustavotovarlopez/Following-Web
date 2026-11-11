import { useCallback, useState, type FormEvent } from 'react';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { CatalogFilters, type CatalogFilterValues } from '../../../../shared/components/catalog-filters';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { useApiList } from '../../../../shared/hooks/use-api-list';
import { companiesApi, type Speciality } from '../../infrastructure/api';

const pagination = { page: 1, pageSize: 100 };

export function SpecialitiesTab() {
  const { selectedCompanyId: companyId, selectedBranchId: branchId, branches } = useGlobalCompany();
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const load = useCallback(
    () => companyId && branchId
      ? companiesApi.listSpecialities(companyId, branchId, { ...pagination, ...filters })
      : Promise.resolve(null),
    [companyId, branchId, filters],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Speciality | null>(null);
  const [draft, setDraft] = useState({ code: '', name: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const branch = branches.find((item) => item.id === branchId);

  function openModal(item?: Speciality) {
    setEditing(item ?? null);
    setDraft(item
      ? { code: item.code, name: item.name, description: item.description ?? '', isActive: item.isActive }
      : { code: '', name: '', description: '', isActive: true });
    setFormError(null);
    setModalOpen(true);
  }

  const closeModal = () => { if (!saving) setModalOpen(false); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!companyId || !branchId) {
      setFormError('Selecciona una compañía y una branch para guardar la especialidad.');
      return;
    }
    if (!draft.code.trim() || !draft.name.trim()) {
      setFormError('El código y el nombre son obligatorios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = { code: draft.code.trim(), name: draft.name.trim(), description: draft.description };
      const result = editing
        ? await companiesApi.patchSpeciality(companyId, branchId, editing.id, { ...body, isActive: draft.isActive })
        : await companiesApi.createSpeciality(companyId, branchId, body);
      if (!result) throw new Error('La API no devolvió la especialidad guardada.');
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la especialidad.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: Speciality) {
    if (!companyId || !branchId) {
      setActionError('Selecciona una compañía y una branch para desactivar la especialidad.');
      return;
    }
    if (!window.confirm(`¿Deseas desactivar la especialidad "${item.name}"?`)) return;
    setActionError(null);
    try {
      await companiesApi.deleteSpeciality(companyId, branchId, item.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar la especialidad.');
    }
  }

  const columns: TableColumn<Speciality>[] = [
    { key: 'branch', label: 'Branch', render: () => branch?.name },
    { key: 'code', label: 'Código', render: (item) => item.code },
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description || '—' },
    { key: 'state', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    { key: 'actions', label: 'Acciones', render: (item) => (
      <RowActions onEdit={() => openModal(item)} onDelete={() => void deactivate(item)} />
    ) },
  ];

  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h3>Especialidades</h3>
          <p className="muted">Consulta y administra las especialidades de una branch.</p>
        </div>
        <button className="button primary" type="button" disabled={!companyId || !branchId}
          onClick={() => openModal()}>Nuevo +</button>
      </div>
      <CatalogFilters className="management-filters" disabled={!companyId || !branchId} onApply={setFilters} />
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable columns={columns} rows={data} loading={loading} error={error}
        rowKey={(item) => item.id}
        emptyMessage={companyId && branchId
          ? 'No hay especialidades para mostrar.'
          : 'Selecciona compañía y branch en los selectores globales para consultar sus especialidades.'} />
      <ResourceModal open={modalOpen} title={editing ? 'Editar especialidad' : 'Nueva especialidad'} onClose={closeModal}>
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          <p className="muted">Branch: {branch?.name}</p>
          <Field label="Código" value={draft.code} maxLength={50} required
            onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
          <Field label="Nombre" value={draft.name} maxLength={150} required
            onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Field label="Descripción" value={draft.description} maxLength={1000}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          {editing && <SelectField label="Estado" value={String(draft.isActive)}
            options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
            onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })} />}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions onCancel={closeModal} saving={saving}
            submitLabel={editing ? 'Guardar cambios' : 'Crear especialidad'} />
        </form>
      </ResourceModal>
    </div>
  );
}
