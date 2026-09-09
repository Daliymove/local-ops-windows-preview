import React, { useState, useMemo } from 'react';
import type { StateResponse } from '../../types/console';
import { ServiceRow } from './ServiceRow';
import { PortDiscoveryBanner } from './PortDiscoveryBanner';
import { WatchChips } from './WatchChips';
import { Search } from 'lucide-react';

interface ServicesViewProps {
  data: StateResponse | null;
  onRefresh: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ data, onRefresh }) => {
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
    return services.filter(s => {
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
    });
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
              {filteredServices.length > 0 ? (
                filteredServices.map(svc => (
                  <ServiceRow key={svc.instanceKey || svc.key} svc={svc} onRefresh={onRefresh} />
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
      />
    </div>
  );
};
