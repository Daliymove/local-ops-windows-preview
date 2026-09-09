import React from 'react';
import type { ServiceItem } from '../../types/console';
import {
  Pin, EyeOff, Eye, Plus, Trash2, ArrowUpRight,
  Bot, Terminal, Code, Server, Package
} from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

interface ServiceRowProps {
  svc: ServiceItem;
  onRefresh: () => void;
}

export const ServiceRow: React.FC<ServiceRowProps> = ({ svc, onRefresh }) => {
  const { openConfirm, openAppEdit, showToast } = useModal();

  const handleKill = () => {
    openConfirm({
      title: '结束进程',
      message: `确定要结束进程「${svc.name}」吗？\nPID: ${svc.pid} · 端口 :${svc.port}`,
      okText: '结束进程',
      tone: 'danger',
      showForce: true,
      onConfirm: async (force?: boolean) => {
        const res = await api.killProcess(svc.pid, force || false);
        if (res.ok) {
          showToast(`已结束进程 ${svc.name} (PID ${svc.pid})`);
          onRefresh();
        } else {
          showToast(`结束进程失败: ${res.error}`);
        }
      },
    });
  };

  const handleToggleFlag = async (flag: 'pinned' | 'hidden' | 'promoted') => {
    const nextVal = !svc[flag];
    const res = await api.setServiceFlag(svc.key, flag, nextVal);
    if (res.ok) {
      showToast(nextVal ? '已标记' : '已取消标记');
      onRefresh();
    } else {
      showToast(`操作失败: ${res.error}`);
    }
  };

  const handleAddToLaunchpad = () => {
    openAppEdit({
      mode: 'create',
      initialKind: 'service',
      attachPid: svc.pid,
      initialName: svc.project || svc.name,
      initialPort: svc.port,
      initialCwd: svc.cwd || undefined,
      initialCommand: svc.cmd || undefined,
    });
  };

  const handleCopyUrl = async () => {
    const url = `http://127.0.0.1:${svc.port}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(`已复制: ${url}`);
    } catch {
      showToast('复制失败');
    }
  };

  const renderOriginIcon = (iconName: string) => {
    switch (iconName) {
      case 'bot': return <Bot size={12} className="text-purple-500" />;
      case 'code': return <Code size={12} className="text-blue-500" />;
      case 'terminal': return <Terminal size={12} className="text-emerald-500" />;
      case 'package': return <Package size={12} className="text-amber-500" />;
      default: return <Server size={12} className="text-zinc-500" />;
    }
  };

  const formatUptime = (sec: number) => {
    if (!sec || sec < 60) return `${sec || 0}秒`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}分`;
    const h = Math.floor(m / 60);
    return `${h}时${m % 60}分`;
  };

  return (
    <tr
      className="border-b transition-colors hover:bg-[var(--card-2)] text-xs select-none"
      style={{ borderColor: 'var(--line)' }}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {svc.name}
          </span>
          <button
            type="button"
            onClick={handleCopyUrl}
            title="点击复制访问地址"
            className="mono font-bold px-1.5 py-0.2 rounded border bg-[var(--card)] hover:border-[var(--accent)] text-[var(--accent)] transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            :{svc.port}
          </button>
          {svc.pinned && (
            <span className="text-amber-500" title="已置顶">
              <Pin size={12} />
            </span>
          )}
        </div>
        <div className="text-[11px] mono mt-0.5" style={{ color: 'var(--ink-4)' }}>
          PID: {svc.pid}
        </div>
      </td>

      <td className="py-3 px-4">
        {svc.origin ? (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--card-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            {renderOriginIcon(svc.origin.icon)}
            <span>{svc.origin.label}</span>
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        )}
      </td>

      <td className="py-3 px-4 max-w-xs">
        <div className="truncate font-medium" style={{ color: 'var(--ink)' }} title={svc.cwd || ''}>
          {svc.project || (svc.cwd ? svc.cwd.split(/[\\/]/).pop() : '—')}
        </div>
        <div className="truncate text-[11px] mono" style={{ color: 'var(--ink-4)' }} title={svc.cmd}>
          {svc.cmd}
        </div>
      </td>

      <td className="py-3 px-4 mono text-right">
        <div>{svc.cpu != null && svc.cpu > 0 ? `${svc.cpu.toFixed(1)}%` : '—'}</div>
        <div className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
          {svc.mem != null ? `${svc.mem.toFixed(1)}%` : '—'}
        </div>
      </td>

      <td className="py-3 px-4 mono text-[11px] text-right" style={{ color: 'var(--ink-3)' }}>
        {formatUptime(svc.uptimeSec)}
      </td>

      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {!svc.appId && (
            <button
              type="button"
              onClick={handleAddToLaunchpad}
              title="认领并加入启动台"
              className="p-1.5 rounded-lg border hover:bg-[var(--card)] text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              style={{ borderColor: 'var(--line)' }}
            >
              <Plus size={14} />
            </button>
          )}

          <a
            href={`http://127.0.0.1:${svc.port}`}
            target="_blank"
            rel="noreferrer"
            title="在新标签页打开"
            className="p-1.5 rounded-lg border hover:bg-[var(--card)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <ArrowUpRight size={14} />
          </a>

          <button
            type="button"
            onClick={() => handleToggleFlag('pinned')}
            title={svc.pinned ? '取消置顶' : '置顶'}
            className={`p-1.5 rounded-lg border hover:bg-[var(--card)] transition-colors cursor-pointer ${
              svc.pinned ? 'text-amber-500 border-amber-500/30' : 'text-[var(--ink-3)]'
            }`}
            style={{ borderColor: svc.pinned ? undefined : 'var(--line)' }}
          >
            <Pin size={14} />
          </button>

          <button
            type="button"
            onClick={() => handleToggleFlag('hidden')}
            title={svc.hidden ? '取消隐藏' : '隐藏服务'}
            className="p-1.5 rounded-lg border hover:bg-[var(--card)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            {svc.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          <button
            type="button"
            onClick={handleKill}
            title="结束进程"
            className="p-1.5 rounded-lg border hover:bg-red-500/10 text-[var(--ink-3)] hover:text-red-500 hover:border-red-500/30 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};
