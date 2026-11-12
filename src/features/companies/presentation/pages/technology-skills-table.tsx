import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { API_MUTATION_EVENT, loadCatalogPages, type ApiMutationDetail, type PageResponse } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { companiesApi, type Skill, type SkillLevel, type Technology } from '../../infrastructure/api';

function useTechnologyDetails<T>(path: string, request: (page: number) => Promise<PageResponse<T> | null>) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const [state, setState] = useState<{
    path: string; revision: number; rows: T[]; loading: boolean; error: string | null;
  }>({ path, revision, rows: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    const loader = requestRef.current;
    setState({ path, revision, rows: [], loading: true, error: null });
    void loadCatalogPages(loader).then((rows) => {
      if (active) setState({ path, revision, rows, loading: false, error: null });
    }).catch((cause) => {
      if (active) setState({ path, revision, rows: [], loading: false,
        error: cause instanceof Error ? cause.message : 'No se pudieron consultar los detalles de la tecnología.' });
    });
    return () => { active = false; };
  }, [path, revision]);

  useEffect(() => {
    function onMutation(event: Event) {
      const { path: changedPath } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (changedPath === path) refresh();
    }
    window.addEventListener(API_MUTATION_EVENT, onMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, onMutation);
  }, [path, refresh]);

  if (state.path !== path || state.revision !== revision) {
    return { rows: [], loading: true, error: null, refresh };
  }
  return { rows: state.rows, loading: state.loading, error: state.error, refresh };
}

export function CatalogDetailsToggle({ expanded, controls, label, onClick }: {
  expanded: boolean; controls: string; label: string; onClick: () => void;
}) {
  return (
    <button className="row-action-button details" type="button" aria-expanded={expanded}
      aria-controls={controls} aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} ${label}`}
      title={`Más detalles: ${label}`} onClick={onClick}>
      <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
        <path d="M3 4h18v13H3zM3 9h18M9 4v13M16 20l3-3 3 3" />
      </svg>
    </button>
  );
}

export function TechnologySkillsTable({ companyId, branchId, technology }: {
  companyId: number; branchId: number; technology: Technology;
}) {
  const path = `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technology.id}/skills`;
  const skills = useTechnologyDetails<Skill>(path,
    (page) => companiesApi.listSkills(companyId, branchId, technology.id, { page, pageSize: 100 }));
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  function toggleLevels(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const columns: TableColumn<Skill>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'description', label: 'Descripción', render: (item) => item.description || 'No informada' },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
    { key: 'levels', label: 'Acciones', render: (item) => (
      <CatalogDetailsToggle expanded={expanded.has(item.id)} controls={`technology-${technology.id}-skill-${item.id}-levels`}
        label={`niveles de ${item.name}`} onClick={() => toggleLevels(item.id)} />
    ) },
  ];

  return (
    <div className="technology-inline-details" id={`technology-${technology.id}-skills`}>
      <section className="resource-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{technology.code} · {technology.name}</p>
            <h2>Habilidades</h2>
            <p className="muted">Habilidades relacionadas con esta tecnología. Abre sus detalles para consultar los niveles.</p>
          </div>
          <div className="management-filter-actions">
            {skills.error && <button className="button secondary" type="button" onClick={skills.refresh}>Reintentar</button>}
            <button className="button primary" type="button" onClick={() => setCreating(true)}>Nuevo +</button>
          </div>
        </div>
        <ManagementTable columns={columns} rows={skills.rows} loading={skills.loading} error={skills.error}
          rowKey={(item) => item.id} emptyMessage="Esta tecnología aún no tiene habilidades."
          renderExpandedRow={(item) => expanded.has(item.id)
            ? <SkillLevelsTable key={`${companyId}:${branchId}:${technology.id}:${item.id}`}
                companyId={companyId} branchId={branchId} technology={technology} skill={item} />
            : null} />
      </section>
      {creating && createPortal(
        <TechnologySkillModal companyId={companyId} branchId={branchId} technology={technology}
          onClose={() => setCreating(false)} />, document.body,
      )}
    </div>
  );
}

function SkillLevelsTable({ companyId, branchId, technology, skill }: {
  companyId: number; branchId: number; technology: Technology; skill: Skill;
}) {
  const path = `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technology.id}/skills/${skill.id}/levels`;
  const levels = useTechnologyDetails<SkillLevel>(path,
    (page) => companiesApi.listSkillLevels(companyId, branchId, technology.id, skill.id, { page, pageSize: 100 }));
  const [creating, setCreating] = useState(false);
  const columns: TableColumn<SkillLevel>[] = [
    { key: 'name', label: 'Nombre', render: (item) => item.name },
    { key: 'number', label: 'Número', render: (item) => item.number },
    { key: 'active', label: 'Estado', render: (item) => <ActiveBadge active={item.isActive} /> },
  ];

  return (
    <div className="technology-inline-details" id={`technology-${technology.id}-skill-${skill.id}-levels`}>
      <section className="resource-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{technology.name} · {skill.name}</p>
            <h3>Niveles de habilidad</h3>
          </div>
          <div className="management-filter-actions">
            {levels.error && <button className="button secondary" type="button" onClick={levels.refresh}>Reintentar</button>}
            <button className="button primary" type="button" onClick={() => setCreating(true)}>Nuevo +</button>
          </div>
        </div>
        <ManagementTable columns={columns} rows={levels.rows} loading={levels.loading} error={levels.error}
          rowKey={(item) => item.id} emptyMessage="Esta habilidad aún no tiene niveles." />
      </section>
      {creating && createPortal(
        <TechnologySkillModal companyId={companyId} branchId={branchId} technology={technology} skill={skill}
          onClose={() => setCreating(false)} />, document.body,
      )}
    </div>
  );
}

function TechnologySkillModal({ companyId, branchId, technology, skill, onClose }: {
  companyId: number; branchId: number; technology: Technology; skill?: Skill; onClose: () => void;
}) {
  const [draft, setDraft] = useState({ name: '', description: '', number: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const close = () => { if (!saving) onClose(); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!draft.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (skill && (!/^\d+$/.test(draft.number) || !Number.isSafeInteger(Number(draft.number)))) {
      setError('Indica un número de nivel entero mayor o igual que cero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = skill
        ? await companiesApi.createSkillLevel(companyId, branchId, technology.id, skill.id,
            { name: draft.name.trim(), number: Number(draft.number) })
        : await companiesApi.createSkill(companyId, branchId, technology.id,
            { name: draft.name.trim(), description: draft.description });
      if (!result) throw new Error('La API no devolvió el registro creado.');
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo crear el registro.');
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <ResourceModal open title={skill ? 'Nuevo nivel de habilidad' : 'Nueva habilidad'} dismissible={!saving} onClose={close}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <p className="muted">Tecnología: {technology.code} · {technology.name}{skill ? ` · Habilidad: ${skill.name}` : ''}</p>
        <Field label="Nombre" value={draft.name} required disabled={saving}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        {skill ? (
          <Field label="Número" type="number" min="0" step="1" value={draft.number} required disabled={saving}
            onChange={(event) => setDraft({ ...draft, number: event.target.value })} />
        ) : (
          <Field label="Descripción" value={draft.description} disabled={saving}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        )}
        {error && <div className="alert error">{error}</div>}
        <ModalActions onCancel={close} saving={saving} submitLabel={skill ? 'Crear nivel' : 'Crear habilidad'} />
      </form>
    </ResourceModal>
  );
}
