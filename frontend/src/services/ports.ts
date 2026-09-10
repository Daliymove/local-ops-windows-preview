import type { AppItem } from '../types/console';

export function normalizePort(value: unknown): number | null {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

export function configuredPort(app: AppItem | null | undefined): number | null {
  return normalizePort(app?.port);
}

export function actualPorts(app: AppItem | null | undefined): number[] {
  const seen = new Set<number>();
  for (const value of (app && Array.isArray(app.ports) ? app.ports : [])) {
    const port = normalizePort(value);
    if (port) seen.add(port);
  }
  return [...seen];
}

export function hasPortMismatch(app: AppItem | null | undefined): boolean {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  return !!(
    app &&
    app.running &&
    configured &&
    app.listening === false &&
    actual.length &&
    !actual.includes(configured)
  );
}

export function preferredOpenPort(app: AppItem | null | undefined): number | null {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  if (hasPortMismatch(app)) return actual[0] || null;
  if (configured && (!app || !app.running || app.listening !== false)) return configured;
  return actual[0] || configured;
}

export function displayedPorts(app: AppItem | null | undefined): number[] {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  if (app && app.running && actual.length) {
    const preferred = preferredOpenPort(app);
    return preferred ? [preferred, ...actual.filter(port => port !== preferred)] : actual;
  }
  return configured ? [configured] : actual;
}

export function portIsOpenable(app: AppItem | null | undefined): boolean {
  return !!(
    app &&
    app.running &&
    preferredOpenPort(app) &&
    (!configuredPort(app) || app.listening !== false || hasPortMismatch(app))
  );
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const OPEN_URL_MAX_LEN = 500;

export function normalizeConfiguredOpenUrl(value: unknown): { value?: string | null; error?: string } {
  if (value == null) return { value: null };
  if (typeof value !== 'string') return { error: 'invalid' };
  const raw = value.trim();
  if (!raw) return { value: null };
  if (raw.length > OPEN_URL_MAX_LEN || /\s/.test(raw) || raw.startsWith('//')) {
    return { error: 'invalid' };
  }
  if (raw.charAt(0) === '/') return { value: raw };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(localhost|127\.0\.0\.1|\[::1\])/i.test(raw)) {
    return { value: '/' + raw };
  }
  let candidate = raw;
  if (/^(localhost|127\.0\.0\.1|\[::1\])/i.test(raw)) candidate = 'http://' + raw;
  try {
    const parsed = new URL(candidate);
    const host = (parsed.hostname || '').toLowerCase();
    if (parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(host) && !parsed.username) {
      return { value: candidate };
    }
  } catch {
    /* invalid url */
  }
  return { error: 'invalid' };
}

export function resolveOpenUrl(
  item: { openUrl?: string | null; openHost?: string; openHosts?: Record<string, string> } | null | undefined,
  port: number | null | undefined
): string {
  const value = normalizePort(port);
  if (!value) return '';
  let host = item?.openHosts?.[String(value)];
  if (!host && item?.openHost) host = item.openHost;
  host = host === 'localhost' ? 'localhost' : '127.0.0.1';
  const origin = 'http://' + host + ':' + value;
  const parsed = normalizeConfiguredOpenUrl(item?.openUrl);
  if (!parsed || parsed.error || !parsed.value) return origin;
  return parsed.value.charAt(0) === '/' ? origin + parsed.value : parsed.value;
}

export function localServiceUrl(app: AppItem, port?: number | null): string {
  const targetPort = port || preferredOpenPort(app);
  return resolveOpenUrl(app, targetPort);
}
