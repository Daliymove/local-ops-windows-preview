import React from 'react';
import { useModal } from '../../context/ModalContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useModal();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm shadow-lg border transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: 'var(--card)',
            color: 'var(--ink)',
            borderColor: 'var(--line-2)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
