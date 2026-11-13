import { useState, type FormEvent } from 'react';
import { Field } from '../../../../shared/components/field';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { servicesApi } from '../../../services/infrastructure/api';
import { requirementsApi, type Requirement, type RequirementScopeLink, type ServiceRegistration } from '../../infrastructure/api/requirements-api';
import { localDate, validDeliverableUrl } from '../requirement-form-utils';
import { useRequirementCatalog, useRequirementMounted } from '../use-requirement-catalog';

const validText = (value: string, max: number) => Boolean(value.trim()) && value.trim().length <= max;

export function ServiceDeliverableModal({ companyId, branchId, requirement, row, onClose, onSaved }: {
  companyId: number; branchId: number; requirement: Requirement; row: RequirementScopeLink;
  onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => ({
    code: '', name: '', registeredDate: localDate(), lastUpdateDate: '',
    groupMode: 'existing', groupId: '', groupCode: '', groupName: '', groupDate: localDate(), groupVersion: '',
    unitMode: 'existing', unitId: '', unitCode: '', unitName: '', unitDate: localDate(),
    metadataId: '', url: row.deliverableUrl || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRequirementMounted();
  const creatingService = !requirement.service;
  const groups = useRequirementCatalog('service-deliverable-groups', creatingService,
    (page) => servicesApi.listGroups({ page, pageSize: 100 }), ['/services/v0/groups']);
  const units = useRequirementCatalog('service-deliverable-units', creatingService,
    (page) => servicesApi.listApplicationUnits({ page, pageSize: 100 }), ['/services/v0/application_units']);
  const metadata = useRequirementCatalog('service-deliverable-metadata', true,
    (page) => servicesApi.listMetadata({ page, pageSize: 100 }), ['/services/v0/metadata']);
  const catalogs = [groups, units, metadata];
  const loading = catalogs.some((v) => v.loading);
  const errors = catalogs.map((v) => v.error).filter((v): v is string => v !== null);
  const close = () => { if (!saving) onClose(); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const url = draft.url.trim();
    if (loading || errors.length || !metadata.items.some((v) => v.id === Number(draft.metadataId) && v.isActive)) {
      setError('Selecciona una metadata activa y espera a que se carguen los catalogos.'); return;
    }
    if (!validDeliverableUrl(url)) { setError('Indica una URL HTTP o HTTPS absoluta, de hasta 2048 caracteres.'); return; }
    let service: ServiceRegistration;
    if (requirement.service) {
      service = { id: requirement.service.id };
    } else {
      if (!validText(draft.code, 100) || !validText(draft.name, 255) || !draft.registeredDate
        || (draft.lastUpdateDate && draft.lastUpdateDate < draft.registeredDate)) {
        setError('Revisa el codigo, nombre y fechas del servicio.'); return;
      }
      if (!['existing', 'new'].includes(draft.groupMode) || !['existing', 'new'].includes(draft.unitMode)) {
        setError('Selecciona como relacionar el grupo y la unidad aplicativa.'); return;
      }
      if (draft.groupMode === 'existing'
        ? !groups.items.some((v) => v.id === Number(draft.groupId) && v.isActive)
        : !validText(draft.groupCode, 100) || !validText(draft.groupName, 255) || !draft.groupDate || !validText(draft.groupVersion, 50)) {
        setError('Selecciona un grupo activo o completa los datos del nuevo grupo.'); return;
      }
      if (draft.unitMode === 'existing'
        ? !units.items.some((v) => v.id === Number(draft.unitId) && v.isActive)
        : !validText(draft.unitCode, 50) || !validText(draft.unitName, 255) || !draft.unitDate) {
        setError('Selecciona una unidad activa o completa los datos de la nueva unidad.'); return;
      }
      service = {
        code: draft.code.trim(), name: draft.name.trim(), registeredDate: draft.registeredDate,
        lastUpdateDate: draft.lastUpdateDate || undefined,
        group: draft.groupMode === 'existing' ? { id: Number(draft.groupId) }
          : { code: draft.groupCode.trim(), name: draft.groupName.trim(), registeredDate: draft.groupDate, version: draft.groupVersion.trim() },
        applicationUnit: draft.unitMode === 'existing' ? { id: Number(draft.unitId) }
          : { code: draft.unitCode.trim(), name: draft.unitName.trim(), registeredDate: draft.unitDate },
      };
    }
    setSaving(true); setError(null);
    try {
      const result = await requirementsApi.completeServiceDeliverable(companyId, branchId, requirement.id, row.id,
        { service, metadata: { id: Number(draft.metadataId) }, deliverableUrl: url });
      if (!result) throw new Error('La API no devolvio el entregable finalizado.');
      if (mounted.current) onSaved();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo registrar el servicio y finalizar el alcance.');
    } finally { if (mounted.current) setSaving(false); }
  }

  return <ResourceModal open title={`Finalizar entregable de servicio · ${row.scope.name}`} dismissible={!saving} onClose={close}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <p className="muted">Se guarda el servicio, su metadata y el entregable, y se finalizan el alcance y su responsable vigente en una sola operacion.
        Cancelar no crea registros. La misma URL se conserva en el alcance y en el detalle de la metadata.</p>
      {requirement.service ? <p className="muted">Servicio relacionado: <strong>{requirement.service.code} · {requirement.service.name}</strong>.
        Se utiliza este servicio sin reemplazarlo. Si la metadata ya esta relacionada, se actualiza su detalle y se reactiva sin duplicarla.</p> : <>
        <fieldset className="requirements-checklist" disabled={saving}><legend>Nuevo servicio</legend>
          <Field label="Codigo del servicio" required maxLength={100} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <Field label="Nombre del servicio" required maxLength={255} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Field label="Fecha de registro del servicio" required type="date" value={draft.registeredDate}
            onChange={(e) => setDraft({ ...draft, registeredDate: e.target.value })} />
          <Field label="Ultima actualizacion (opcional)" type="date" min={draft.registeredDate} value={draft.lastUpdateDate}
            onChange={(e) => setDraft({ ...draft, lastUpdateDate: e.target.value })} />
        </fieldset>
        <fieldset className="requirements-checklist" disabled={saving}><legend>Grupo del servicio</legend>
          <SelectField label="Grupo" required value={draft.groupMode} options={[{ value: 'existing', label: 'Relacionar existente' }, { value: 'new', label: 'Nuevo +' }]}
            onChange={(e) => setDraft({ ...draft, groupMode: e.target.value })} />
          {draft.groupMode === 'existing' ? <SelectField label="Grupo existente" required value={draft.groupId} disabled={groups.loading}
            options={groups.items.filter((v) => v.isActive).map((v) => ({ value: v.id, label: `${v.code} · ${v.name} · ${v.version}` }))}
            onChange={(e) => setDraft({ ...draft, groupId: e.target.value })} /> : <>
            <Field label="Codigo del grupo" required maxLength={100} value={draft.groupCode} onChange={(e) => setDraft({ ...draft, groupCode: e.target.value })} />
            <Field label="Nombre del grupo" required maxLength={255} value={draft.groupName} onChange={(e) => setDraft({ ...draft, groupName: e.target.value })} />
            <Field label="Registro del grupo" required type="date" value={draft.groupDate} onChange={(e) => setDraft({ ...draft, groupDate: e.target.value })} />
            <Field label="Version del grupo" required maxLength={50} value={draft.groupVersion} onChange={(e) => setDraft({ ...draft, groupVersion: e.target.value })} />
          </>}
        </fieldset>
        <fieldset className="requirements-checklist" disabled={saving}><legend>Unidad aplicativa</legend>
          <SelectField label="Unidad aplicativa" required value={draft.unitMode} options={[{ value: 'existing', label: 'Relacionar existente' }, { value: 'new', label: 'Nuevo +' }]}
            onChange={(e) => setDraft({ ...draft, unitMode: e.target.value })} />
          {draft.unitMode === 'existing' ? <SelectField label="Unidad existente" required value={draft.unitId} disabled={units.loading}
            options={units.items.filter((v) => v.isActive).map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))}
            onChange={(e) => setDraft({ ...draft, unitId: e.target.value })} /> : <>
            <Field label="Codigo de la unidad" required maxLength={50} value={draft.unitCode} onChange={(e) => setDraft({ ...draft, unitCode: e.target.value })} />
            <Field label="Nombre de la unidad" required maxLength={255} value={draft.unitName} onChange={(e) => setDraft({ ...draft, unitName: e.target.value })} />
            <Field label="Registro de la unidad" required type="date" value={draft.unitDate} onChange={(e) => setDraft({ ...draft, unitDate: e.target.value })} />
          </>}
        </fieldset>
      </>}
      <SelectField label="Metadata del servicio" required disabled={saving || metadata.loading} value={draft.metadataId}
        options={metadata.items.filter((v) => v.isActive).map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))}
        onChange={(e) => setDraft({ ...draft, metadataId: e.target.value })} />
      <Field label="URL del entregable y detalle de metadata" type="url" required maxLength={2048} disabled={saving} value={draft.url}
        onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
      {[...errors, error].filter(Boolean).map((message, i) => <div key={i} className="alert error">{message}</div>)}
      {errors.length > 0 && <button className="button secondary" type="button" disabled={saving || loading}
        onClick={() => catalogs.forEach((v) => v.refresh())}>Reintentar catalogos</button>}
      <ModalActions onCancel={close} saving={saving} submitDisabled={loading || errors.length > 0} submitLabel="Guardar servicio y finalizar" />
    </form>
  </ResourceModal>;
}
