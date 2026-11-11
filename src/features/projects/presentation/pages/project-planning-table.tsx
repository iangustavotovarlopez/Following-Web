import { ActiveBadge, type TableColumn } from '../../../../shared/components/api-section';
import { ManagementTable } from '../../../../shared/components/management-table';
import type { Planning } from '../../infrastructure/api';
import { useProjectPlanning } from '../use-project-planning';

interface PlanningRow {
  key: string;
  level: string;
  depth: number;
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  isAdditional?: boolean;
}

export function PlanningHierarchyTable({ planning }: { planning: Planning }) {
  const rows: PlanningRow[] = [];
  for (const period of planning.periods) {
    const periodKey = `period:${period.id}`;
    rows.push({ ...period, key: periodKey, level: 'Periodo', depth: 0 });
    for (const subperiod of period.subperiods) {
      const subperiodKey = `${periodKey}:subperiod:${subperiod.id}`;
      rows.push({ ...subperiod, key: subperiodKey, level: 'Subperiodo', depth: 1 });
      for (const section of subperiod.sections) {
        const sectionKey = `${subperiodKey}:section:${section.id}`;
        rows.push({ ...section, key: sectionKey, level: 'Sección', depth: 2 });
        for (const fraction of section.fractions) {
          rows.push({ ...fraction, key: `${sectionKey}:fraction:${fraction.id}`, level: 'Fracción', depth: 3 });
        }
      }
    }
  }
  const columns: TableColumn<PlanningRow>[] = [
    { key: 'level', label: 'Nivel', render: (row) => row.level },
    { key: 'code', label: 'Código', render: (row) => row.code },
    { key: 'name', label: 'Nombre', render: (row) => (
      <span className="planning-hierarchy-name" style={{ paddingLeft: `${row.depth * 16}px` }}>
        {row.name}{row.isAdditional && <span className="planning-additional">Adicional</span>}
      </span>
    ) },
    { key: 'start', label: 'Inicio', render: (row) => row.startDate || 'No informado' },
    { key: 'end', label: 'Fin', render: (row) => row.endDate || 'No informado' },
    { key: 'active', label: 'Estado', render: (row) => <ActiveBadge active={row.isActive} /> },
  ];
  return <ManagementTable columns={columns} rows={rows} loading={false} error={null}
    rowKey={(row) => row.key} emptyMessage="Esta planeación no tiene periodos asociados." />;
}

export function ProjectPlanningTable({ projectId, projectName }: { projectId: number; projectName: string }) {
  const { plannings, loading, error, refresh } = useProjectPlanning(projectId);
  const current = plannings.filter((planning) => planning.isActive);
  return (
    <div className="project-inline-details" id={`project-planning-${projectId}`}>
      <section className="resource-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Detalle del proyecto</p>
            <h2>Planificación de {projectName}</h2>
            <p className="muted">Planeación activa con sus periodos, subperiodos, secciones y fracciones.</p>
          </div>
          {error && <button className="button secondary" type="button" onClick={refresh}>Reintentar</button>}
        </div>
        {error ? <div className="alert error">{error}</div> : loading
          ? <div className="empty-state">Consultando planeación...</div>
          : current.length === 0
            ? <div className="empty-state">Este proyecto aún no tiene una planeación activa. Puedes crearla en la pestaña Planning.</div>
            : current.map((planning) => (
              <div key={planning.id}>
                <div className="planning-summary-heading"><h3>{planning.name}</h3><ActiveBadge active={planning.isActive} /></div>
                <PlanningHierarchyTable planning={planning} />
              </div>
            ))}
      </section>
    </div>
  );
}
