import { useCallback, useState, type FormEvent } from 'react';
import { collaboratorsApi, type CollaboratorRole } from '../../infrastructure/api';
import { ActiveBadge, ApiSection, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiList } from '../../../../shared/hooks/use-api-list';

const columns: TableColumn<CollaboratorRole>[] = [
  { key: 'code', label: 'Código', render: (role) => role.code },
  { key: 'name', label: 'Nombre', render: (role) => role.name },
  { key: 'status', label: 'Estado', render: (role) => <ActiveBadge active={role.isActive} /> },
];

export function CollaboratorRolesSection() {
  const load = useCallback(
    () => collaboratorsApi.listRoles({ page: 1, pageSize: 100 }),
    [],
  );
  const { data, loading, error, refresh } = useApiList(load);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await collaboratorsApi.createRole({ code: code.trim(), name: name.trim() });
      setCode('');
      setName('');
      refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo crear el rol');
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form className="inline-form" onSubmit={submit}>
      <Field label="Código del rol" value={code} onChange={(event) => setCode(event.target.value)} required />
      <Field label="Nombre del rol" value={name} onChange={(event) => setName(event.target.value)} required />
      <SubmitButton loading={saving}>Crear rol</SubmitButton>
      {formError && <span className="form-error">{formError}</span>}
    </form>
  );

  return (
    <ApiSection
      title="Roles de colaboradores"
      description="Consulta y registra roles del catálogo."
      columns={columns}
      rows={data}
      loading={loading}
      error={error}
      form={form}
    />
  );
}