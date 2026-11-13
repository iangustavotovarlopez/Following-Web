import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCatalogPages, type PageResponse } from '../../../shared/api';
import { SelectField } from '../../../shared/components/select-field';
import { companiesApi, type Period, type Subperiod, type Section, type Fraction, type Speciality } from '../../companies/infrastructure/api';
import type { Project } from '../../projects/infrastructure/api';
import type { StaffingNamedReference } from '../infrastructure/api/staffing-api';

export type StaffingSelection = Record<'projectId' | 'periodId' | 'subperiodId' | 'sectionId' | 'fractionId' | 'specialityId', string>;
export const emptySelection: StaffingSelection = { projectId: '', periodId: '', subperiodId: '', sectionId: '', fractionId: '', specialityId: '' };
export const idOf = (value: string) => value ? Number(value) : undefined;
export const referenceLabel = (item: StaffingNamedReference) => [item.code?.trim(), item.name?.trim()].filter(Boolean).join(' · ') || 'No informado';

export function useStaffingCatalog<T>(key: string, enabled: boolean, request: (page: number) => Promise<PageResponse<T> | null>) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; items: T[]; loading: boolean; error: string | null }>({ key, items: [], loading: enabled, error: null });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ key, items: [], loading: enabled, error: null });
    if (enabled) void loadCatalogPages(requestRef.current).then((items) => {
      if (active) setState({ key, items, loading: false, error: null });
    }).catch((cause: unknown) => {
      if (active) setState({ key, items: [], loading: false, error: cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.' });
    });
    return () => { active = false; };
  }, [key, enabled, revision]);
  const current = state.key === key ? state : { key, items: [] as T[], loading: enabled, error: null };
  return { ...current, refresh };
}

export function StaffingScopeFields({ value, onChange, companyId, branchId, projects, disabled = false, required = false }: {
  value: StaffingSelection; onChange: (value: StaffingSelection) => void; companyId?: number; branchId?: number;
  projects: Project[]; disabled?: boolean; required?: boolean;
}) {
  const selectedProject = projects.find((item) => item.id === idOf(value.projectId));
  const scopeCompany = selectedProject?.company.id ?? companyId;
  const scopeBranch = scopeCompany === companyId ? branchId : undefined;
  const periodId = idOf(value.periodId), subperiodId = idOf(value.subperiodId), sectionId = idOf(value.sectionId);
  const periods = useStaffingCatalog<Period>(`periods:${scopeCompany}`, !!scopeCompany,
    (page) => scopeCompany ? companiesApi.listPeriods(scopeCompany, { page, pageSize: 100 }) : Promise.resolve(null));
  const subperiods = useStaffingCatalog<Subperiod>(`subperiods:${scopeCompany}:${periodId}`, !!scopeCompany && !!periodId,
    (page) => scopeCompany && periodId ? companiesApi.listSubperiods(scopeCompany, periodId, { page, pageSize: 100 }) : Promise.resolve(null));
  const sections = useStaffingCatalog<Section>(`sections:${scopeCompany}:${periodId}:${subperiodId}`, !!scopeCompany && !!periodId && !!subperiodId,
    (page) => scopeCompany && periodId && subperiodId ? companiesApi.listSections(scopeCompany, periodId, subperiodId, { page, pageSize: 100 }) : Promise.resolve(null));
  const fractions = useStaffingCatalog<Fraction>(`fractions:${scopeCompany}:${periodId}:${subperiodId}:${sectionId}`, !!scopeCompany && !!periodId && !!subperiodId && !!sectionId,
    (page) => scopeCompany && periodId && subperiodId && sectionId ? companiesApi.listFractions(scopeCompany, periodId, subperiodId, sectionId, { page, pageSize: 100 }) : Promise.resolve(null));
  const specialities = useStaffingCatalog<Speciality>(`specialities:${scopeCompany}:${scopeBranch}`, !!scopeCompany && !!scopeBranch,
    (page) => scopeCompany && scopeBranch ? companiesApi.listSpecialities(scopeCompany, scopeBranch, { page, pageSize: 100 }) : Promise.resolve(null));
  const options = (items: StaffingNamedReference[]) => items.filter((item) => !required || item.isActive !== false).map((item) => ({ value: item.id, label: referenceLabel(item) }));
  return <>
    <SelectField label="Proyecto" value={value.projectId} required={required} disabled={disabled} options={options(projects)}
      onChange={(event) => onChange({ ...emptySelection, projectId: event.target.value })} />
    <SelectField label="Periodo" value={value.periodId} required={required} disabled={disabled || !scopeCompany || periods.loading || !!periods.error} options={options(periods.items)}
      onChange={(event) => onChange({ ...value, periodId: event.target.value, subperiodId: '', sectionId: '', fractionId: '' })} />
    <SelectField label="Subperiodo" value={value.subperiodId} required={required} disabled={disabled || !periodId || subperiods.loading || !!subperiods.error} options={options(subperiods.items)}
      onChange={(event) => onChange({ ...value, subperiodId: event.target.value, sectionId: '', fractionId: '' })} />
    <SelectField label="Sección" value={value.sectionId} required={required} disabled={disabled || !subperiodId || sections.loading || !!sections.error} options={options(sections.items)}
      onChange={(event) => onChange({ ...value, sectionId: event.target.value, fractionId: '' })} />
    <SelectField label="Fracción" value={value.fractionId} required={required} disabled={disabled || !sectionId || fractions.loading || !!fractions.error} options={options(fractions.items)}
      onChange={(event) => onChange({ ...value, fractionId: event.target.value })} />
    <SelectField label="Especialidad" value={value.specialityId} required={required} disabled={disabled || !scopeBranch || specialities.loading || !!specialities.error} options={options(specialities.items)}
      onChange={(event) => onChange({ ...value, specialityId: event.target.value })} />
    {[periods, subperiods, sections, fractions, specialities].filter((catalog) => catalog.error).map((catalog) =>
      <div className="alert error" key={catalog.key}>{catalog.error} <button type="button" className="button secondary" onClick={catalog.refresh}>Reintentar</button></div>)}
  </>;
}

