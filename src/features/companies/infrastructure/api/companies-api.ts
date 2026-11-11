import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface CompanyState {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CompanyStateQuery extends PaginationQuery {
  isActive?: boolean;
  name?: string;
}

export interface CompanyStateCreateRequest {
  name: string;
}

export interface CompanyStatePatchRequest {
  name?: string;
  isActive?: boolean;
}

export interface Company {
  id: number;
  code: string;
  name: string;
  description?: string;
  state: {
    id: number;
    name: string;
  };
}

export interface CompanyQuery extends PaginationQuery {
  code?: string;
  name?: string;
  'state.id'?: number;
}

export interface NameCodeCatalogQuery extends PaginationQuery {
  name?: string;
  code?: string;
}

export interface NameCatalogQuery extends PaginationQuery {
  name?: string;
}

export interface CompanyCreateRequest {
  code: string;
  name: string;
  description?: string;
  state: { id: number };
}

export interface CompanyPatchRequest {
  code?: string;
  name?: string;
  description?: string;
  state?: { id: number };
}

export interface Period {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface PeriodCreateRequest {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}

export interface PeriodPatchRequest {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface Subperiod {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SubperiodCreateRequest extends PeriodCreateRequest {}

export interface Branch {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface BranchCreateRequest {
  name: string;
  description?: string;
}

export interface BranchPatchRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface BranchQuery extends PaginationQuery {
  name?: string;
}

export interface Technology {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface TechnologyCreateRequest {
  code: string;
  name: string;
}

export interface TechnologyPatchRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface TechnologyQuery extends PaginationQuery {
  code?: string;
  name?: string;
}

export interface Speciality {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface SpecialityCreateRequest {
  code: string;
  name: string;
  description?: string;
}

export interface SpecialityPatchRequest {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface Section {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}

export interface Fraction extends Section {}
export interface SectionCreateRequest extends PeriodCreateRequest {}
export interface FractionCreateRequest extends PeriodCreateRequest {}

export interface Skill {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface SkillCreateRequest {
  name: string;
  description?: string;
}

export interface SkillLevel {
  id: number;
  name: string;
  number: number;
  isActive: boolean;
}

export interface SkillLevelCreateRequest {
  name: string;
  number: number;
}

export interface Team {
  id: number;
  name: string;
  isActive: boolean;
}

export interface TeamCreateRequest {
  name: string;
}

export interface TeamPatchRequest {
  name?: string;
  isActive?: boolean;
}

export interface TeamMember {
  id: number;
  collaborator: {
    id: number;
    code: string;
    name: string;
  };
  isActive: boolean;
}

export interface TeamMemberCreateRequest {
  collaborator: { id: number };
}

export interface Deliverable {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  sequence: number;
}

export interface DeliverableCreateRequest {
  name: string;
  description: string;
  sequence: number;
}

export interface DeliverablePatchRequest {
  name?: string;
  description?: string;
  sequence?: number;
  isActive?: boolean;
}

export class CompaniesApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listCompanyStates(query: CompanyStateQuery = {}) {
    return this.client.get<PageResponse<CompanyState>>('/companies/v0/states', query);
  }

  createCompanyState(body: CompanyStateCreateRequest) {
    return this.client.post<CompanyState>('/companies/v0/states', body);
  }

  patchCompanyState(id: number, body: CompanyStatePatchRequest) {
    return this.client.patch<CompanyState>(`/companies/v0/states/${id}`, body);
  }

  listCompanies(query: CompanyQuery = {}) {
    return this.client.get<PageResponse<Company>>('/companies/v0/companies', query);
  }

  createCompany(body: CompanyCreateRequest) {
    return this.client.post<Company>('/companies/v0/companies', body);
  }

  patchCompany(id: number, body: CompanyPatchRequest) {
    return this.client.patch<Company>(`/companies/v0/companies/${id}`, body);
  }

  deleteCompany(id: number) {
    return this.client.delete(`/companies/v0/companies/${id}`);
  }

  listPeriods(companyId: number, query: NameCodeCatalogQuery = {}) {
    return this.client.get<PageResponse<Period>>(
      `/companies/v0/companies/${companyId}/periods`,
      query,
    );
  }

  createPeriod(companyId: number, body: PeriodCreateRequest) {
    return this.client.post<Period>(
      `/companies/v0/companies/${companyId}/periods`,
      body,
    );
  }

  patchPeriod(companyId: number, periodId: number, body: PeriodPatchRequest) {
    return this.client.patch<Period>(
      `/companies/v0/companies/${companyId}/periods/${periodId}`,
      body,
    );
  }

  listSubperiods(companyId: number, periodId: number, query: NameCodeCatalogQuery = {}) {
    return this.client.get<PageResponse<Subperiod>>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods`,
      query,
    );
  }

  createSubperiod(companyId: number, periodId: number, body: SubperiodCreateRequest) {
    return this.client.post<Subperiod>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods`,
      body,
    );
  }

  listBranches(companyId: number, query: BranchQuery = {}) {
    return this.client.get<PageResponse<Branch>>(
      `/companies/v0/companies/${companyId}/branches`,
      query,
    );
  }

  createBranch(companyId: number, body: BranchCreateRequest) {
    return this.client.post<Branch>(
      `/companies/v0/companies/${companyId}/branches`,
      body,
    );
  }

  patchBranch(companyId: number, branchId: number, body: BranchPatchRequest) {
    return this.client.patch<Branch>(
      `/companies/v0/companies/${companyId}/branches/${branchId}`,
      body,
    );
  }

  deleteBranch(companyId: number, branchId: number) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}`,
    );
  }

  listTechnologies(
    companyId: number,
    branchId: number,
    query: TechnologyQuery = {},
  ) {
    return this.client.get<PageResponse<Technology>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies`,
      query,
    );
  }

  createTechnology(companyId: number, branchId: number, body: TechnologyCreateRequest) {
    return this.client.post<Technology>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies`,
      body,
    );
  }

  patchTechnology(
    companyId: number,
    branchId: number,
    technologyId: number,
    body: TechnologyPatchRequest,
  ) {
    return this.client.patch<Technology>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}`,
      body,
    );
  }

  deleteTechnology(companyId: number, branchId: number, technologyId: number) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}`,
    );
  }

  listSpecialities(companyId: number, branchId: number, query: NameCodeCatalogQuery = {}) {
    return this.client.get<PageResponse<Speciality>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities`,
      query,
    );
  }

  createSpeciality(
    companyId: number,
    branchId: number,
    body: SpecialityCreateRequest,
  ) {
    return this.client.post<Speciality>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities`,
      body,
    );
  }

  patchSpeciality(companyId: number, branchId: number, specialityId: number, body: SpecialityPatchRequest) {
    return this.client.patch<Speciality>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}`,
      body,
    );
  }

  deleteSpeciality(companyId: number, branchId: number, specialityId: number) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}`,
    );
  }

  listSections(
    companyId: number,
    periodId: number,
    subperiodId: number,
    query: NameCodeCatalogQuery = {},
  ) {
    return this.client.get<PageResponse<Section>>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods/${subperiodId}/sections`,
      query,
    );
  }

  createSection(
    companyId: number,
    periodId: number,
    subperiodId: number,
    body: SectionCreateRequest,
  ) {
    return this.client.post<Section>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods/${subperiodId}/sections`,
      body,
    );
  }

  listFractions(
    companyId: number,
    periodId: number,
    subperiodId: number,
    sectionId: number,
    query: NameCodeCatalogQuery = {},
  ) {
    return this.client.get<PageResponse<Fraction>>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods/${subperiodId}/sections/${sectionId}/fractions`,
      query,
    );
  }

  createFraction(
    companyId: number,
    periodId: number,
    subperiodId: number,
    sectionId: number,
    body: FractionCreateRequest,
  ) {
    return this.client.post<Fraction>(
      `/companies/v0/companies/${companyId}/periods/${periodId}/subperiods/${subperiodId}/sections/${sectionId}/fractions`,
      body,
    );
  }

  listSkills(
    companyId: number,
    branchId: number,
    technologyId: number,
    query: PaginationQuery = {},
  ) {
    return this.client.get<PageResponse<Skill>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/skills`,
      query,
    );
  }

  createSkill(
    companyId: number,
    branchId: number,
    technologyId: number,
    body: SkillCreateRequest,
  ) {
    return this.client.post<Skill>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/skills`,
      body,
    );
  }

  listSkillLevels(
    companyId: number,
    branchId: number,
    technologyId: number,
    skillId: number,
    query: PaginationQuery = {},
  ) {
    return this.client.get<PageResponse<SkillLevel>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/skills/${skillId}/levels`,
      query,
    );
  }

  createSkillLevel(
    companyId: number,
    branchId: number,
    technologyId: number,
    skillId: number,
    body: SkillLevelCreateRequest,
  ) {
    return this.client.post<SkillLevel>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/skills/${skillId}/levels`,
      body,
    );
  }

  listTeams(
    companyId: number,
    branchId: number,
    specialityId: number,
    query: NameCatalogQuery = {},
  ) {
    return this.client.get<PageResponse<Team>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams`,
      query,
    );
  }

  createTeam(companyId: number, branchId: number, specialityId: number, body: TeamCreateRequest) {
    return this.client.post<Team>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams`,
      body,
    );
  }

  patchTeam(
    companyId: number,
    branchId: number,
    specialityId: number,
    teamId: number,
    body: TeamPatchRequest,
  ) {
    return this.client.patch<Team>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${teamId}`,
      body,
    );
  }

  deleteTeam(companyId: number, branchId: number, specialityId: number, teamId: number) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${teamId}`,
    );
  }

  listTeamMembers(
    companyId: number,
    branchId: number,
    specialityId: number,
    teamId: number,
    query: PaginationQuery = {},
  ) {
    return this.client.get<PageResponse<TeamMember>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${teamId}/members`,
      query,
    );
  }

  createTeamMember(
    companyId: number,
    branchId: number,
    specialityId: number,
    teamId: number,
    body: TeamMemberCreateRequest,
  ) {
    return this.client.post<TeamMember>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${teamId}/members`,
      body,
    );
  }

  deleteTeamMember(
    companyId: number,
    branchId: number,
    specialityId: number,
    teamId: number,
    memberId: number,
  ) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}/specialities/${specialityId}/teams/${teamId}/members/${memberId}`,
    );
  }

  listDeliverables(
    companyId: number,
    branchId: number,
    technologyId: number,
    query: PaginationQuery = {},
  ) {
    return this.client.get<PageResponse<Deliverable>>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/deliverables`,
      query,
    );
  }

  createDeliverable(
    companyId: number,
    branchId: number,
    technologyId: number,
    body: DeliverableCreateRequest,
  ) {
    return this.client.post<Deliverable>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/deliverables`,
      body,
    );
  }

  patchDeliverable(
    companyId: number,
    branchId: number,
    technologyId: number,
    id: number,
    body: DeliverablePatchRequest,
  ) {
    return this.client.patch<Deliverable>(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/deliverables/${id}`,
      body,
    );
  }

  deleteDeliverable(
    companyId: number,
    branchId: number,
    technologyId: number,
    id: number,
  ) {
    return this.client.delete(
      `/companies/v0/companies/${companyId}/branches/${branchId}/technologies/${technologyId}/deliverables/${id}`,
    );
  }
}

export const companiesApi = new CompaniesApi();
