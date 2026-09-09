import React from 'react';
import { useModal } from '../../context/ModalContext';
import { useTheme } from '../../hooks/useTheme';
import { X, Settings, Sun, Moon, Laptop } from 'lucide-react';
import type { StateResponse } from '../../types/console';

interface SettingsModalProps {
  data: StateResponse | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ data }) => {
  const { isSettingsOpen, setSettingsOpen, showToast } = useModal();
  const { theme, setTheme } = useTheme();

  if (!isSettingsOpen) return null;

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('当前浏览器不支持系统桌面通知');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast('已开启系统桌面通知权限');
    } else {
      showToast('未能获取通知权限');
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
          onClick={() => setSettingsOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--ink-4)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Settings size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold">设置中心</h3>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              外观偏好与控制台参数
            </p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div className="space-y-2">
            <label className="font-semibold" style={{ color: 'var(--ink)' }}>
              外观模式
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-bold'
                    : 'border-[var(--line)] hover:bg-[var(--card-2)] text-[var(--ink-2)]'
                }`}
              >
                <Sun size={15} />
                <span>浅色模式</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-bold'
                    : 'border-[var(--line)] hover:bg-[var(--card-2)] text-[var(--ink-2)]'
                }`}
              >
                <Moon size={15} />
                <span>深色模式</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('auto')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-medium cursor-pointer transition-all ${
                  theme === 'auto'
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] font-bold'
                    : 'border-[var(--line)] hover:bg-[var(--card-2)] text-[var(--ink-2)]'
                }`}
              >
                <Laptop size={15} />
                <span>跟随系统</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--ink)' }}>
                  批处理任务桌面通知
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                  当一次性批处理任务执行完毕时，在后台接收系统通知提醒
                </div>
              </div>
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:bg-[var(--card-2)] transition-colors cursor-pointer shrink-0"
                style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}
              >
                授权通知
              </button>
            </div>
          </div>

          <div
            className="p-3.5 rounded-xl border text-[11px] mono space-y-1"
            style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)', color: 'var(--ink-3)' }}
          >
            <div>控制台版本: v{data?.version || '1.0.0'}</div>
            <div>运行环境: Python 3.12+ · 回环绑定 127.0.0.1:{data?.consolePort || 9600}</div>
            <div>数据目录: {data?.consoleCwd || '—'}</div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
