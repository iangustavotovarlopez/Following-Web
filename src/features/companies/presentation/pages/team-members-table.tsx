import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { API_MUTATION_EVENT, loadCatalogPages, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { RowActions } from '../../../../shared/components/row-actions';
import { SelectField } from '../../../../shared/components/select-field';
import { companiesApi, type Team, type TeamMember } from '../../infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { collaboratorsApi, type Collaborator } from '../../../collaborators/infrastructure/api';

export function TeamMembersTable({ companyId, branchId, specialityId, team }: {
  companyId: number;
  branchId: number;
  specialityId: number;
  team: Team;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ joinDate: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const membersPath = `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${team.id}/members`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loadCatalogPages((page) => companiesApi.listTeamMembers(
      companyId, branchId, specialityId, team.id, { page, pageSize: 100, includeInactive: true },
    )).then((items) => {
      if (active) setMembers(items);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los miembros del equipo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [companyId, branchId, specialityId, team.id, revision]);

  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path === membersPath || path.startsWith(`${membersPath}/`)) {
        setRevision((current) => current + 1);
      }
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, [membersPath]);

  function openEditor(member: TeamMember) {
    setEditing(member);
    setDraft({ joinDate: member.joinDate ?? '', isActive: member.isActive });
    setFormError(null);
  }

  function closeEditor() {
    if (!saving) setEditing(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!editing || !draft.joinDate) {
      setFormError('Indica la fecha de ingreso del integrante.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const updated = await companiesApi.patchTeamMember(
        companyId, branchId, specialityId, team.id, editing.id, draft,
      );
      if (!updated) throw new Error('La API no devolvió el integrante actualizado.');
      setEditing(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo actualizar el integrante.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(member: TeamMember) {
    if (deletingId !== null || !member.isActive
      || !window.confirm(`¿Deseas desactivar a "${collaboratorFullName(member.collaborator)}" en este equipo?`)) return;
    setDeletingId(member.id);
    setActionError(null);
    try {
      await companiesApi.deleteTeamMember(companyId, branchId, specialityId, team.id, member.id);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo desactivar el integrante.');
    } finally {
      setDeletingId(null);
    }
  }

  const columns: TableColumn<TeamMember>[] = [
    { key: 'code', label: 'Código', render: (member) => member.collaborator.code },
    { key: 'name', label: 'Colaborador', render: (member) => collaboratorFullName(member.collaborator) },
    { key: 'joinDate', label: 'Fecha de ingreso', render: (member) => member.joinDate ?? 'No informado' },
    { key: 'active', label: 'Estado', render: (member) => <ActiveBadge active={member.isActive} /> },
    {
      key: 'actions', label: 'Acciones', render: (member) => (
        <RowActions onEdit={() => openEditor(member)} onDelete={() => void remove(member)}
          deleteDisabled={!member.isActive || deletingId !== null} />
      ),
    },
  ];

  return (
    <div className="team-inline-details" id={`team-members-${team.id}`}>
      <section className="resource-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detalle del equipo</p>
            <h2>Miembros de {team.name}</h2>
            <p className="muted">Integrantes activos e inactivos. Eliminar desactiva la relación sin borrar al colaborador.</p>
          </div>
          <div className="management-filter-actions">
            {error && <button className="button secondary" type="button"
              onClick={() => setRevision((current) => current + 1)}>Reintentar</button>}
            <button className="button primary" type="button" disabled={!team.isActive || loading || Boolean(error)}
              onClick={() => setAdding(true)}>Añadir +</button>
          </div>
        </div>
        {!team.isActive && <div className="company-scope-hint">No se pueden añadir integrantes a un equipo inactivo.</div>}
        {members.some((member) => !member.joinDate) && (
          <div className="alert warning">Hay fechas de ingreso no informadas. Actualiza el backend y el esquema V1 para consultar y editar este campo.</div>
        )}
        {actionError && <div className="alert error">{actionError}</div>}
        <ManagementTable columns={columns} rows={members} loading={loading} error={error}
          rowKey={(member) => member.id} emptyMessage="Este equipo aún no tiene miembros asignados." />
      </section>
      {adding && createPortal(
        <TeamMemberAssignmentModal companyId={companyId} branchId={branchId} specialityId={specialityId}
          team={team} members={members} membersLoading={loading} membersError={error}
          onClose={() => setAdding(false)} />,
        document.body,
      )}
      {editing && createPortal(
        <ResourceModal open title="Editar integrante del equipo" onClose={closeEditor}>
          <form className="modal-form" onSubmit={(event) => void submit(event)}>
            <p className="muted">Colaborador: {editing.collaborator.code} · {collaboratorFullName(editing.collaborator)}</p>
            <Field label="Fecha de ingreso" type="date" value={draft.joinDate} required disabled={saving}
              onChange={(event) => setDraft({ ...draft, joinDate: event.target.value })} />
            <SelectField label="Estado" value={String(draft.isActive)} disabled={saving}
              options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.value === 'true' })} />
            {!team.isActive && !editing.isActive && (
              <span className="muted">No se pueden reactivar integrantes mientras el equipo esté inactivo.</span>
            )}
            {formError && <div className="alert error">{formError}</div>}
            <ModalActions onCancel={closeEditor} saving={saving} submitLabel="Guardar cambios"
              submitDisabled={!draft.joinDate || (!team.isActive && !editing.isActive && draft.isActive)} />
          </form>
        </ResourceModal>,
        document.body,
      )}
    </div>
  );
}

function TeamMemberAssignmentModal({ companyId, branchId, specialityId, team, members,
  membersLoading, membersError, onClose }: {
  companyId: number;
  branchId: number;
  specialityId: number;
  team: Team;
  members: TeamMember[];
  membersLoading: boolean;
  membersError: string | null;
  onClose: () => void;
}) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [joinDate, setJoinDate] = useState(() => {
    const today = new Date();
    return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')].join('-');
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError(null);
    void loadCatalogPages((page) => collaboratorsApi.listCollaborators({
      'company.id': companyId, page, pageSize: 100,
    })).then((items) => {
      if (active) setCollaborators(items);
    }).catch((cause) => {
      if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudieron consultar los colaboradores.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [companyId, revision]);

  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (/^\/collaborators\/v0\/collaborators(?:\/\d+)?$/.test(path)) {
        setRevision((current) => current + 1);
      }
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, []);

  const activeIds = new Set(members.filter((member) => member.isActive).map((member) => member.collaborator.id));
  const available = collaborators.filter((collaborator) => collaborator.company.id === companyId
    && collaborator.state.name.trim().toUpperCase() !== 'INACTIVO' && !activeIds.has(collaborator.id));
  const selected = available.find((collaborator) => collaborator.id === selectedId);
  const normalizedQuery = query.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const matches = normalizedQuery.length < 3 ? [] : available.filter((collaborator) =>
    collaborator.code.toLocaleLowerCase('es').includes(normalizedQuery)
    || collaboratorFullName(collaborator).toLocaleLowerCase('es').includes(normalizedQuery));
  const reactivating = selected && members.some((member) => !member.isActive && member.collaborator.id === selected.id);
  const blocked = loading || Boolean(catalogError) || membersLoading || Boolean(membersError) || !team.isActive;

  function close() {
    if (!saving) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (blocked || !selected || !joinDate) {
      setFormError('Selecciona un colaborador disponible y su fecha de ingreso.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const assigned = await companiesApi.createTeamMember(companyId, branchId, specialityId, team.id, {
        collaborator: { id: selected.id }, joinDate,
      });
      if (!assigned) throw new Error('La API no devolvió el integrante asignado.');
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo añadir el integrante al equipo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourceModal open title="Añadir integrante al equipo" onClose={close}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <p className="muted">Equipo: {team.name}. Sólo se muestran colaboradores disponibles de su compañía.</p>
        <Field label="Buscar colaborador por código o nombre" value={query} autoComplete="off"
          placeholder="Escribe al menos 3 caracteres" disabled={saving}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId(undefined);
            setFormError(null);
          }} />
        {loading && <span className="muted">Cargando colaboradores...</span>}
        {catalogError && <div className="alert error">{catalogError}</div>}
        {catalogError && <button className="button secondary" type="button"
          onClick={() => setRevision((current) => current + 1)}>Reintentar colaboradores</button>}
        {membersError && <div className="alert error">No se pudieron verificar los miembros del equipo: {membersError}</div>}
        {!loading && !catalogError && normalizedQuery.length >= 3 && !selected && (
          <ul className="team-member-search-results" aria-label="Colaboradores encontrados">
            {matches.length === 0 && <li className="search-feedback">No hay colaboradores disponibles que coincidan con la búsqueda.</li>}
            {matches.map((collaborator) => (
              <li key={collaborator.id}>
                <button className="role-search-option" type="button" disabled={saving}
                  onClick={() => {
                    setSelectedId(collaborator.id);
                    setFormError(null);
                  }}>
                  <strong>{collaborator.code}</strong>
                  <span>{collaboratorFullName(collaborator)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && <div className="search-selection">
          <strong>{collaboratorFullName(selected)}</strong><span>{selected.code}</span>
          <button className="button secondary" type="button" disabled={saving}
            onClick={() => setSelectedId(undefined)}>Cambiar colaborador</button>
        </div>}
        {reactivating && <span className="muted">La relación existente está inactiva. Añadir la reactivará con la fecha indicada.</span>}
        <Field label="Fecha de ingreso" type="date" value={joinDate} required disabled={saving}
          onChange={(event) => setJoinDate(event.target.value)} />
        {formError && <div className="alert error">{formError}</div>}
        <ModalActions onCancel={close} saving={saving} submitLabel="Añadir al equipo"
          submitDisabled={blocked || !selected || !joinDate} />
      </form>
    </ResourceModal>
  );
}
