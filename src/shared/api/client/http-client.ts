import { ApiError, ProblemDetail } from './api-error';

export interface HttpClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/following/api').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get<T>(path: string, query?: Record<string, unknown>): Promise<T | null> {
    return this.request<T>(path, { method: 'GET', query });
  }

  async post<T>(path: string, body?: unknown): Promise<T | null> {
    return this.request<T>(path, { method: 'POST', body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T | null> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  async delete(path: string): Promise<void> {
    await this.request<unknown>(path, { method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: unknown;
      query?: Record<string, unknown>;
    },
  ): Promise<T | null> {
    const origin =
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(`${this.baseUrl}${path}`, origin);
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });

    const headers = new Headers({ Accept: 'application/json' });
    const init: RequestInit = { method: options.method, headers };
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url.toString(), init);
    if (!response.ok) {
      let problem: ProblemDetail = {};
      try {
        problem = (await response.json()) as ProblemDetail;
      } catch {
        problem = { detail: response.statusText };
      }
      throw new ApiError(response.status, problem);
    }
    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  }
}

export const httpClient = new HttpClient();
