import React, { useState } from 'react';
import type { WatchedItem } from '../../types/console';
import { Eye, Plus, X } from 'lucide-react';
import { api } from '../../services/api';
import { useModal } from '../../context/ModalContext';

interface WatchChipsProps {
  watchedKeywords: string[];
  watchedProcesses: WatchedItem[];
  onRefresh: () => void;
}

export const WatchChips: React.FC<WatchChipsProps> = ({
  watchedKeywords,
  watchedProcesses,
  onRefresh,
}) => {
  const { showToast } = useModal();
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const kw = newKeyword.trim().toLowerCase();
    if (!kw) return;
    const res = await api.setWatchKeyword(kw, 'add');
    if (res.ok) {
      showToast(`已添加关注关键词: ${kw}`);
      setNewKeyword('');
      onRefresh();
    } else {
      showToast(`添加失败: ${res.error}`);
    }
  };

  const handleRemove = async (kw: string) => {
    const res = await api.setWatchKeyword(kw, 'remove');
    if (res.ok) {
      showToast(`已取消关注: ${kw}`);
      onRefresh();
    }
  };

  return (
    <div
      className="p-4 rounded-2xl border space-y-3"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={16} style={{ color: 'var(--accent)' }} />
          <h4 className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
            关注进程监控
          </h4>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
          匹配命令行中包含的关键字
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {watchedKeywords.map(kw => (
          <span
            key={kw}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono"
            style={{
              backgroundColor: 'var(--card-2)',
              borderColor: 'var(--line)',
              color: 'var(--ink)',
            }}
          >
            <span>{kw}</span>
            <button
              type="button"
              onClick={() => handleRemove(kw)}
              className="text-[var(--ink-4)] hover:text-red-500 cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <form onSubmit={handleAdd} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="输入如 ffmpeg, ollama..."
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border bg-transparent font-mono focus:outline-none"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer"
          >
            <Plus size={13} />
          </button>
        </form>
      </div>

      {watchedProcesses.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--ink-3)' }}>
            当前命中关注进程 ({watchedProcesses.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {watchedProcesses.map(p => (
              <div
                key={p.pid}
                className="p-2 rounded-xl border text-xs flex items-center justify-between"
                style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
              >
                <div className="truncate min-w-0 pr-2">
                  <div className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {p.name}
                  </div>
                  <div className="text-[10px] mono truncate" style={{ color: 'var(--ink-4)' }}>
                    PID {p.pid} · {p.cmd}
                  </div>
                </div>
                <div className="mono text-[11px] shrink-0 text-right" style={{ color: 'var(--ink-3)' }}>
                  <div>{p.cpu > 0 ? `${p.cpu.toFixed(1)}%` : '0%'}</div>
                  <div>{p.mem != null ? `${p.mem.toFixed(1)}%` : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
