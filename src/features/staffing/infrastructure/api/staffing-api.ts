import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface StaffingReference {
  id: number;
}

export interface StaffingStateReference extends StaffingReference {
  name: string;
  isActive: boolean;
}

export interface StaffingQuery extends PaginationQuery {
  companyId?: number;
  branchId?: number;
  periodId?: number;
  subperiodId?: number;
  sectionId?: number;
  fractionId?: number;
  specialityId?: number;
  staffingStateId?: number;
}

export interface StaffingState {
  id: number;
  name: string;
  isActive: boolean;
}

export interface StaffingStateQuery extends PaginationQuery {
  isActive?: boolean;
}

export interface CreateStaffingRequest {
  period: StaffingReference;
  subperiod: StaffingReference;
  section: StaffingReference;
  fraction: StaffingReference;
  speciality: StaffingReference;
  state: StaffingReference;
  registeredDate: string;
}

export interface StaffingCatalogReference extends StaffingReference {
  code?: string;
  name: string;
  isActive: boolean;
}

export interface Staffing {
  id: number;
  company: { id: number; code: string; name: string };
  branch: { id: number; name: string; isActive: boolean };
  period: StaffingCatalogReference;
  subperiod: StaffingCatalogReference;
  section: StaffingCatalogReference;
  fraction: StaffingCatalogReference;
  speciality: StaffingCatalogReference;
  staffingState: StaffingStateReference;
  registeredDate: string;
  isActive: boolean;
}

export interface StaffingAssignmentType {
  id: number;
  name: string;
  capacity: number;
  isActive: boolean;
}

export interface StaffingAssignment {
  id: number;
  collaborator: {
    id: number;
    code: string;
    name: string;
    secondName?: string;
    thirdName?: string;
    lastname: string;
    secondLastname?: string;
    thirdLastname?: string;
    state: StaffingStateReference;
  };
  project: { id: number; code: string; name: string; company: StaffingReference };
  technology: { id: number; code: string; name: string; isActive: boolean; branch: { id: number; name: string } };
  assignmentType: StaffingAssignmentType;
  role: { id: number; code: string; name: string; isActive: boolean };
  request: string;
  capacity: number;
  isActive: boolean;
}

export interface StaffingAssignmentQuery extends PaginationQuery {
  projectId?: number;
  technologyId?: number;
  includeInactive?: boolean;
}

export interface CreateStaffingAssignmentRequest {
  collaborator: StaffingReference;
  project: StaffingReference;
  technology: StaffingReference;
  assignmentType: StaffingReference;
  role: StaffingReference;
  request: string;
  capacity: number;
}

export interface PatchStaffingAssignmentRequest extends Partial<Omit<CreateStaffingAssignmentRequest, 'collaborator'>> {
  isActive?: boolean;
}

export class StaffingApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listStaffing(query: StaffingQuery = {}) {
    return this.client.get<PageResponse<Staffing>>('/staffing/v0/staffing', query);
  }

  listStates(query: StaffingStateQuery = {}) {
    return this.client.get<PageResponse<StaffingState>>('/staffing/v0/states', query);
  }

  createStaffing(body: CreateStaffingRequest) {
    return this.client.post<Staffing>('/staffing/v0/staffing', body);
  }

  listAssignmentTypes(query: PaginationQuery & { isActive?: boolean } = {}) {
    return this.client.get<PageResponse<StaffingAssignmentType>>('/staffing/v0/assignment_types', query);
  }

  listAssignments(staffingId: number, query: StaffingAssignmentQuery = {}) {
    return this.client.get<PageResponse<StaffingAssignment>>(`/staffing/v0/staffing/${staffingId}/assignments`, query);
  }

  createAssignment(staffingId: number, body: CreateStaffingAssignmentRequest) {
    return this.client.post<StaffingAssignment>(`/staffing/v0/staffing/${staffingId}/assignments`, body);
  }

  patchAssignment(staffingId: number, assignmentId: number, body: PatchStaffingAssignmentRequest) {
    return this.client.patch<StaffingAssignment>(`/staffing/v0/staffing/${staffingId}/assignments/${assignmentId}`, body);
  }

  deleteAssignment(staffingId: number, assignmentId: number) {
    return this.client.delete(`/staffing/v0/staffing/${staffingId}/assignments/${assignmentId}`);
  }
}

export const staffingApi = new StaffingApi();