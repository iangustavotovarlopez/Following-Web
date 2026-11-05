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
  type Planning,
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
  const [plannings, setPlannings] = useState<Planning[]>([]);
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
  const [planningId, setPlanningId] = useState<Id>();
  const [planningSubperiodId, setPlanningSubperiodId] = useState<Id>();
  const [planningSectionId, setPlanningSectionId] = useState<Id>();
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

  useEffect(() => {
    setPlannings([]);
    setPlanningId(undefined);
    setPlanningSubperiodId(undefined);
    setPlanningSectionId(undefined);
    if (!projectId) return;
    projectsApi.listPlanning(projectId).then((response) => setPlannings(response ?? []));
  }, [projectId]);

  const selectedPlanning = plannings.find((item) => item.id === planningId);
  const planningSubperiods = selectedPlanning?.periods.flatMap((item) => item.subperiods) ?? [];
  const planningSections = planningSubperiods.flatMap((item) => item.sections);

  function refreshPlannings() {
    if (projectId) {
      projectsApi.listPlanning(projectId).then((response) => setPlannings(response ?? []));
    }
  }

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
        <SelectField label="Planning" value={planningId ?? ''} options={optionsOf(plannings, (item) => item.name)} onChange={(e) => {
          setPlanningId(idOf(e.target.value));
          setPlanningSubperiodId(undefined);
          setPlanningSectionId(undefined);
        }} />
        <SelectField label="Planning subperiod" value={planningSubperiodId ?? ''} options={optionsOf(planningSubperiods, (item) => item.name)} onChange={(e) => {
          setPlanningSubperiodId(idOf(e.target.value));
          setPlanningSectionId(undefined);
        }} />
        <SelectField label="Planning section" value={planningSectionId ?? ''} options={optionsOf(planningSections, (item) => item.name)} onChange={(e) => setPlanningSectionId(idOf(e.target.value))} />
        <SelectField label="Skill" value={skillId ?? ''} options={optionsOf(skills, (item) => item.name)} onChange={(e) => setSkillId(idOf(e.target.value))} />
        <SelectField label="Level" value={levelId ?? ''} options={optionsOf(levels, (item) => item.name)} onChange={(e) => setLevelId(idOf(e.target.value))} />
      </div>

      <div className="operation-grid">
        <CollaboratorSpecialityOperation collaboratorId={collaboratorId} specialityId={specialityId} />
        <CollaboratorSkillOperation collaboratorId={collaboratorId} specialityId={specialityId} skillId={skillId} levelId={levelId} />
        <PlanningOperation projectId={projectId} periodId={periodId} onCreated={refreshPlannings} />
        <PlanningPeriodOperation projectId={projectId} planningId={planningId} periods={periods} onCreated={refreshPlannings} />
        <PlanningSectionOperation projectId={projectId} planningId={planningId} subperiodId={planningSubperiodId} sections={planningSections} onCreated={refreshPlannings} />
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

function PlanningOperation({ projectId, periodId, onCreated }: { projectId: Id; periodId: Id; onCreated: () => void }) {
  const action = useApiAction<unknown>();
  const [name, setName] = useState('');
  return (
    <OperationCard title="Create project planning" description="Crea una planeación con un periodo seleccionado.">
      <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="button primary" onClick={() => {
        if (projectId && periodId && name.trim()) {
          void action.execute(async () => {
            const result = await projectsApi.createPlanning(projectId, { name, period: { id: periodId } });
            onCreated();
            return result;
          });
        }
      }} disabled={action.loading || !projectId || !periodId || !name.trim()}>
        {action.loading ? 'Guardando...' : 'Crear planeación'}
      </button>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function PlanningPeriodOperation({ projectId, planningId, periods, onCreated }: {
  projectId: Id;
  planningId: Id;
  periods: Period[];
  onCreated: () => void;
}) {
  const action = useApiAction<unknown>();
  const [periodId, setPeriodId] = useState<Id>();
  const [isAdditional, setIsAdditional] = useState(false);
  return (
    <OperationCard title="Add planning period" description="Asocia un periodo existente a la planeación seleccionada.">
      <form className="operation-form" onSubmit={(event) => {
        event.preventDefault();
        if (!projectId || !planningId || !periodId) return;
        void action.execute(async () => {
          const result = await projectsApi.addPlanningPeriod(projectId, planningId, {
            period: { id: periodId },
            isAdditional,
          });
          onCreated();
          return result;
        });
      }}>
        <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => setPeriodId(idOf(event.target.value))} required />
        <SelectField label="Adicional" value={String(isAdditional)} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }]} onChange={(event) => setIsAdditional(event.target.value === 'true')} />
        <SubmitButton loading={action.loading} disabled={!projectId || !planningId || !periodId}>Agregar periodo</SubmitButton>
      </form>
      <ActionMessage error={action.error} result={action.result} />
    </OperationCard>
  );
}

function PlanningSectionOperation({ projectId, planningId, subperiodId, sections, onCreated }: {
  projectId: Id;
  planningId: Id;
  subperiodId: Id;
  sections: Planning['periods'][number]['subperiods'][number]['sections'];
  onCreated: () => void;
}) {
  const action = useApiAction<unknown>();
  const [sectionId, setSectionId] = useState<Id>();
  return (
    <OperationCard title="Add planning section" description="Asocia una sección al subperiodo seleccionado.">
      <form className="operation-form" onSubmit={(event) => {
        event.preventDefault();
        if (!projectId || !planningId || !subperiodId || !sectionId) return;
        void action.execute(async () => {
          const result = await projectsApi.addPlanningSection(projectId, planningId, { subperiodId, sectionId });
          onCreated();
          return result;
        });
      }}>
        <SelectField label="Sección" value={sectionId ?? ''} options={optionsOf(sections, (item) => item.name)} onChange={(event) => setSectionId(idOf(event.target.value))} required />
        <SubmitButton loading={action.loading} disabled={!projectId || !planningId || !subperiodId || !sectionId}>Agregar sección</SubmitButton>
      </form>
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
