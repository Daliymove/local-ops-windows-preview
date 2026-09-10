import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useModal } from '../../context/ModalContext';
import { X, Copy, FileText, RotateCw } from 'lucide-react';
import { api } from '../../services/api';

export const LogDrawer: React.FC = () => {
  const { logDrawerState, closeLogDrawer, showToast } = useModal();
  const [logs, setLogs] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const logPreRef = useRef<HTMLPreElement>(null);

  const isOpen = !!logDrawerState;
  const { appId, appName, isConsole } = logDrawerState || {};

  // 监听 ESC 键关闭日志抽屉
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLogDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLogDrawer]);

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let text = '';
      if (isConsole) {
        text = await api.getConsoleLogs(400);
      } else if (appId) {
        text = await api.getLogs(appId, 400);
      }
      setLogs(text || '（暂无日志输出）');
      setLastUpdated(new Date());
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, [appId, isConsole]);

  useEffect(() => {
    if (!isOpen) return;

    fetchLogs();
    const timer = setInterval(fetchLogs, 1500);
    return () => {
      clearInterval(timer);
    };
  }, [isOpen, fetchLogs]);

  // 清洗 ANSI 终端控制序列，消除控制字符乱码
  const cleanLogs = useMemo(() => {
    if (!logs) return '';
    return logs.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  }, [logs]);

  useEffect(() => {
    if (autoScroll && logPreRef.current) {
      logPreRef.current.scrollTop = logPreRef.current.scrollHeight;
    }
  }, [cleanLogs, autoScroll]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanLogs);
      showToast('日志已复制到剪贴板');
    } catch {
      showToast('复制失败');
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) {
          closeLogDrawer();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-backdrop-in"
    >
      <div
        className="w-full max-w-2xl h-full flex flex-col border-l shadow-2xl animate-drawer-in"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line)',
          color: 'var(--ink)',
        }}
      >
        <div
          className="h-16 px-6 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="flex items-center gap-3">
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {isConsole ? '总控台运行日志' : `${appName || '应用'} · 日志`}
              </h3>
              <p className="text-[11px] mono" style={{ color: 'var(--ink-4)' }}>
                实时轮询最新 400 行输出 {lastUpdated ? `· 已更新 ${lastUpdated.toLocaleTimeString()}` : ''} · 按 Esc 退出
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-3)] cursor-pointer select-none mr-1">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded border-[var(--line)]"
              />
              <span>自动滚屏</span>
            </label>

            <button
              type="button"
              onClick={() => fetchLogs()}
              disabled={isRefreshing}
              title="立即刷新日志"
              className="p-2 rounded-xl border hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-50 transition-colors"
              style={{ borderColor: 'var(--line)' }}
            >
              <RotateCw size={15} className={isRefreshing ? 'animate-spin text-[var(--accent)]' : ''} />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              title="复制全部日志"
              className="p-2 rounded-xl border hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer transition-colors"
              style={{ borderColor: 'var(--line)' }}
            >
              <Copy size={15} />
            </button>

            <button
              type="button"
              onClick={closeLogDrawer}
              title="关闭 (Esc)"
              className="p-2 rounded-xl border hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer transition-colors"
              style={{ borderColor: 'var(--line)' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <pre
          ref={logPreRef}
          className="flex-1 p-6 font-mono text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap select-text"
          style={{
            backgroundColor: 'var(--card-2)',
            color: 'var(--ink-2)',
          }}
        >
          {cleanLogs}
        </pre>
      </div>
    </div>
  );
};
