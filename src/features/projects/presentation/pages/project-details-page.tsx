import { ActiveBadge } from '../../../../shared/components/api-section';
import { type PlanningPeriod } from '../../infrastructure/api';
import { useProjectPlanning } from '../use-project-planning';

type DateRange = { startDate?: string; endDate?: string };
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatDateRange({ startDate, endDate }: DateRange) {
  if (startDate && endDate) return `${formatDate(startDate)} al ${formatDate(endDate)}`;
  if (startDate) return `Desde ${formatDate(startDate)}`;
  if (endDate) return `Hasta ${formatDate(endDate)}`;
  return 'Fechas no disponibles';
}

function dateTimestamp(value?: string) {
  if (!value) return null;
  const timestamp = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function dateIsWithinRange(range: DateRange, date: Date) {
  const start = dateTimestamp(range.startDate);
  const end = dateTimestamp(range.endDate);
  return start !== null && end !== null && date.getTime() >= start && date.getTime() <= end;
}

function timelineFor(periods: PlanningPeriod[], today: Date) {
  const ranges = periods.flatMap((period) => {
    const start = dateTimestamp(period.startDate);
    const end = dateTimestamp(period.endDate);
    return start !== null && end !== null ? [{ start, end }] : [];
  });
  if (!ranges.length) return null;

  const start = Math.min(today.getTime(), ...ranges.map((range) => range.start));
  const end = Math.max(today.getTime(), ...ranges.map((range) => range.end));
  const duration = Math.max(1, end - start);

  return {
    position: (timestamp: number) => Math.max(0, Math.min(100, ((timestamp - start) / duration) * 100)),
    todayPosition: Math.max(0, Math.min(100, ((today.getTime() - start) / duration) * 100)),
  };
}

function currentStage(periods: PlanningPeriod[], today: Date) {
  for (const period of periods) {
    if (!period.isActive || !dateIsWithinRange(period, today)) continue;
    const subperiod = period.subperiods.find((item) => item.isActive && dateIsWithinRange(item, today));
    const section = subperiod?.sections.find((item) => item.isActive && dateIsWithinRange(item, today));
    const fraction = section?.fractions.find((item) => item.isActive && dateIsWithinRange(item, today));
    return [period.name, subperiod?.name, section?.name, fraction?.name].filter(Boolean).join(' · ');
  }
  return null;
}

interface ProjectDetailsPageProps {
  projectId: number;
  projectCode: string;
  projectName?: string;
}

export function ProjectDetailsPage({ projectId, projectCode, projectName }: ProjectDetailsPageProps) {
  const { plannings, loading, error, refresh } = useProjectPlanning(projectId);

  const title = projectName || `Proyecto ${projectCode || projectId}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Following Web</p>
          <h1>{title}</h1>
          <p className="collaborator-detail-summary">
            Código: {projectCode || 'No disponible'}
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
            {error && <button className="button secondary" type="button" onClick={refresh}>Reintentar</button>}
          </div>

          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="empty-state">Consultando planeaciones...</div>
          ) : error ? null : plannings.length === 0 ? (
            <div className="empty-state">Este proyecto aún no tiene planeaciones registradas.</div>
          ) : (
            <div className="planning-list">
              {plannings.map((planning) => {
                const subperiodCount = planning.periods.reduce((total, period) => total + period.subperiods.length, 0);
                const sectionCount = planning.periods.reduce((total, period) =>
                  total + period.subperiods.reduce((subtotal, subperiod) => subtotal + subperiod.sections.length, 0), 0);
                const fractionCount = planning.periods.reduce((total, period) =>
                  total + period.subperiods.reduce((subtotal, subperiod) =>
                    subtotal + subperiod.sections.reduce((sectionTotal, section) => sectionTotal + section.fractions.length, 0), 0), 0);
                const timeline = timelineFor(planning.periods, today);
                const stage = currentStage(planning.periods, today);

                return (
                  <article className="planning-card" key={planning.id}>
                    <header className="planning-card-heading">
                      <div>
                        <h3>{planning.name}</h3>
                        <p className="planning-counts">
                          {planning.periods.length} periodos · {subperiodCount} subperiodos · {sectionCount} secciones · {fractionCount} fracciones
                        </p>
                      </div>
                      <ActiveBadge active={planning.isActive} />
                    </header>

                    {planning.periods.length ? (
                      <>
                        <div className="planning-timeline-wrap">
                          <p className="planning-subheading">Línea del tiempo <span>Hoy · {dateFormatter.format(today)}</span></p>
                          {timeline ? (
                            <>
                              <div className="planning-timeline-track" aria-label={`Periodos de ${planning.name}`}>
                                {planning.periods.map((period) => {
                                  const start = dateTimestamp(period.startDate);
                                  const end = dateTimestamp(period.endDate);
                                  if (start === null || end === null) return null;
                                  const startPosition = timeline.position(start);
                                  const endPosition = timeline.position(end);
                                  const isCurrent = period.isActive && dateIsWithinRange(period, today);
                                  return (
                                    <span
                                      className={`planning-period-span${isCurrent ? ' is-current' : ''}`}
                                      key={period.id}
                                      style={{ left: `${startPosition}%`, width: `${Math.max(0.6, endPosition - startPosition)}%` }}
                                      title={`${period.name}: ${formatDateRange(period)}`}
                                    >
                                      <span className="planning-timeline-point" />
                                    </span>
                                  );
                                })}
                                <span
                                  className={`planning-today-marker${timeline.todayPosition < 8 ? ' at-start' : timeline.todayPosition > 92 ? ' at-end' : ''}`}
                                  style={{ left: `${timeline.todayPosition}%` }}
                                >
                                  <span className="planning-today-label">Hoy</span>
                                  <span className="planning-today-line" />
                                </span>
                              </div>
                              <ol className="planning-timeline-periods">
                                {planning.periods.map((period) => {
                                  const start = dateTimestamp(period.startDate);
                                  const isCurrent = period.isActive && dateIsWithinRange(period, today);
                                  const isUpcoming = start !== null && start > today.getTime();
                                  return (
                                    <li className={isCurrent ? 'is-current' : isUpcoming ? 'is-upcoming' : ''} key={period.id}>
                                      <span className="planning-timeline-period-dot" aria-hidden="true" />
                                      <div>
                                        <strong>{period.name}</strong>
                                        <span>{formatDateRange(period)}</span>
                                        {isUpcoming && <span className="planning-timeline-start">Inicia {formatDate(period.startDate!)}</span>}
                                      </div>
                                      {isCurrent ? <span className="planning-period-status">En curso</span> : isUpcoming ? <span className="planning-period-status upcoming">Próximo</span> : null}
                                    </li>
                                  );
                                })}
                              </ol>
                              <p className="planning-current-stage">
                                {stage ? <><strong>Etapa actual:</strong> {stage}</> : 'Hoy no coincide con un periodo activo.'}
                              </p>
                            </>
                          ) : <p className="planning-no-dates">No hay fechas disponibles para trazar los periodos.</p>}
                        </div>

                        <ol className="planning-period-list">
                          {planning.periods.map((period, periodIndex) => (
                            <li className="planning-period-item" key={period.id}>
                              <div className={`planning-level-line period-level-line${period.isActive && dateIsWithinRange(period, today) ? ' is-current' : ''}`}>
                                <span className="planning-level-label">Periodo {String(periodIndex + 1).padStart(2, '0')}</span>
                                <strong>{period.name}</strong>
                                <span className="planning-code">{period.code}</span>
                                <span className="planning-date-range">{formatDateRange(period)}</span>
                                {period.isAdditional && <span className="planning-additional">Adicional</span>}
                                <ActiveBadge active={period.isActive} />
                              </div>

                              {period.subperiods.length ? (
                                <ol className="planning-subperiod-list">
                                  {period.subperiods.map((subperiod) => (
                                    <li key={subperiod.id}>
                                      <div className={`planning-level-line subperiod-level-line${subperiod.isActive && dateIsWithinRange(subperiod, today) ? ' is-current' : ''}`}>
                                        <span className="planning-level-label">Subperiodo</span>
                                        <strong>{subperiod.name}</strong>
                                        <span className="planning-code">{subperiod.code}</span>
                                        <span className="planning-date-range">{formatDateRange(subperiod)}</span>
                                        <ActiveBadge active={subperiod.isActive} />
                                      </div>

                                      {subperiod.sections.length ? (
                                        <ol className="planning-section-list">
                                          {subperiod.sections.map((section) => (
                                            <li key={section.id}>
                                              <div className={`planning-level-line section-level-line${section.isActive && dateIsWithinRange(section, today) ? ' is-current' : ''}`}>
                                                <span className="planning-level-label">Sección</span>
                                                <strong>{section.name}</strong>
                                                <span className="planning-code">{section.code}</span>
                                                <span className="planning-date-range">{formatDateRange(section)}</span>
                                                <ActiveBadge active={section.isActive} />
                                              </div>
                                              {section.fractions.length ? (
                                                <ul className="planning-fraction-list">
                                                  {section.fractions.map((fraction) => (
                                                    <li className={fraction.isActive && dateIsWithinRange(fraction, today) ? 'is-current' : ''} key={fraction.id}>
                                                      <span className="planning-level-label">Fracción</span>
                                                      <strong>{fraction.name}</strong>
                                                      <span className="planning-code">{fraction.code}</span>
                                                      <span className="planning-date-range">{formatDateRange(fraction)}</span>
                                                      <ActiveBadge active={fraction.isActive} />
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : <p className="planning-no-children">Sin fracciones</p>}
                                            </li>
                                          ))}
                                        </ol>
                                      ) : <p className="planning-no-children">Sin secciones</p>}
                                    </li>
                                  ))}
                                </ol>
                              ) : <p className="planning-no-children">Sin subperiodos</p>}
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : <p className="planning-no-children">Esta planeación no tiene periodos.</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}