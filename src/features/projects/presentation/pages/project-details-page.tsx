import { useEffect, useState } from 'react';
import { ActiveBadge } from '../../../../shared/components/api-section';
import { projectsApi, type Planning, type Project } from '../../infrastructure/api';

interface ProjectDetailsPageProps {
  projectId: number;
  projectCode: string;
}

export function ProjectDetailsPage({ projectId, projectCode }: ProjectDetailsPageProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    projectsApi
      .listPlanning(projectId)
      .then((response) => {
        if (active) setPlannings(response ?? []);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las planeaciones');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (projectCode) {
      projectsApi
        .listProjects({ code: projectCode, page: 1, pageSize: 20 })
        .then((response) => {
          if (active) setProject(response?.content.find((item) => item.id === projectId) ?? null);
        })
        .catch(() => {
          if (active) setProject(null);
        });
    }

    return () => {
      active = false;
    };
  }, [projectCode, projectId]);

  const title = project?.name ?? `Proyecto ${projectCode || projectId}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Following Web</p>
          <h1>{title}</h1>
          <p className="collaborator-detail-summary">
            Código: {project?.code ?? (projectCode || 'No disponible')}
          </p>
        </div>
        <a className="button detail-back-button" href="/">
          Volver al listado
        </a>
      </header>

      <main className="dashboard">
        <section className="resource-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Detalle del proyecto</p>
              <h2>Planeaciones</h2>
              <p className="muted">Planeaciones registradas para este proyecto.</p>
            </div>
          </div>

          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="empty-state">Consultando planeaciones...</div>
          ) : error ? null : plannings.length === 0 ? (
            <div className="empty-state">Este proyecto aún no tiene planeaciones registradas.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Planeación</th>
                    <th>Estado</th>
                    <th>Periodos</th>
                    <th>Secciones</th>
                    <th>Fracciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plannings.map((planning) => {
                    const periods = planning.periods ?? [];
                    const sections = periods.flatMap((period) =>
                      period.subperiods.flatMap((subperiod) => subperiod.sections),
                    );
                    const fractions = sections.flatMap((section) => section.fractions ?? []);
                    return (
                      <tr key={planning.id}>
                        <td>{planning.name}</td>
                        <td><ActiveBadge active={planning.isActive} /></td>
                        <td>{periods.length ? periods.map((period) => period.name).join(', ') : '—'}</td>
                        <td>{sections.length ? sections.map((section) => section.name).join(', ') : '—'}</td>
                        <td>{fractions.length ? fractions.map((fraction) => fraction.name).join(', ') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}