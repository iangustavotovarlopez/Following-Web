import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface StaffingReference {
  id: number;
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

export interface CreateStaffingRequest {
  period: StaffingReference;
  subperiod: StaffingReference;
  section: StaffingReference;
  fraction: StaffingReference;
  project: StaffingReference;
  speciality: StaffingReference;
  capacity: number;
  request?: string;
  staffingState: StaffingReference;
  registeredDate: string;
}

export interface Staffing extends CreateStaffingRequest {
  id: number;
  isActive: boolean;
}

export class StaffingApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listStaffing(query: StaffingQuery = {}) {
    return this.client.get<PageResponse<Staffing>>('/staffing/v0/staffing', query);
  }

  createStaffing(body: CreateStaffingRequest) {
    return this.client.post<Staffing>('/staffing/v0/staffing', body);
  }
}

export const staffingApi = new StaffingApi();