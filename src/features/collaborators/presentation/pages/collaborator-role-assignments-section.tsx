import { useEffect, useState, type FormEvent } from 'react';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorRole,
} from '../../infrastructure/api';
import { Field } from '../../../../shared/components/field';
import { SubmitButton } from '../../../../shared/components/submit-button';

async function loadRoles(): Promise<CollaboratorRole[]> {
  let page = 1;
  let totalPages = 1;
  const roles: CollaboratorRole[] = [];

  while (page <= totalPages) {
    const response = await collaboratorsApi.listRoles({ page, pageSize: 100 });
    if (!response) break;
    roles.push(...response.content);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return roles;
}

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

export function CollaboratorRoleAssignmentsSection() {
  const [collaboratorQuery, setCollaboratorQuery] = useState('');
  const [collaboratorMatches, setCollaboratorMatches] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [collaboratorSearching, setCollaboratorSearching] = useState(false);
  const [collaboratorSearchError, setCollaboratorSearchError] = useState<string | null>(null);
  const [roles, setRoles] = useState<CollaboratorRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roleQuery, setRoleQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadRoles()
      .then((response) => {
        if (active) setRoles(response);
      })
      .catch((cause) => {
        if (active) {
          setRolesError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo de roles');
        }
      })
      .finally(() => {
        if (active) setRolesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = collaboratorQuery.trim();
    if (selectedCollaborator || query.length < 3) {
      setCollaboratorMatches([]);
      setCollaboratorSearching(false);
      setCollaboratorSearchError(null);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setCollaboratorSearching(true);
      setCollaboratorSearchError(null);
      collaboratorsApi
        .listCollaborators({ code: query, page: 1, pageSize: 20 })
        .then((response) => {
          if (active) {
            setCollaboratorMatches(
              (response?.content ?? []).filter((collaborator) =>
                collaborator.code.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
              ),
            );
          }
        })
        .catch((cause) => {
          if (active) {
            setCollaboratorSearchError(
              cause instanceof Error ? cause.message : 'No se pudo buscar el colaborador',
            );
          }
        })
        .finally(() => {
          if (active) setCollaboratorSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [collaboratorQuery, selectedCollaborator]);

  const roleMatches = roleQuery.trim()
    ? roles
        .filter((role) => role.code.toLocaleLowerCase().includes(roleQuery.trim().toLocaleLowerCase()))
        .slice(0, 8)
    : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCollaborator || !selectedRole) return;
    setSaving(true);
    setError(null);
    setResult(null);

    try {
      await collaboratorsApi.createRoleRelation(selectedCollaborator.id, {
        role: { id: selectedRole.id },
      });
      setResult(`Rol ${selectedRole.code} asignado a ${selectedCollaborator.code}.`);
      setSelectedCollaborator(null);
      setCollaboratorQuery('');
      setCollaboratorMatches([]);
      setSelectedRole(null);
      setRoleQuery('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo asignar el rol');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="resource-section role-assignment-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">API relation</p>
          <h2>Asignación de roles</h2>
          <p className="muted">Relaciona un colaborador y un rol existentes mediante sus códigos.</p>
        </div>
        <div className="form-stack">
          <form className="inline-form" onSubmit={submit}>
            <div className="role-search-field">
              <Field
                label="Buscar colaborador por código"
                value={selectedCollaborator?.code ?? collaboratorQuery}
                onChange={(event) => {
                  setSelectedCollaborator(null);
                  setCollaboratorQuery(event.target.value);
                  setCollaboratorMatches([]);
                }}
                placeholder="Escribe al menos 3 caracteres"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={!selectedCollaborator && collaboratorMatches.length > 0}
                aria-controls="collaborator-role-matches"
                required
              />
              {selectedCollaborator && (
                <div className="search-selection">
                  <strong>{collaboratorName(selectedCollaborator)}</strong>
                  <span>{selectedCollaborator.code} · {selectedCollaborator.company.name}</span>
                </div>
              )}
              {!selectedCollaborator && collaboratorQuery.trim().length >= 3 && (
                <ul className="role-search-results" id="collaborator-role-matches" role="listbox">
                  {collaboratorSearching && <li className="search-feedback">Buscando colaboradores...</li>}
                  {collaboratorSearchError && <li className="search-feedback error-text">{collaboratorSearchError}</li>}
                  {!collaboratorSearching && !collaboratorSearchError && collaboratorMatches.length === 0 && (
                    <li className="search-feedback">No se encontraron colaboradores.</li>
                  )}
                  {collaboratorMatches.map((collaborator) => (
                    <li key={collaborator.id} role="presentation">
                      <button
                        className="role-search-option"
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          setSelectedCollaborator(collaborator);
                          setCollaboratorQuery(collaborator.code);
                          setCollaboratorMatches([]);
                        }}
                      >
                        <strong>{collaborator.code}</strong>
                        <span>{collaboratorName(collaborator)} · {collaborator.company.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="role-search-field">
              <Field
                label="Buscar rol por código"
                value={selectedRole?.code ?? roleQuery}
                onChange={(event) => {
                  setSelectedRole(null);
                  setRoleQuery(event.target.value);
                }}
                placeholder={rolesLoading ? 'Cargando roles...' : 'Escribe parte del código'}
                autoComplete="off"
                disabled={rolesLoading || Boolean(rolesError)}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={!selectedRole && roleMatches.length > 0}
                aria-controls="collaborator-role-options"
              />
              {selectedRole && (
                <div className="search-selection">
                  <strong>{selectedRole.name}</strong>
                  <span>{selectedRole.code}</span>
                </div>
              )}
              {!selectedRole && roleQuery.trim() && (
                <ul className="role-search-results" id="collaborator-role-options" role="listbox">
                  {roleMatches.length === 0 && !rolesLoading && (
                    <li className="search-feedback">No se encontraron roles con ese código.</li>
                  )}
                  {roleMatches.map((role) => (
                    <li key={role.id} role="presentation">
                      <button
                        className="role-search-option"
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          setSelectedRole(role);
                          setRoleQuery(role.code);
                        }}
                      >
                        <strong>{role.code}</strong>
                        <span>{role.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <SubmitButton loading={saving} disabled={!selectedCollaborator || !selectedRole}>Asignar rol</SubmitButton>
            {rolesError && <span className="form-error">{rolesError}</span>}
            {error && <span className="form-error">{error}</span>}
            {result && <span className="form-success">{result}</span>}
          </form>
        </div>
      </div>
    </section>
  );
}