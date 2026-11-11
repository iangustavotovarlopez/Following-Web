import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  companiesApi,
  type Period,
  type Skill,
  type SkillLevel,
  type Technology,
} from '../../../companies/infrastructure/api';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorTechnology,
  type CollaboratorTechnologySkill,
} from '../../../collaborators/infrastructure/api';
import { projectsApi, type Planning, type Project } from '../../../projects/infrastructure/api';
import {
  servicesApi,
  type Environment,
  type ServiceMetadata,
  type ServiceEnvironmentRelation,
  type ServiceMetadataRelation,
} from '../../../services/infrastructure/api';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { API_MUTATION_EVENT, loadCatalogPages, type ApiMutationDetail } from '../../../../shared/api';
import { useApiAction } from '../../../../shared/hooks/use-api-action';
import { useGlobalCompany } from '../../../../app/providers/company-context';

type Id = number | undefined;
type CatalogResult<T> = { items: T[]; loading: boolean; error: string | null };

const pagination = { page: 1, pageSize: 100 };
const idOf = (value: string): Id => value ? Number(value) : undefined;
const optionsOf = <T extends { id: number }>(items: T[], label: (item: T) => string) =>
  items.map((item) => ({ value: item.id, label: label(item) }));

function useCatalog<T>(key: string, enabled: boolean, request: () => Promise<T[] | null>): CatalogResult<T> {
  const requestRef = useRef(request);
  requestRef.current = request;
  const load = useCallback(() => requestRef.current(), [key, enabled]);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setItems([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    load()
      .then((result) => { if (active) setItems(result ?? []); })
      .catch((cause) => {
        if (active) {
          setItems([]);
          setError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [enabled, load]);

  return { items, loading, error };
}

function RelationSection({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="resource-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Relaciones</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      <div className="relation-operation-content">{children}</div>
    </section>
  );
}

function ActionMessage({ error, result }: { error: string | null; result: unknown }) {
  if (error) return <p className="form-error">{error}</p>;
  return result === null ? null : <pre className="action-result">{JSON.stringify(result, null, 2)}</pre>;
}

function BaseForm({ children, onSubmit }: { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="operation-form" onSubmit={onSubmit}>{children}</form>;
}

export function AdvancedRelationshipsManagement() {
  const { selectedCompanyId, selectedBranchId } = useGlobalCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [metadata, setMetadata] = useState<ServiceMetadata[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [planningRevision, setPlanningRevision] = useState(0);
  const [projectRevision, setProjectRevision] = useState(0);
  const [collaboratorRevision, setCollaboratorRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setProjects([]);
    setCatalogError(null);
    Promise.all([
      loadCatalogPages((page) => projectsApi.listProjects({ page, pageSize: 100, 'company.id': selectedCompanyId })),
      servicesApi.listEnvironments(pagination),
      servicesApi.listMetadata(pagination),
    ])
      .then(([projectResponse, environmentResponse, metadataResponse]) => {
        if (!active) return;
        setProjects(projectResponse);
        setEnvironments(environmentResponse?.content ?? []);
        setMetadata(metadataResponse?.content ?? []);
      })
      .catch((cause) => {
        if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudieron cargar los catálogos');
      });
    return () => { active = false; };
  }, [selectedCompanyId, projectRevision]);

  useEffect(() => {
    function handleMutation(event: Event) {
      const { path } = (event as CustomEvent<ApiMutationDetail>).detail;
      if (path === '/collaborators/v0/collaborators' || /^\/collaborators\/v0\/collaborators\/\d+$/.test(path)) {
        setCollaboratorRevision((current) => current + 1);
      }
      if (/^\/projects\/v0\/projects(?:\/\d+)?$/.test(path)) setProjectRevision((current) => current + 1);
      if (/^\/projects\/v0\/projects\/\d+\/plannings(?:\/.*)?$/.test(path)) setPlanningRevision((current) => current + 1);
    }
    window.addEventListener(API_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(API_MUTATION_EVENT, handleMutation);
  }, []);

  return (
    <div className="resource-grid">
      {catalogError && <div className="alert error">{catalogError}</div>}
      {(!selectedCompanyId || !selectedBranchId) && (
        <div className="company-scope-hint">
          Selecciona compañía y branch en los selectores globales para usar las relaciones de tecnologías y habilidades.
        </div>
      )}
      <CollaboratorTechnologySection key={`technology:${selectedCompanyId}:${selectedBranchId}`} collaboratorRevision={collaboratorRevision} />
      <CollaboratorSkillLevelSection key={`skill-level:${selectedCompanyId}:${selectedBranchId}`} collaboratorRevision={collaboratorRevision} />
      <PlanningPeriodSection key={`planning-period:${selectedCompanyId ?? 'all'}`} projects={projects} revision={planningRevision} />
      <PlanningSectionAssignment key={`planning-section:${selectedCompanyId ?? 'all'}`} projects={projects} revision={planningRevision} />
      <ServiceEnvironmentSection environments={environments} />
      <ServiceMetadataSection metadata={metadata} />
    </div>
  );
}

function CollaboratorTechnologySection({ collaboratorRevision }: {
  collaboratorRevision: number;
}) {
  const { selectedCompanyId: companyId, selectedBranchId: branchId } = useGlobalCompany();
  const [technologyId, setTechnologyId] = useState<Id>();
  const [collaboratorId, setCollaboratorId] = useState<Id>();
  const technologies = useCatalog<Technology>(`technologies:${companyId}:${branchId}`, Boolean(companyId && branchId), () =>
    companiesApi.listTechnologies(companyId!, branchId!, pagination).then((response) => response?.content ?? []),
  );
  const collaborators = useCatalog<Collaborator>(`collaborators:${companyId}:${collaboratorRevision}`, Boolean(companyId), () =>
    collaboratorsApi.listCollaborators({ 'company.id': companyId!, ...pagination }).then((response) => response?.content ?? []),
  );
  const action = useApiAction<CollaboratorTechnology>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!collaboratorId || !technologyId) return;
    void action.execute(() => collaboratorsApi.createTechnology(collaboratorId, { technology: { id: technologyId } }))
      .catch(() => undefined);
  }

  return (
    <RelationSection title="Asignar tecnología" description="Asocia una tecnología existente a un colaborador.">
      <BaseForm onSubmit={submit}>
        <SelectField label="Technology" value={technologyId ?? ''} options={optionsOf(technologies.items, (item) => item.name)} onChange={(event) => setTechnologyId(idOf(event.target.value))} disabled={!branchId} required />
        <SelectField label="Colaborador" value={collaboratorId ?? ''} options={optionsOf(collaborators.items, (item) => `${item.code} · ${item.name} ${item.lastname}`)} onChange={(event) => setCollaboratorId(idOf(event.target.value))} disabled={!companyId || collaborators.loading} required />
        <SubmitButton loading={action.loading} disabled={!collaboratorId || !technologyId}>Asignar</SubmitButton>
        {technologies.error && <span className="form-error">{technologies.error}</span>}
        {collaborators.error && <span className="form-error">{collaborators.error}</span>}
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}

function CollaboratorSkillLevelSection({ collaboratorRevision }: {
  collaboratorRevision: number;
}) {
  const { selectedCompanyId: companyId, selectedBranchId: branchId } = useGlobalCompany();
  const [technologyId, setTechnologyId] = useState<Id>();
  const [collaboratorId, setCollaboratorId] = useState<Id>();
  const [skillId, setSkillId] = useState<Id>();
  const [levelId, setLevelId] = useState<Id>();
  const technologies = useCatalog<Technology>(`skill-technologies:${companyId}:${branchId}`, Boolean(companyId && branchId), () =>
    companiesApi.listTechnologies(companyId!, branchId!, pagination).then((response) => response?.content ?? []),
  );
  const skills = useCatalog<Skill>(`skills:${companyId}:${branchId}:${technologyId}`, Boolean(companyId && branchId && technologyId), () =>
    companiesApi.listSkills(companyId!, branchId!, technologyId!, pagination).then((response) => response?.content ?? []),
  );
  const levels = useCatalog<SkillLevel>(`levels:${companyId}:${branchId}:${technologyId}:${skillId}`, Boolean(companyId && branchId && technologyId && skillId), () =>
    companiesApi.listSkillLevels(companyId!, branchId!, technologyId!, skillId!, pagination).then((response) => response?.content ?? []),
  );
  const collaborators = useCatalog<Collaborator>(`skill-collaborators:${companyId}:${collaboratorRevision}`, Boolean(companyId), () =>
    collaboratorsApi.listCollaborators({ 'company.id': companyId!, ...pagination }).then((response) => response?.content ?? []),
  );
  const action = useApiAction<CollaboratorTechnologySkill>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!collaboratorId || !technologyId || !skillId || !levelId) return;
    void action.execute(() => collaboratorsApi.patchTechnologySkill(collaboratorId, technologyId, skillId, { level: { id: levelId } }))
      .catch(() => undefined);
  }

  return (
    <RelationSection title="Asignar nivel de habilidad" description="Actualiza el nivel de una habilidad para un colaborador y una tecnología.">
      <BaseForm onSubmit={submit}>
        <SelectField label="Technology" value={technologyId ?? ''} options={optionsOf(technologies.items, (item) => item.name)} onChange={(event) => {
          setTechnologyId(idOf(event.target.value));
          setSkillId(undefined);
          setLevelId(undefined);
        }} disabled={!branchId} required />
        <SelectField label="Habilidad" value={skillId ?? ''} options={optionsOf(skills.items, (item) => item.name)} onChange={(event) => {
          setSkillId(idOf(event.target.value));
          setLevelId(undefined);
        }} disabled={!technologyId} required />
        <SelectField label="Nivel" value={levelId ?? ''} options={optionsOf(levels.items, (item) => item.name)} onChange={(event) => setLevelId(idOf(event.target.value))} disabled={!skillId} required />
        <SelectField label="Colaborador" value={collaboratorId ?? ''} options={optionsOf(collaborators.items, (item) => `${item.code} · ${item.name} ${item.lastname}`)} onChange={(event) => setCollaboratorId(idOf(event.target.value))} disabled={!companyId || collaborators.loading} required />
        <SubmitButton loading={action.loading} disabled={!collaboratorId || !technologyId || !skillId || !levelId}>Asignar nivel</SubmitButton>
        {technologies.error && <span className="form-error">{technologies.error}</span>}
        {skills.error && <span className="form-error">{skills.error}</span>}
        {levels.error && <span className="form-error">{levels.error}</span>}
        {collaborators.error && <span className="form-error">{collaborators.error}</span>}
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}

function PlanningPeriodSection({ projects, revision }: {
  projects: Project[];
  revision: number;
}) {
  const [projectId, setProjectId] = useState<Id>();
  const [planningId, setPlanningId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [isAdditional, setIsAdditional] = useState(false);
  const plannings = useCatalog<Planning>(`planning-period-plannings:${projectId}:${revision}`, Boolean(projectId), () =>
    projectsApi.listPlanning(projectId!),
  );
  const project = projects.find((item) => item.id === projectId);
  const periods = useCatalog<Period>(`planning-period-periods:${projectId}:${revision}`, Boolean(project), () =>
    companiesApi.listPeriods(project!.company.id, pagination).then((response) => response?.content ?? []),
  );
  const action = useApiAction<{ id: number; period: { id: number }; isAdditional: boolean; isActive: boolean }>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !planningId || !periodId) return;
    void action.execute(() => projectsApi.addPlanningPeriod(projectId, planningId, {
      period: { id: periodId },
      isAdditional,
    })).catch(() => undefined);
  }

  return (
    <RelationSection title="Agregar periodo a planeación" description="Asocia un periodo existente a una planeación.">
      <BaseForm onSubmit={submit}>
        <SelectField label="Proyecto" value={projectId ?? ''} options={optionsOf(projects, (item) => item.name)} onChange={(event) => {
          setProjectId(idOf(event.target.value));
          setPlanningId(undefined);
          setPeriodId(undefined);
        }} required />
        <SelectField label="Planeación" value={planningId ?? ''} options={optionsOf(plannings.items, (item) => item.name)} onChange={(event) => setPlanningId(idOf(event.target.value))} disabled={!projectId} required />
        <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods.items, (item) => item.name)} onChange={(event) => setPeriodId(idOf(event.target.value))} disabled={!projectId} required />
        <SelectField label="Periodo adicional" value={String(isAdditional)} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }]} onChange={(event) => setIsAdditional(event.target.value === 'true')} />
        <SubmitButton loading={action.loading} disabled={!projectId || !planningId || !periodId}>Agregar periodo</SubmitButton>
        {plannings.error && <span className="form-error">{plannings.error}</span>}
        {periods.error && <span className="form-error">{periods.error}</span>}
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}

function PlanningSectionAssignment({ projects, revision }: {
  projects: Project[];
  revision: number;
}) {
  const [projectId, setProjectId] = useState<Id>();
  const [planningId, setPlanningId] = useState<Id>();
  const [subperiodId, setSubperiodId] = useState<Id>();
  const [sectionId, setSectionId] = useState<Id>();
  const plannings = useCatalog<Planning>(`planning-section-plannings:${projectId}:${revision}`, Boolean(projectId), () =>
    projectsApi.listPlanning(projectId!),
  );
  const planning = plannings.items.find((item) => item.id === planningId);
  const subperiods = planning?.periods.flatMap((period) => period.subperiods) ?? [];
  const sections = subperiods.find((subperiod) => subperiod.id === subperiodId)?.sections ?? [];
  const action = useApiAction<void>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId || !planningId || !subperiodId || !sectionId) return;
    void action.execute(() => projectsApi.addPlanningSection(projectId, planningId, {
      subperiod: { id: subperiodId },
      section: { id: sectionId },
    }))
      .catch(() => undefined);
  }

  return (
    <RelationSection title="Agregar sección a planeación" description="Asocia una sección disponible dentro del subperiodo seleccionado.">
      <BaseForm onSubmit={submit}>
        <SelectField label="Proyecto" value={projectId ?? ''} options={optionsOf(projects, (item) => item.name)} onChange={(event) => {
          setProjectId(idOf(event.target.value));
          setPlanningId(undefined);
          setSubperiodId(undefined);
          setSectionId(undefined);
        }} required />
        <SelectField label="Planeación" value={planningId ?? ''} options={optionsOf(plannings.items, (item) => item.name)} onChange={(event) => {
          setPlanningId(idOf(event.target.value));
          setSubperiodId(undefined);
          setSectionId(undefined);
        }} disabled={!projectId} required />
        <SelectField label="Subperiodo" value={subperiodId ?? ''} options={optionsOf(subperiods, (item) => item.name)} onChange={(event) => {
          setSubperiodId(idOf(event.target.value));
          setSectionId(undefined);
        }} disabled={!planningId} required />
        <SelectField label="Sección" value={sectionId ?? ''} options={optionsOf(sections, (item) => item.name)} onChange={(event) => setSectionId(idOf(event.target.value))} disabled={!subperiodId} required />
        <SubmitButton loading={action.loading} disabled={!projectId || !planningId || !subperiodId || !sectionId}>Agregar sección</SubmitButton>
        {plannings.error && <span className="form-error">{plannings.error}</span>}
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}

function ServiceEnvironmentSection({ environments }: { environments: Environment[] }) {
  const [serviceId, setServiceId] = useState('');
  const [environmentId, setEnvironmentId] = useState<Id>();
  const action = useApiAction<ServiceEnvironmentRelation>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId || !environmentId) return;
    void action.execute(() => servicesApi.assignServiceEnvironment(Number(serviceId), environmentId))
      .catch(() => undefined);
  }

  return (
    <RelationSection title="Asignar ambiente a servicio" description="Vincula un servicio existente con un ambiente del catálogo.">
      <BaseForm onSubmit={submit}>
        <Field label="ID del servicio" type="number" min="1" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required />
        <SelectField label="Ambiente" value={environmentId ?? ''} options={optionsOf(environments, (item) => item.name)} onChange={(event) => setEnvironmentId(idOf(event.target.value))} required />
        <SubmitButton loading={action.loading} disabled={!serviceId || !environmentId}>Asignar ambiente</SubmitButton>
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}

function ServiceMetadataSection({ metadata }: { metadata: ServiceMetadata[] }) {
  const [serviceId, setServiceId] = useState('');
  const [metadataId, setMetadataId] = useState<Id>();
  const [detail, setDetail] = useState('');
  const action = useApiAction<ServiceMetadataRelation>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId || !metadataId || !detail.trim()) return;
    void action.execute(() => servicesApi.assignServiceMetadata(Number(serviceId), metadataId, detail.trim()))
      .catch(() => undefined);
  }

  return (
    <RelationSection title="Asignar metadata a servicio" description="Vincula metadata del catálogo con un servicio y su detalle.">
      <BaseForm onSubmit={submit}>
        <Field label="ID del servicio" type="number" min="1" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required />
        <SelectField label="Metadata" value={metadataId ?? ''} options={optionsOf(metadata, (item) => item.name)} onChange={(event) => setMetadataId(idOf(event.target.value))} required />
        <Field label="Detalle" value={detail} onChange={(event) => setDetail(event.target.value)} required />
        <SubmitButton loading={action.loading} disabled={!serviceId || !metadataId || !detail.trim()}>Asignar metadata</SubmitButton>
        <ActionMessage error={action.error} result={action.result} />
      </BaseForm>
    </RelationSection>
  );
}