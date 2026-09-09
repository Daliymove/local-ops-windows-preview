import React from 'react';
import type { ServiceItem } from '../../types/console';
import { Sparkles, Plus, EyeOff, X } from 'lucide-react';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

interface PortDiscoveryBannerProps {
  newServices: ServiceItem[];
  onDismiss: (key: string) => void;
  onRefresh: () => void;
}

export const PortDiscoveryBanner: React.FC<PortDiscoveryBannerProps> = ({
  newServices,
  onDismiss,
  onRefresh,
}) => {
  const { openAppEdit, showToast } = useModal();

  if (newServices.length === 0) return null;

  const handleClaim = (svc: ServiceItem) => {
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

  const handleHide = async (svc: ServiceItem) => {
    await api.setServiceFlag(svc.key, 'hidden', true);
    showToast(`已隐藏端口 :${svc.port}`);
    onDismiss(svc.key);
    onRefresh();
  };

  return (
    <div
      className="p-4 rounded-2xl border shadow-sm space-y-3"
      style={{
        backgroundColor: 'var(--accent-light)',
        borderColor: 'var(--accent)',
      }}
    >
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--accent)' }}>
        <Sparkles size={16} />
        <span>发现新监听端口 ({newServices.length})</span>
      </div>

      <div className="space-y-2">
        {newServices.map(svc => (
          <div
            key={svc.key}
            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[var(--card)] border text-xs"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="mono font-bold text-sm" style={{ color: 'var(--accent)' }}>
                :{svc.port}
              </span>
              <div className="min-w-0">
                <div className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                  {svc.name}
                  <span className="text-[11px] mono ml-2" style={{ color: 'var(--ink-4)' }}>
                    (PID {svc.pid})
                  </span>
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--ink-3)' }}>
                  {svc.project || svc.cwd || svc.cmd}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleClaim(svc)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus size={13} />
                <span>加入启动台</span>
              </button>
              <button
                type="button"
                onClick={() => handleHide(svc)}
                className="p-1.5 rounded-lg border hover:bg-[var(--card-2)] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                style={{ borderColor: 'var(--line)' }}
                title="忽略并隐藏"
              >
                <EyeOff size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDismiss(svc.key)}
                className="p-1.5 rounded-lg text-[var(--ink-4)] hover:text-[var(--ink)] cursor-pointer"
                title="关闭提示"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
