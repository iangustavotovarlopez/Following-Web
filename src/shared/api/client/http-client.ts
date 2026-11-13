import { ApiError, ProblemDetail } from './api-error';

export interface HttpClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export const API_MUTATION_EVENT = 'following:api-mutation';

export interface ApiMutationDetail {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getCache = new Map<string, { expiresAt: number; request: Promise<unknown> }>();
  private readonly getCacheTtlMs = 30_000;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/following/api').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async get<T>(path: string, query?: object): Promise<T | null> {
    const url = this.buildUrl(path, query);
    const key = url.toString();
    const now = Date.now();
    for (const [cachedKey, entry] of this.getCache) {
      if (entry.expiresAt <= now) this.getCache.delete(cachedKey);
    }

    const cached = this.getCache.get(key);
    if (cached) return cached.request as Promise<T | null>;

    const request = this.request<T>(path, { method: 'GET', query });
    const entry = { expiresAt: now + this.getCacheTtlMs, request };
    this.getCache.set(key, entry);
    void request.catch(() => {
      if (this.getCache.get(key) === entry) this.getCache.delete(key);
    });
    return request;
  }

  async post<T>(path: string, body?: unknown, affectedPaths: readonly string[] = []): Promise<T | null> {
    const response = await this.request<T>(path, { method: 'POST', body });
    this.getCache.clear();
    this.notifyMutation('POST', path);
    for (const affectedPath of affectedPaths) this.notifyMutation('POST', affectedPath);
    return response;
  }

  async patch<T>(path: string, body?: unknown): Promise<T | null> {
    const response = await this.request<T>(path, { method: 'PATCH', body });
    this.getCache.clear();
    this.notifyMutation('PATCH', path);
    return response;
  }

  async delete(path: string): Promise<void> {
    await this.request<unknown>(path, { method: 'DELETE' });
    this.getCache.clear();
    this.notifyMutation('DELETE', path);
  }

  private notifyMutation(method: ApiMutationDetail['method'], path: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<ApiMutationDetail>(API_MUTATION_EVENT, {
        detail: { method, path },
      }));
    }
  }

  private buildUrl(path: string, query?: object) {
    const origin =
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const url = new URL(`${this.baseUrl}${path}`, origin);
    Object.entries(query ?? {}).sort(([left], [right]) => left.localeCompare(right)).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
    return url;
  }

  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: unknown;
      query?: object;
    },
  ): Promise<T | null> {
    const url = this.buildUrl(path, options.query);

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
