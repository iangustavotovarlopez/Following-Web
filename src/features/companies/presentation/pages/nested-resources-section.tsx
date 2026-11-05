import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  companiesApi,
  type Branch,
  type Company,
  type Deliverable,
  type DeliverablePatchRequest,
  type Fraction,
  type Period,
  type PeriodPatchRequest,
  type Section,
  type Skill,
  type SkillLevel,
  type Speciality,
  type Subperiod,
  type Team,
} from '../../infrastructure/api';
import { collaboratorsApi, type Collaborator } from '../../../collaborators/infrastructure/api';
import { ApiSection } from '../../../../shared/components/api-section';
import { Field } from '../../../../shared/components/field';
import { SelectField } from '../../../../shared/components/select-field';
import { SubmitButton } from '../../../../shared/components/submit-button';
import { useApiAction } from '../../../../shared/hooks/use-api-action';

type Id = number | undefined;

interface ApiActionState<T> {
  loading: boolean;
  error: string | null;
  result: T | null;
  execute: (action: () => Promise<T | null>) => Promise<T | null>;
}

const idOf = (value: string) => (value ? Number(value) : undefined);
const optionsOf = <T extends { id: number }>(
  values: T[],
  label: (value: T) => string,
) => values.map((value) => ({ value: value.id, label: label(value) }));

function OperationCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="operation-card">
      <div>
        <p className="eyebrow">POST</p>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      {children}
    </article>
  );
}

function ActionMessage({ error, result }: { error: string | null; result: unknown }) {
  if (error) {
    return <p className="form-error">{error}</p>;
  }
  if (result === null) {
    return null;
  }
  return <pre className="action-result">{JSON.stringify(result, null, 2)}</pre>;
}

export function NestedResourcesSection() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subperiods, setSubperiods] = useState<Subperiod[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [fractions, setFractions] = useState<Fraction[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [levels, setLevels] = useState<SkillLevel[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  const [companyId, setCompanyId] = useState<Id>();
  const [periodId, setPeriodId] = useState<Id>();
  const [subperiodId, setSubperiodId] = useState<Id>();
  const [branchId, setBranchId] = useState<Id>();
  const [specialityId, setSpecialityId] = useState<Id>();
  const [sectionId, setSectionId] = useState<Id>();
  const [skillId, setSkillId] = useState<Id>();
  const [teamId, setTeamId] = useState<Id>();
  const [collaboratorId, setCollaboratorId] = useState<Id>();

  useEffect(() => {
    Promise.all([
      companiesApi.listCompanies({ page: 1, pageSize: 100 }),
      collaboratorsApi.listCollaborators({ page: 1, pageSize: 100 }),
    ]).then(([companyResponse, collaboratorResponse]) => {
      setCompanies(companyResponse?.content ?? []);
      setCollaborators(collaboratorResponse?.content ?? []);
    });
  }, []);

  useEffect(() => {
    setPeriods([]);
    setPeriodId(undefined);
    setBranches([]);
    setBranchId(undefined);
    if (!companyId) return;
    Promise.all([
      companiesApi.listPeriods(companyId, { page: 1, pageSize: 100 }),
      companiesApi.listBranches(companyId, { page: 1, pageSize: 100 }),
    ]).then(([periodResponse, branchResponse]) => {
      setPeriods(periodResponse?.content ?? []);
      setBranches(branchResponse?.content ?? []);
    });
  }, [companyId]);

  useEffect(() => {
    setSubperiods([]);
    setSubperiodId(undefined);
    if (!companyId || !periodId) return;
    companiesApi
      .listSubperiods(companyId, periodId, { page: 1, pageSize: 100 })
      .then((response) => setSubperiods(response?.content ?? []));
  }, [companyId, periodId]);

  useEffect(() => {
    setSpecialities([]);
    setSpecialityId(undefined);
    if (!companyId || !branchId) return;
    companiesApi
      .listSpecialities(companyId, branchId, { page: 1, pageSize: 100 })
      .then((response) => setSpecialities(response?.content ?? []));
  }, [companyId, branchId]);

  useEffect(() => {
    setSections([]);
    setSectionId(undefined);
    if (!companyId || !periodId || !subperiodId) return;
    companiesApi
      .listSections(companyId, periodId, subperiodId, { page: 1, pageSize: 100 })
      .then((response) => setSections(response?.content ?? []));
  }, [companyId, periodId, subperiodId]);

  useEffect(() => {
    setFractions([]);
    if (!companyId || !periodId || !subperiodId || !sectionId) return;
    companiesApi
      .listFractions(companyId, periodId, subperiodId, sectionId, { page: 1, pageSize: 100 })
      .then((response) => setFractions(response?.content ?? []));
  }, [companyId, periodId, subperiodId, sectionId]);

  useEffect(() => {
    setSkills([]);
    setSkillId(undefined);
    setTeams([]);
    setTeamId(undefined);
    setDeliverables([]);
    if (!companyId || !branchId || !specialityId) return;
    Promise.all([
      companiesApi.listSkills(companyId, branchId, specialityId, { page: 1, pageSize: 100 }),
      companiesApi.listTeams(companyId, branchId, specialityId, { page: 1, pageSize: 100 }),
      companiesApi.listDeliverables(companyId, branchId, specialityId, { page: 1, pageSize: 100 }),
    ]).then(([skillResponse, teamResponse, deliverableResponse]) => {
      setSkills(skillResponse?.content ?? []);
      setTeams(teamResponse?.content ?? []);
      setDeliverables(deliverableResponse?.content ?? []);
    });
  }, [companyId, branchId, specialityId]);

  useEffect(() => {
    setLevels([]);
    if (!companyId || !branchId || !specialityId || !skillId) return;
    companiesApi
      .listSkillLevels(companyId, branchId, specialityId, skillId, { page: 1, pageSize: 100 })
      .then((response) => setLevels(response?.content ?? []));
  }, [companyId, branchId, specialityId, skillId]);

  return (
    <section className="resource-section operations-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Relaciones</p>
          <h2>Nested resources</h2>
          <p className="muted">
            Los selectores se alimentan de los GET de la API y evitan capturar IDs manualmente.
          </p>
        </div>
      </div>

      <div className="selector-bar">
        <SelectField
          label="Company"
          value={companyId ?? ''}
          options={optionsOf(companies, (item) => item.name)}
          onChange={(event) => setCompanyId(idOf(event.target.value))}
        />
        <SelectField
          label="Period"
          value={periodId ?? ''}
          options={optionsOf(periods, (item) => item.name)}
          onChange={(event) => setPeriodId(idOf(event.target.value))}
        />
        <SelectField
          label="Subperiod"
          value={subperiodId ?? ''}
          options={optionsOf(subperiods, (item) => item.name)}
          onChange={(event) => setSubperiodId(idOf(event.target.value))}
        />
        <SelectField
          label="Branch"
          value={branchId ?? ''}
          options={optionsOf(branches, (item) => item.name)}
          onChange={(event) => setBranchId(idOf(event.target.value))}
        />
        <SelectField
          label="Speciality"
          value={specialityId ?? ''}
          options={optionsOf(specialities, (item) => item.name)}
          onChange={(event) => setSpecialityId(idOf(event.target.value))}
        />
        <SelectField
          label="Section"
          value={sectionId ?? ''}
          options={optionsOf(sections, (item) => item.name)}
          onChange={(event) => setSectionId(idOf(event.target.value))}
        />
        <SelectField
          label="Skill"
          value={skillId ?? ''}
          options={optionsOf(skills, (item) => item.name)}
          onChange={(event) => setSkillId(idOf(event.target.value))}
        />
        <SelectField
          label="Team"
          value={teamId ?? ''}
          options={optionsOf(teams, (item) => item.name)}
          onChange={(event) => setTeamId(idOf(event.target.value))}
        />
      </div>

      <div className="operation-grid">
        <PeriodOperation
          companyId={companyId}
          onCreated={(period) => {
            setPeriods((current) => current.some((item) => item.id === period.id) ? current : [...current, period]);
            setPeriodId(period.id);
          }}
        />
        <PeriodPatchOperation
          companyId={companyId}
          periods={periods}
          onUpdated={(period) => setPeriods((current) => current.map((item) => item.id === period.id ? period : item))}
        />
        <SubperiodOperation
          companyId={companyId}
          periodId={periodId}
          onCreated={(subperiod) => {
            setSubperiods((current) => current.some((item) => item.id === subperiod.id) ? current : [...current, subperiod]);
            setSubperiodId(subperiod.id);
          }}
        />
        <BranchOperation
          companyId={companyId}
          onCreated={(branch) => {
            setBranches((current) =>
              current.some((item) => item.id === branch.id) ? current : [...current, branch],
            );
            setBranchId(branch.id);
          }}
        />
        <SpecialityOperation
          companyId={companyId}
          branchId={branchId}
          onCreated={(speciality) => {
            setSpecialities((current) => current.some((item) => item.id === speciality.id) ? current : [...current, speciality]);
            setSpecialityId(speciality.id);
          }}
        />
        <SectionOperation
          companyId={companyId}
          periodId={periodId}
          subperiodId={subperiodId}
          onCreated={(section) => {
            setSections((current) => current.some((item) => item.id === section.id) ? current : [...current, section]);
            setSectionId(section.id);
          }}
        />
        <FractionOperation
          companyId={companyId}
          periodId={periodId}
          subperiodId={subperiodId}
          sectionId={sectionId}
        />
        <SkillOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          onCreated={(skill) => {
            setSkills((current) => current.some((item) => item.id === skill.id) ? current : [...current, skill]);
            setSkillId(skill.id);
          }}
        />
        <LevelOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          skillId={skillId}
        />
        <TeamOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          onCreated={(team) => {
            setTeams((current) => current.some((item) => item.id === team.id) ? current : [...current, team]);
            setTeamId(team.id);
          }}
        />
        <DeliverableOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          onCreated={(deliverable) => setDeliverables((current) =>
            current.some((item) => item.id === deliverable.id) ? current : [...current, deliverable],
          )}
        />
        <DeliverablePatchOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          deliverables={deliverables}
          onUpdated={(deliverable) => setDeliverables((current) => current.map((item) =>
            item.id === deliverable.id ? deliverable : item,
          ))}
        />
        <TeamMemberOperation
          companyId={companyId}
          branchId={branchId}
          specialityId={specialityId}
          teamId={teamId}
          collaborators={collaborators}
          collaboratorId={collaboratorId}
          setCollaboratorId={setCollaboratorId}
        />
      </div>
    </section>
  );
}

function OperationForm<T>({
  title,
  children,
  onSubmit,
  action,
}: {
  title: string;
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
  action: ApiActionState<T>;
}) {
  return (
    <OperationCard title={title} description="Completa los campos y ejecuta el POST.">
      <form className="operation-form" onSubmit={onSubmit}>
        {children}
        <SubmitButton loading={action.loading}>Guardar</SubmitButton>
        <ActionMessage error={action.error} result={action.result} />
      </form>
    </OperationCard>
  );
}

function PeriodOperation({ companyId, onCreated }: {
  companyId: Id;
  onCreated?: (period: Period) => void;
}) {
  const action = useApiAction<Period>();
  const [form, setForm] = useState({ name: '', code: '', startDate: '', endDate: '' });
  return (
    <OperationForm
      title="Create period"
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        if (!companyId) return;
        void action.execute(() => companiesApi.createPeriod(companyId, form)).then((period) => {
          if (period) onCreated?.(period);
        });
      }}
    >
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Inicio" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      <Field label="Fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
    </OperationForm>
  );
}

function PeriodPatchOperation({ companyId, periods, onUpdated }: {
  companyId: Id;
  periods: Period[];
  onUpdated?: (period: Period) => void;
}) {
  const action = useApiAction<Period>();
  const [periodId, setPeriodId] = useState<Id>();
  const [form, setForm] = useState<PeriodPatchRequest>({});
  return (
    <OperationForm title="Update period" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && periodId) {
        void action.execute(() => companiesApi.patchPeriod(companyId, periodId, form)).then((period) => {
          if (period) onUpdated?.(period);
        });
      }
    }}>
      <SelectField label="Periodo" value={periodId ?? ''} options={optionsOf(periods, (item) => item.name)} onChange={(event) => {
        const period = periods.find((item) => item.id === idOf(event.target.value));
        setPeriodId(period?.id);
        setForm(period ? { name: period.name, code: period.code, startDate: period.startDate, endDate: period.endDate, isActive: period.isActive } : {});
      }} required />
      <Field label="Nombre" value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Field label="Código" value={form.code ?? ''} onChange={(event) => setForm({ ...form, code: event.target.value })} />
      <Field label="Inicio" type="date" value={form.startDate ?? ''} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
      <Field label="Fin" type="date" value={form.endDate ?? ''} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
      <SelectField label="Activo" value={form.isActive === undefined ? '' : String(form.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })} />
    </OperationForm>
  );
}

function SubperiodOperation({ companyId, periodId, onCreated }: {
  companyId: Id;
  periodId: Id;
  onCreated?: (subperiod: Subperiod) => void;
}) {
  const action = useApiAction<Subperiod>();
  const [form, setForm] = useState({ name: '', code: '', startDate: '', endDate: '' });
  return (
    <OperationForm title="Create subperiod" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && periodId) {
        void action.execute(() => companiesApi.createSubperiod(companyId, periodId, form)).then((subperiod) => {
          if (subperiod) onCreated?.(subperiod);
        });
      }
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Inicio" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      <Field label="Fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
    </OperationForm>
  );
}

function BranchOperation({
  companyId,
  onCreated,
}: {
  companyId: Id;
  onCreated: (branch: Branch) => void;
}) {
  const action = useApiAction<Branch>();
  const [form, setForm] = useState({ name: '', description: '' });
  return (
    <OperationForm title="Create branch" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId) {
        void action.execute(() => companiesApi.createBranch(companyId, form)).then((branch) => {
          if (branch) onCreated(branch);
        });
      }
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    </OperationForm>
  );
}

function SpecialityOperation({ companyId, branchId, onCreated }: {
  companyId: Id;
  branchId: Id;
  onCreated?: (speciality: Speciality) => void;
}) {
  const action = useApiAction<Speciality>();
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  return (
    <OperationForm title="Create speciality" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId) {
        void action.execute(() => companiesApi.createSpeciality(companyId, branchId, form)).then((speciality) => {
          if (speciality) onCreated?.(speciality);
        });
      }
    }}>
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    </OperationForm>
  );
}

function SectionOperation({ companyId, periodId, subperiodId, onCreated }: {
  companyId: Id;
  periodId: Id;
  subperiodId: Id;
  onCreated?: (section: Section) => void;
}) {
  const action = useApiAction<Section>();
  const [form, setForm] = useState({ name: '', code: '', startDate: '', endDate: '' });
  return (
    <OperationForm title="Create section" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && periodId && subperiodId) {
        void action.execute(() => companiesApi.createSection(companyId, periodId, subperiodId, form)).then((section) => {
          if (section) onCreated?.(section);
        });
      }
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Inicio" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      <Field label="Fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
    </OperationForm>
  );
}

function FractionOperation({ companyId, periodId, subperiodId, sectionId }: { companyId: Id; periodId: Id; subperiodId: Id; sectionId: Id }) {
  const action = useApiAction<Fraction>();
  const [form, setForm] = useState({ name: '', code: '', startDate: '', endDate: '' });
  return (
    <OperationForm title="Create fraction" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && periodId && subperiodId && sectionId) void action.execute(() => companiesApi.createFraction(companyId, periodId, subperiodId, sectionId, form));
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Inicio" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      <Field label="Fin" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
    </OperationForm>
  );
}

function SkillOperation({ companyId, branchId, specialityId, onCreated }: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
  onCreated?: (skill: Skill) => void;
}) {
  const action = useApiAction<Skill>();
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  return (
    <OperationForm title="Create skill" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId) {
        void action.execute(() => companiesApi.createSkill(companyId, branchId, specialityId, form)).then((skill) => {
          if (skill) onCreated?.(skill);
        });
      }
    }}>
      <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
    </OperationForm>
  );
}

function LevelOperation({ companyId, branchId, specialityId, skillId }: { companyId: Id; branchId: Id; specialityId: Id; skillId: Id }) {
  const action = useApiAction<SkillLevel>();
  const [form, setForm] = useState({ name: '', number: 0 });
  return (
    <OperationForm title="Create skill level" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId && skillId) void action.execute(() => companiesApi.createSkillLevel(companyId, branchId, specialityId, skillId, form));
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Número" type="number" min="0" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} required />
    </OperationForm>
  );
}

function TeamOperation({ companyId, branchId, specialityId, onCreated }: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
  onCreated?: (team: Team) => void;
}) {
  const action = useApiAction<Team>();
  const [name, setName] = useState('');
  return (
    <OperationForm title="Create team" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId) {
        void action.execute(() => companiesApi.createTeam(companyId, branchId, specialityId, { name })).then((team) => {
          if (team) onCreated?.(team);
        });
      }
    }}>
      <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
    </OperationForm>
  );
}

function DeliverableOperation({ companyId, branchId, specialityId, onCreated }: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
  onCreated?: (deliverable: Deliverable) => void;
}) {
  const action = useApiAction<Deliverable>();
  const [form, setForm] = useState({ name: '', description: '', sequence: 1 });
  return (
    <OperationForm title="Create deliverable" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId) {
        void action.execute(() => companiesApi.createDeliverable(companyId, branchId, specialityId, form)).then((deliverable) => {
          if (deliverable) onCreated?.(deliverable);
        });
      }
    }}>
      <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <Field label="Secuencia" type="number" min="1" value={form.sequence} onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })} required />
    </OperationForm>
  );
}

function DeliverablePatchOperation({ companyId, branchId, specialityId, deliverables, onUpdated }: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
  deliverables: Deliverable[];
  onUpdated?: (deliverable: Deliverable) => void;
}) {
  const action = useApiAction<Deliverable>();
  const [deliverableId, setDeliverableId] = useState<Id>();
  const [form, setForm] = useState<DeliverablePatchRequest>({});
  return (
    <OperationForm title="Update deliverable" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId && deliverableId) {
        void action.execute(() => companiesApi.patchDeliverable(companyId, branchId, specialityId, deliverableId, form)).then((deliverable) => {
          if (deliverable) onUpdated?.(deliverable);
        });
      }
    }}>
      <SelectField label="Entregable" value={deliverableId ?? ''} options={optionsOf(deliverables, (item) => item.name)} onChange={(event) => {
        const item = deliverables.find((candidate) => candidate.id === idOf(event.target.value));
        setDeliverableId(item?.id);
        setForm(item ? { name: item.name, description: item.description, sequence: item.sequence, isActive: item.isActive } : {});
      }} required />
      <Field label="Nombre" value={form.name ?? ''} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Field label="Descripción" value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <Field label="Secuencia" type="number" min="1" value={form.sequence ?? ''} onChange={(event) => setForm({ ...form, sequence: Number(event.target.value) })} />
      <SelectField label="Activo" value={form.isActive === undefined ? '' : String(form.isActive)} options={[{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }]} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })} />
    </OperationForm>
  );
}

function TeamMemberOperation({
  companyId,
  branchId,
  specialityId,
  teamId,
  collaborators,
  collaboratorId,
  setCollaboratorId,
}: {
  companyId: Id;
  branchId: Id;
  specialityId: Id;
  teamId: Id;
  collaborators: Collaborator[];
  collaboratorId: Id;
  setCollaboratorId: (value: Id) => void;
}) {
  const action = useApiAction<unknown>();
  return (
    <OperationForm title="Assign team member" action={action} onSubmit={(event) => {
      event.preventDefault();
      if (companyId && branchId && specialityId && teamId && collaboratorId) {
        void action.execute(() => companiesApi.createTeamMember(companyId, branchId, specialityId, teamId, { collaborator: { id: collaboratorId } }));
      }
    }}>
      <SelectField
        label="Collaborator"
        value={collaboratorId ?? ''}
        options={optionsOf(collaborators, (item) => item.name)}
        onChange={(event) => setCollaboratorId(idOf(event.target.value))}
      />
    </OperationForm>
  );
}
