import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGlobalCompany } from '../../../../app/providers/company-context';
import { API_MUTATION_EVENT, type ApiMutationDetail } from '../../../../shared/api';
import { ActiveBadge, formatStateName } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { collaboratorsApi } from '../../../collaborators/infrastructure/api';
import { collaboratorFullName } from '../../../collaborators/presentation/collaborator-name';
import { projectsApi } from '../../../projects/infrastructure/api';
import { requirementPath, requirementsApi, type RequirementBoardCard } from '../../infrastructure/api/requirements-api';
import { useRequirementCatalog } from '../use-requirement-catalog';
import { RequirementDetails } from './requirements-section';

type Grouping = 'project' | 'collaborator' | 'stage' | 'state';
const workflowStates = ['Sin Asignar', 'Asignado', 'En Progreso', 'Bloqueado', 'Finalizado'];

function groupCards(cards: RequirementBoardCard[], grouping: Grouping) {
  const columns = new Map<string, { label: string; cards: RequirementBoardCard[] }>();
  if (grouping === 'state') workflowStates.forEach((label) => columns.set(label.toLowerCase(), { label, cards: [] }));
  for (const card of cards) {
    const r = card.requirement;
    const targets = grouping === 'project' ? [{ key: String(r.project.id), label: `${r.project.code} · ${r.project.name}` }]
      : grouping === 'stage' ? [{ key: String(r.currentStage?.id ?? 'none'), label: r.currentStage?.name ?? 'Sin etapa iniciada' }]
      : grouping === 'state' ? [{ key: r.state.name.trim().toLowerCase(), label: formatStateName(r.state.name) }]
      : card.owners.length ? [...new Map(card.owners.map(({ assignment }) =>
        [assignment.collaborator.id, { key: String(assignment.collaborator.id), label: collaboratorFullName(assignment.collaborator) }])).values()]
        : [{ key: 'none', label: 'Sin responsable' }];
    for (const { key, label } of targets) {
      const column = columns.get(key) ?? { label, cards: [] };
      column.cards.push(card);
      columns.set(key, column);
    }
  }
  return [...columns.entries()].map(([key, column]) => ({ key, ...column }));
}

export function RequirementsBoardPage() {
  const { selectedCompanyId: companyId, selectedBranchId: branchId } = useGlobalCompany();
  return <main className="requirements-board-page">
    {companyId && branchId ? <RequirementsBoard key={`${companyId}:${branchId}`} companyId={companyId} branchId={branchId} />
      : <div className="empty-state">Selecciona una compania y un Branch en la barra superior.</div>}
  </main>;
}

function RequirementsBoard({ companyId, branchId }: { companyId: number; branchId: number }) {
  const [grouping, setGrouping] = useState<Grouping>('state');
  const [draft, setDraft] = useState({ projectId: '', collaboratorId: '', serviceCode: '' });
  const [filters, setFilters] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const path = requirementPath(companyId, branchId);
  const cards = useRequirementCatalog(`requirement-board:${path}:${JSON.stringify(filters)}`, true,
    (page) => requirementsApi.board(companyId, branchId, { page, pageSize: 100,
      projectId: filters.projectId ? Number(filters.projectId) : undefined,
      collaborator_id: filters.collaboratorId ? Number(filters.collaboratorId) : undefined,
      'service.code': filters.serviceCode || undefined }));
  const projects = useRequirementCatalog(`requirement-board-projects:${companyId}`, true,
    (page) => projectsApi.listProjects({ 'company.id': companyId, page, pageSize: 100 }), ['/projects/v0/projects']);
  const people = useRequirementCatalog(`requirement-board-people:${companyId}`, true,
    (page) => collaboratorsApi.listCollaborators({ 'company.id': companyId, page, pageSize: 100 }), ['/collaborators/v0/collaborators']);
  useEffect(() => {
    function onMutation(event: Event) {
      const mutation = (event as CustomEvent<ApiMutationDetail>).detail.path;
      if (mutation === path || mutation.startsWith(`${path}/`) || mutation.startsWith('/projects/v0/projects')
        || mutation.startsWith('/collaborators/v0/collaborators') || mutation.startsWith('/requirements/v0/scopes')) cards.refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, [path, cards.refresh]);
  const columns = groupCards(cards.items, grouping);
  const selected = cards.items.find((v) => v.requirement.id === selectedId)?.requirement;
  const errors = [error, cards.error, projects.error, people.error].filter(Boolean);
  return <>
    <div className="section-heading"><div><p className="eyebrow">Seguimiento</p><h2>Tablero de requerimientos</h2>
      <p className="muted">Una tarjeta por requerimiento. El estado general se deriva de sus alcances; las tarjetas no cambian de estado al arrastrarlas.</p></div>
      <button className="button secondary" type="button" disabled={cards.loading}
        onClick={() => { cards.refresh(); projects.refresh(); people.refresh(); }}>Actualizar</button></div>
    <form className="management-filters" onSubmit={(event) => {
      event.preventDefault();
      if (draft.serviceCode.trim() && draft.serviceCode.trim().length < 3) { setError('service.code requiere al menos tres caracteres.'); return; }
      setError(null); setFilters({ ...draft, serviceCode: draft.serviceCode.trim() }); setSelectedId(null); cards.refresh();
    }}>
      <SelectField label="Agrupar por" required value={grouping} options={[
        { value: 'state', label: 'Estado general' }, { value: 'project', label: 'Proyecto' },
        { value: 'collaborator', label: 'Colaborador' }, { value: 'stage', label: 'Etapa / Scope' },
      ]} onChange={(event) => {
        const value = event.target.value;
        if (value === 'state' || value === 'project' || value === 'collaborator' || value === 'stage') setGrouping(value);
      }} />
      <SelectField label="Proyecto" value={draft.projectId} disabled={projects.loading}
        options={projects.items.map((v) => ({ value: v.id, label: `${v.code} · ${v.name}` }))}
        onChange={(e) => setDraft({ ...draft, projectId: e.target.value })} />
      <SelectField label="Persona asignada a un alcance" value={draft.collaboratorId} disabled={people.loading}
        options={people.items.map((v) => ({ value: v.id, label: `${v.code} · ${collaboratorFullName(v)}` }))}
        onChange={(e) => setDraft({ ...draft, collaboratorId: e.target.value })} />
      <Field label="service.code" value={draft.serviceCode} maxLength={100} onChange={(e) => setDraft({ ...draft, serviceCode: e.target.value })} />
      <div className="management-filter-actions"><button className="button primary" type="submit">Filtrar</button>
        <button className="button secondary" type="button" onClick={() => {
          const empty = { projectId: '', collaboratorId: '', serviceCode: '' };
          setDraft(empty); setFilters(empty); setError(null); setSelectedId(null); cards.refresh();
        }}>Limpiar</button></div>
    </form>
    {errors.map((message, i) => <div className="alert error" key={i}>{message}</div>)}
    {cards.loading && <p className="muted" role="status">Cargando requerimientos y responsables...</p>}
    {!cards.loading && !cards.error && <p className="muted">{cards.items.length} requerimientos.
      {grouping === 'collaborator' && ' Una tarjeta aparece en cada colaborador con un alcance vigente, sin duplicarse dentro de su columna.'}</p>}
    {!cards.loading && !cards.error && !cards.items.length && <div className="empty-state">No hay requerimientos para estos filtros.</div>}
    {!cards.error && <div className="requirements-board-columns" aria-label="Columnas del tablero">
      {columns.map((column) => <section className="requirements-board-column" key={column.key}>
        <h3>{column.label} <span className="badge">{column.cards.length}</span></h3>
        {column.cards.map((card) => <BoardCard key={card.requirement.id} card={card} onDetails={() => setSelectedId(card.requirement.id)} />)}
        {!column.cards.length && <p className="muted">Sin requerimientos</p>}
      </section>)}
    </div>}
    {selected && createPortal(<ResourceModal open title={`Requerimiento #${selected.id}`} onClose={() => setSelectedId(null)}>
      <RequirementDetails requirement={selected} companyId={companyId} branchId={branchId} />
    </ResourceModal>, document.body)}
  </>;
}

function BoardCard({ card: { requirement: r, owners }, onDetails }: { card: RequirementBoardCard; onDetails: () => void }) {
  const people = [...new Map(owners.map(({ assignment }) =>
    [assignment.collaborator.id, collaboratorFullName(assignment.collaborator)])).values()];
  return <article className="requirement-board-card">
    <div className="requirement-board-card-heading"><strong>#{r.id}</strong><ActiveBadge active={r.isActive} /></div>
    <h4>{r.project.code} · {r.project.name}</h4>
    <p>{r.description}</p>
    <dl>
      <dt>Estado general</dt><dd>{formatStateName(r.state.name)}</dd>
      <dt>Etapa Actual</dt><dd>{r.currentStage?.name || 'Sin etapa iniciada'}</dd>
      <dt>Personas asignadas</dt><dd>{people.length ? people.join(', ') : 'Sin responsable'}</dd>
      <dt>Complejidad</dt><dd>{r.complexity.name}</dd>
      <dt>Servicio</dt><dd>{r.service ? `${r.service.code} · ${r.service.name}` : 'No relacionado'}</dd>
      <dt>Registro</dt><dd>{r.registeredDate}</dd>
      {r.completionDate && <><dt>Finalizacion</dt><dd>{r.completionDate}</dd></>}
    </dl>
    {owners.length > 0 && <details><summary>Responsables por alcance ({owners.length})</summary>
      <ul>{owners.map((owner) => <li key={owner.scopeLinkId}><strong>{owner.scope.name}</strong>
        <p>{collaboratorFullName(owner.assignment.collaborator)} · {owner.assignment.role.name}</p>
        <p>{formatStateName(owner.state.name)} · Asignacion: {owner.assignment.assignedDate}
          {owner.assignment.completionDate && ` · Finalizacion: ${owner.assignment.completionDate}`}</p>
      </li>)}</ul>
    </details>}
    <button className="button secondary" type="button" onClick={onDetails}>Ver alcances e historial</button>
  </article>;
}
