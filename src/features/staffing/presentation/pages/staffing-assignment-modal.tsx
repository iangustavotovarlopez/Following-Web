import { useState, type FormEvent } from 'react';
import { Field } from '../../../../shared/components/field';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { collaboratorsApi } from '../../../collaborators/infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { staffingApi, type Staffing, type StaffingAssignment, type PatchStaffingAssignmentRequest } from '../../infrastructure/api/staffing-api';
import { useStaffingCatalog } from '../staffing-fields';

export function StaffingAssignmentModal({ staffing, assignments, editing, onClose, onSaved }: {
  staffing: Staffing; assignments: StaffingAssignment[]; editing?: StaffingAssignment; onClose: () => void; onSaved: () => void;
}) {
  const companyId = staffing.project.company?.id;
  const [query, setQuery] = useState('');
  const [collaboratorId, setCollaboratorId] = useState(editing ? String(editing.collaborator.id) : '');
  const [typeId, setTypeId] = useState(editing ? String(editing.assignmentType.id) : '');
  const [roleId, setRoleId] = useState(editing ? String(editing.role.id) : '');
  const [capacity, setCapacity] = useState(editing ? String(editing.capacity) : '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const people = useStaffingCatalog(`collaborators:${companyId}`, !editing && !!companyId,
    (page) => collaboratorsApi.listCollaborators({ 'company.id': companyId, page, pageSize: 100 }));
  const types = useStaffingCatalog('assignment-types', true, (page) => staffingApi.listAssignmentTypes({ page, pageSize: 100 }));
  const roles = useStaffingCatalog('roles', true, (page) => collaboratorsApi.listRoles({ page, pageSize: 100 }));
  const activePerson = (person: StaffingAssignment['collaborator']) => person.state.isActive && person.state.name.trim().toUpperCase() !== 'INACTIVO';
  const available = people.items.filter((person) => person.company.id === companyId && activePerson(person));
  const normalized = query.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const matches = normalized.length >= 3 ? available.filter((person) => person.code.toLocaleLowerCase('es').includes(normalized)
    || collaboratorFullName(person).toLocaleLowerCase('es').includes(normalized)) : [];
  const person = editing?.collaborator ?? available.find((item) => item.id === Number(collaboratorId));
  const usedCents = assignments.filter((item) => item.isActive && item.id !== editing?.id && item.collaborator.id === Number(collaboratorId))
    .reduce((sum, item) => sum + Math.round(item.capacity * 100), 0);
  const remaining = (10000 - usedCents) / 100;
  const percentage = capacity === '' ? NaN : Number(capacity);
  const validPercentage = /^\d+(?:\.\d{1,2})?$/.test(capacity) && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
  const duplicate = assignments.find((item) => item.id !== editing?.id && item.collaborator.id === Number(collaboratorId)
    && item.assignmentType.id === Number(typeId) && item.role.id === Number(roleId));
  const changedIdentity = editing && (Number(typeId) !== editing.assignmentType.id || Number(roleId) !== editing.role.id);
  const needsEligibility = !editing || (isActive && (!editing.isActive || changedIdentity));
  const selectedType = types.items.find((item) => item.id === Number(typeId)) ?? (editing?.assignmentType.id === Number(typeId) ? editing.assignmentType : undefined);
  const selectedRole = roles.items.find((item) => item.id === Number(roleId)) ?? (editing?.role.id === Number(roleId) ? editing.role : undefined);
  const blocked = people.loading || types.loading || roles.loading || !!people.error || !!types.error || !!roles.error;
  const exceedsLimit = isActive && validPercentage && usedCents + Math.round(percentage * 100) > 10000;
  const conflict = duplicate && (editing || duplicate.isActive);
  const valid = !!person && !!selectedType && !!selectedRole && validPercentage && !exceedsLimit && !conflict
    && (!needsEligibility || (staffing.isActive && activePerson(person) && selectedType.isActive && selectedRole.isActive));
  const close = () => { if (!saving) onClose(); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!valid || blocked) { setError('Verifica el colaborador, tipo, rol y capacidad disponible.'); return; }
    setSaving(true); setError(null);
    try {
      let saved: StaffingAssignment | null;
      if (editing) {
        const body: PatchStaffingAssignmentRequest = {};
        if (Number(typeId) !== editing.assignmentType.id) body.assignmentType = { id: Number(typeId) };
        if (Number(roleId) !== editing.role.id) body.role = { id: Number(roleId) };
        if (percentage !== editing.capacity) body.capacity = percentage;
        if (isActive !== editing.isActive) body.isActive = isActive;
        if (Object.keys(body).length === 0) throw new Error('No hay cambios para guardar.');
        saved = await staffingApi.patchAssignment(staffing.id, editing.id, body);
      } else saved = await staffingApi.createAssignment(staffing.id, {
        collaborator: { id: Number(collaboratorId) }, assignmentType: { id: Number(typeId) }, role: { id: Number(roleId) }, capacity: percentage,
      });
      if (!saved) throw new Error('La API no devolvió la asignación guardada.');
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la asignación.'); }
    finally { setSaving(false); }
  }
  const typeOptions = types.items.filter((item) => item.isActive || item.id === editing?.assignmentType.id)
    .map((item) => ({ value: item.id, label: item.name }));
  if (editing && !typeOptions.some((item) => item.value === editing.assignmentType.id)) typeOptions.push({ value: editing.assignmentType.id, label: editing.assignmentType.name });
  const roleOptions = roles.items.filter((item) => item.isActive || item.id === editing?.role.id)
    .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));
  if (editing && !roleOptions.some((item) => item.value === editing.role.id)) roleOptions.push({ value: editing.role.id, label: editing.role.name });
  return <ResourceModal open title={editing ? 'Editar asignación de staffing' : 'Añadir asignación de staffing'} onClose={close} dismissible={!saving}>
    <form className="modal-form" onSubmit={(event) => void submit(event)}>
      {editing ? <p className="muted">Colaborador: {editing.collaborator.code} · {collaboratorFullName(editing.collaborator)}</p> : <>
        <Field label="Buscar colaborador por código o nombre" value={query} placeholder="Al menos 3 caracteres" disabled={saving}
          onChange={(event) => { setQuery(event.target.value); setCollaboratorId(''); }} />
        <SelectField label="Colaborador" value={collaboratorId} required disabled={saving || people.loading || !!people.error}
          options={matches.map((item) => ({ value: item.id, label: `${item.code} · ${collaboratorFullName(item)}` }))}
          onChange={(event) => setCollaboratorId(event.target.value)} />
        {!people.loading && !people.error && normalized.length >= 3 && matches.length === 0 && <p className="muted">No hay colaboradores disponibles que coincidan.</p>}
      </>}
      <SelectField label="Tipo de asignación" value={typeId} required options={typeOptions} disabled={saving || types.loading || !!types.error} onChange={(event) => setTypeId(event.target.value)} />
      <SelectField label="Rol" value={roleId} required options={roleOptions} disabled={saving || roles.loading || !!roles.error} onChange={(event) => setRoleId(event.target.value)} />
      <div className="management-filter-actions" aria-label="Capacidades rápidas">
        {[25, 35, 50, 100].map((value) => <button key={value} className="button secondary" type="button" disabled={saving} onClick={() => setCapacity(String(value))}>{value}%</button>)}
      </div>
      <Field label="Capacidad (%)" type="number" min="0" max="100" step="0.01" value={capacity} required disabled={saving} onChange={(event) => setCapacity(event.target.value)} />
      {!!collaboratorId && <p className="muted">Disponible en esta solicitud: {remaining.toLocaleString('es')}%. Máximo activo total por colaborador: 100%.</p>}
      {editing && <SelectField label="Actividad" value={String(isActive)} disabled={saving} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
        onChange={(event) => setIsActive(event.target.value === 'true')} />}
      {exceedsLimit && <div className="alert error">La suma de asignaciones activas del colaborador superaría el 100%.</div>}
      {conflict && <div className="alert error">Ya existe una relación con el mismo colaborador, tipo y rol.</div>}
      {!editing && duplicate && !duplicate.isActive && <p className="muted">Añadir reactivará la relación existente y actualizará su capacidad.</p>}
      {needsEligibility && !staffing.isActive && <div className="alert error">La solicitud está inactiva; no se pueden añadir ni reactivar asignaciones.</div>}
      {[people, types, roles].filter((catalog) => catalog.error).map((catalog) => <div className="alert error" key={catalog.key}>{catalog.error}
        <button type="button" className="button secondary" onClick={catalog.refresh}>Reintentar</button></div>)}
      {error && <div className="alert error">{error}</div>}
      <ModalActions onCancel={close} saving={saving} submitLabel={editing ? 'Guardar cambios' : 'Añadir asignación'} submitDisabled={blocked || !valid} />
    </form>
  </ResourceModal>;
}
