import React, { useState, useMemo } from 'react';
import type { StateResponse } from '../../types/console';
import { AppCard } from './AppCard';
import { Plus, Search, StopCircle, Layers } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

interface LaunchpadViewProps {
  data: StateResponse | null;
  onRefresh: () => void;
}

export const LaunchpadView: React.FC<LaunchpadViewProps> = ({ data, onRefresh }) => {
  const { openAppEdit, openConfirm, showToast } = useModal();
  const [filterKind, setFilterKind] = useState<'all' | 'service' | 'task' | 'running' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const apps = useMemo(() => data?.apps || [], [data?.apps]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (filterKind === 'service' && app.kind !== 'service') return false;
      if (filterKind === 'task' && app.kind !== 'task') return false;
      if (filterKind === 'running' && !app.running) return false;
      if (filterKind === 'issues') {
        const hasIssue = app.portOccupied || app.portConflict || (app.health && app.health.status === 'error');
        if (!hasIssue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(q);
        const matchCmd = app.command.toLowerCase().includes(q);
        const matchPort = app.port ? String(app.port).includes(q) : false;
        if (!matchName && !matchCmd && !matchPort) return false;
      }

      return true;
    });
  }, [apps, filterKind, searchQuery]);

  const runningCount = apps.filter(a => a.running).length;
  const serviceCount = apps.filter(a => a.kind === 'service').length;
  const taskCount = apps.filter(a => a.kind === 'task').length;
  const issueCount = apps.filter(a => a.portOccupied || a.portConflict || a.health?.status === 'error').length;

  const handleBatchStop = () => {
    const runningApps = apps.filter(a => a.running);
    if (runningApps.length === 0) {
      showToast('当前没有正在运行的应用');
      return;
    }

    openConfirm({
      title: '批量停止应用',
      message: `确定要停止所有正在运行的 ${runningApps.length} 个应用服务与任务吗？`,
      okText: '全部停止',
      tone: 'danger',
      onConfirm: async () => {
        for (const app of runningApps) {
          await api.stopApp(app.id);
        }
        showToast(`已停止 ${runningApps.length} 个应用`);
        onRefresh();
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div
          className="flex items-center p-1 rounded-xl gap-1 border flex-wrap"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--line)',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterKind('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterKind === 'all'
                ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            全部 ({apps.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('service')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterKind === 'service'
                ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            服务 ({serviceCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('task')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterKind === 'task'
                ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            任务 ({taskCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('running')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterKind === 'running'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
          >
            运行中 ({runningCount})
          </button>
          {issueCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterKind('issues')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterKind === 'issues'
                  ? 'bg-red-500 text-white shadow-xs font-semibold'
                  : 'text-red-500 hover:bg-red-500/10'
              }`}
            >
              异常 ({issueCount})
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border flex-1 sm:w-64"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <Search size={14} className="text-[var(--ink-4)] shrink-0" />
            <input
              type="text"
              placeholder="搜索应用名、端口、命令..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs w-full focus:outline-none"
              style={{ color: 'var(--ink)' }}
            />
          </div>

          {runningCount > 0 && (
            <button
              type="button"
              onClick={handleBatchStop}
              title="一键停止所有应用"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer shrink-0"
            >
              <StopCircle size={14} />
              <span className="hidden md:inline">停止全部</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openAppEdit({ mode: 'create', initialKind: 'service' })}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:opacity-90 text-white shadow-xs transition-opacity cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>添加服务</span>
          </button>
        </div>
      </div>

      {filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredApps.map((app, idx) => (
            <div
              key={app.id}
              style={{ '--d': Math.min(idx, 12) } as React.CSSProperties}
              className="animate-card-stagger"
            >
              <AppCard app={app} onRefresh={onRefresh} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border text-center p-8"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
        >
          <Layers size={40} className="text-[var(--ink-4)] mb-3" />
          <h4 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            没有找到匹配的应用
          </h4>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--ink-3)' }}>
            {searchQuery ? '尝试更改搜索关键词或切换分类' : '点击上方「添加服务」创建你的第一个本地启动项'}
          </p>
          <button
            type="button"
            onClick={() => openAppEdit({ mode: 'create', initialKind: 'service' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={14} />
            <span>新建服务</span>
          </button>
        </div>
      )}
    </div>
  );
};
