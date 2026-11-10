import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface ProjectState {
  id: number;
  name: string;
  isActive: boolean;
}

export interface ProjectStateQuery extends PaginationQuery {
  isActive?: boolean;
  name?: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  company: { id: number };
  state: { id: number };
}

export interface ProjectQuery extends PaginationQuery {
  code?: string;
  name?: string;
  'company.id'?: number;
  'state.id'?: number;
}

export interface CreateProjectRequest {
  code: string;
  name: string;
  company: { id: number };
  state: { id: number };
}

export interface PatchProjectRequest {
  code?: string;
  name?: string;
  company?: { id: number };
  state?: { id: number };
}

export interface Planning {
  id: number;
  name: string;
  isActive: boolean;
  periods: PlanningPeriod[];
}

export interface PlanningPeriod {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isAdditional: boolean;
  isActive: boolean;
  subperiods: PlanningSubperiod[];
}

export interface PlanningSubperiod {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sections: PlanningSection[];
}

export interface PlanningSection {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  fractions: PlanningFraction[];
}

export interface PlanningFraction {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CreatePlanningRequest {
  name: string;
  period: { id: number };
}

export interface AddPlanningPeriodRequest {
  period: { id: number };
  isAdditional: boolean;
}

export interface AddPlanningSectionRequest {
  subperiod: { id: number };
  section: { id: number };
}

export class ProjectsApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listStates(query: ProjectStateQuery = {}) {
    return this.client.get<PageResponse<ProjectState>>('/projects/v0/states', query);
  }

  createState(body: { name: string }) {
    return this.client.post<ProjectState>('/projects/v0/states', body);
  }

  patchState(id: number, body: { name?: string; isActive?: boolean }) {
    return this.client.patch<ProjectState>(`/projects/v0/states/${id}`, body);
  }

  listProjects(query: ProjectQuery = {}) {
    return this.client.get<PageResponse<Project>>('/projects/v0/projects', query);
  }

  createProject(body: CreateProjectRequest) {
    return this.client.post<Project>('/projects/v0/projects', body);
  }

  patchProject(id: number, body: PatchProjectRequest) {
    return this.client.patch<Project>(`/projects/v0/projects/${id}`, body);
  }

  listPlanning(projectId: number) {
    return this.client.get<Planning[]>(
      `/projects/v0/projects/${projectId}/plannings`,
    );
  }

  createPlanning(projectId: number, body: CreatePlanningRequest) {
    return this.client.post<{
      id: number;
      name: string;
      periodId: number;
    }>(`/projects/v0/projects/${projectId}/plannings`, body);
  }

  addPlanningPeriod(
    projectId: number,
    planningId: number,
    body: AddPlanningPeriodRequest,
  ) {
    return this.client.post<{
      id: number;
      period: { id: number };
      isAdditional: boolean;
      isActive: boolean;
    }>(`/projects/v0/projects/${projectId}/plannings/${planningId}/periods`, body);
  }

  deletePlanningPeriod(projectId: number, planningId: number, periodId: number) {
    return this.client.delete(
      `/projects/v0/projects/${projectId}/plannings/${planningId}/periods/${periodId}`,
    );
  }

  deletePlanningSubperiod(
    projectId: number,
    planningId: number,
    subperiodId: number,
  ) {
    return this.client.delete(
      `/projects/v0/projects/${projectId}/plannings/${planningId}/subperiods/${subperiodId}`,
    );
  }

  addPlanningSection(
    projectId: number,
    planningId: number,
    body: AddPlanningSectionRequest,
  ) {
    return this.client.post<void>(
      `/projects/v0/projects/${projectId}/plannings/${planningId}/sections`,
      body,
    );
  }
}

export const projectsApi = new ProjectsApi();
