import { useEffect, useState, type ReactNode } from 'react';
import {
  companiesApi,
  type Branch,
  type Company,
  type Period,
  type Skill,
  type SkillLevel,
  type Speciality,
} from '../../../companies/infrastructure/api';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorSpeciality,
  type CollaboratorSpecialitySkill,
} from '../../../collaborators/infrastructure/api';
import {
  projectsApi,
  type Project,
} from '../../../projects/infrastructure/api';
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
import { useApiAction } from '../../../../shared/hooks/use-api-action';

type Id = number | undefined;

const idOf = (value: string) => (value ? Number(value) : undefined);
const optionsOf = <T extends { id: number }>(
  values: T[],
  label: (value: T) => string,
) => values.map((value) => ({ value: value.id, label: label(value) }));

export function AdvancedRelationsSection() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [levels, setLevels] = useState<SkillLevel[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [metadata, setMetadata] = useState<ServiceMetadata[]>([]);

  const [companyId, setCompanyId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const [collaboratorId, setCollaboratorId] = useState<Id>();
  const [projectId, setProjectId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [skillId, setSkillId] = useState<Id>();
  const [levelId, setLevelId] = useState<Id>();

  useEffect(() => {
    Promise.all([
      companiesApi.listCompanies({ page: 1, pageSize: 100 }),
      collaboratorsApi.listCollaborators({ page: 1, pageSize: 100 }),
      projectsApi.listProjects({ page: 1, pageSize: 100 }),
      servicesApi.listEnvironments({ page: 1, pageSize: 100 }),
      servicesApi.listMetadata({ page: 1, pageSize: 100 }),
    ]).then(([companiesResponse, collaboratorsResponse, projectsResponse, environmentsResponse, metadataResponse]) => {
      setCompanies(companiesResponse?.content ?? []);
      setCollaborators(collaboratorsResponse?.content ?? []);
      setProjects(projectsResponse?.content ?? []);
      setEnvironments(environmentsResponse?.content ?? []);
      setMetadata(metadataResponse?.content ?? []);
    });
  }, []);

  useEffect(() => {
    setBranches([]);
    setBranchId(undefined);
    if (!companyId) return;
    companiesApi.listBranches(companyId, { page: 1, pageSize: 100 })
      .then((response) => setBranches(response?.content ?? []));
  }, [companyId]);

  useEffect(() => {
    setSpecialities([]);
    setSpecialityId(undefined);
    if (!companyId || !branchId) return;
    companiesApi.listSpecialities(companyId, branchId, { page: 1, pageSize: 100 })
      .then((response) => setSpecialities(response?.content ?? []));
  }, [companyId, branchId]);

  useEffect(() => {
    setSkills([]);
    setSkillId(undefined);
    if (!companyId || !branchId || !specialityId) return;
    companiesApi.listSkills(companyId, branchId, specialityId, { page: 1, pageSize: 100 })
      .then((response) => setSkills(response?.content ?? []));
  }, [companyId, branchId, specialityId]);

  useEffect(() => {
    setLevels([]);
    setLevelId(undefined);
    if (!companyId || !branchId || !specialityId || !skillId) return;
    companiesApi.listSkillLevels(companyId, branchId, specialityId, skillId, { page: 1, pageSize: 100 })
      .then((response) => setLevels(response?.content ?? []));
  }, [companyId, branchId, specialityId, skillId]);

  useEffect(() => {
    setPeriods([]);
    setPeriodId(undefined);
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    companiesApi.listPeriods(project.company.id, { page: 1, pageSize: 100 })
      .then((response) => setPeriods(response?.content ?? []));
  }, [projectId, projects]);

  return (
    <section className="resource-section operations-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Relaciones</p>
          <h2>Advanced relationships</h2>
          <p className="muted">
            Asignaciones con catálogos cargados mediante dropdowns.
          </p>
        </div>
      </div>

      <div className="selector-bar">
        <SelectField label="Company" value={companyId ?? ''} options={optionsOf(companies, (item) => item.name)} onChange={(e) => setCompanyId(idOf(e.target.value))} />
        <SelectField label="Branch" value={branchId ?? ''} options={optionsOf(branches, (item) => item.name)} onChange={(e) => setBranchId(idOf(e.target.value))} />
        <SelectField label="Speciality" value={specialityId ?? ''} options={optionsOf(specialities, (item) => item.name)} onChange={(e) => setSpecialityId(idOf(e.target.value))} />
        <SelectField label="Collaborator" value={collaboratorId ?? ''} options={optionsOf(collaborators, (item) => item.name)} onChange={(e) => setCollaboratorId(idOf(e.target.value))} />
        <SelectField label="Project" value={projectId ?? ''} options={optionsOf(projects, (item) => item.name)} onChange={(e) => setProjectId(idOf(e.target.value))} />
        <SelectField label="Period" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(e) => setPeriodId(idOf(e.target.value))} />
        <SelectField label="Skill" value={skillId ?? ''} options={optionsOf(skills, (item) => item.name)} onChange={(e) => setSkillId(idOf(e.target.value))} />
        <SelectField label="Level" value={levelId ?? ''} options={optionsOf(levels, (item) => item.name)} onChange={(e) => setLevelId(idOf(e.target.value))} />
      </div>

      <div className="operation-grid">
        <CollaboratorSpecialityOperation collaboratorId={collaboratorId} specialityId={specialityId} />
        <CollaboratorSkillOperation collaboratorId={collaboratorId} specialityId={specialityId} skillId={skillId} levelId={levelId} />
        <PlanningOperation projectId={projectId} periodId={periodId} />
        <ServiceEnvironmentOperation environments={environments} />
        <ServiceMetadataOperation metadata={metadata} />
      </div>
    </section>
  );
}

function OperationCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="operation-card">
      <p className="eyebrow">API operation</p>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {children}
    </article>
  );
}

function ActionMessage({ error, result }: { error: string | null; result: unknown }) {
  if (error) return <p className="form-error">{error}</p>;
  return result === null ? null : <pre className="action-result">{JSON.stringify(result, null, 2)}</pre>;
}

function CollaboratorSpecialityOperation({ collaboratorId, specialityId }: { collaboratorId: Id; specialityId: Id }) {
  const action = useApiAction<CollaboratorSpeciality>();
  return (
    <OperationCard title="Assign speciality to collaborator" description="POST collaborator/specialities">
      <button className="button primary" onClick={() => {
        if (collaboratorId && specialityId) void action.execute(() => collaboratorsApi.createSpeciality(collaboratorId, { speciality: { id: specialityId } }));
      }} disabled={action.loading || !collaboratorId || !specialityId}>
        {action.loading ? 'Guardando...' : 'Asignar'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function CollaboratorSkillOperation({ collaboratorId, specialityId, skillId, levelId }: { collaboratorId: Id; specialityId: Id; skillId: Id; levelId: Id }) {
  const action = useApiAction<CollaboratorSpecialitySkill>();
  return (
    <OperationCard title="Assign skill level" description="PATCH collaborator speciality skill">
      <button className="button primary" onClick={() => {
        if (collaboratorId && specialityId && skillId && levelId) void action.execute(() => collaboratorsApi.patchSpecialitySkill(collaboratorId, specialityId, skillId, { level: { id: levelId } }));
      }} disabled={action.loading || !collaboratorId || !specialityId || !skillId || !levelId}>
        {action.loading ? 'Guardando...' : 'Asignar nivel'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function PlanningOperation({ projectId, periodId }: { projectId: Id; periodId: Id }) {
  const action = useApiAction<unknown>();
  const [name, setName] = useState('');
  return (
    <OperationCard title="Create project planning" description="Crea una planeación con un periodo seleccionado.">
      <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="button primary" onClick={() => {
        if (projectId && periodId && name.trim()) void action.execute(() => projectsApi.createPlanning(projectId, { name, period: { id: periodId } }));
      }} disabled={action.loading || !projectId || !periodId || !name.trim()}>
        {action.loading ? 'Guardando...' : 'Crear planeación'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function ServiceEnvironmentOperation({ environments }: { environments: Environment[] }) {
  const action = useApiAction<ServiceEnvironmentRelation>();
  const [serviceId, setServiceId] = useState('');
  const [environmentId, setEnvironmentId] = useState<Id>();
  return (
    <OperationCard title="Assign service environment" description="El servicio se identifica por ID; el ambiente se elige del catálogo.">
      <Field label="Service ID" type="number" min="1" value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
      <SelectField label="Environment" value={environmentId ?? ''} options={optionsOf(environments, (item) => item.name)} onChange={(e) => setEnvironmentId(idOf(e.target.value))} />
      <button className="button primary" onClick={() => {
        if (serviceId && environmentId) void action.execute(() => servicesApi.assignServiceEnvironment(Number(serviceId), environmentId));
      }} disabled={action.loading || !serviceId || !environmentId}>
        {action.loading ? 'Guardando...' : 'Asignar'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function ServiceMetadataOperation({ metadata }: { metadata: ServiceMetadata[] }) {
  const action = useApiAction<ServiceMetadataRelation>();
  const [serviceId, setServiceId] = useState('');
  const [metadataId, setMetadataId] = useState<Id>();
  const [detail, setDetail] = useState('');
  return (
    <OperationCard title="Assign service metadata" description="Metadata seleccionada del catálogo con detalle requerido.">
      <Field label="Service ID" type="number" min="1" value={serviceId} onChange={(e) => setServiceId(e.target.value)} />
      <SelectField label="Metadata" value={metadataId ?? ''} options={optionsOf(metadata, (item) => item.name)} onChange={(e) => setMetadataId(idOf(e.target.value))} />
      <Field label="Detalle" value={detail} onChange={(e) => setDetail(e.target.value)} />
      <button className="button primary" onClick={() => {
        if (serviceId && metadataId && detail.trim()) void action.execute(() => servicesApi.assignServiceMetadata(Number(serviceId), metadataId, detail));
      }} disabled={action.loading || !serviceId || !metadataId || !detail.trim()}>
        {action.loading ? 'Guardando...' : 'Asignar'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}
