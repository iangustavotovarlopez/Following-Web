import { useCallback, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import {
  servicesApi,
  type Environment,
  type ServiceApplicationUnit,
  type ServiceGroup,
  type ServiceMetadata,
} from '../../infrastructure/api';
import type { PageResponse } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { CatalogFilters, type CatalogFilterValues } from '../../../../shared/components/catalog-filters';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { useApiList } from '../../../../shared/hooks/use-api-list';

type CatalogItem = { id: number; name: string; isActive: boolean };
type CatalogForm = { code: string; name: string; isActive: boolean };
type GroupForm = CatalogForm & { registeredDate: string; version: string };
type ApplicationUnitForm = CatalogForm & { registeredDate: string };

interface ManagedCatalogProps<T extends CatalogItem, Form extends object> {
  title: string;
  description: string;
  columns: TableColumn<T>[];
  initialForm: Form;
  list: (filters: CatalogFilterValues) => Promise<PageResponse<T> | null>;
  toForm: (item: T) => Form;
  create: (form: Form) => Promise<unknown>;
  update: (id: number, form: Form) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  renderFields: (
    form: Form,
    setForm: Dispatch<SetStateAction<Form>>,
    editing: boolean,
  ) => ReactNode;
}

const environmentColumns: TableColumn<Environment>[] = [
  { key: 'code', label: 'Código', render: (item) => item.code },
  { key: 'name', label: 'Nombre', render: (item) => item.name },
  { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
];

const groupColumns: TableColumn<ServiceGroup>[] = [
  { key: 'code', label: 'Código', render: (item) => item.code },
  { key: 'name', label: 'Nombre', render: (item) => item.name },
  { key: 'version', label: 'Versión', render: (item) => item.version },
  { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
];

const unitColumns: TableColumn<ServiceApplicationUnit>[] = [
  { key: 'code', label: 'Código', render: (item) => item.code },
  { key: 'name', label: 'Nombre', render: (item) => item.name },
  { key: 'registeredDate', label: 'Registro', render: (item) => item.registeredDate },
  { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
];

const metadataColumns: TableColumn<ServiceMetadata>[] = [
  { key: 'code', label: 'Código', render: (item) => item.code },
  { key: 'name', label: 'Nombre', render: (item) => item.name },
  { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
];

export function ServicesSection() {
  const [activeTab, setActiveTab] = useState('groups');
  const tabs = [
    { id: 'groups', label: 'Groups' },
    { id: 'application-units', label: 'Application Units' },
    { id: 'environments', label: 'Environments' },
    { id: 'metadata', label: 'Metadata' },
  ];

  return (
    <section className="resource-section companies-management">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Catálogos</p>
          <h2>Services</h2>
          <p className="muted">Administra grupos, unidades aplicativas y ambientes.</p>
        </div>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Catálogos de servicios">
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
        {activeTab === 'groups' && (
          <ManagedCatalog<ServiceGroup, GroupForm>
            title="Service Groups"
            description="Consulta y administra los grupos de servicios."
            columns={groupColumns}
            initialForm={{ code: '', name: '', registeredDate: '', version: '', isActive: true }}
            list={(filters) => servicesApi.listGroups({ page: 1, pageSize: 100, ...filters })}
            toForm={(item) => ({
              code: item.code,
              name: item.name,
              registeredDate: item.registeredDate,
              version: item.version,
              isActive: item.isActive,
            })}
            create={(form) => servicesApi.createGroup({
              code: form.code,
              name: form.name,
              registeredDate: form.registeredDate,
              version: form.version,
            })}
            update={(id, form) => servicesApi.patchGroup(id, form)}
            remove={(id) => servicesApi.deleteGroup(id)}
            renderFields={(form, setForm, editing) => <>
              <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Field label="Fecha de registro" type="date" value={form.registeredDate} onChange={(event) => setForm({ ...form, registeredDate: event.target.value })} required />
              <Field label="Versión" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} required />
              {editing && <ActiveField value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />}
            </>}
          />
        )}
        {activeTab === 'application-units' && (
          <ManagedCatalog<ServiceApplicationUnit, ApplicationUnitForm>
            title="Application Units"
            description="Consulta y administra las unidades aplicativas."
            columns={unitColumns}
            initialForm={{ code: '', name: '', registeredDate: '', isActive: true }}
            list={(filters) => servicesApi.listApplicationUnits({ page: 1, pageSize: 100, ...filters })}
            toForm={(item) => ({
              code: item.code,
              name: item.name,
              registeredDate: item.registeredDate,
              isActive: item.isActive,
            })}
            create={(form) => servicesApi.createApplicationUnit({
              code: form.code,
              name: form.name,
              registeredDate: form.registeredDate,
            })}
            update={(id, form) => servicesApi.patchApplicationUnit(id, form)}
            remove={(id) => servicesApi.deleteApplicationUnit(id)}
            renderFields={(form, setForm, editing) => <>
              <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <Field label="Fecha de registro" type="date" value={form.registeredDate} onChange={(event) => setForm({ ...form, registeredDate: event.target.value })} required />
              {editing && <ActiveField value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />}
            </>}
          />
        )}
        {activeTab === 'environments' && (
          <ManagedCatalog<Environment, CatalogForm>
            title="Environments"
            description="Consulta y administra los ambientes disponibles para los servicios."
            columns={environmentColumns}
            initialForm={{ code: '', name: '', isActive: true }}
            list={(filters) => servicesApi.listEnvironments({ page: 1, pageSize: 100, ...filters })}
            toForm={(item) => ({ code: item.code, name: item.name, isActive: item.isActive })}
            create={(form) => servicesApi.createEnvironment({ code: form.code, name: form.name })}
            update={(id, form) => servicesApi.patchEnvironment(id, form)}
            remove={(id) => servicesApi.deleteEnvironment(id)}
            renderFields={(form, setForm, editing) => <>
              <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              {editing && <ActiveField value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />}
            </>}
          />
        )}
        {activeTab === 'metadata' && (
          <ManagedCatalog<ServiceMetadata, CatalogForm>
            title="Metadata"
            description="Consulta y administra los metadatos disponibles para los servicios."
            columns={metadataColumns}
            initialForm={{ code: '', name: '', isActive: true }}
            list={(filters) => servicesApi.listMetadata({ page: 1, pageSize: 100, ...filters })}
            toForm={(item) => ({ code: item.code, name: item.name, isActive: item.isActive })}
            create={(form) => servicesApi.createMetadata({ code: form.code, name: form.name })}
            update={(id, form) => servicesApi.patchMetadata(id, form)}
            remove={(id) => servicesApi.deleteMetadata(id)}
            renderFields={(form, setForm, editing) => <>
              <Field label="Código" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              <Field label="Nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              {editing && <ActiveField value={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />}
            </>}
          />
        )}
      </div>
    </section>
  );
}

function ManagedCatalog<T extends CatalogItem, Form extends object>({
  title,
  description,
  columns,
  initialForm,
  list,
  toForm,
  create,
  update,
  remove,
  renderFields,
}: ManagedCatalogProps<T, Form>) {
  const [filters, setFilters] = useState<CatalogFilterValues>({});
  const load = useCallback(() => list(filters), [filters, list]);
  const { data, loading, error, refresh } = useApiList(load);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditingItem(null);
    setForm({ ...initialForm });
    setFormError(null);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(item: T) {
    setEditingItem(item);
    setForm(toForm(item));
    setFormError(null);
    setActionError(null);
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingItem) await update(editingItem.id, form);
      else await create(form);
      setModalOpen(false);
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: T) {
    if (!window.confirm(`¿Deseas desactivar "${item.name}"?`)) return;
    setActionError(null);
    try {
      await remove(item.id);
      refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el registro.');
    }
  }

  const actionColumn: TableColumn<T> = {
    key: 'actions',
    label: 'Acciones',
    render: (item) => (
      <RowActions onEdit={() => openEdit(item)} onDelete={() => void deleteItem(item)} />
    ),
  };

  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <button className="button primary" onClick={openCreate} type="button">Nuevo +</button>
      </div>
      <div className="management-filters">
        <CatalogFilters onApply={setFilters} />
      </div>
      {actionError && <div className="alert error">{actionError}</div>}
      <ManagementTable
        columns={[...columns, actionColumn]}
        emptyMessage="No hay registros para mostrar."
        loading={loading}
        error={error}
        rows={data}
        rowKey={(item) => item.id}
      />
      <ResourceModal
        open={modalOpen}
        title={`${editingItem ? 'Editar' : 'Nuevo'} ${title}`}
        onClose={() => setModalOpen(false)}
      >
        <form className="modal-form" onSubmit={(event) => void submit(event)}>
          {renderFields(form, setForm, Boolean(editingItem))}
          {formError && <div className="alert error">{formError}</div>}
          <ModalActions
            onCancel={() => setModalOpen(false)}
            saving={saving}
            submitLabel={editingItem ? 'Guardar cambios' : 'Crear'}
          />
        </form>
      </ResourceModal>
    </div>
  );
}

function ActiveField({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <SelectField
      label="Estado"
      value={String(value)}
      options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
      onChange={(event) => onChange(event.target.value === 'true')}
    />
  );
}
