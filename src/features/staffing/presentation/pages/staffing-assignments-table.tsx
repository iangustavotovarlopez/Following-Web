import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { ManagementTable } from '../../../../shared/components/management-table';
import { RowActions } from '../../../../shared/components/row-actions';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { staffingApi, type Staffing, type StaffingAssignment } from '../../infrastructure/api/staffing-api';
import { referenceLabel, useStaffingCatalog } from '../staffing-fields';
import { StaffingAssignmentModal } from './staffing-assignment-modal';

export function StaffingAssignmentsTable({ staffing }: { staffing: Staffing }) {
  const assignments = useStaffingCatalog(`assignments:${staffing.id}`, true,
    (page) => staffingApi.listAssignments(staffing.id, { page, pageSize: 100, includeInactive: true }));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffingAssignment>();
  const [deleting, setDeleting] = useState<number>();
  const [error, setError] = useState<string | null>(null);
  const path = `/staffing/v0/staffing/${staffing.id}/assignments`;
  useEffect(() => {
    const handleMutation = (event: Event) => {
      const changed = (event as CustomEvent<ApiMutationDetail>).detail.path;
      if (changed === path || changed.startsWith(`${path}/`)) assignments.refresh();
    };
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, [path, assignments.refresh]);
  async function remove(item: StaffingAssignment) {
    if (deleting !== undefined || !item.isActive || !window.confirm(`¿Desactivar la asignación de "${collaboratorFullName(item.collaborator)}"?`)) return;
    setDeleting(item.id); setError(null);
    try { await staffingApi.deleteAssignment(staffing.id, item.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo desactivar la asignación.'); }
    finally { setDeleting(undefined); }
  }
  const columns: TableColumn<StaffingAssignment>[] = [
    { key: 'collaborator', label: 'Colaborador', render: (item) => `${item.collaborator.code} · ${collaboratorFullName(item.collaborator)}` },
    { key: 'type', label: 'Tipo de asignación', render: (item) => item.assignmentType.name },
    { key: 'role', label: 'Rol', render: (item) => referenceLabel(item.role) },
    { key: 'capacity', label: 'Capacidad', render: (item) => `${item.capacity.toLocaleString('es')}%` },
    { key: 'active', label: 'Actividad', render: (item) => <ActiveBadge active={item.isActive} /> },
    { key: 'actions', label: 'Acciones', render: (item) => <RowActions onEdit={() => setEditing(item)} onDelete={() => void remove(item)} deleteDisabled={!item.isActive || deleting !== undefined} /> },
  ];
  return <div className="team-inline-details" id={`staffing-assignments-${staffing.id}`}>
    <section className="resource-section">
      <div className="section-heading"><div><p className="eyebrow">Detalle de staffing</p><h3>Asignaciones</h3>
        <p className="muted">Activas e inactivas. Eliminar conserva al colaborador y el historial.</p></div>
        <div className="management-filter-actions">
          {assignments.error && <button className="button secondary" type="button" onClick={assignments.refresh}>Reintentar</button>}
          <button className="button primary" type="button" disabled={!staffing.isActive || !staffing.project.company?.id || assignments.loading || !!assignments.error}
            onClick={() => setAdding(true)}>Añadir +</button>
        </div>
      </div>
      {!staffing.project.company?.id && <div className="alert warning">Actualiza el backend y las rutinas V1 para obtener la compañía del proyecto antes de añadir asignaciones.</div>}
      {error && <div className="alert error">{error}</div>}
      <ManagementTable columns={columns} rows={assignments.items} loading={assignments.loading} error={assignments.error}
        rowKey={(item) => item.id} emptyMessage="Esta solicitud aún no tiene asignaciones." />
    </section>
    {(adding || editing) && createPortal(<StaffingAssignmentModal staffing={staffing} assignments={assignments.items} editing={editing}
      onClose={() => { setAdding(false); setEditing(undefined); }} onSaved={() => { setAdding(false); setEditing(undefined); }} />, document.body)}
  </div>;
}

