import { useEffect, useState } from 'react';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorRole,
  type CollaboratorRoleRelation,
  type CollaboratorSpeciality,
  type CollaboratorTechnology,
} from '../../infrastructure/api';
import { companiesApi, type Branch, type Technology } from '../../../companies/infrastructure/api';
import { ActiveBadge } from '../../../../shared/components/api-section';

type CollaboratorTechnologyDetail = CollaboratorTechnology & {
  technologyName: string;
  technologyCode: string;
};

function collaboratorName(collaborator: Collaborator) {
  return [
    collaborator.name,
    collaborator.secondName,
    collaborator.thirdName,
    collaborator.lastname,
    collaborator.secondLastname,
    collaborator.thirdLastname,
  ]
    .filter(Boolean)
    .join(' ');
}

async function loadAllRoles() {
  let page = 1;
  let totalPages = 1;
  const roles: CollaboratorRole[] = [];

  while (page <= totalPages) {
    const response = await collaboratorsApi.listRoles({ page, pageSize: 100 });
    roles.push(...(response?.content ?? []));
    totalPages = response?.pagination.totalPages ?? 0;
    page += 1;
  }

  return roles;
}

async function loadAllRoleRelations(collaboratorId: number) {
  let page = 1;
  let totalPages = 1;
  const relations: CollaboratorRoleRelation[] = [];

  while (page <= totalPages) {
    const response = await collaboratorsApi.listRoleRelations(collaboratorId, {
      page,
      pageSize: 100,
    });
    relations.push(...(response?.content ?? []));
    totalPages = response?.pagination.totalPages ?? 0;
    page += 1;
  }

  return relations;
}

async function loadAllSpecialities(collaboratorId: number) {
  let page = 1;
  let totalPages = 1;
  const specialities: CollaboratorSpeciality[] = [];

  while (page <= totalPages) {
    const response = await collaboratorsApi.listSpecialities(collaboratorId, {
      page,
      pageSize: 100,
    });
    specialities.push(...(response?.content ?? []));
    totalPages = response?.pagination.totalPages ?? 0;
    page += 1;
  }

  return specialities;
}

async function loadAllTechnologies(collaboratorId: number) {
  let page = 1;
  let totalPages = 1;
  const technologies: CollaboratorTechnology[] = [];

  while (page <= totalPages) {
    const response = await collaboratorsApi.listTechnologies(collaboratorId, { page, pageSize: 100 });
    technologies.push(...(response?.content ?? []));
    totalPages = response?.pagination.totalPages ?? 0;
    page += 1;
  }

  return technologies;
}

async function loadTechnologyCatalog(companyId: number) {
  const branchResponse = await companiesApi.listBranches(companyId, { page: 1, pageSize: 100 });
  const branches: Branch[] = branchResponse?.content ?? [];
  const technologyResponses = await Promise.all(
    branches.map((branch) => companiesApi.listTechnologies(companyId, branch.id, { page: 1, pageSize: 100 })),
  );
  return new Map<number, Technology>(technologyResponses.flatMap((response) => response?.content ?? []).map((technology) => [technology.id, technology]));
}

interface CollaboratorDetailsPageProps {
  collaboratorId: number;
  collaboratorCode: string;
}

export function CollaboratorDetailsPage({
  collaboratorId,
  collaboratorCode,
}: CollaboratorDetailsPageProps) {
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [roles, setRoles] = useState<CollaboratorRole[]>([]);
  const [relations, setRelations] = useState<CollaboratorRoleRelation[]>([]);
  const [specialities, setSpecialities] = useState<CollaboratorSpeciality[]>([]);
  const [technologies, setTechnologies] = useState<CollaboratorTechnologyDetail[]>([]);
  const [technologiesLoading, setTechnologiesLoading] = useState(true);
  const [technologiesError, setTechnologiesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTechnologiesLoading(true);
    setTechnologiesError(null);

    const collaboratorRequest = collaboratorCode.trim().length >= 3
      ? collaboratorsApi.listCollaborators({ code: collaboratorCode, page: 1, pageSize: 20 }).catch(() => null)
      : Promise.resolve(null);

    Promise.all([
      loadAllRoles(),
      loadAllRoleRelations(collaboratorId),
      loadAllSpecialities(collaboratorId),
    ])
      .then(([roleResults, relationResults, specialityResults]) => {
        if (!active) return;
        setRoles(roleResults);
        setRelations(relationResults);
        setSpecialities(specialityResults);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron consultar roles y especialidades');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    collaboratorRequest.then((response) => {
      if (active) setCollaborator(response?.content.find((item) => item.id === collaboratorId) ?? null);
    });

    Promise.all([loadAllTechnologies(collaboratorId), collaboratorRequest])
      .then(async ([technologyRelations, collaboratorResponse]) => {
        const foundCollaborator = collaboratorResponse?.content.find((item) => item.id === collaboratorId);
        const catalog = technologyRelations.length && foundCollaborator?.company.id
          ? await loadTechnologyCatalog(foundCollaborator.company.id)
          : new Map<number, Technology>();
        if (!active) return;
        setTechnologies(technologyRelations.map((relation) => {
          const technology = catalog.get(relation.technology.id);
          return {
            ...relation,
            technologyName: technology?.name ?? `Technology #${relation.technology.id}`,
            technologyCode: technology?.code ?? '—',
          };
        }));
      })
      .catch((cause) => {
        if (active) setTechnologiesError(cause instanceof Error ? cause.message : 'No se pudieron consultar las tecnologías');
      })
      .finally(() => { if (active) setTechnologiesLoading(false); });

    return () => {
      active = false;
    };
  }, [collaboratorCode, collaboratorId]);

  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const title = collaborator ? collaboratorName(collaborator) : `Colaborador ${collaboratorCode || collaboratorId}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Following Web</p>
          <h1>{title}</h1>
          <p className="collaborator-detail-summary">
            Código: {collaborator?.code ?? (collaboratorCode || 'No disponible')}
            {collaborator?.company.name ? ` · ${collaborator.company.name}` : ''}
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
              <p className="eyebrow">Detalle del colaborador</p>
              <h2>Roles</h2>
              <p className="muted">Roles relacionados con este colaborador.</p>
            </div>
          </div>

          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="empty-state">Consultando roles...</div>
          ) : error ? null : relations.length === 0 ? (
            <div className="empty-state">Este colaborador aún no tiene roles asignados.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {relations.map((relation) => {
                    const role = rolesById.get(relation.role.id);
                    return (
                      <tr key={relation.id}>
                        <td>{role?.code ?? `#${relation.role.id}`}</td>
                        <td>{role?.name ?? 'Rol no disponible en el catálogo'}</td>
                        <td><ActiveBadge active={relation.isActive} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="resource-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Detalle del colaborador</p>
              <h2>Especialidades</h2>
              <p className="muted">Especialidades relacionadas con este colaborador.</p>
            </div>
          </div>

          {error ? null : loading ? (
            <div className="empty-state">Consultando especialidades...</div>
          ) : specialities.length === 0 ? (
            <div className="empty-state">Este colaborador aún no tiene especialidades.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Especialidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {specialities.map((relation) => (
                    <tr key={relation.id}>
                      <td>{relation.speciality.name}</td>
                      <td><ActiveBadge active={relation.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="resource-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Detalle del colaborador</p>
              <h2>Tecnologías</h2>
              <p className="muted">Tecnologías asignadas a este colaborador.</p>
            </div>
          </div>

          {technologiesError && <div className="alert error">{technologiesError}</div>}
          {technologiesLoading ? (
            <div className="empty-state">Consultando tecnologías...</div>
          ) : technologiesError ? null : technologies.length === 0 ? (
            <div className="empty-state">Este colaborador aún no tiene tecnologías asignadas.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tecnología</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {technologies.map((relation) => (
                    <tr key={relation.id}>
                      <td>{relation.technologyCode}</td>
                      <td>{relation.technologyName}</td>
                      <td><ActiveBadge active={relation.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}