import React, { useState, useEffect } from 'react';
import { useModal } from '../../context/ModalContext';
import { X, Folder, FileCode, Sparkles, AlertCircle } from 'lucide-react';
import { GlyphIcon } from '../common/IconHelper';
import { api } from '../../services/api';
import { GLYPH_OPTIONS, type DetectCandidate, type DetectResponse } from '../../types/console';

interface AppEditModalProps {
  onUpdated: () => void;
}

export const AppEditModal: React.FC<AppEditModalProps> = ({ onUpdated }) => {
  const { appEditState, closeAppEdit, showToast } = useModal();

  const isOpen = !!appEditState;
  const isEdit = appEditState?.mode === 'edit';
  const editingApp = appEditState?.app;

  const [kind, setKind] = useState<'service' | 'task'>('service');
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('');
  const [port, setPort] = useState<number | ''>('');
  const [openUrl, setOpenUrl] = useState('');
  const [glyph, setGlyph] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [candidates, setCandidates] = useState<DetectCandidate[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && editingApp) {
      setKind(editingApp.kind || 'service');
      setName(editingApp.name || '');
      setCommand(editingApp.command || '');
      setCwd(editingApp.cwd || '');
      setPort(editingApp.port != null ? editingApp.port : '');
      setOpenUrl(editingApp.openUrl || '');
      setGlyph(editingApp.glyph || null);
    } else {
      setKind(appEditState?.initialKind || 'service');
      setName(appEditState?.initialName || '');
      setCommand(appEditState?.initialCommand || '');
      setCwd(appEditState?.initialCwd || '');
      setPort(appEditState?.initialPort != null ? appEditState.initialPort : '');
      setOpenUrl('');
      setGlyph('rocket');
    }
    setCandidates([]);
  }, [isOpen, isEdit, editingApp, appEditState]);

  if (!isOpen) return null;

  const handlePickDir = async () => {
    const res = await api.pickPath('dir');
    if (res.ok && typeof res.path === 'string') {
      setCwd(res.path);
      triggerDetect(res.path);
    }
  };

  const handlePickScript = async () => {
    const res = await api.pickPath('script');
    if (res.ok && typeof res.path === 'string') {
      const scriptPath = res.path;
      setCommand(scriptPath);
      if (!name) {
        const base = scriptPath.split(/[/\\]/).pop() || '';
        setName(base.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const triggerDetect = async (dirPath: string) => {
    if (!dirPath.trim()) return;
    try {
      const res = (await api.detectProject(dirPath)) as unknown as DetectResponse;
      if (res.ok && Array.isArray(res.candidates)) {
        setCandidates(res.candidates);
        if (!name && res.name) {
          setName(res.name);
        }
      }
    } catch {
      // ignore
    }
  };

  const applyCandidate = (cand: DetectCandidate) => {
    setCommand(cand.command);
    if (cand.port != null) setPort(cand.port);
    if (cand.kind) setKind(cand.kind);
    showToast(`已应用配置: ${cand.label}`);
  };

  const handleStopEditing = async () => {
    if (!editingApp) return;
    setLoading(true);
    try {
      const res = await api.stopApp(editingApp.id);
      if (res.ok) {
        showToast(`已停止 ${editingApp.name}`);
        onUpdated();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('请填写应用名称');
      return;
    }
    if (!command.trim()) {
      showToast('请填写启动命令');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        command: command.trim(),
        cwd: cwd.trim() || null,
        port: kind === 'service' && port !== '' ? Number(port) : null,
        openUrl: kind === 'service' && openUrl.trim() ? openUrl.trim() : null,
        kind,
        glyph: glyph || null,
        attachPid: appEditState?.attachPid,
      };

      if (isEdit && editingApp) {
        const res = await api.updateApp(editingApp.id, payload);
        if (res.ok) {
          showToast('应用配置已保存');
          closeAppEdit();
          onUpdated();
        } else {
          showToast(`保存失败: ${res.error}`);
        }
      } else {
        const res = await api.createApp(payload);
        if (res.ok) {
          showToast('应用创建成功');
          closeAppEdit();
          onUpdated();
        } else {
          showToast(`创建失败: ${res.error}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden select-none animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        <div
          className="h-16 px-6 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <h3 className="text-base font-bold">
            {isEdit ? `编辑${kind === 'task' ? '任务' : '服务'}` : `添加${kind === 'task' ? '批处理任务' : '本地服务'}`}
          </h3>
          <button
            type="button"
            onClick={closeAppEdit}
            className="p-1.5 rounded-lg text-[var(--ink-4)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {isEdit && editingApp?.running && (
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-3 text-amber-500 bg-amber-500/10 border-amber-500/30"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>该应用当前正在运行中。修改启动命令或端口前需先停止。</span>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleStopEditing}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 shrink-0 cursor-pointer"
              >
                停止服务
              </button>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <label className="font-semibold" style={{ color: 'var(--ink)' }}>类型</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKind('service')}
                  className={`p-2.5 rounded-xl border font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    kind === 'service'
                      ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--ink-3)]'
                  }`}
                >
                  <span>长期服务 (Web / API / Dev)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind('task')}
                  className={`p-2.5 rounded-xl border font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    kind === 'task'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-[var(--line)] text-[var(--ink-3)]'
                  }`}
                >
                  <span>批处理任务 (编译 / 脚本 / 备份)</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-semibold" style={{ color: 'var(--ink)' }}>应用名称 *</label>
            <input
              type="text"
              required
              placeholder="例如: 我的前端项目 / 后端服务"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border bg-[var(--card-2)] focus:outline-none focus:border-[var(--accent)] text-xs"
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold" style={{ color: 'var(--ink)' }}>工作目录 (CWD)</label>
              <button
                type="button"
                onClick={handlePickDir}
                className="text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Folder size={13} />
                <span>选择文件夹</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="绝对路径，可留空"
              value={cwd}
              onChange={e => {
                setCwd(e.target.value);
                triggerDetect(e.target.value);
              }}
              className="w-full px-3.5 py-2 rounded-xl border bg-[var(--card-2)] focus:outline-none focus:border-[var(--accent)] text-xs mono"
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </div>

          {candidates.length > 0 && (
            <div
              className="p-3 rounded-xl border space-y-2"
              style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent)' }}>
                <Sparkles size={14} />
                <span>识别到项目预设启动命令：</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidates.map((cand, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyCandidate(cand)}
                    className="p-2 rounded-lg border text-left bg-[var(--card)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <div className="font-semibold" style={{ color: 'var(--ink)' }}>{cand.label}</div>
                    <div className="mono text-[10px] truncate" style={{ color: 'var(--ink-4)' }}>{cand.command}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold" style={{ color: 'var(--ink)' }}>启动命令 *</label>
              <button
                type="button"
                onClick={handlePickScript}
                className="text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileCode size={13} />
                <span>选择脚本文件</span>
              </button>
            </div>
            <textarea
              required
              rows={2}
              placeholder="例如: npm run dev 或 python main.py"
              value={command}
              onChange={e => setCommand(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border bg-[var(--card-2)] focus:outline-none focus:border-[var(--accent)] text-xs mono"
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </div>

          {kind === 'service' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold" style={{ color: 'var(--ink)' }}>监听端口</label>
                <input
                  type="number"
                  placeholder="例如: 3000 / 8080"
                  value={port}
                  onChange={e => setPort(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2 rounded-xl border bg-[var(--card-2)] focus:outline-none focus:border-[var(--accent)] text-xs mono"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold" style={{ color: 'var(--ink)' }}>自定义打开路径 (URL)</label>
                <input
                  type="text"
                  placeholder="例如 /docs 或完整本机 URL"
                  value={openUrl}
                  onChange={e => setOpenUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border bg-[var(--card-2)] focus:outline-none focus:border-[var(--accent)] text-xs"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-semibold" style={{ color: 'var(--ink)' }}>卡片图标徽标</label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {GLYPH_OPTIONS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGlyph(g)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    glyph === g
                      ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-xs'
                      : 'border-[var(--line)] hover:bg-[var(--card-2)] text-[var(--ink-3)]'
                  }`}
                >
                  <GlyphIcon name={g} size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--line)' }}>
            <button
              type="button"
              onClick={closeAppEdit}
              className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isEdit ? '保存更改' : '立即创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
