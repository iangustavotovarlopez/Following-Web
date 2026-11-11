import { useCallback, useState, type FormEvent } from 'react';
import {
  collaboratorsApi,
  type CollaboratorRole,
  type CollaboratorRolePatchRequest,
} from '../../infrastructure/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { CatalogFilters, type CatalogFilterValues } from '../../../../shared/components/catalog-filters';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { useApiList } from '../../../../shared/hooks/use-api-list';

export function CollaboratorRolesSection() {
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const load = useCallback(
    () => collaboratorsApi.listRoles({ page: 1, pageSize: 100, ...filters }),
    [filters],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CollaboratorRole | null>(null);
  const [form, setForm] = useState({ code: '', name: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openModal(role?: CollaboratorRole) {
    setEditingRole(role ?? null);
    setForm(role
      ? { code: role.code, name: role.name, isActive: role.isActive }
      : { code: '', name: '', isActive: true });
    setFormError(null);
    setActionError(null);
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingRole) {
        const patch: CollaboratorRolePatchRequest = {
          code: form.code.trim(),
          name: form.name.trim(),
          isActive: form.isActive,
        };
        await collaboratorsApi.patchRole(editingRole.id, patch);
      } else {
        await collaboratorsApi.createRole({ code: form.code.trim(), name: form.name.trim() });
      }
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el rol.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: CollaboratorRole) {
    if (!window.confirm(`¿Deseas desactivar el rol "${role.name}"?`)) return;
    setActionError(null);
    try {
      await collaboratorsApi.deleteRole(role.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el rol.');
    }
  }

  const columns: TableColumn<CollaboratorRole>[] = [
    { key: 'code', label: 'Código', render: (role) => role.code },
    { key: 'name', label: 'Nombre', render: (role) => role.name },
    { key: 'status', label: 'Estado', render: (role) => <ActiveBadge active={role.isActive} /> },
    {
      key: 'actions',
      label: 'Acciones',
      render: (role) => (
        <RowActions
          onEdit={() => openModal(role)}
          onDelete={() => void deleteRole(role)}
        />
      ),
    },
  ];

  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h3>Roles</h3>
          <p className="muted">Consulta, filtra y administra los roles de colaboradores.</p>
        </div>
        <button className="button primary" onClick={() => openModal()} type="button">Nuevo +</button>
      </div>
      <div className="management-filters">
        <CatalogFilters onApply={setFilters} />
      </div>
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable
        columns={columns}
        emptyMessage="No hay roles para mostrar."
        loading={loading}
        error={error}
        rows={data}
        rowKey={(role) => role.id}
      />
      <ResourceModal
        open={modalOpen}
        title={editingRole ? 'Editar rol' : 'Nuevo rol'}
        onClose={() => setModalOpen(false)}
      >
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
          <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          {editingRole && (
            <SelectField
              label="Estado"
              value={String(form.isActive)}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
            />
          )}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={editingRole ? 'Guardar cambios' : 'Crear rol'}
          />
        </form>
      </ResourceModal>
    </div>
  );
}
