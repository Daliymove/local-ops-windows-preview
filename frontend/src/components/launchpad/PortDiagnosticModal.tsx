import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { X, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { preferredOpenPort } from '../../services/ports';

interface PortDiagnosticModalProps {
  onUpdated: () => void;
}

export const PortDiagnosticModal: React.FC<PortDiagnosticModalProps> = ({ onUpdated }) => {
  const { portDiagApp, closePortDiag, showToast } = useModal();
  const [loading, setLoading] = useState(false);

  if (!portDiagApp) return null;

  const app = portDiagApp;
  const port = preferredOpenPort(app) || app.port;
  const owner = app.portOwner;

  const handleAttach = async () => {
    if (!owner) return;
    setLoading(true);
    try {
      const res = await api.attachApp(app.id, owner.pid);
      if (res.ok) {
        showToast(`已认领 PID ${owner.pid} 为应用受控进程`);
        closePortDiag();
        onUpdated();
      } else {
        showToast(`认领失败: ${res.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKillOccupier = async () => {
    if (!owner) return;
    setLoading(true);
    try {
      if (owner.appId) {
        await api.stopApp(owner.appId);
      } else {
        await api.killProcess(owner.pid, false);
      }
      showToast(`已关闭占用进程 PID ${owner.pid}`);
      closePortDiag();
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl p-6 relative select-none animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        <button
          type="button"
          onClick={closePortDiag}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--ink-4)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold">端口占用诊断</h3>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              端口 <strong className="mono">:{port}</strong> 无法正常绑定
            </p>
          </div>
        </div>

        <div
          className="p-3.5 rounded-xl border text-xs space-y-2 mb-6"
          style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
        >
          <p style={{ color: 'var(--ink-2)' }}>
            应用「<strong>{app.name}</strong>」配置了端口 <strong>:{port}</strong>，但该端口当前已被其他进程监听占用。
          </p>

          {owner ? (
            <div className="pt-2 border-t font-mono space-y-1" style={{ borderColor: 'var(--line)' }}>
              <div>占用进程: <strong className="text-amber-500">{owner.name}</strong> (PID: {owner.pid})</div>
              {owner.appName && <div>关联启动台卡片: <strong>{owner.appName}</strong></div>}
            </div>
          ) : (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
              暂未获取到占用者详细进程信息，可能为系统服务或权限限制。
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closePortDiag}
            className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)' }}
          >
            关闭
          </button>

          {owner && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleKillOccupier}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
              >
                结束占用进程
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleAttach}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                认领为本卡片
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
