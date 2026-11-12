import {
  HttpClient,
  PageResponse,
  PaginationQuery,
  httpClient,
} from '../../../../shared/api';

export interface Environment {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ServiceSummary {
  id: number;
  code: string;
  name: string;
}

export interface ServiceMetadata {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ServiceApplicationUnit {
  id: number;
  code: string;
  name: string;
  registeredDate: string;
  isActive: boolean;
}

export interface ServiceGroup {
  id: number;
  code: string;
  name: string;
  registeredDate: string;
  version: string;
  isActive: boolean;
}

export interface CatalogQuery extends PaginationQuery {
  code?: string;
  name?: string;
}

export interface EnvironmentCreateRequest {
  code: string;
  name: string;
}

export interface EnvironmentPatchRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface ServiceMetadataCreateRequest {
  code: string;
  name: string;
}

export interface ServiceMetadataPatchRequest {
  code?: string;
  name?: string;
  isActive?: boolean;
}

export interface ServiceApplicationUnitCreateRequest {
  code: string;
  name: string;
  registeredDate: string;
}

export interface ServiceApplicationUnitPatchRequest {
  code?: string;
  name?: string;
  registeredDate?: string;
  isActive?: boolean;
}

export interface ServiceGroupCreateRequest {
  code: string;
  name: string;
  registeredDate: string;
  version: string;
}

export interface ServiceGroupPatchRequest {
  code?: string;
  name?: string;
  registeredDate?: string;
  version?: string;
  isActive?: boolean;
}

export interface ServiceEnvironmentRelation {
  id: number;
  environment: Environment;
  isActive: boolean;
}

export interface ServiceMetadataRelation {
  id: number;
  metadata: ServiceMetadata;
  detail: string;
  isActive: boolean;
}

export class ServicesApi {
  constructor(private readonly client: HttpClient = httpClient) {}

  listServices(query: PaginationQuery & { code?: string } = {}) {
    return this.client.get<PageResponse<ServiceSummary>>('/services/v0/services', query);
  }

  listEnvironments(query: CatalogQuery = {}) {
    return this.client.get<PageResponse<Environment>>(
      '/services/v0/environments',
      query,
    );
  }

  createEnvironment(body: EnvironmentCreateRequest) {
    return this.client.post<Environment>('/services/v0/environments', body);
  }

  patchEnvironment(id: number, body: EnvironmentPatchRequest) {
    return this.client.patch<Environment>(`/services/v0/environments/${id}`, body);
  }

  deleteEnvironment(id: number) {
    return this.client.delete(`/services/v0/environments/${id}`);
  }

  listGroups(query: CatalogQuery = {}) {
    return this.client.get<PageResponse<ServiceGroup>>('/services/v0/groups', query);
  }

  createGroup(body: ServiceGroupCreateRequest) {
    return this.client.post<ServiceGroup>('/services/v0/groups', body);
  }

  patchGroup(id: number, body: ServiceGroupPatchRequest) {
    return this.client.patch<ServiceGroup>(`/services/v0/groups/${id}`, body);
  }

  deleteGroup(id: number) {
    return this.client.delete(`/services/v0/groups/${id}`);
  }

  listApplicationUnits(query: CatalogQuery = {}) {
    return this.client.get<PageResponse<ServiceApplicationUnit>>(
      '/services/v0/application_units',
      query,
    );
  }

  createApplicationUnit(body: ServiceApplicationUnitCreateRequest) {
    return this.client.post<ServiceApplicationUnit>(
      '/services/v0/application_units',
      body,
    );
  }

  patchApplicationUnit(id: number, body: ServiceApplicationUnitPatchRequest) {
    return this.client.patch<ServiceApplicationUnit>(
      `/services/v0/application_units/${id}`,
      body,
    );
  }

  deleteApplicationUnit(id: number) {
    return this.client.delete(`/services/v0/application_units/${id}`);
  }

  listMetadata(query: CatalogQuery = {}) {
    return this.client.get<PageResponse<ServiceMetadata>>(
      '/services/v0/metadata',
      query,
    );
  }

  createMetadata(body: ServiceMetadataCreateRequest) {
    return this.client.post<ServiceMetadata>('/services/v0/metadata', body);
  }

  patchMetadata(id: number, body: ServiceMetadataPatchRequest) {
    return this.client.patch<ServiceMetadata>(
      `/services/v0/metadata/${id}`,
      body,
    );
  }

  deleteMetadata(id: number) {
    return this.client.delete(`/services/v0/metadata/${id}`);
  }

  listServiceEnvironments(serviceId: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<ServiceEnvironmentRelation>>(
      `/services/v0/services/${serviceId}/environments`,
      query,
    );
  }

  assignServiceEnvironment(serviceId: number, environmentId: number) {
    return this.client.post<ServiceEnvironmentRelation>(
      `/services/v0/services/${serviceId}/environments`,
      { environment: { id: environmentId } },
    );
  }

  removeServiceEnvironment(serviceId: number, relationId: number) {
    return this.client.delete(
      `/services/v0/services/${serviceId}/environments/${relationId}`,
    );
  }

  listServiceMetadata(serviceId: number, query: PaginationQuery = {}) {
    return this.client.get<PageResponse<ServiceMetadataRelation>>(
      `/services/v0/services/${serviceId}/metadata`,
      query,
    );
  }

  assignServiceMetadata(serviceId: number, metadataId: number, detail: string) {
    return this.client.post<ServiceMetadataRelation>(
      `/services/v0/services/${serviceId}/metadata`,
      { metadata: { id: metadataId }, detail },
    );
  }

  removeServiceMetadata(serviceId: number, relationId: number) {
    return this.client.delete(
      `/services/v0/services/${serviceId}/metadata/${relationId}`,
    );
  }
}

export const servicesApi = new ServicesApi();
