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
  projectId?: number;
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
  project: StaffingReference;
  speciality: StaffingReference;
  request: string;
  state: StaffingReference;
  registeredDate: string;
}

export interface Staffing extends Omit<CreateStaffingRequest, 'state'> {
  id: number;
  project: StaffingNamedReference & { company?: StaffingReference };
  period: StaffingNamedReference;
  subperiod: StaffingNamedReference;
  section: StaffingNamedReference;
  fraction: StaffingNamedReference;
  speciality: StaffingNamedReference;
  staffingState: StaffingStateReference;
  isActive: boolean;
}

export interface StaffingNamedReference extends StaffingReference {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface AssignmentType extends StaffingStateReference { capacity: number }

export interface StaffingAssignment {
  id: number;
  collaborator: StaffingReference & {
    code: string;
    name: string;
    secondName?: string;
    thirdName?: string;
    lastname: string;
    secondLastname?: string;
    thirdLastname?: string;
    state: StaffingStateReference;
  };
  assignmentType: AssignmentType;
  role: StaffingStateReference & { code?: string };
  capacity: number;
  isActive: boolean;
}

export interface CreateStaffingAssignmentRequest {
  collaborator: StaffingReference;
  assignmentType: StaffingReference;
  role: StaffingReference;
  capacity: number;
}

export interface PatchStaffingAssignmentRequest {
  assignmentType?: StaffingReference;
  role?: StaffingReference;
  capacity?: number;
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

  listAssignmentTypes(query: StaffingStateQuery = {}) {
    return this.client.get<PageResponse<AssignmentType>>('/staffing/v0/assignment_types', query);
  }

  listAssignments(staffingId: number, query: PaginationQuery & { includeInactive?: boolean } = {}) {
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