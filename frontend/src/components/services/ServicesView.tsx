import React, { useState, useMemo } from 'react';
import type { StateResponse, ServiceItem } from '../../types/console';
import { ServiceRow } from './ServiceRow';
import { PortDiscoveryBanner } from './PortDiscoveryBanner';
import { WatchChips } from './WatchChips';
import { Search, RotateCcw } from 'lucide-react';

interface ServicesViewProps {
  data: StateResponse | null;
  onRefresh: () => void;
  onMutate?: (updater: (prev: StateResponse | null) => StateResponse | null) => void;
  isRestarting?: boolean;
}

function isSystemService(s: ServiceItem): boolean {
  if (!s) return false;
  const originLabel = s.origin?.label;
  if (originLabel === '系统' || originLabel === 'System') return true;
  if (s.group === 'background') return true;
  const name = (s.name || '').toLowerCase();
  if (
    name === 'system' ||
    name.startsWith('svchost') ||
    name === 'spoolsv.exe' ||
    name === 'lsass.exe' ||
    name === 'wininit.exe' ||
    name === 'csrss.exe' ||
    name === 'services.exe' ||
    name === 'smss.exe' ||
    name === 'launchd' ||
    name === 'kernel_task'
  ) {
    return true;
  }
  const cmd = (s.cmd || '').toLowerCase();
  const cwd = (s.cwd || '').toLowerCase();
  if (cmd.includes('\\windows\\system32\\') || cmd.includes('\\windows\\syswow64\\') || cwd.includes('\\windows\\system32\\')) {
    return true;
  }
  if (cmd.startsWith('/system/') || cmd.startsWith('/usr/libexec/') || cmd.startsWith('/usr/sbin/') || cmd.startsWith('/sbin/')) {
    return true;
  }
  return false;
}

function isConsoleService(s: ServiceItem): boolean {
  return !!s.appId || s.origin?.label === '总控台';
}

function getServiceTier(s: ServiceItem): { tier: number; subTier: number } {
  const pinned = !!s.pinned;
  const isConsole = isConsoleService(s);
  const isSystem = isSystemService(s);

  if (pinned) {
    // 0: 置顶应用（置顶内按总控台优先）
    return { tier: 0, subTier: isConsole ? 0 : isSystem ? 2 : 1 };
  }
  if (isConsole) {
    // 1: 总控台应用
    return { tier: 1, subTier: 0 };
  }
  if (!isSystem) {
    // 2: 用户应用
    return { tier: 2, subTier: 0 };
  }
  // 3: 系统应用
  return { tier: 3, subTier: 0 };
}

function sortServices(a: ServiceItem, b: ServiceItem): number {
  const aRank = getServiceTier(a);
  const bRank = getServiceTier(b);

  if (aRank.tier !== bRank.tier) {
    return aRank.tier - bRank.tier;
  }
  if (aRank.subTier !== bRank.subTier) {
    return aRank.subTier - bRank.subTier;
  }

  const aPort = a.port ?? Infinity;
  const bPort = b.port ?? Infinity;
  if (aPort !== bPort) return aPort - bPort;

  return (a.name || '').localeCompare(b.name || '');
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  data,
  onRefresh,
  onMutate,
  isRestarting = false,
}) => {
  const [tab, setTab] = useState<'mine' | 'background' | 'hidden'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedDiscoveryKeys, setDismissedDiscoveryKeys] = useState<Set<string>>(new Set());

  const services = useMemo(() => data?.services || [], [data?.services]);
  const watched = data?.watched || [];
  const watchedKeywords = data?.watchedKeywords || [];

  const newDiscoveries = useMemo(() => {
    return services.filter(
      s =>
        s.group === 'mine' &&
        !s.appId &&
        !s.hidden &&
        !s.pinned &&
        !dismissedDiscoveryKeys.has(s.key)
    );
  }, [services, dismissedDiscoveryKeys]);

  const filteredServices = useMemo(() => {
    return services
      .filter(s => {
        if (tab === 'mine') {
          if (s.group !== 'mine' || s.hidden) return false;
        } else if (tab === 'background') {
          if (s.group !== 'background' || s.hidden) return false;
        } else if (tab === 'hidden') {
          if (!s.hidden) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchPort = String(s.port).includes(q);
          const matchProject = (s.project || '').toLowerCase().includes(q);
          const matchCmd = s.cmd.toLowerCase().includes(q);
          const matchOrigin = (s.origin?.label || '').toLowerCase().includes(q);
          if (!matchName && !matchPort && !matchProject && !matchCmd && !matchOrigin) return false;
        }

        return true;
      })
      .sort(sortServices);
  }, [services, tab, searchQuery]);

  const mineCount = services.filter(s => s.group === 'mine' && !s.hidden).length;
  const bgCount = services.filter(s => s.group === 'background' && !s.hidden).length;
  const hiddenCount = services.filter(s => s.hidden).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <PortDiscoveryBanner
        newServices={newDiscoveries}
        onDismiss={key => setDismissedDiscoveryKeys(prev => new Set([...prev, key]))}
        onRefresh={onRefresh}
        onMutate={onMutate}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div
          className="flex items-center p-1 rounded-xl gap-1 border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === 'mine'
                ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            我的服务 ({mineCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('background')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              tab === 'background'
                ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            后台进程 ({bgCount})
          </button>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setTab('hidden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === 'hidden'
                  ? 'bg-zinc-600 text-white shadow-xs font-semibold'
                  : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              已隐藏 ({hiddenCount})
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-72"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <Search size={14} className="text-[var(--ink-4)] shrink-0" />
          <input
            type="text"
            placeholder="搜索进程名、端口、来源、路径..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
        </div>
      </div>

      <div
        className="rounded-2xl border shadow-xs overflow-hidden"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-4)]"
                style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
              >
                <th className="py-3 px-4">进程与监听端口</th>
                <th className="py-3 px-4">启动来源</th>
                <th className="py-3 px-4">工作目录 / 启动命令</th>
                <th className="py-3 px-4 text-right">CPU% / 内存%</th>
                <th className="py-3 px-4 text-right">运行时长</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {isRestarting ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs"
                        style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
                      >
                        <RotateCcw size={18} className="animate-spin text-[var(--accent)]" />
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                        总控台重启中，等待服务就绪…
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                        核心服务启动后将自动刷新并展示监听进程列表
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredServices.length > 0 ? (
                filteredServices.map(svc => (
                  <ServiceRow
                    key={svc.instanceKey || svc.key}
                    svc={svc}
                    onRefresh={onRefresh}
                    onMutate={onMutate}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
                    没有找到符合条件的监听进程
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WatchChips
        watchedKeywords={watchedKeywords}
        watchedProcesses={watched}
        onRefresh={onRefresh}
        onMutate={onMutate}
      />
    </div>
  );
};
