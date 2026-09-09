export interface HealthIssue {
  kind: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  fix?: string;
  action?: string;
}

export interface AppHealth {
  status: 'ok' | 'error' | 'unknown';
  blocking: boolean;
  issues: HealthIssue[];
}

export interface LastExit {
  status: 'succeeded' | 'canceled' | 'failed' | 'stopped';
  code: number | null;
  at: number;
  startedAt?: number;
  durationSec?: number;
}

export interface AppItem {
  id: string;
  name: string;
  command: string;
  cwd: string | null;
  port: number | null;
  openUrl: string | null;
  emoji: string | null;
  glyph: string | null;
  icon: string | null;
  favicon: string | null;
  kind: 'service' | 'task';
  attached?: boolean;
  running: boolean;
  pid: number | null;
  uptimeSec: number;
  listening?: boolean;
  portOccupied?: boolean;
  portOccupiedPid?: number | null;
  portConflict?: boolean;
  portConflictApps?: string[];
  lastExit?: LastExit | null;
  health?: AppHealth;
  ports?: number[];
  portOwner?: {
    pid: number;
    name: string;
    appId?: string;
    appName?: string;
  } | null;
  legacyManaged?: boolean;
}

export interface ProcessOrigin {
  label: string;
  icon: string;
}

export interface ServiceItem {
  key: string;
  instanceKey: string;
  pid: number;
  name: string;
  port: number;
  cwd: string | null;
  project: string | null;
  cmd: string;
  cpu: number;
  mem: number;
  uptimeSec: number;
  group: 'mine' | 'background';
  pinned: boolean;
  hidden: boolean;
  promoted: boolean;
  appId: string | null;
  appName: string | null;
  origin: ProcessOrigin;
}

export interface WatchedItem {
  pid: number;
  name: string;
  cmd: string;
  cpu: number;
  mem: number;
  uptimeSec: number;
  keyword: string;
}

export interface ThemeItem {
  id: string;
  name: string;
  author?: string;
  desc?: string;
  colors?: string[];
}

export interface StateResponse {
  services: ServiceItem[];
  watched: WatchedItem[];
  apps: AppItem[];
  watchedKeywords: string[];
  consolePort: number;
  consolePid: number;
  consoleCwd: string;
  version: string;
  schemaVersion: number;
  degraded: boolean;
  degradedReasons: Array<{ component: string; error: string }>;
  themes?: ThemeItem[];
  uiTheme?: string;
}

export interface DetectCandidate {
  command: string;
  label: string;
  source: string;
  port: number | null;
  kind: 'service' | 'task';
  detail: string;
}

export interface DetectResponse {
  ok: boolean;
  cwd?: string;
  name?: string;
  files?: string[];
  candidates?: DetectCandidate[];
  error?: string;
}

export interface DiagnoseIssue {
  kind: string;
  title: string;
  detail: string;
  fix?: string;
  action?: string;
}

export interface DiagnoseResponse {
  ok: boolean;
  summary?: string;
  issues?: DiagnoseIssue[];
  error?: string;
}

export const GLYPH_OPTIONS = [
  'rocket', 'globe', 'terminal', 'server', 'database', 'bot',
  'gamepad-2', 'film', 'music', 'code', 'folder-git-2', 'zap',
  'container', 'cpu', 'wifi', 'hard-drive', 'package', 'wrench'
];
