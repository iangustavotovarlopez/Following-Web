import { useEffect, useState } from 'react';
import { ActiveBadge } from '../../../../shared/components/api-section';
import { companiesApi, type Fraction, type Period, type Section, type Subperiod } from '../../../companies/infrastructure/api';
import { projectsApi, type Planning, type PlanningFraction, type PlanningPeriod, type PlanningSection, type PlanningSubperiod } from '../../infrastructure/api';
import type { PageResponse, PaginationQuery } from '../../../../shared/api';

type DateRange = { startDate?: string; endDate?: string };
type DetailedFraction = PlanningFraction & DateRange;
type DetailedSection = PlanningSection & DateRange & { fractions: DetailedFraction[] };
type DetailedSubperiod = PlanningSubperiod & DateRange & { sections: DetailedSection[] };
type DetailedPeriod = PlanningPeriod & DateRange & { subperiods: DetailedSubperiod[] };
type DetailedPlanning = Omit<Planning, 'periods'> & { periods: DetailedPeriod[] };

async function loadAllPages<T>(request: (query: PaginationQuery) => Promise<PageResponse<T> | null>) {
  const firstPage = await request({ page: 1, pageSize: 100 });
  if (!firstPage) return [];

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
      request({ page: index + 2, pageSize: 100 }),
    ),
  );
  return [...firstPage.content, ...remainingPages.flatMap((response) => response?.content ?? [])];
}

const idKey = (...ids: number[]) => ids.join(':');
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

function timelineFor(periods: DetailedPeriod[], today: Date) {
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

function currentStage(periods: DetailedPeriod[], today: Date) {
  for (const period of periods) {
    if (!period.isActive || !dateIsWithinRange(period, today)) continue;
    const subperiod = period.subperiods.find((item) => item.isActive && dateIsWithinRange(item, today));
    const section = subperiod?.sections.find((item) => item.isActive && dateIsWithinRange(item, today));
    const fraction = section?.fractions.find((item) => item.isActive && dateIsWithinRange(item, today));
    return [period.name, subperiod?.name, section?.name, fraction?.name].filter(Boolean).join(' · ');
  }
  return null;
}

async function loadPlanningDates(companyId: number, plannings: Planning[]): Promise<DetailedPlanning[]> {
  const periods = await loadAllPages((query) => companiesApi.listPeriods(companyId, query));
  const periodById = new Map<number, Period>(periods.map((period) => [period.id, period]));
  const periodIds = [...new Set(plannings.flatMap((planning) => planning.periods.map((period) => period.id)))];
  const subperiodByKey = new Map<string, Subperiod>();

  await Promise.all(periodIds.map(async (periodId) => {
    const subperiods = await loadAllPages((query) => companiesApi.listSubperiods(companyId, periodId, query));
    subperiods.forEach((subperiod) => subperiodByKey.set(idKey(periodId, subperiod.id), subperiod));
  }));

  const subperiodRefs = [...new Map(plannings.flatMap((planning) => planning.periods.flatMap((period) =>
    period.subperiods.map((subperiod) => [idKey(period.id, subperiod.id), { periodId: period.id, subperiodId: subperiod.id }] as const),
  ))).values()];
  const sectionByKey = new Map<string, Section>();

  await Promise.all(subperiodRefs.map(async ({ periodId, subperiodId }) => {
    const sections = await loadAllPages((query) => companiesApi.listSections(companyId, periodId, subperiodId, query));
    sections.forEach((section) => sectionByKey.set(idKey(periodId, subperiodId, section.id), section));
  }));

  const sectionRefs = [...new Map(plannings.flatMap((planning) => planning.periods.flatMap((period) =>
    period.subperiods.flatMap((subperiod) => subperiod.sections.map((section) => [
      idKey(period.id, subperiod.id, section.id),
      { periodId: period.id, subperiodId: subperiod.id, sectionId: section.id },
    ] as const)),
  ))).values()];
  const fractionByKey = new Map<string, Fraction>();

  await Promise.all(sectionRefs.map(async ({ periodId, subperiodId, sectionId }) => {
    const fractions = await loadAllPages((query) => companiesApi.listFractions(companyId, periodId, subperiodId, sectionId, query));
    fractions.forEach((fraction) => fractionByKey.set(idKey(periodId, subperiodId, sectionId, fraction.id), fraction));
  }));

  return plannings.map((planning) => ({
    ...planning,
    periods: planning.periods.map((period) => {
      const periodDetails = periodById.get(period.id);
      return {
        ...period,
        startDate: periodDetails?.startDate,
        endDate: periodDetails?.endDate,
        subperiods: period.subperiods.map((subperiod) => {
          const subperiodDetails = subperiodByKey.get(idKey(period.id, subperiod.id));
          return {
            ...subperiod,
            startDate: subperiodDetails?.startDate,
            endDate: subperiodDetails?.endDate,
            sections: subperiod.sections.map((section) => {
              const sectionDetails = sectionByKey.get(idKey(period.id, subperiod.id, section.id));
              return {
                ...section,
                startDate: sectionDetails?.startDate,
                endDate: sectionDetails?.endDate,
                fractions: section.fractions.map((fraction) => {
                  const fractionDetails = fractionByKey.get(idKey(period.id, subperiod.id, section.id, fraction.id));
                  return {
                    ...fraction,
                    startDate: fractionDetails?.startDate,
                    endDate: fractionDetails?.endDate,
                  };
                }),
              };
            }),
          };
        }),
      };
    }),
  }));
}

interface ProjectDetailsPageProps {
  projectId: number;
  projectCode: string;
  projectName?: string;
  companyId?: number;
}

export function ProjectDetailsPage({ projectId, projectCode, projectName, companyId: projectCompanyId }: ProjectDetailsPageProps) {
  const [plannings, setPlannings] = useState<DetailedPlanning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDateError(null);

    projectsApi
      .listPlanning(projectId)
      .then(async (planningResponse) => {
        let detailedPlannings: DetailedPlanning[] = (planningResponse ?? []).map((planning) => ({
          ...planning,
          periods: (planning.periods ?? []).map((period) => ({
            ...period,
            subperiods: (period.subperiods ?? []).map((subperiod) => ({
              ...subperiod,
              sections: (subperiod.sections ?? []).map((section) => ({
                ...section,
                fractions: section.fractions ?? [],
              })),
            })),
          })),
        }));

        if (projectCompanyId && detailedPlannings.length) {
          try {
            detailedPlannings = await loadPlanningDates(projectCompanyId, detailedPlannings);
          } catch {
            if (active) setDateError('No se pudieron cargar las fechas de los periodos y sus elementos.');
          }
        } else if (detailedPlannings.length) {
          setDateError('No se pudieron cargar las fechas de los periodos y sus elementos.');
        }

        if (active) {
          setPlannings(detailedPlannings);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las planeaciones');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectCompanyId, projectId]);

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
          </div>

          {error && <div className="alert error">{error}</div>}
          {dateError && <div className="alert warning">{dateError}</div>}
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