import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { companiesApi, type Period } from '../../../companies/infrastructure/api';
import { loadCatalogPages } from '../../../../shared/api';
import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { ManagementTable } from '../../../../shared/components/management-table';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField } from '../../../../shared/components/select-field';
import { projectsApi, type Planning, type Project } from '../../infrastructure/api';
import { useProjectPlanning } from '../use-project-planning';
import { PlanningHierarchyTable } from './project-planning-table';

export function ProjectPlanningTab({ projects, projectsLoading, projectsError }: {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
}) {
  const [projectId, setProjectId] = useState<number>();
  const [nameFilter, setNameFilter] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const selectedProject = projects.find((project) => project.id === projectId);
  const { plannings, loading, error, refresh } = useProjectPlanning(selectedProject?.id);
  const rows = plannings.filter((planning) => planning.name.toLocaleLowerCase('es').includes(nameFilter.trim().toLocaleLowerCase('es')));
  useEffect(() => { setExpanded(new Set()); }, [projectId, nameFilter]);
  const columns: TableColumn<Planning>[] = [
    { key: 'name', label: 'Nombre', render: (planning) => planning.name },
    { key: 'periods', label: 'Periodos', render: (planning) => planning.periods.length },
    { key: 'active', label: 'Estado', render: (planning) => <ActiveBadge active={planning.isActive} /> },
    { key: 'details', label: 'Acciones', render: (planning) => (
      <button className="row-action-button details" type="button"
        aria-label={`${expanded.has(planning.id) ? 'Ocultar' : 'Mostrar'} detalle de ${planning.name}`}
        aria-expanded={expanded.has(planning.id)}
        title={expanded.has(planning.id) ? 'Ocultar detalle' : 'Mostrar periodos y etapas'}
        onClick={() => setExpanded((current) => {
          const next = new Set(current);
          if (next.has(planning.id)) next.delete(planning.id); else next.add(planning.id);
          return next;
        })}>
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 9v12" />
          <path d={expanded.has(planning.id) ? 'm12 16 3-3 3 3' : 'm12 14 3 3 3-3'} />
        </svg>
      </button>
    ) },
  ];
  return (
    <div className="management-panel">
      <div className="management-panel-heading">
        <div><h3>Planning</h3><p className="muted">Consulta las planeaciones y crea una para un proyecto y periodo.</p></div>
        <button className="button primary" type="button"
          disabled={projectsLoading || Boolean(projectsError) || projects.length === 0}
          onClick={() => setModalOpen(true)}>Nuevo +</button>
      </div>
      <form className="management-filters" onSubmit={(event) => {
        event.preventDefault();
        const name = nameDraft.trim();
        if (name && name.length < 3) { setFilterError('Ingresa al menos 3 caracteres para filtrar por nombre.'); return; }
        setFilterError(null);
        setNameFilter(name);
      }}>
        <SelectField label="Proyecto" value={selectedProject?.id ?? ''}
          options={projects.map((project) => ({ value: project.id, label: `${project.code} · ${project.name}` }))}
          disabled={projectsLoading} onChange={(event) => {
            setProjectId(event.target.value ? Number(event.target.value) : undefined);
            setNameDraft(''); setNameFilter(''); setFilterError(null);
          }} />
        <Field label="Filtrar por nombre" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
        <div className="management-filter-actions">
          <button className="button primary" type="submit" disabled={!selectedProject}>Filtrar</button>
          <button className="button secondary" type="button" onClick={() => { setNameDraft(''); setNameFilter(''); setFilterError(null); }}>Limpiar</button>
        </div>
      </form>
      {filterError && <div className="alert error">{filterError}</div>}
      {error && <button className="button secondary" type="button" onClick={refresh}>Reintentar planeaciones</button>}
      <ManagementTable columns={columns} rows={rows} loading={projectsLoading || loading} error={projectsError || error}
        rowKey={(planning) => planning.id} emptyMessage={selectedProject
          ? 'Este proyecto no tiene planeaciones que coincidan con el filtro.' : 'Selecciona un proyecto para consultar sus planeaciones.'}
        renderExpandedRow={(planning) => expanded.has(planning.id) ? <PlanningHierarchyTable planning={planning} /> : null} />
      {modalOpen && createPortal(
        <CreatePlanningModal projects={projects} projectsLoading={projectsLoading} projectsError={projectsError}
          initialProjectId={selectedProject?.id}
          onClose={() => setModalOpen(false)} onCreated={(id) => {
            setProjectId(id); setNameDraft(''); setNameFilter(''); setFilterError(null); setModalOpen(false);
          }} />,
        document.body,
      )}
    </div>
  );
}

function CreatePlanningModal({ projects, projectsLoading, projectsError, initialProjectId, onClose, onCreated }: {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  initialProjectId?: number;
  onClose: () => void;
  onCreated: (projectId: number) => void;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const project = projects.find((item) => item.id === projectId);
  const companyId = project?.company.id;
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loadedCompanyId, setLoadedCompanyId] = useState<number>();
  const [periodId, setPeriodId] = useState<number>();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(Boolean(companyId));
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setPeriods([]);
    setLoadedCompanyId(undefined);
    setPeriodId(undefined);
    setLoading(Boolean(companyId));
    setCatalogError(null);
    if (companyId) {
      void loadCatalogPages((page) => companiesApi.listPeriods(companyId, { page, pageSize: 100 })).then((items) => {
        if (active) { setPeriods(items.filter((period) => period.isActive)); setLoadedCompanyId(companyId); }
      }).catch((cause) => {
        if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudieron consultar los periodos.');
      }).finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [companyId, revision]);

  function close() { if (!saving) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!project || projectsLoading || projectsError || !name.trim() || loading || catalogError || loadedCompanyId !== companyId
      || !periodId || !periods.some((period) => period.id === periodId)) {
      setFormError('Selecciona un proyecto, un periodo de su compañía y el nombre de la planeación.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await projectsApi.createPlanning(project.id, { name: name.trim(), period: { id: periodId } });
      if (!result) throw new Error('La API no devolvió la planeación creada.');
      onCreated(project.id);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo crear la planeación.');
    } finally { setSaving(false); }
  }
  return (
    <ResourceModal open title="Nueva planeación" onClose={close}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <SelectField label="Proyecto" value={project?.id ?? ''} disabled={saving || projectsLoading || Boolean(projectsError)} required
          options={projects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
          onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : undefined); setPeriodId(undefined); setFormError(null); }} />
        <SelectField label="Periodo" value={periodId ?? ''} required
          disabled={saving || !project || loading || loadedCompanyId !== companyId}
          options={loadedCompanyId === companyId ? periods.map((period) => ({ value: period.id, label: `${period.code} · ${period.name}` })) : []}
          onChange={(event) => setPeriodId(event.target.value ? Number(event.target.value) : undefined)} />
        <Field label="Nombre de la planeación" value={name} maxLength={255} required disabled={saving}
          onChange={(event) => setName(event.target.value)} />
        {loading && <span className="muted">Consultando periodos...</span>}
        {project && !loading && !catalogError && periods.length === 0 && <span className="muted">La compañía del proyecto no tiene periodos activos. Puedes crearlos en Planning → Periods.</span>}
        {catalogError && <div className="alert error">{catalogError}</div>}
        {catalogError && <button className="button secondary" type="button" onClick={() => setRevision((current) => current + 1)}>Reintentar periodos</button>}
        {formError && <div className="alert error">{formError}</div>}
        {projectsError && <div className="alert error">{projectsError}</div>}
        <ModalActions onCancel={close} saving={saving} submitLabel="Crear planeación"
          submitDisabled={!project || projectsLoading || Boolean(projectsError) || !periodId || !name.trim() || loading || Boolean(catalogError) || loadedCompanyId !== companyId} />
      </form>
    </ResourceModal>
  );
}
