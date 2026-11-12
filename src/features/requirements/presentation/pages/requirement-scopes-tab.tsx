import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { companiesApi } from '../../../companies/infrastructure/api';
import { requirementsApi, type RequirementScope } from '../../infrastructure/api/requirements-api';
import { useRequirementCatalog, useRequirementMounted } from '../use-requirement-catalog';

export function RequirementScopesTab({ companyId, branchId }: { companyId?: number; branchId?: number }) {
  const [draftFilter, setDraftFilter] = useState('');
  const [filter, setFilter] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modal, setModal] = useState<{ record?: RequirementScope } | null>(null);
  const mounted = useRequirementMounted();
  const list = useRequirementCatalog(`requirement-scopes:${filter}`, true,
    (page) => requirementsApi.listScopes({ name: filter || undefined, page, pageSize: 100 }), ['/requirements/v0/scopes']);
  async function remove(item: RequirementScope) {
    if (deleting !== null || !window.confirm(`¿Deseas desactivar el alcance "${item.name}"?`)) return;
    setDeleting(item.id); setError(null);
    try { await requirementsApi.deleteScope(item.id); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo desactivar el alcance.'); }
    finally { if (mounted.current) setDeleting(null); }
  }
  const columns: TableColumn<RequirementScope>[] = [
    { key: 'name', label: 'Nombre', render: (v) => v.name },
    { key: 'description', label: 'Descripción', render: (v) => v.description },
    { key: 'sequence', label: 'Secuencia', render: (v) => v.sequence },
    { key: 'deliverable', label: 'Entregable', render: (v) => v.deliverable?.name || 'No relacionado' },
    { key: 'technology', label: 'Tecnología del entregable', render: (v) => v.deliverable?.technology.name || 'No relacionada' },
    { key: 'active', label: 'Estado', render: (v) => <ActiveBadge active={v.isActive} /> },
    { key: 'actions', label: 'Acciones', render: (v) => <RowActions onEdit={() => setModal({ record: v })}
      onDelete={() => void remove(v)} deleteDisabled={!v.isActive || deleting !== null} /> },
  ];
  return <div className="management-panel">
    <div className="management-panel-heading"><div><h3>Scopes</h3>
      <p className="muted">Catálogo global de alcances reutilizables. El entregable es opcional y pertenece a una tecnología.</p></div>
      <button className="button primary" type="button" onClick={() => setModal({})}>Nuevo +</button></div>
    <form className="management-filters" onSubmit={(event) => {
      event.preventDefault();
      const value = draftFilter.trim();
      if (value && value.length < 3) { setFilterError('El nombre requiere al menos tres caracteres para filtrar.'); return; }
      setFilterError(null); setFilter(value); list.refresh();
    }}>
      <Field label="Nombre" maxLength={255} value={draftFilter} onChange={(e) => setDraftFilter(e.target.value)} />
      <div className="management-filter-actions"><button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={() => { setDraftFilter(''); setFilter(''); setFilterError(null); list.refresh(); }}>Limpiar</button>
        {list.error && <button className="button secondary" type="button" onClick={list.refresh}>Reintentar</button>}</div>
    </form>
    {[error, filterError].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
    <ManagementTable columns={columns} rows={list.items} loading={list.loading} error={list.error} rowKey={(v) => v.id}
      emptyMessage="No hay alcances para mostrar." />
    {modal && createPortal(<ScopeModal key={modal.record?.id ?? 'new'} companyId={companyId} branchId={branchId} editing={modal.record}
      onClose={() => setModal(null)} />, document.body)}
  </div>;
}

function ScopeModal({ companyId, branchId, editing, onClose }: {
  companyId?: number; branchId?: number; editing?: RequirementScope; onClose: () => void;
}) {
  const [draft, setDraft] = useState({ name: editing?.name ?? '', description: editing?.description ?? '',
    sequence: String(editing?.sequence ?? 1), technologyId: editing?.deliverable ? String(editing.deliverable.technology.id) : '',
    deliverableId: editing?.deliverable ? String(editing.deliverable.id) : '', isActive: String(editing?.isActive ?? true) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const technologies = useRequirementCatalog(`scope-technologies:${companyId}:${branchId}`, Boolean(companyId && branchId),
    (page) => companyId && branchId ? companiesApi.listTechnologies(companyId, branchId, { page, pageSize: 100 }) : Promise.resolve(null));
  const technologyId = Number(draft.technologyId);
  const technologyInContext = technologies.items.some((v) => v.id === technologyId);
  const deliverables = useRequirementCatalog(`scope-deliverables:${companyId}:${branchId}:${technologyId}`,
    Boolean(companyId && branchId && technologyInContext), (page) => companyId && branchId && technologyInContext
      ? companiesApi.listDeliverables(companyId, branchId, technologyId, { page, pageSize: 100 }) : Promise.resolve(null));
  const currentTechnology = editing?.deliverable?.technology;
  const currentDeliverable = editing?.deliverable;
  const technologyOptions = [...technologies.items, ...(currentTechnology && !technologies.items.some((v) => v.id === currentTechnology.id) ? [currentTechnology] : [])]
    .map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }));
  const deliverableOptions = [...deliverables.items.filter((v) => v.isActive),
    ...(currentDeliverable && currentDeliverable.technology.id === technologyId
      && !deliverables.items.some((v) => v.id === currentDeliverable.id && v.isActive) ? [currentDeliverable] : [])]
    .map((v) => ({ value: v.id, label: v.name }));
  const loading = technologies.loading || deliverables.loading;
  const close = () => { if (!saving) onClose(); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (loading || technologies.error || deliverables.error || !draft.name.trim() || !draft.description.trim()
        || !/^\d+$/.test(draft.sequence) || Number(draft.sequence) < 1 || Number(draft.sequence) > 2147483647
        || (draft.deliverableId && !deliverableOptions.some((v) => v.value === Number(draft.deliverableId)))
        || !['true', 'false'].includes(draft.isActive)) {
      setError('Completa nombre, descripción y secuencia entera positiva usando los catálogos disponibles.'); return;
    }
    setSaving(true); setError(null);
    try {
      const body = { name: draft.name.trim(), description: draft.description.trim(), sequence: Number(draft.sequence) };
      const saved = editing
        ? await requirementsApi.patchScope(editing.id, { ...body, isActive: draft.isActive === 'true',
            deliverable: { id: draft.deliverableId ? Number(draft.deliverableId) : null } })
        : await requirementsApi.createScope({ ...body, deliverable: draft.deliverableId ? { id: Number(draft.deliverableId) } : undefined });
      if (!saved) throw new Error('La API no devolvió el alcance guardado.');
      if (mounted.current) onClose();
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo guardar el alcance.'); }
    finally { if (mounted.current) setSaving(false); }
  }
  return <ResourceModal open title={editing ? 'Editar alcance' : 'Nuevo alcance'} dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(e) => void submit(e)}>
      <Field label="Nombre" required maxLength={255} value={draft.name} disabled={saving} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <label className="field"><span>Descripción</span><textarea required maxLength={1000} rows={3} value={draft.description} disabled={saving}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <Field label="Secuencia" type="number" min="1" max="2147483647" step="1" required value={draft.sequence} disabled={saving}
        onChange={(e) => setDraft({ ...draft, sequence: e.target.value })} />
      <SelectField label="Tecnología (filtro del entregable)" value={draft.technologyId} disabled={saving || loading || !companyId || !branchId}
        options={technologyOptions} onChange={(e) => setDraft({ ...draft, technologyId: e.target.value, deliverableId: '' })} />
      <SelectField label="Entregable (opcional)" emptyLabel="Sin entregable" value={draft.deliverableId} disabled={saving || loading}
        options={deliverableOptions} onChange={(e) => setDraft({ ...draft, deliverableId: e.target.value })} />
      {(!companyId || !branchId || (currentTechnology && !technologyInContext)) && <p className="muted">
        El catálogo de alcances es global. Para elegir otro entregable, selecciona su compañía, Branch y tecnología.
        El entregable actual puede conservarse o quitarse.</p>}
      {editing && <SelectField label="Estado" required value={draft.isActive} disabled={saving}
        options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
        onChange={(e) => setDraft({ ...draft, isActive: e.target.value })} />}
      {[technologies.error, deliverables.error, error].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
      {(technologies.error || deliverables.error) && <button className="button secondary" type="button" onClick={() => { technologies.refresh(); deliverables.refresh(); }}>Reintentar catálogos</button>}
      <ModalActions onCancel={close} saving={saving} submitLabel={editing ? 'Guardar cambios' : 'Crear alcance'}
        submitDisabled={loading || Boolean(technologies.error || deliverables.error)} />
    </form></ResourceModal>;
}
