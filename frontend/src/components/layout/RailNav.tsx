import React from 'react';
import { Rocket, Activity, FileText, Settings } from 'lucide-react';
import type { StateResponse } from '../../types/console';
import { useModal } from '../../context/ModalContext';

interface RailNavProps {
  currentView: 'launchpad' | 'services';
  onViewChange: (view: 'launchpad' | 'services') => void;
  connected: boolean;
  data: StateResponse | null;
}

export const RailNav: React.FC<RailNavProps> = ({
  currentView,
  onViewChange,
  connected,
  data,
}) => {
  const { openLogDrawer, setSettingsOpen } = useModal();

  return (
    <aside
      className="w-16 md:w-20 shrink-0 flex flex-col justify-between py-5 items-center border-r select-none"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--line)',
      }}
    >
      <nav className="flex flex-col gap-3 items-center w-full px-2">
        <button
          type="button"
          onClick={() => onViewChange('launchpad')}
          title="启动台"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
            currentView === 'launchpad'
              ? 'text-white shadow-md'
              : 'text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
          }`}
          style={{
            backgroundColor: currentView === 'launchpad' ? 'var(--accent)' : 'transparent',
          }}
        >
          <Rocket size={20} />
          <span className="text-[10px] mt-1 font-medium leading-none">启动台</span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange('services')}
          title="服务监控"
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
            currentView === 'services'
              ? 'text-white shadow-md'
              : 'text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
          }`}
          style={{
            backgroundColor: currentView === 'services' ? 'var(--accent)' : 'transparent',
          }}
        >
          <Activity size={20} />
          <span className="text-[10px] mt-1 font-medium leading-none">监控</span>
        </button>

        <div className="w-8 h-px my-1" style={{ backgroundColor: 'var(--line)' }} />

        <button
          type="button"
          onClick={() => openLogDrawer({ isConsole: true, appName: '总控台日志' })}
          title="日志中心 (⌘J)"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer active:scale-95"
        >
          <FileText size={20} />
          <span className="text-[10px] mt-1 font-medium leading-none">日志</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="设置中心 (⌘,)"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer active:scale-95"
        >
          <Settings size={20} />
          <span className="text-[10px] mt-1 font-medium leading-none">设置</span>
        </button>
      </nav>

      <div className="flex flex-col items-center gap-1.5 text-center px-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
            {connected ? '已连接' : '已断开'}
          </span>
        </div>
        <span className="text-[10px] mono" style={{ color: 'var(--ink-4)' }}>
          :{data?.consolePort || 9600}
        </span>
        <span className="text-[10px] mono" style={{ color: 'var(--ink-4)' }}>
          v{data?.version || '1.0'}
        </span>
      </div>
    </aside>
  );
};
