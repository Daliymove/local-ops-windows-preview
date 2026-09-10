import React, { useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export const ConfirmDialog: React.FC = () => {
  const { confirmState, closeConfirm } = useModal();
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOpen = !!confirmState;

  // 监听 ESC 键关闭确认框
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, closeConfirm]);

  if (!isOpen) return null;

  const { title, message, okText = '确认', cancelText = '取消', tone = 'danger', showForce, onConfirm } = confirmState!;

  const handleOk = async () => {
    setLoading(true);
    try {
      await onConfirm(force);
      closeConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget && !loading) {
          closeConfirm();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in"
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl p-6 relative select-none animate-modal-in"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              tone === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent-light)] text-[var(--accent)]'
            }`}
          >
            {tone === 'danger' ? <AlertTriangle size={22} /> : <AlertCircle size={22} />}
          </div>
          <h3 className="text-base font-bold">{title}</h3>
        </div>

        <p className="text-xs leading-relaxed whitespace-pre-line mb-4" style={{ color: 'var(--ink-2)' }}>
          {message}
        </p>

        {showForce && (
          <label className="flex items-center gap-2 mb-6 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={force}
              onChange={e => setForce(e.target.checked)}
              className="rounded border-[var(--line-2)] text-red-500 focus:ring-0"
            />
            <span style={{ color: 'var(--ink-3)' }}>强制结束进程树 (SIGKILL / /F)</span>
          </label>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleOk}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity cursor-pointer disabled:opacity-50 ${
              tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--accent)] hover:opacity-90'
            }`}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
};
