'use strict';
/* ============================================================
   ports.js — 端口归一化纯函数（无 DOM 依赖）

   配置端口用于启动前校验，ports 才是运行中进程实际监听的端口。
   两者不一致时，所有“打开/复制”动作必须使用实际端口，避免给出失效链接。
   独立成模块供启动台 / 服务监控 / 命令面板复用，也可被 node 直接单测。
   ============================================================ */

export function normalizePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}

export function configuredPort(app) {
  return normalizePort(app && app.port);
}

export function actualPorts(app) {
  const seen = new Set();
  for (const value of (app && Array.isArray(app.ports) ? app.ports : [])) {
    const port = normalizePort(value);
    if (port) seen.add(port);
  }
  return [...seen];
}

export function hasPortMismatch(app) {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  return !!(app && app.running && configured && app.listening === false
    && actual.length && !actual.includes(configured));
}

export function preferredOpenPort(app) {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  if (hasPortMismatch(app)) return actual[0] || null;
  if (configured && (!app || !app.running || app.listening !== false)) return configured;
  return actual[0] || configured;
}

export function displayedPorts(app) {
  const configured = configuredPort(app);
  const actual = actualPorts(app);
  if (app && app.running && actual.length) {
    const preferred = preferredOpenPort(app);
    return [preferred, ...actual.filter(port => port !== preferred)];
  }
  return configured ? [configured] : actual;
}

export function portIsOpenable(app) {
  return !!(app && app.running && preferredOpenPort(app)
    && (!configuredPort(app) || app.listening !== false || hasPortMismatch(app)));
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const OPEN_URL_MAX_LEN = 500;

/* 规范化用户填写的打开地址。空值表示默认「地址+端口」。
   返回 { value } 或 { error }。路径会拼到当前端口；完整 URL 仅允许本机 http。 */
export function normalizeConfiguredOpenUrl(value) {
  if (value == null) return { value: null };
  if (typeof value !== 'string') return { error: 'invalid' };
  const raw = value.trim();
  if (!raw) return { value: null };
  if (raw.length > OPEN_URL_MAX_LEN || /\s/.test(raw) || raw.startsWith('//')) {
    return { error: 'invalid' };
  }
  if (raw.charAt(0) === '/') return { value: raw };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)
      && !/^(localhost|127\.0\.0\.1|\[::1\])/i.test(raw)) {
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
  } catch (e) { /* 非法地址 */ }
  return { error: 'invalid' };
}

/* 打开链接：默认 http://地址:端口；openUrl 为路径时拼到当前端口，
   为完整本机 URL 时按用户配置打开（用于 Astro base 等子路径站点）。 */
export function resolveOpenUrl(item, port) {
  const value = normalizePort(port);
  if (!value) return '';
  let host = item && item.openHosts && item.openHosts[String(value)];
  if (!host && item) host = item.openHost;
  host = host === 'localhost' ? 'localhost' : '127.0.0.1';
  const origin = 'http://' + host + ':' + value;
  const parsed = normalizeConfiguredOpenUrl(item && item.openUrl);
  if (!parsed || parsed.error || !parsed.value) return origin;
  return parsed.value.charAt(0) === '/' ? origin + parsed.value : parsed.value;
}
