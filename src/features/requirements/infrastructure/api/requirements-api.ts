import { HttpClient, httpClient, type PaginationQuery, type PageResponse } from '../../../../shared/api';

export interface Reference { id: number; code?: string; name: string }
export interface RequirementCatalog extends Reference { number?: number; isActive: boolean }
export interface Requirement {
  id: number; project: Reference; description: string;
  registeredDate: string; completionDate?: string; state: RequirementCatalog;
  complexity: RequirementCatalog; service?: Reference; isActive: boolean;
  currentStage?: { id: number; name: string; sequence: number };
}
export interface RequirementScope {
  id: number; name: string; description: string; sequence: number; isActive: boolean;
  deliverable?: { id: number; name: string; technology: Reference };
}
export interface RequirementScopeLink {
  id: number; scope: RequirementScope; registeredDate: string; completionDate?: string;
  deliverableUrl?: string; assignedCount: number;
  isActive: boolean;
  state: RequirementCatalog; currentAssignment?: ScopeAssignment;
}
export interface ScopeLinkPatch { registeredDate?: string; completionDate?: string; deliverableUrl?: string; isActive?: boolean }
export interface ScopeAssignmentCreate { collaborator: { id: number }; role: { id: number } }
export interface ScopeAssignment {
  id: number; collaborator: StaffingOption['collaborator']; role: Reference; state: RequirementCatalog;
  registeredDate: string; assignedDate: string; completionDate?: string; isActive: boolean;
}
export interface StaffingOption {
  id: number; staffingId: number; project: Reference; request: string; isActive: boolean; periodCode: string;
  collaborator: Reference & { secondName?: string; thirdName?: string; lastname?: string; secondLastname?: string; thirdLastname?: string };
}
interface RequirementFields {
  description: string; registeredDate: string; completionDate?: string;
  state: { id: number }; complexity: { id: number };
  scopes?: { id: number }[]; staffingAssignments?: { id: number }[];
}
export interface RequirementCreate extends RequirementFields { project?: { id: number }; service?: { id: number } }
export interface RequirementPatch extends Partial<RequirementFields> { service?: { id: number | null }; isActive?: boolean }
export interface ScopeCreate { name: string; description: string; sequence: number; deliverable?: { id: number } }
export interface ScopePatch extends Partial<Omit<ScopeCreate, 'deliverable'>> { deliverable?: { id: number | null }; isActive?: boolean }
export interface RequirementQuery extends PaginationQuery { projectId?: number; 'service.code'?: string; collaborator_id?: number }

export const requirementPath = (company: number, branch: number) => `/requirements/v0/companies/${company}/branches/${branch}/requirements`;
const contextPath = (company: number, branch: number) => `/requirements/v0/companies/${company}/branches/${branch}`;
export class RequirementsApi {
  constructor(private readonly client: HttpClient = httpClient) {}
  list(company: number, branch: number, query: RequirementQuery = {}) {
    return this.client.get<PageResponse<Requirement>>(requirementPath(company, branch), query);
  }
  create(company: number, branch: number, body: RequirementCreate) {
    return this.client.post<Requirement>(requirementPath(company, branch), body);
  }
  patch(company: number, branch: number, id: number, body: RequirementPatch) {
    return this.client.patch<Requirement>(`${requirementPath(company, branch)}/${id}`, body);
  }
  delete(company: number, branch: number, id: number) {
    return this.client.delete(`${requirementPath(company, branch)}/${id}`);
  }
  scopes(company: number, branch: number, id: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<RequirementScopeLink>>(`${requirementPath(company, branch)}/${id}/scopes`, query);
  }
  patchScopeLink(company: number, branch: number, requirement: number, link: number, body: ScopeLinkPatch) {
    return this.client.patch<RequirementScopeLink>(`${requirementPath(company, branch)}/${requirement}/scopes/${link}`, body);
  }
  deleteScopeLink(company: number, branch: number, requirement: number, link: number) {
    return this.client.delete(`${requirementPath(company, branch)}/${requirement}/scopes/${link}`);
  }
  completeScopeLink(company: number, branch: number, requirement: number, link: number) {
    return this.client.post<RequirementScopeLink>(`${requirementPath(company, branch)}/${requirement}/scopes/${link}/complete`, {});
  }
  changeScopeState(company: number, branch: number, requirement: number, link: number, stateId: number) {
    return this.client.patch<RequirementScopeLink>(`${requirementPath(company, branch)}/${requirement}/scopes/${link}/state`,
      { state: { id: stateId } });
  }
  scopeStates(query: PaginationQuery & { isActive?: boolean } = {}) {
    return this.client.get<PageResponse<RequirementCatalog>>('/requirements/v0/scope_states', query);
  }
  assignScope(company: number, branch: number, requirement: number, link: number, body: ScopeAssignmentCreate) {
    return this.client.post<ScopeAssignment>(`${requirementPath(company, branch)}/${requirement}/scopes/${link}/assignments`, body);
  }
  scopeAssignments(company: number, branch: number, requirement: number, link: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<ScopeAssignment>>(`${requirementPath(company, branch)}/${requirement}/scopes/${link}/assignments`, query);
  }
  staffing(company: number, branch: number, id: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<StaffingOption>>(`${requirementPath(company, branch)}/${id}/staffing_assignments`, query);
  }
  staffingOptions(company: number, branch: number, query: PaginationQuery & { projectId?: number } = {}) {
    return this.client.get<PageResponse<StaffingOption>>(`${contextPath(company, branch)}/staffing_assignments`, query);
  }
  states(query: PaginationQuery & { isActive?: boolean } = {}) {
    return this.client.get<PageResponse<RequirementCatalog>>('/requirements/v0/states', query);
  }
  complexities(query: PaginationQuery & { isActive?: boolean } = {}) {
    return this.client.get<PageResponse<RequirementCatalog>>('/requirements/v0/complexities', query);
  }
  listScopes(query: PaginationQuery & { name?: string; isActive?: boolean; companyId?: number; branchId?: number } = {}) {
    return this.client.get<PageResponse<RequirementScope>>('/requirements/v0/scopes', query);
  }
  createScope(body: ScopeCreate) { return this.client.post<RequirementScope>('/requirements/v0/scopes', body); }
  patchScope(id: number, body: ScopePatch) { return this.client.patch<RequirementScope>(`/requirements/v0/scopes/${id}`, body); }
  deleteScope(id: number) { return this.client.delete(`/requirements/v0/scopes/${id}`); }
}
export const requirementsApi = new RequirementsApi();
