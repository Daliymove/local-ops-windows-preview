import React, { useState, useEffect } from 'react';
import { useModal } from '../../context/ModalContext';
import type { StateResponse } from '../../types/console';
import { Search, Rocket, Activity, Plus } from 'lucide-react';
import { api } from '../../services/api';

interface CmdkModalProps {
  data: StateResponse | null;
  onViewChange: (view: 'launchpad' | 'services') => void;
  onRefresh?: () => void;
}

export const CmdkModal: React.FC<CmdkModalProps> = ({ data, onViewChange, onRefresh }) => {
  const { isCmdkOpen, setCmdkOpen, openAppEdit, openLogDrawer, showToast } = useModal();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(!isCmdkOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        openLogDrawer({ isConsole: true, appName: '总控台日志' });
      }
      if (e.key === 'Escape' && isCmdkOpen) {
        setCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdkOpen, setCmdkOpen, openLogDrawer]);

  if (!isCmdkOpen) return null;

  const apps = data?.apps || [];
  const q = query.toLowerCase();

  const filteredApps = apps.filter(a =>
    a.name.toLowerCase().includes(q) || a.command.toLowerCase().includes(q)
  );

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) {
          setCmdkOpen(false);
        }
      }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in"
    >
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden select-none animate-cmdk-in"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--line)' }}
        >
          <Search size={18} className="text-[var(--ink-4)] shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="搜索服务、任务或输入指令..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <span className="text-[10px] mono px-2 py-0.5 rounded border text-[var(--ink-4)]" style={{ borderColor: 'var(--line)' }}>
            ESC
          </span>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto space-y-1 text-xs">
          <div
            onClick={() => {
              onViewChange('launchpad');
              setCmdkOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--card-2)] cursor-pointer transition-colors"
          >
            <Rocket size={16} className="text-[var(--accent)]" />
            <span>切换至启动台</span>
          </div>

          <div
            onClick={() => {
              onViewChange('services');
              setCmdkOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--card-2)] cursor-pointer transition-colors"
          >
            <Activity size={16} className="text-emerald-500" />
            <span>切换至服务监控</span>
          </div>

          <div
            onClick={() => {
              openAppEdit({ mode: 'create', initialKind: 'service' });
              setCmdkOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--card-2)] cursor-pointer transition-colors"
          >
            <Plus size={16} className="text-[var(--accent)]" />
            <span>新建服务卡片</span>
          </div>

          {filteredApps.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
              <div className="px-3 py-1 text-[11px] font-semibold" style={{ color: 'var(--ink-4)' }}>
                应用与任务
              </div>
              {filteredApps.map(app => (
                <div
                  key={app.id}
                  onClick={async () => {
                    if (app.running) {
                      await api.stopApp(app.id);
                      showToast(`已停止 ${app.name}`);
                    } else {
                      await api.startApp(app.id);
                      showToast(`已启动 ${app.name}`);
                    }
                    onRefresh?.();
                    setCmdkOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--card-2)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        app.running ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                    />
                    <span className="font-semibold">{app.name}</span>
                    <span className="mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
                      {app.kind === 'service' ? `:${app.port || '-'}` : '任务'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
                    {app.running ? '点击停止' : '点击启动'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
