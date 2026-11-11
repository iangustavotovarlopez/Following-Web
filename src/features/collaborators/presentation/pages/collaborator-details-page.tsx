import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  collaboratorsApi,
  type Collaborator,
  type CollaboratorRole,
  type CollaboratorRoleRelation,
  type CollaboratorSpeciality,
  type CollaboratorTechnology,
} from '../../infrastructure/api';
import { companiesApi, type Branch } from '../../../companies/infrastructure/api';
import { ActiveBadge } from '../../../../shared/components/api-section';
import type { PageResponse } from '../../../../shared/api';
import { ModalActions, ResourceModal } from '../../../../shared/components/resource-modal';
import { SelectField, type SelectOption } from '../../../../shared/components/select-field';

type AssignmentKind = 'role' | 'speciality' | 'technology';

const assignmentLabels: Record<AssignmentKind, string> = {
  role: 'rol',
  speciality: 'especialidad',
  technology: 'tecnología',
};

async function loadCatalogPages<T>(request: (page: number) => Promise<PageResponse<T> | null>) {
  const items: T[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await request(page);
    // List endpoints return 204 when there are no records.
    if (response === null) break;
    items.push(...response.content);
    totalPages = response.pagination.totalPages;
  }
  return items;
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

async function loadAllRoles() {
  return loadCatalogPages((page) => collaboratorsApi.listRoles({ page, pageSize: 100 }));
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
  return loadCatalogPages((page) => collaboratorsApi.listTechnologies(collaboratorId, { page, pageSize: 100 }));
}

interface CollaboratorDetailsPageProps {
  collaboratorId: number;
  collaboratorCode: string;
  inlineCollaborator?: Collaborator;
}

export function CollaboratorDetailsPage({
  collaboratorId,
  collaboratorCode,
  inlineCollaborator,
}: CollaboratorDetailsPageProps) {
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [roles, setRoles] = useState<CollaboratorRole[]>([]);
  const [relations, setRelations] = useState<CollaboratorRoleRelation[]>([]);
  const [specialities, setSpecialities] = useState<CollaboratorSpeciality[]>([]);
  const [technologies, setTechnologies] = useState<CollaboratorTechnology[]>([]);
  const [technologiesLoading, setTechnologiesLoading] = useState(true);
  const [technologiesError, setTechnologiesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentKind, setAssignmentKind] = useState<AssignmentKind | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setTechnologiesLoading(true);
    setTechnologiesError(null);

    const collaboratorRequest = inlineCollaborator
      ? Promise.resolve(inlineCollaborator)
      : collaboratorCode.trim().length >= 3
        ? collaboratorsApi.listCollaborators({ code: collaboratorCode, page: 1, pageSize: 20 })
          .then((response) => response?.content.find((item) => item.id === collaboratorId) ?? null)
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

    collaboratorRequest.then((result) => {
      if (active) setCollaborator(result);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el colaborador');
    });

    loadAllTechnologies(collaboratorId)
      .then((technologyRelations) => {
        if (active) setTechnologies(technologyRelations);
      })
      .catch((cause) => {
        if (active) setTechnologiesError(cause instanceof Error ? cause.message : 'No se pudieron consultar las tecnologías');
      })
      .finally(() => { if (active) setTechnologiesLoading(false); });

    return () => {
      active = false;
    };
  }, [collaboratorCode, collaboratorId, inlineCollaborator, revision]);

  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const title = collaborator ? collaboratorName(collaborator) : `Colaborador ${collaboratorCode || collaboratorId}`;
  const selectedCollaborator = inlineCollaborator ?? collaborator;
  const canAssign = Boolean(selectedCollaborator
    && selectedCollaborator.state.name.trim().toUpperCase() !== 'INACTIVO');
  const specialitiesMissingBranch = specialities.some((relation) => !relation.speciality.branch?.name?.trim());
  const technologiesMissingBranch = technologies.some((relation) => !relation.technology.branch?.name?.trim());
  const assignedIds = assignmentKind === 'role'
    ? relations.filter((relation) => relation.isActive).map((relation) => relation.role.id)
    : assignmentKind === 'speciality'
      ? specialities.filter((relation) => relation.isActive).map((relation) => relation.speciality.id)
      : technologies.filter((relation) => relation.isActive).map((relation) => relation.technology.id);

  return (
    <div className={inlineCollaborator ? 'collaborator-inline-details' : 'app-shell'}>
      {!inlineCollaborator && <header className="app-header">
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
      </header>}

      {selectedCollaborator && !canAssign && (
        <div className="company-scope-hint">No se pueden añadir asignaciones a un colaborador inactivo.</div>
      )}
      <div className={inlineCollaborator ? 'collaborator-detail-tables' : 'dashboard'}>
        <section className="resource-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Detalle del colaborador</p>
              <h2>Roles</h2>
              <p className="muted">Roles relacionados con este colaborador.</p>
            </div>
            <button className="button primary collaborator-add-button" type="button"
              disabled={!canAssign || loading || Boolean(error)}
              onClick={() => setAssignmentKind('role')}>Añadir</button>
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
            <button className="button primary collaborator-add-button" type="button"
              disabled={!canAssign || loading || Boolean(error)}
              onClick={() => setAssignmentKind('speciality')}>Añadir</button>
          </div>

          {!loading && !error && specialitiesMissingBranch && (
            <div className="alert warning">
              La API no incluye la branch de algunas especialidades. Actualiza el backend y las
              rutinas V1 de la base de datos para mostrarla. Puedes seguir consultando y asignando especialidades.
            </div>
          )}
          {error ? null : loading ? (
            <div className="empty-state">Consultando especialidades...</div>
          ) : specialities.length === 0 ? (
            <div className="empty-state">Este colaborador aún no tiene especialidades.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Especialidad</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {specialities.map((relation) => (
                    <tr key={relation.id}>
                      <td>{relation.speciality.branch?.name?.trim() || 'No informado'}</td>
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
            <button className="button primary collaborator-add-button" type="button"
              disabled={!canAssign || technologiesLoading || Boolean(technologiesError)}
              onClick={() => setAssignmentKind('technology')}>Añadir</button>
          </div>

          {technologiesError && <div className="alert error">{technologiesError}</div>}
          {!technologiesLoading && !technologiesError && technologiesMissingBranch && (
            <div className="alert warning">
              La API no incluye la branch de algunas tecnologías. Actualiza el backend y las
              rutinas V1 de la base de datos para mostrarla. Puedes seguir consultando y asignando tecnologías.
            </div>
          )}
          {technologiesLoading ? (
            <div className="empty-state">Consultando tecnologías...</div>
          ) : technologiesError ? null : technologies.length === 0 ? (
            <div className="empty-state">Este colaborador aún no tiene tecnologías asignadas.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Código</th>
                    <th>Tecnología</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {technologies.map((relation) => (
                    <tr key={relation.id}>
                      <td>{relation.technology.branch?.name?.trim() || 'No informado'}</td>
                      <td>{relation.technology.code}</td>
                      <td>{relation.technology.name}</td>
                      <td><ActiveBadge active={relation.isActive} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {assignmentKind && selectedCollaborator && (
        <CollaboratorAssignmentModal
          key={`${collaboratorId}:${assignmentKind}`}
          kind={assignmentKind}
          collaborator={selectedCollaborator}
          assignedIds={assignedIds}
          onClose={() => setAssignmentKind(null)}
          onAssigned={() => {
            setAssignmentKind(null);
            setRevision((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

function CollaboratorAssignmentModal({ kind, collaborator, assignedIds, onClose, onAssigned }: {
  kind: AssignmentKind;
  collaborator: Collaborator;
  assignedIds: number[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const companyId = collaborator.company.id;
  const label = assignmentLabels[kind];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError(null);
    const request = kind === 'role'
      ? loadAllRoles().then((roles) => {
          if (active) setOptions(roles.filter((role) => role.isActive)
            .map((role) => ({ value: role.id, label: `${role.code} · ${role.name}` })));
        })
      : loadCatalogPages((page) => companiesApi.listBranches(companyId, { page, pageSize: 100 }))
        .then((items) => {
          if (active) setBranches(items.filter((branch) => branch.isActive));
        });
    void request.catch((cause) => {
      if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [kind, companyId]);

  useEffect(() => {
    if (kind === 'role' || !branchId) return;
    let active = true;
    setLoading(true);
    setCatalogError(null);
    const request = kind === 'speciality'
      ? loadCatalogPages((page) => companiesApi.listSpecialities(companyId, Number(branchId), { page, pageSize: 100 }))
      : loadCatalogPages((page) => companiesApi.listTechnologies(companyId, Number(branchId), { page, pageSize: 100 }));
    void request.then((items) => {
      if (active) setOptions(items.filter((item) => item.isActive)
        .map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` })));
    }).catch((cause) => {
      if (active) setCatalogError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [kind, companyId, branchId]);

  const availableOptions = options.filter((option) => !assignedIds.includes(Number(option.value)));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (collaborator.state.name.trim().toUpperCase() === 'INACTIVO') {
      setFormError('No se pueden añadir asignaciones a un colaborador inactivo.');
      return;
    }
    if (loading || catalogError || !availableOptions.some((option) => String(option.value) === selectedId)) {
      setFormError('Selecciona una opción disponible para asignar.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const id = Number(selectedId);
      const result = kind === 'role'
        ? await collaboratorsApi.createRoleRelation(collaborator.id, { role: { id } })
        : kind === 'speciality'
          ? await collaboratorsApi.createSpeciality(collaborator.id, { speciality: { id } })
          : await collaboratorsApi.createTechnology(collaborator.id, { technology: { id } });
      if (!result) throw new Error('La API no devolvió la asignación creada.');
      onAssigned();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo realizar la asignación.');
    } finally {
      setSaving(false);
    }
  }

  const close = () => { if (!saving) onClose(); };
  return createPortal(
    <ResourceModal open title={`Añadir ${label}`} onClose={close}>
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <p className="muted">Colaborador: {collaborator.code} · {collaboratorName(collaborator)}</p>
        {kind !== 'role' && (
          <SelectField label="Branch" value={branchId}
            options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            onChange={(event) => {
              setBranchId(event.target.value);
              setSelectedId('');
              setOptions([]);
              setFormError(null);
              setCatalogError(null);
              if (!event.target.value) setLoading(false);
            }}
            disabled={saving || branches.length === 0} required />
        )}
        <SelectField label={kind === 'role' ? 'Rol' : kind === 'speciality' ? 'Especialidad' : 'Tecnología'}
          value={selectedId} options={availableOptions}
          onChange={(event) => { setSelectedId(event.target.value); setFormError(null); }}
          disabled={saving || loading || Boolean(catalogError) || (kind !== 'role' && !branchId)} required />
        {loading && <span className="muted">Cargando catálogo...</span>}
        {!loading && !catalogError && (kind === 'role' || branchId) && availableOptions.length === 0 && (
          <span className="muted">No hay opciones activas pendientes de asignar.</span>
        )}
        {!loading && !catalogError && kind !== 'role' && branches.length === 0 && (
          <span className="muted">No hay branches activas para la compañía del colaborador.</span>
        )}
        {catalogError && <div className="alert error">{catalogError}</div>}
        {formError && <div className="alert error">{formError}</div>}
        <ModalActions onCancel={close} saving={saving} submitLabel="Asignar"
          submitDisabled={loading || Boolean(catalogError) || !selectedId || availableOptions.length === 0} />
      </form>
    </ResourceModal>,
    document.body,
  );
}