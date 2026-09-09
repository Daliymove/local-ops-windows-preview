import type { StateResponse, DetectResponse, DiagnoseResponse, AppItem } from '../types/console';

const REQUEST_TIMEOUT_MS = 15000;

let mutationEpoch = 0;
export function currentMutationEpoch(): number {
  return mutationEpoch;
}
export function bumpMutationEpoch(): void {
  mutationEpoch += 1;
}

export interface ApiResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
  [key: string]: unknown;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  isRawBody?: boolean
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const opt: RequestInit = {
    method,
    signal: controller.signal,
  };

  if (body !== undefined) {
    if (isRawBody) {
      opt.body = body as BodyInit;
    } else {
      opt.headers = { 'Content-Type': 'application/json' };
      opt.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(path, opt);
    if (res.status === 204) {
      mutationEpoch += 1;
      return { ok: true };
    }

    const contentType = res.headers.get('content-type') || '';
    const fallbackError =
      res.status === 401 || res.status === 403
        ? '访问被拒绝，请从总控台页面重试'
        : `HTTP ${res.status}`;

    let data: Record<string, unknown>;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = (await res.text()).trim();
      data = { ok: res.ok, error: text || fallbackError };
    }

    if (!res.ok && data.ok !== false) {
      return { ok: false, error: (data.error as string) || fallbackError };
    }

    mutationEpoch += 1;
    return data as unknown as ApiResult<T>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: '请求超时，请稍后重试' };
    }
    return { ok: false, error: err instanceof Error ? err.message : '网络请求失败' };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T = unknown>(path: string) => request<T>('DELETE', path),

  fetchState: async (): Promise<StateResponse | null> => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // App operations
  startApp: (id: string) => api.post(`/api/apps/${id}/start`),
  stopApp: (id: string) => api.post(`/api/apps/${id}/stop`),
  restartApp: (id: string) => api.post(`/api/apps/${id}/restart`),
  diagnoseApp: (id: string) => api.post<DiagnoseResponse>(`/api/apps/${id}/diagnose`),
  attachApp: (id: string, pid: number) => api.post(`/api/apps/${id}/attach`, { pid }),
  fetchAppFavicon: (id: string) => api.post(`/api/apps/${id}/favicon`),
  reorderApps: (ids: string[]) => api.post('/api/apps/reorder', { ids }),
  createApp: (data: Partial<AppItem> & { attachPid?: number }) => api.post<AppItem>('/api/apps', data),
  updateApp: (id: string, data: Partial<AppItem> & { stopBeforeUpdate?: boolean }) =>
    api.put<AppItem>(`/api/apps/${id}`, data),
  deleteApp: (id: string) => api.del(`/api/apps/${id}`),
  uploadIcon: (id: string, file: Blob) =>
    request('POST', `/api/apps/${id}/icon`, file, true),
  deleteIcon: (id: string) => api.del(`/api/apps/${id}/icon`),
  getLogs: async (id: string, tail: number = 300): Promise<string> => {
    const res = await api.get<{ text: string }>(`/api/apps/${id}/logs?tail=${tail}`);
    return (res as unknown as { text?: string }).text || '';
  },

  // Services
  killProcess: (pid: number, force: boolean = false) =>
    api.post('/api/kill', { pid, force }),
  setServiceFlag: (key: string, flag: 'hidden' | 'pinned' | 'promoted', value: boolean) =>
    api.post('/api/services/flag', { key, flag, value }),
  setWatchKeyword: (keyword: string, action: 'add' | 'remove') =>
    api.post<{ keywords: string[] }>('/api/watch', { keyword, action }),

  // Console self
  restartConsole: () => api.post('/api/console/restart'),
  stopConsole: () => api.post('/api/console/stop'),
  getConsoleLogs: async (tail: number = 300): Promise<string> => {
    const res = await api.get<{ text: string }>(`/api/console/log?tail=${tail}`);
    return (res as unknown as { text?: string }).text || '';
  },
  setUiTheme: (theme: string) => api.post('/api/ui/theme', { theme }),

  // System helpers
  pickPath: (what: 'dir' | 'script') =>
    api.post<{ ok: boolean; path?: string; canceled?: boolean }>('/api/pick', { what }),
  detectProject: (cwd: string) =>
    api.post<DetectResponse>('/api/project/detect', { cwd }),
};
