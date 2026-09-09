import React, { useState } from 'react';
import type { AppItem, AppHealth } from '../../types/console';
import {
  Play, Square, RotateCcw, ArrowUpRight, Copy,
  FileText, Activity, Edit3, Trash2, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { GlyphIcon } from '../common/IconHelper';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';
import {
  preferredOpenPort, portIsOpenable, localServiceUrl,
  hasPortMismatch
} from '../../services/ports';

interface AppCardProps {
  app: AppItem;
  onRefresh: () => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onRefresh }) => {
  const { openConfirm, openAppEdit, openLogDrawer, openPortDiag, openAppDiag, showToast } = useModal();
  const [loading, setLoading] = useState(false);

  const openPort = preferredOpenPort(app);
  const isOpenable = portIsOpenable(app);
  const openUrl = localServiceUrl(app);
  const hasMismatch = hasPortMismatch(app);
  const isConflict = app.portOccupied || app.portConflict || hasMismatch;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (app.running) {
        const res = await api.stopApp(app.id);
        if (res.ok) {
          showToast(`已停止 ${app.name}`);
        } else {
          showToast(`停止失败：${res.error}`);
        }
      } else {
        const res = await api.startApp(app.id);
        if (res.ok) {
          showToast(`已启动 ${app.name}`);
        } else {
          showToast(`启动失败：${res.error || '未知错误'}`);
          const health = (res as { health?: AppHealth }).health;
          if (health && !health.blocking) {
            openAppDiag(app);
          }
        }
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const res = await api.restartApp(app.id);
      if (res.ok) {
        showToast(`已重启 ${app.name}`);
      } else {
        showToast(`重启失败：${res.error}`);
      }
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!openUrl) return;
    try {
      await navigator.clipboard.writeText(openUrl);
      showToast(`已复制链接: ${openUrl}`);
    } catch {
      showToast('复制失败');
    }
  };

  const handleDelete = () => {
    openConfirm({
      title: `删除 ${app.kind === 'task' ? '任务' : '服务'}`,
      message: `确定要删除应用「${app.name}」吗？如果它正在运行，将会被同时停止。`,
      okText: '删除',
      tone: 'danger',
      onConfirm: async () => {
        const res = await api.deleteApp(app.id);
        if (res.ok) {
          showToast(`已删除 ${app.name}`);
          onRefresh();
        } else {
          showToast(`删除失败: ${res.error}`);
        }
      },
    });
  };

  const formatUptime = (sec: number) => {
    if (!sec || sec < 60) return `${sec || 0}秒`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}分`;
    const h = Math.floor(m / 60);
    return `${h}时${m % 60}分`;
  };

  const renderTaskExitBadge = () => {
    if (app.kind !== 'task' || !app.lastExit) return null;
    const { status, code, durationSec } = app.lastExit;
    const durStr = durationSec != null ? `${durationSec.toFixed(1)}s` : '';

    if (status === 'succeeded') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <CheckCircle2 size={11} />
          <span>成功 {durStr}</span>
        </span>
      );
    }
    if (status === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
          <span>已取消 {durStr}</span>
        </span>
      );
    }
    if (status === 'stopped') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--ink-3)] bg-[var(--line)] px-1.5 py-0.5 rounded">
          <span>已中止</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
        <span>失败 (code {code}) {durStr}</span>
      </span>
    );
  };

  return (
    <article
      className="group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-md select-none"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: isConflict ? 'var(--red)' : 'var(--card-border)',
      }}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden border"
              style={{
                backgroundColor: 'var(--card-2)',
                borderColor: 'var(--line)',
                color: 'var(--accent)',
              }}
            >
              {app.icon ? (
                <img src={app.icon} alt="" className="w-full h-full object-cover" />
              ) : app.glyph ? (
                <GlyphIcon name={app.glyph} size={20} />
              ) : app.favicon ? (
                <img src={app.favicon} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <span>{(app.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate leading-snug" style={{ color: 'var(--ink)' }}>
                {app.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      app.running
                        ? 'bg-emerald-500 shadow-xs'
                        : 'bg-zinc-400 dark:bg-zinc-600'
                    }`}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                    {app.running ? '运行中' : '已停止'}
                  </span>
                </span>

                {app.kind === 'service' && (app.port || openPort) && (
                  <button
                    type="button"
                    onClick={() => (isConflict ? openPortDiag(app) : handleCopy())}
                    className={`text-[11px] mono font-medium px-1.5 py-0.2 rounded border transition-colors cursor-pointer ${
                      isConflict
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 font-bold'
                        : 'bg-[var(--card-2)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--accent)]'
                    }`}
                  >
                    :{openPort || app.port}
                    {isConflict && ' (占用冲突)'}
                  </button>
                )}

                {app.running && app.uptimeSec > 0 && (
                  <span className="text-[10px] mono" style={{ color: 'var(--ink-4)' }}>
                    {formatUptime(app.uptimeSec)}
                  </span>
                )}

                {renderTaskExitBadge()}
              </div>
            </div>
          </div>

          {app.health && app.health.status === 'error' && (
            <button
              type="button"
              onClick={() => openAppDiag(app)}
              title="查看配置与健康问题"
              className="text-amber-500 hover:text-amber-600 cursor-pointer p-1"
            >
              <AlertTriangle size={16} />
            </button>
          )}
        </div>

        <div
          className="text-xs mono p-2 rounded-lg truncate mb-3 border font-mono select-all"
          style={{
            backgroundColor: 'var(--card-2)',
            borderColor: 'var(--line)',
            color: 'var(--ink-3)',
          }}
          title={app.command}
        >
          {app.command}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
        <button
          type="button"
          disabled={loading || (app.health?.blocking && !app.running)}
          onClick={handleToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            app.running
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-[var(--accent)] hover:opacity-90 text-white'
          }`}
        >
          {app.running ? (
            <>
              <Square size={12} fill="currentColor" />
              <span>{app.kind === 'task' ? '中止' : '停止'}</span>
            </>
          ) : (
            <>
              <Play size={12} fill="currentColor" />
              <span>{app.kind === 'task' ? '运行' : '启动'}</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1">
          {app.kind === 'service' && isOpenable && (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              title="在新标签页打开"
              className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
              style={{ borderColor: 'var(--line)' }}
            >
              <ArrowUpRight size={14} />
            </a>
          )}

          {app.kind === 'service' && openPort && (
            <button
              type="button"
              onClick={handleCopy}
              title="复制访问地址"
              className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
              style={{ borderColor: 'var(--line)' }}
            >
              <Copy size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => openLogDrawer({ appId: app.id, appName: app.name })}
            title="查看日志"
            className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <FileText size={14} />
          </button>

          {app.kind === 'service' && app.running && (
            <button
              type="button"
              onClick={handleRestart}
              title="重启服务"
              className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
              style={{ borderColor: 'var(--line)' }}
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => openAppDiag(app)}
            title="健康与启动诊断"
            className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <Activity size={14} />
          </button>

          <button
            type="button"
            onClick={() => openAppEdit({ mode: 'edit', app })}
            title="编辑应用配置"
            className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <Edit3 size={14} />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            title="删除应用"
            className="p-1.5 rounded-lg border transition-colors hover:bg-red-500/10 text-[var(--ink-3)] hover:text-red-500 hover:border-red-500/30 cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
};
