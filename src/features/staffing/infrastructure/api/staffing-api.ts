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
  capacity: number;
  request: string;
  state: StaffingReference;
  registeredDate: string;
}

export interface Staffing extends Omit<CreateStaffingRequest, 'state'> {
  id: number;
  staffingState: StaffingStateReference;
  isActive: boolean;
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
}

export const staffingApi = new StaffingApi();