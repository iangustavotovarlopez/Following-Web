import { useEffect, useState } from 'react';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorRole,
  type CollaboratorRoleRelation,
} from '../../infrastructure/api';
import { ActiveBadge } from '../../../../shared/components/api-section';

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
    roles.push(...response.content);
    totalPages = response.pagination.totalPages;
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
    relations.push(...response.content);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return relations;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([loadAllRoles(), loadAllRoleRelations(collaboratorId)])
      .then(([roleResults, relationResults]) => {
        if (!active) return;
        setRoles(roleResults);
        setRelations(relationResults);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron consultar los roles');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    if (collaboratorCode.trim().length >= 3) {
      collaboratorsApi
        .listCollaborators({ code: collaboratorCode, page: 1, pageSize: 20 })
        .then((response) => {
          if (active) {
            setCollaborator(response.content.find((item) => item.id === collaboratorId) ?? null);
          }
        })
        .catch(() => {
          if (active) setCollaborator(null);
        });
    }

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
      </main>
    </div>
  );
}