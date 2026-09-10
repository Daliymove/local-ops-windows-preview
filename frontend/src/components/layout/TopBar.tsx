import React from 'react';
import { Sun, Moon, RotateCcw, StopCircle, Rocket, Activity } from 'lucide-react';
import type { StateResponse } from '../../types/console';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

interface TopBarProps {
  currentView: 'launchpad' | 'services';
  onViewChange: (view: 'launchpad' | 'services') => void;
  data: StateResponse | null;
  theme: string;
  onToggleTheme: () => void;
  isRestarting?: boolean;
  onRestartConsole?: () => Promise<boolean>;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onViewChange,
  data,
  theme,
  onToggleTheme,
  isRestarting = false,
  onRestartConsole,
}) => {
  const { openConfirm, showToast } = useModal();

  const handleRestartConsole = () => {
    openConfirm({
      title: '重启总控台',
      message: '确定要重启总控台自身服务吗？点击后页面将重置为初始状态，待服务启动后自动恢复呈现。',
      okText: '确认重启',
      tone: 'primary',
      onConfirm: async () => {
        if (onRestartConsole) {
          await onRestartConsole();
        } else {
          const res = await api.restartConsole();
          if (res.ok) {
            showToast('总控台正在重启，稍后将自动重新连接…', 5000);
          } else {
            showToast('重启失败：' + res.error, 4000);
          }
        }
      },
    });
  };

  const handleStopConsole = () => {
    openConfirm({
      title: '停止总控台',
      message: '停止总控台自身服务后，页面将断开连接。已启动的独立应用进程将保持后台运行。',
      okText: '停止',
      tone: 'danger',
      onConfirm: async () => {
        await api.stopConsole();
        showToast('总控台服务已停止', 4000);
      },
    });
  };

  const runningAppsCount = data?.apps.filter(a => a.running).length || 0;
  const listeningServicesCount = data?.services.length || 0;

  return (
    <header
      className="h-16 px-6 border-b flex items-center justify-between select-none shrink-0"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--line)',
      }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/assets/brand-mark.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--ink)' }}>
              总控台
            </h1>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--ink-4)' }}>
              本地服务监控 · 快速启动
            </p>
          </div>
        </div>

        <div
          className="flex items-center p-1 rounded-xl gap-1 border"
          style={{
            backgroundColor: 'var(--card-2)',
            borderColor: 'var(--line)',
          }}
        >
          <button
            type="button"
            onClick={() => onViewChange('launchpad')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              currentView === 'launchpad'
                ? 'bg-[var(--card)] shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
            style={{
              color: currentView === 'launchpad' ? 'var(--accent)' : undefined,
            }}
          >
            <Rocket size={14} />
            <span>启动台</span>
            {data?.apps && data.apps.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] mono font-bold"
                style={{
                  backgroundColor: currentView === 'launchpad' ? 'var(--accent-light)' : 'var(--line)',
                  color: currentView === 'launchpad' ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {data.apps.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onViewChange('services')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              currentView === 'services'
                ? 'bg-[var(--card)] shadow-xs font-semibold'
                : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
            }`}
            style={{
              color: currentView === 'services' ? 'var(--accent)' : undefined,
            }}
          >
            <Activity size={14} />
            <span>服务监控</span>
            {data?.services && data.services.length > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] mono font-bold"
                style={{
                  backgroundColor: currentView === 'services' ? 'var(--accent-light)' : 'var(--line)',
                  color: currentView === 'services' ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {data.services.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-3 text-xs mono px-3 py-1.5 rounded-lg border"
             style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
          <span>运行中: <strong className="text-emerald-500">{runningAppsCount}</strong></span>
          <span>·</span>
          <span>监听中: <strong style={{ color: 'var(--ink)' }}>{listeningServicesCount}</strong></span>
        </div>

        <button
          type="button"
          onClick={handleRestartConsole}
          disabled={isRestarting}
          title="重启总控台"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isRestarting ? 'opacity-60 cursor-not-allowed bg-[var(--card-2)]' : 'hover:bg-[var(--card-2)]'
          }`}
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <RotateCcw size={13} className={isRestarting ? 'animate-spin text-[var(--accent)]' : ''} />
          <span>{isRestarting ? '重启中…' : '重启'}</span>
          <span className="mono text-[11px]" style={{ color: 'var(--ink-4)' }}>
            :{data?.consolePort || 9600}
          </span>
        </button>

        <button
          type="button"
          onClick={handleStopConsole}
          title="停止总控台"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
        >
          <StopCircle size={14} />
          <span>停止</span>
        </button>

        <div className="w-px h-5" style={{ backgroundColor: 'var(--line)' }} />

        <button
          type="button"
          onClick={onToggleTheme}
          title="切换深浅主题"
          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-[var(--card-2)] cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <a
          href="https://github.com/laogou717/local-ops"
          target="_blank"
          rel="noreferrer"
          title="查看 GitHub 仓库"
          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-[var(--card-2)] cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
};
