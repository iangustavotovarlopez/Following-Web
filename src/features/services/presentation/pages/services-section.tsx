import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import {
  servicesApi,
  type Environment,
  type EnvironmentPatchRequest,
  type ServiceApplicationUnit,
  type ServiceApplicationUnitPatchRequest,
  type ServiceGroup,
  type ServiceGroupPatchRequest,
  type ServiceMetadata,
  type ServiceMetadataPatchRequest,
} from '../../infrastructure/api';
import type { PageResponse } from '../../../../shared/api';
import { ApiSection, ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';

interface CatalogCardProps<T> {
  title: string;
  description: string;
  columns: TableColumn<T>[];
  load: () => Promise<PageResponse<T> | null>;
  form: (items: T[], refresh: () => void) => ReactNode;
}

function CatalogCard<T>({
  title,
  description,
  columns,
  load,
  form,
}: CatalogCardProps<T>) {
  const { data, loading, error, refresh } = useApiList(load);
  return (
    <ApiSection
      title={title}
      description={description}
      columns={columns}
      rows={data}
      loading={loading}
      error={error}
      form={form(data, refresh)}
    />
  );
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
  return (
    <div className="resource-grid">
      <EnvironmentCard />
      <GroupCard />
      <ApplicationUnitCard />
      <MetadataCard />
    </div>
  );
}

function EnvironmentCard() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [patch, setPatch] = useState<EnvironmentPatchRequest>({});
  const load = useCallback(() => servicesApi.listEnvironments({ page: 1, pageSize: 20 }), [refreshKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await servicesApi.createEnvironment({ code, name });
      setCode('');
      setName('');
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }
  async function update(event: FormEvent, refresh: () => void) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await servicesApi.patchEnvironment(editingId, patch);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }
  return (
    <CatalogCard
      title="Environments"
      description="Ambientes disponibles para los servicios."
      columns={environmentColumns}
      load={load}
      form={(items, refresh) => (
        <div className="form-stack">
          <form className="inline-form" onSubmit={submit}>
            <Field label="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
            <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <SubmitButton loading={saving}>Crear</SubmitButton>
            {error && <span className="form-error">{error}</span>}
          </form>
          <form className="inline-form" onSubmit={(event) => update(event, refresh)}>
            <SelectField label="Editar ambiente" value={editingId || ''} options={items.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
              const item = items.find((candidate) => candidate.id === Number(e.target.value));
              setEditingId(item?.id ?? 0);
              setPatch(item ? { code: item.code, name: item.name, isActive: item.isActive } : {});
            }} required />
            <Field label="Código" value={patch.code ?? ''} onChange={(e) => setPatch({ ...patch, code: e.target.value })} />
            <Field label="Nombre" value={patch.name ?? ''} onChange={(e) => setPatch({ ...patch, name: e.target.value })} />
            <SelectField label="Activo" value={patch.isActive === undefined ? '' : String(patch.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setPatch({ ...patch, isActive: e.target.value === 'true' })} />
            <SubmitButton loading={saving}>Actualizar</SubmitButton>
          </form>
        </div>
      )}
    />
  );
}

function GroupCard() {
  const [form, setForm] = useState({ code: '', name: '', registeredDate: '', version: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [patch, setPatch] = useState<ServiceGroupPatchRequest>({});
  const load = useCallback(() => servicesApi.listGroups({ page: 1, pageSize: 20 }), [refreshKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await servicesApi.createGroup(form);
      setForm({ code: '', name: '', registeredDate: '', version: '' });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }
  async function update(event: FormEvent, refresh: () => void) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await servicesApi.patchGroup(editingId, patch);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }
  return (
    <CatalogCard
      title="Service groups"
      description="Agrupadores de servicios."
      columns={groupColumns}
      load={load}
      form={(items, refresh) => (
        <div className="form-stack">
          <form className="inline-form" onSubmit={submit}>
            <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Field label="Fecha" type="date" value={form.registeredDate} onChange={(e) => setForm({ ...form, registeredDate: e.target.value })} required />
            <Field label="Versión" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} required />
            <SubmitButton loading={saving}>Crear</SubmitButton>
            {error && <span className="form-error">{error}</span>}
          </form>
          <form className="inline-form" onSubmit={(event) => update(event, refresh)}>
            <SelectField label="Editar grupo" value={editingId || ''} options={items.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
              const item = items.find((candidate) => candidate.id === Number(e.target.value));
              setEditingId(item?.id ?? 0);
              setPatch(item ? { code: item.code, name: item.name, registeredDate: item.registeredDate, version: item.version, isActive: item.isActive } : {});
            }} required />
            <Field label="Código" value={patch.code ?? ''} onChange={(e) => setPatch({ ...patch, code: e.target.value })} />
            <Field label="Nombre" value={patch.name ?? ''} onChange={(e) => setPatch({ ...patch, name: e.target.value })} />
            <Field label="Fecha" type="date" value={patch.registeredDate ?? ''} onChange={(e) => setPatch({ ...patch, registeredDate: e.target.value })} />
            <Field label="Versión" value={patch.version ?? ''} onChange={(e) => setPatch({ ...patch, version: e.target.value })} />
            <SelectField label="Activo" value={patch.isActive === undefined ? '' : String(patch.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setPatch({ ...patch, isActive: e.target.value === 'true' })} />
            <SubmitButton loading={saving}>Actualizar</SubmitButton>
          </form>
        </div>
      )}
    />
  );
}

function ApplicationUnitCard() {
  const [form, setForm] = useState({ code: '', name: '', registeredDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [patch, setPatch] = useState<ServiceApplicationUnitPatchRequest>({});
  const load = useCallback(() => servicesApi.listApplicationUnits({ page: 1, pageSize: 20 }), [refreshKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await servicesApi.createApplicationUnit(form);
      setForm({ code: '', name: '', registeredDate: '' });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }
  async function update(event: FormEvent, refresh: () => void) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await servicesApi.patchApplicationUnit(editingId, patch);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }
  return (
    <CatalogCard
      title="Application units"
      description="Unidades aplicativas asociadas a servicios."
      columns={unitColumns}
      load={load}
      form={(items, refresh) => (
        <div className="form-stack">
          <form className="inline-form" onSubmit={submit}>
            <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Field label="Fecha" type="date" value={form.registeredDate} onChange={(e) => setForm({ ...form, registeredDate: e.target.value })} required />
            <SubmitButton loading={saving}>Crear</SubmitButton>
            {error && <span className="form-error">{error}</span>}
          </form>
          <form className="inline-form" onSubmit={(event) => update(event, refresh)}>
            <SelectField label="Editar unidad" value={editingId || ''} options={items.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
              const item = items.find((candidate) => candidate.id === Number(e.target.value));
              setEditingId(item?.id ?? 0);
              setPatch(item ? { code: item.code, name: item.name, registeredDate: item.registeredDate, isActive: item.isActive } : {});
            }} required />
            <Field label="Código" value={patch.code ?? ''} onChange={(e) => setPatch({ ...patch, code: e.target.value })} />
            <Field label="Nombre" value={patch.name ?? ''} onChange={(e) => setPatch({ ...patch, name: e.target.value })} />
            <Field label="Fecha" type="date" value={patch.registeredDate ?? ''} onChange={(e) => setPatch({ ...patch, registeredDate: e.target.value })} />
            <SelectField label="Activo" value={patch.isActive === undefined ? '' : String(patch.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setPatch({ ...patch, isActive: e.target.value === 'true' })} />
            <SubmitButton loading={saving}>Actualizar</SubmitButton>
          </form>
        </div>
      )}
    />
  );
}

function MetadataCard() {
  const [form, setForm] = useState({ code: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [patch, setPatch] = useState<ServiceMetadataPatchRequest>({});
  const load = useCallback(() => servicesApi.listMetadata({ page: 1, pageSize: 20 }), [refreshKey]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await servicesApi.createMetadata(form);
      setForm({ code: '', name: '' });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }
  async function update(event: FormEvent, refresh: () => void) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      await servicesApi.patchMetadata(editingId, patch);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }
  return (
    <CatalogCard
      title="Metadata"
      description="Metadata disponible para los servicios."
      columns={metadataColumns}
      load={load}
      form={(items, refresh) => (
        <div className="form-stack">
          <form className="inline-form" onSubmit={submit}>
            <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <SubmitButton loading={saving}>Crear</SubmitButton>
            {error && <span className="form-error">{error}</span>}
          </form>
          <form className="inline-form" onSubmit={(event) => update(event, refresh)}>
            <SelectField label="Editar metadata" value={editingId || ''} options={items.map((item) => ({ value: item.id, label: item.name }))} onChange={(e) => {
              const item = items.find((candidate) => candidate.id === Number(e.target.value));
              setEditingId(item?.id ?? 0);
              setPatch(item ? { code: item.code, name: item.name, isActive: item.isActive } : {});
            }} required />
            <Field label="Código" value={patch.code ?? ''} onChange={(e) => setPatch({ ...patch, code: e.target.value })} />
            <Field label="Nombre" value={patch.name ?? ''} onChange={(e) => setPatch({ ...patch, name: e.target.value })} />
            <SelectField label="Activo" value={patch.isActive === undefined ? '' : String(patch.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(e) => setPatch({ ...patch, isActive: e.target.value === 'true' })} />
            <SubmitButton loading={saving}>Actualizar</SubmitButton>
          </form>
        </div>
      )}
    />
  );
}
