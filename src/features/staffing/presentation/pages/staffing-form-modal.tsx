import { useState, type FormEvent } from 'react';
import { Field } from '../../../../shared/components/field';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { formatStateName } from '../../../../shared/components/api-section';
import { projectsApi } from '../../../projects/infrastructure/api';
import { staffingApi, type CreateStaffingRequest } from '../../infrastructure/api/staffing-api';
import { emptySelection, idOf, StaffingScopeFields, useStaffingCatalog } from '../staffing-fields';

export function StaffingFormModal({ companyId, branchId, onClose, onSaved }: {
  companyId: number; branchId: number; onClose: () => void; onSaved: () => void;
}) {
  const [selection, setSelection] = useState(emptySelection);
  const [request, setRequest] = useState('');
  const [stateId, setStateId] = useState('');
  const [registeredDate, setRegisteredDate] = useState(() => {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projects = useStaffingCatalog(`projects:${companyId}`, true,
    (page) => projectsApi.listProjects({ 'company.id': companyId, page, pageSize: 100 }));
  const states = useStaffingCatalog('staffing-states', true,
    (page) => staffingApi.listStates({ isActive: true, page, pageSize: 100 }));
  const valid = Object.values(selection).every(Boolean) && !!stateId && !!registeredDate && !!request.trim()
    && projects.items.some((item) => item.id === idOf(selection.projectId) && item.company.id === companyId)
    && states.items.some((item) => item.id === idOf(stateId) && item.isActive);
  const blocked = projects.loading || states.loading || !!projects.error || !!states.error;
  const close = () => { if (!saving) onClose(); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!valid || blocked) { setError('Completa los campos y selecciona recursos de la compañía y branch actuales.'); return; }
    const body: CreateStaffingRequest = {
      project: { id: Number(selection.projectId) }, period: { id: Number(selection.periodId) },
      subperiod: { id: Number(selection.subperiodId) }, section: { id: Number(selection.sectionId) },
      fraction: { id: Number(selection.fractionId) }, speciality: { id: Number(selection.specialityId) },
      request: request.trim(), state: { id: Number(stateId) }, registeredDate,
    };
    setSaving(true); setError(null);
    try {
      const created = await staffingApi.createStaffing(body);
      if (!created) throw new Error('La API no devolvió la solicitud creada.');
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la solicitud.'); }
    finally { setSaving(false); }
  }
  return <ResourceModal open title="Nueva solicitud de staffing" onClose={close} dismissible={!saving}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      <StaffingScopeFields value={selection} onChange={setSelection} companyId={companyId} branchId={branchId}
        projects={projects.items} disabled={saving || blocked} required />
      <Field label="Solicitud" value={request} onChange={(event) => setRequest(event.target.value)} required disabled={saving} />
      <SelectField label="Estado de staffing" value={stateId} onChange={(event) => setStateId(event.target.value)} required disabled={saving || blocked}
        options={states.items.filter((item) => item.isActive).map((item) => ({ value: item.id, label: formatStateName(item.name) }))} />
      <Field label="Fecha de registro" type="date" value={registeredDate} onChange={(event) => setRegisteredDate(event.target.value)} required disabled={saving} />
      <p className="muted">La capacidad se registra al asignar colaboradores, no al crear la solicitud.</p>
      {[projects, states].filter((catalog) => catalog.error).map((catalog) => <div key={catalog.key} className="alert error">{catalog.error}
        <button type="button" className="button secondary" onClick={catalog.refresh}>Reintentar</button></div>)}
      {error && <div className="alert error">{error}</div>}
      <ModalActions onCancel={close} saving={saving} submitLabel="Crear solicitud" submitDisabled={blocked || !valid} />
    </form>
  </ResourceModal>;
}
