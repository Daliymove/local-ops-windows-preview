import React from 'react';
import { Plus, FileText, Settings, Terminal } from 'lucide-react';
import { useModal } from '../../context/ModalContext';

interface QuickActionsProps {
  onRefresh: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = () => {
  const { openAppEdit, openLogDrawer, setSettingsOpen } = useModal();

  return (
    <div
      className="p-4 rounded-2xl border space-y-3"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
    >
      <h4 className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
        快捷操作
      </h4>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openAppEdit({ mode: 'create', initialKind: 'service' })}
          className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <Plus size={14} className="text-[var(--accent)]" />
          <span>新建服务</span>
        </button>

        <button
          type="button"
          onClick={() => openAppEdit({ mode: 'create', initialKind: 'task' })}
          className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <Terminal size={14} className="text-emerald-500" />
          <span>新建任务</span>
        </button>

        <button
          type="button"
          onClick={() => openLogDrawer({ isConsole: true, appName: '总控台日志' })}
          className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <FileText size={14} className="text-blue-500" />
          <span>日志中心</span>
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
        >
          <Settings size={14} className="text-purple-500" />
          <span>设置中心</span>
        </button>
      </div>
    </div>
  );
};
