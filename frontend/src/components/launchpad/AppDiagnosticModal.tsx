import React, { useEffect, useState } from 'react';
import { useModal } from '../../context/ModalContext';
import { X, Activity, AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { api } from '../../services/api';
import type { DiagnoseResponse } from '../../types/console';

export const AppDiagnosticModal: React.FC = () => {
  const { appDiagApp, closeAppDiag } = useModal();
  const [diagResult, setDiagResult] = useState<DiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!appDiagApp) return;
    let canceled = false;
    setLoading(true);
    api.diagnoseApp(appDiagApp.id).then(res => {
      if (!canceled) {
        setDiagResult(res as unknown as DiagnoseResponse);
        setLoading(false);
      }
    });
    return () => {
      canceled = true;
    };
  }, [appDiagApp]);

  if (!appDiagApp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xl p-6 relative select-none animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        <button
          type="button"
          onClick={closeAppDiag}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--ink-4)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold">应用运行与健康诊断</h3>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              分析应用「{appDiagApp.name}」的配置与启动环境
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--ink-3)]">
            正在执行本地规则诊断…
          </div>
        ) : diagResult?.issues && diagResult.issues.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {diagResult.issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
                style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
              >
                <div className="flex items-center gap-2 font-semibold text-red-500">
                  <AlertTriangle size={14} />
                  <span>{issue.title}</span>
                </div>
                <p style={{ color: 'var(--ink-2)' }}>{issue.detail}</p>
                {issue.fix && (
                  <div
                    className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--card)] border text-[11px] font-mono text-emerald-600 dark:text-emerald-400"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <Wrench size={13} className="shrink-0 mt-0.5" />
                    <span>建议：{issue.fix}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="p-6 rounded-xl border text-center space-y-2"
            style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
          >
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold">健康状态良好</h4>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              工作目录、脚本路径、启动参数与端口配置均正常，未发现静态阻断问题。
            </p>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={closeAppDiag}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
