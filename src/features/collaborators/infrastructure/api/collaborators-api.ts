import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface CollaboratorCatalogItem {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CollaboratorRole extends CollaboratorCatalogItem {
  code: string;
}
export interface CollaboratorState extends CollaboratorCatalogItem {}

export interface CollaboratorRoleRelation {
  id: number;
  role: { id: number };
  isActive: boolean;
}

export interface Collaborator {
  id: number;
  code: string;
  name: string;
  secondName?: string;
  thirdName?: string;
  lastname: string;
  secondLastname?: string;
  thirdLastname?: string;
  company: CollaboratorCatalogItem;
  state: CollaboratorCatalogItem;
  hireDate: string;
  separationDate?: string;
  includes?: IncludeBlock[];
}

export interface IncludeBlock {
  name: string;
  items: unknown[];
  hasMoreData: boolean;
}

export interface CollaboratorQuery extends PaginationQuery {
  code?: string;
  name?: string;
  companyId?: number;
  stateId?: number;
  includes?: string;
}

export interface CreateCollaboratorRequest {
  code: string;
  name: string;
  secondName?: string;
  thirdName?: string;
  lastname: string;
  secondLastname?: string;
  thirdLastname?: string;
  company: { id: number };
  state: { id: number };
  hireDate: string;
  separationDate?: string;
}

export interface CollaboratorSpeciality {
  id: number;
  speciality: {
    id: number;
    name: string;
    isActive: boolean;
  };
  isActive: boolean;
}

export interface CollaboratorSpecialitySkill {
  id: number;
  skill: { id: number; name: string };
  level?: { id: number; name: string };
  isActive: boolean;
}

export interface CreateCollaboratorSpecialityRequest {
  speciality: { id: number };
  isActive?: boolean;
}

export interface CreateCollaboratorRoleRelationRequest {
  role: { id: number };
}

export interface PatchCollaboratorSpecialitySkillRequest {
  level: { id: number };
  isActive?: boolean;
}

export class CollaboratorsApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listRoles(query: PaginationQuery & { name?: string } = {}) {
    return this.client.get<PageResponse<CollaboratorRole>>(
      '/collaborators/v0/roles',
      query,
    );
  }

  createRole(body: { code: string; name: string }) {
    return this.client.post<CollaboratorRole>('/collaborators/v0/roles', body);
  }

  listStates(query: PaginationQuery & { name?: string } = {}) {
    return this.client.get<PageResponse<CollaboratorState>>(
      '/collaborators/v0/states',
      query,
    );
  }

  createState(body: { name: string }) {
    return this.client.post<CollaboratorState>('/collaborators/v0/states', body);
  }

  listCollaborators(query: CollaboratorQuery = {}) {
    return this.client.get<PageResponse<Collaborator>>(
      '/collaborators/v0/collaborators',
      query,
    );
  }

  createCollaborator(body: CreateCollaboratorRequest) {
    return this.client.post<Collaborator>('/collaborators/v0/collaborators', body);
  }

  listRoleRelations(collaboratorId: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<CollaboratorRoleRelation>>(
      `/collaborators/v0/collaborators/${collaboratorId}/roles`,
      query,
    );
  }

  createRoleRelation(
    collaboratorId: number,
    body: CreateCollaboratorRoleRelationRequest,
  ) {
    return this.client.post<CollaboratorRoleRelation>(
      `/collaborators/v0/collaborators/${collaboratorId}/roles`,
      body,
    );
  }

  listSpecialities(collaboratorId: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<CollaboratorSpeciality>>(
      `/collaborators/v0/collaborators/${collaboratorId}/specialities`,
      query,
    );
  }

  createSpeciality(
    collaboratorId: number,
    body: CreateCollaboratorSpecialityRequest,
  ) {
    return this.client.post<CollaboratorSpeciality>(
      `/collaborators/v0/collaborators/${collaboratorId}/specialities`,
      body,
    );
  }

  listSpecialitySkills(
    collaboratorId: number,
    specialityId: number,
    query: PaginationQuery = {},
  ) {
    return this.client.get<PageResponse<CollaboratorSpecialitySkill>>(
      `/collaborators/v0/collaborators/${collaboratorId}/specialities/${specialityId}/skills`,
      query,
    );
  }

  patchSpecialitySkill(
    collaboratorId: number,
    specialityId: number,
    skillId: number,
    body: PatchCollaboratorSpecialitySkillRequest,
  ) {
    return this.client.patch<CollaboratorSpecialitySkill>(
      `/collaborators/v0/collaborators/${collaboratorId}/specialities/${specialityId}/skills/${skillId}`,
      body,
    );
  }
}

export const collaboratorsApi = new CollaboratorsApi();
