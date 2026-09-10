import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../../context/ModalContext';
import {
  X,
  Folder,
  FileCode,
  Sparkles,
  AlertCircle,
  Globe,
  Terminal,
  Check,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { GlyphIcon } from '../common/IconHelper';
import { api } from '../../services/api';
import { GLYPH_OPTIONS, type DetectCandidate, type DetectResponse } from '../../types/console';

interface AppEditModalProps {
  onUpdated: () => void;
  iconsDir?: string;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/x-icon';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return null;
  }
}

export const AppEditModal: React.FC<AppEditModalProps> = ({ onUpdated, iconsDir }) => {
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
  const [detecting, setDetecting] = useState(false);
  const [pickingDir, setPickingDir] = useState(false);
  const [pickingScript, setPickingScript] = useState(false);
  const lastDetectedCwdRef = useRef<string>('');

  // 自定义与预设图标状态
  const [customIconFile, setCustomIconFile] = useState<File | Blob | null>(null);
  const [customIconPreviewUrl, setCustomIconPreviewUrl] = useState<string | null>(null);
  const [customIconSource, setCustomIconSource] = useState<string | null>(null);
  const [iconType, setIconType] = useState<'preset' | 'custom' | null>(null);
  const [iconPathDisplay, setIconPathDisplay] = useState<string | null>(null);
  const [removeStoredIcon, setRemoveStoredIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      if (editingApp.icon) {
        setCustomIconPreviewUrl(editingApp.icon);
        const isPreset = editingApp.iconType === 'preset';
        setIconType(isPreset ? 'preset' : (editingApp.iconType || 'custom'));
        setCustomIconSource(isPreset ? '项目预设图标' : '配置图标');
        const iconFilename = editingApp.icon.replace(/^\/icons\//, '');
        const displayPath = editingApp.iconPath || (iconsDir
          ? (iconsDir.endsWith('\\') || iconsDir.endsWith('/')
              ? `${iconsDir}${iconFilename}`
              : `${iconsDir}\\${iconFilename}`)
          : editingApp.icon);
        setIconPathDisplay(displayPath);
      } else {
        setCustomIconPreviewUrl(null);
        setCustomIconSource(null);
        setIconType(null);
        setIconPathDisplay(null);
      }
      setCustomIconFile(null);
      setRemoveStoredIcon(false);

      // 编辑状态下如果存在工作目录，静默检测项目是否包含 public/favicon.* 预设图标
      if (editingApp.cwd) {
        triggerDetect(editingApp.cwd, false);
      }
    } else {
      const initKind = appEditState?.initialKind || 'service';
      const initCwd = appEditState?.initialCwd || '';
      const initCmd = appEditState?.initialCommand || '';
      const initPort = appEditState?.initialPort != null ? appEditState.initialPort : '';

      setKind(initKind);
      setName(appEditState?.initialName || '');
      setCommand(initCmd);
      setCwd(initCwd);
      setPort(initPort);
      setOpenUrl('');
      setGlyph('rocket');
      setCustomIconFile(null);
      setCustomIconPreviewUrl(null);
      setCustomIconSource(null);
      setIconType(null);
      setIconPathDisplay(null);
      setRemoveStoredIcon(false);

      // 若带有初始目录（例如从服务监控认领），自动触发项目配置与端口检测
      if (initCwd) {
        triggerDetect(initCwd, !initCmd, typeof initPort === 'number' ? initPort : undefined);
      }
    }
    setCandidates([]);
  }, [isOpen, isEdit, editingApp, appEditState, iconsDir]);

  // 监听 ESC 键关闭编辑弹窗（非 loading 状态）
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        closeAppEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, closeAppEdit]);

  // 清理组件卸载或切换时的 objectURL
  useEffect(() => {
    return () => {
      if (customIconPreviewUrl && customIconPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customIconPreviewUrl);
      }
    };
  }, [customIconPreviewUrl]);

  if (!isOpen) return null;

  // 触发项目检测与脚本/端口识别
  const triggerDetect = async (
    dirPath: string,
    autoApply: boolean = true,
    preferPort?: number
  ) => {
    if (!dirPath.trim()) return;
    lastDetectedCwdRef.current = dirPath.trim();
    setDetecting(true);
    try {
      const res = (await api.detectProject(dirPath)) as unknown as DetectResponse;
      if (res.ok) {
        if (Array.isArray(res.candidates)) {
          setCandidates(res.candidates);
        }
        if (!name && res.name) {
          setName(res.name);
        }

        // 自动读取项目下的 public/favicon.* 作为预设图标
        if (res.presetIcon && res.presetIcon.dataUrl) {
          // 若为新增服务，或当前图标为项目预设类型（非用户从其他文件夹上传的配置图标）：
          if (!isEdit || iconType !== 'custom' || (!editingApp?.icon && customIconSource !== '配置图标')) {
            const blob = dataUrlToBlob(res.presetIcon.dataUrl);
            if (blob) {
              if (!isEdit || !editingApp?.icon) {
                setCustomIconFile(blob);
                setCustomIconPreviewUrl(res.presetIcon.dataUrl);
              }
              setIconType('preset');
              setCustomIconSource('项目预设图标');
              setIconPathDisplay(res.presetIcon.fullPath || `${dirPath}/${res.presetIcon.source}`);
              setRemoveStoredIcon(false);
            }
          }
        } else if (customIconSource === '项目预设图标') {
          setCustomIconFile(null);
          setCustomIconPreviewUrl(null);
          setCustomIconSource(null);
          setIconType(null);
          setIconPathDisplay(null);
        }

        // 自动检测脚本及端口核心逻辑
        if (autoApply && res.candidates && res.candidates.length > 0) {
          let chosen: DetectCandidate | undefined;
          if (preferPort != null) {
            // 优先匹配外部指定的目标端口
            chosen = res.candidates.find(c => c.port === preferPort);
          }
          if (!chosen) {
            // 优先匹配当前类型（服务或任务），否则取推荐的首个候选
            chosen = res.candidates.find(c => c.kind === kind) || res.candidates[0];
          }

          if (chosen) {
            setCommand(chosen.command);
            if (chosen.port != null) {
              setPort(chosen.port);
            }
            if (chosen.kind) {
              setKind(chosen.kind);
            }
            showToast(
              `已自动检测配置: ${chosen.label}${chosen.port ? ` · 端口 :${chosen.port}` : ''}`
            );
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setDetecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('图标大小不能超过 5MB');
      e.target.value = '';
      return;
    }

    const validExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExt && !file.type.startsWith('image/')) {
      showToast('仅支持 ICO / PNG / JPEG / WebP 格式图片');
      e.target.value = '';
      return;
    }

    if (customIconPreviewUrl && customIconPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customIconPreviewUrl);
    }

    let previewBlob: Blob = file;
    // 部分 Windows 浏览器中 .ico 文件的 file.type 可能为空，包装为 image/x-icon 避免 <img> 解析异常
    if (file.name.toLowerCase().endsWith('.ico') && (!file.type || !file.type.startsWith('image/'))) {
      previewBlob = new Blob([file], { type: 'image/x-icon' });
    }

    const previewUrl = URL.createObjectURL(previewBlob);
    setCustomIconFile(previewBlob);
    setCustomIconPreviewUrl(previewUrl);
    setIconType('custom');
    setCustomIconSource('配置图标');
    setIconPathDisplay(file.name);
    setRemoveStoredIcon(false);
    showToast(`已选择配置图标: ${file.name}`);
    e.target.value = '';
  };

  const handleClearIcon = () => {
    if (customIconPreviewUrl && customIconPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customIconPreviewUrl);
    }
    setCustomIconFile(null);
    setCustomIconPreviewUrl(null);
    setCustomIconSource(null);
    setIconType(null);
    setIconPathDisplay(null);
    if (editingApp?.icon) {
      setRemoveStoredIcon(true);
    }
    if (!glyph) {
      setGlyph('rocket');
    }
    showToast('已恢复系统自带图标');
  };

  const handleSelectGlyph = (g: string) => {
    setGlyph(g);
    if (customIconPreviewUrl && customIconPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(customIconPreviewUrl);
    }
    setCustomIconFile(null);
    setCustomIconPreviewUrl(null);
    setCustomIconSource(null);
    setIconType(null);
    setIconPathDisplay(null);
    if (editingApp?.icon) {
      setRemoveStoredIcon(true);
    }
  };

  const handlePickDir = async () => {
    if (pickingDir) return;
    setPickingDir(true);
    try {
      const res = await api.pickPath('dir', cwd.trim() || undefined);
      if (res.ok && typeof res.path === 'string') {
        const dirPath = res.path;
        setCwd(dirPath);
        lastDetectedCwdRef.current = dirPath.trim();
        // 自动从文件夹名推导应用名称
        if (!name) {
          const folderName = dirPath.split(/[/\\]/).filter(Boolean).pop() || '';
          if (folderName) setName(folderName);
        }
        // 自动调用项目识别并带入脚本和端口
        await triggerDetect(dirPath, true);
      }
    } catch {
      // ignore
    } finally {
      setPickingDir(false);
    }
  };

  const handlePickScript = async () => {
    if (pickingScript) return;
    setPickingScript(true);
    try {
      const res = await api.pickPath('script', cwd.trim() || undefined);
      if (res.ok && typeof res.path === 'string') {
        const scriptPath = res.path;
        // 优先使用后端生成的跨平台规范执行命令
        const cmd = (res as { command?: string }).command || scriptPath;
        setCommand(cmd);

        // 自动推导应用名称
        const base = scriptPath.split(/[/\\]/).pop() || '';
        const baseNoExt = base.replace(/\.[^.]+$/, '');
        if (!name && baseNoExt) {
          setName(baseNoExt);
        }

        // 自动解析脚本所在目录并填入 CWD
        const dir = scriptPath.replace(/[/\\][^/\\]+$/, '');
        if (dir && !cwd) {
          setCwd(dir);
          lastDetectedCwdRef.current = dir.trim();
          // 对该目录进行项目特征探测（不强行覆盖命令）
          triggerDetect(dir, false);
        }
        showToast(`已选择脚本: ${base}`);
      }
    } catch {
      // ignore
    } finally {
      setPickingScript(false);
    }
  };

  const applyCandidate = (cand: DetectCandidate) => {
    setCommand(cand.command);
    if (cand.port != null) setPort(cand.port);
    if (cand.kind) setKind(cand.kind);
    showToast(`已套用: ${cand.label}${cand.port ? ` (端口 ${cand.port})` : ''}`);
  };

  const handleStopEditing = async () => {
    if (!editingApp) return;
    setLoading(true);
    try {
      const res = await api.stopApp(editingApp.id);
      if (res.ok) {
        showToast(`已停止 ${editingApp.name}`);
        onUpdated();
      } else {
        showToast(`停止失败: ${res.error || '未知错误'}`);
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
        iconType: customIconPreviewUrl ? (iconType || 'preset') : null,
        iconSourcePath: customIconPreviewUrl ? iconPathDisplay : null,
      };

      let targetAppId: string | null = null;
      if (isEdit && editingApp) {
        const res = await api.updateApp(editingApp.id, payload);
        if (res.ok || Boolean((res as unknown as { id?: string })?.id)) {
          targetAppId = editingApp.id;
        } else {
          showToast(`保存失败: ${res.error || '未知错误'}`);
          return;
        }
      } else {
        const res = await api.createApp(payload);
        const newId = (res as unknown as { id?: string })?.id;
        if (res.ok || Boolean(newId)) {
          targetAppId = newId || null;
        } else {
          showToast(`创建失败: ${res.error || '未知错误'}`);
          return;
        }
      }

      // 处理图标上传或删除
      if (targetAppId) {
        if (customIconFile) {
          try {
            const uploadRes = await api.uploadIcon(targetAppId, customIconFile);
            if (!uploadRes.ok) {
              showToast(`应用已保存，但图标上传失败: ${uploadRes.error || '未知错误'}`);
            }
          } catch {
            showToast('应用已保存，但图标上传异常');
          }
        } else if (removeStoredIcon) {
          try {
            await api.deleteIcon(targetAppId);
          } catch {
            // ignore
          }
        }
      }

      showToast(isEdit ? '应用配置已保存' : '应用创建成功');
      closeAppEdit();
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    // 外层容器：移除点击蒙层退出，避免用户在编辑输入时不小心点偏导致内容关闭丢失
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-backdrop-in">
      <div
        className="w-full max-w-xl max-h-[95vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden select-none animate-modal-in"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line-2)',
          color: 'var(--ink)',
        }}
      >
        {/* 顶部 Header：紧凑高度 */}
        <div
          className="h-13 px-6 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--line)' }}
        >
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight">
              {isEdit ? `编辑${kind === 'task' ? '任务' : '服务'}` : `添加${kind === 'task' ? '批处理任务' : '本地服务'}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeAppEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-4)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            aria-label="关闭"
            title="关闭 (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* 主表单与底部栏：确保 Footer 固定在底部可见，表单在正常屏幕一页呈现 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 text-xs sm:text-[13px]">
            {/* 运行中警告 */}
            {isEdit && editingApp?.running && (
              <div className="p-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>应用运行中。若需修改启动命令、目录或端口，请先停止。</span>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStopEditing}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-500 hover:bg-red-600 active:scale-95 text-white shrink-0 cursor-pointer transition-all shadow-xs"
                >
                  停止服务
                </button>
              </div>
            )}

            {/* 类型选择器（新增模式下：紧凑双卡片） */}
            {!isEdit && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                    应用类型
                  </label>
                  <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                    决定生命周期与端口监听
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKind('service')}
                    className={`h-11 px-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                      kind === 'service'
                        ? 'bg-[var(--accent-light)] border-[var(--accent)] ring-1 ring-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[var(--card-2)] hover:border-[var(--line-2)] text-[var(--ink-2)]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        kind === 'service'
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--card)] border border-[var(--line)] text-[var(--ink-3)]'
                      }`}
                    >
                      <Globe size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate" style={{ color: kind === 'service' ? 'var(--accent)' : 'var(--ink)' }}>
                          长期服务
                        </span>
                        {kind === 'service' && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                      </div>
                      <p className="text-[10px] truncate leading-none mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        常驻进程，端口监听
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKind('task')}
                    className={`h-11 px-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                      kind === 'task'
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-[var(--line)] bg-[var(--card-2)] hover:border-[var(--line-2)] text-[var(--ink-2)]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        kind === 'task'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--card)] border border-[var(--line)] text-[var(--ink-3)]'
                      }`}
                    >
                      <Terminal size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate" style={{ color: kind === 'task' ? 'var(--green)' : 'var(--ink)' }}>
                          批处理任务
                        </span>
                        {kind === 'task' && <Check size={14} className="text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[10px] truncate leading-none mt-0.5" style={{ color: 'var(--ink-3)' }}>
                        执行后自动记录结果
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 应用名称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                应用名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如: 我的前端项目 / 后端服务"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-9 px-3 text-xs sm:text-[13px] rounded-xl border bg-[var(--card-2)] focus:bg-[var(--card)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all outline-none"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* 工作目录 (CWD) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                  工作目录 (CWD)
                </label>
                <div className="flex items-center gap-1.5">
                  {cwd.trim() && (
                    <button
                      type="button"
                      disabled={detecting}
                      onClick={() => triggerDetect(cwd, true)}
                      title="扫描并自动检测项目脚本与端口"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg text-[var(--accent)] bg-[var(--card-2)] hover:bg-[var(--accent-light)] border border-[var(--line)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={11} className={detecting ? 'animate-spin' : ''} />
                      <span>{detecting ? '检测中...' : '自动检测'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePickDir}
                    disabled={pickingDir}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg text-[var(--accent)] bg-[var(--card-2)] hover:bg-[var(--accent-light)] border border-[var(--line)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Folder size={12} className={pickingDir ? 'animate-pulse' : ''} />
                    <span>{pickingDir ? '选择中...' : '选择文件夹'}</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="绝对路径，留空默认使用用户主目录"
                value={cwd}
                onChange={e => setCwd(e.target.value)}
                onBlur={() => {
                  const trimmed = cwd.trim();
                  if (!pickingDir && trimmed && trimmed !== lastDetectedCwdRef.current) {
                    lastDetectedCwdRef.current = trimmed;
                    triggerDetect(trimmed, !command.trim());
                  }
                }}
                className="w-full h-9 px-3 text-xs font-mono rounded-xl border bg-[var(--card-2)] focus:bg-[var(--card)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all outline-none"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* 候选命令推荐（仅在探测到预设时出现） */}
            {candidates.length > 0 && (
              <div
                className="p-2.5 rounded-xl border space-y-1.5 animate-in fade-in duration-150"
                style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line-2)' }}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--accent)' }}>
                    <Sparkles size={13} />
                    <span>检测到启动脚本（点击切换）：</span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                    共找到 {candidates.length} 项
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {candidates.map((cand, idx) => {
                    const isSelected = command.trim() === cand.command.trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyCandidate(cand)}
                        className={`p-1.5 px-2 rounded-lg border text-left transition-all cursor-pointer group ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-light)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-semibold text-xs transition-colors"
                            style={{ color: isSelected ? 'var(--accent)' : 'var(--ink)' }}
                          >
                            {cand.label}
                          </span>
                          {cand.port != null && (
                            <span
                              className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                                isSelected
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'bg-[var(--card-2)] text-[var(--ink-3)] border border-[var(--line)]'
                              }`}
                            >
                              :{cand.port}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] truncate mt-0.5" style={{ color: 'var(--ink-4)' }}>
                          {cand.command}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 启动命令 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                  启动命令 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handlePickScript}
                  disabled={pickingScript}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg text-[var(--accent)] bg-[var(--card-2)] hover:bg-[var(--accent-light)] border border-[var(--line)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileCode size={12} className={pickingScript ? 'animate-pulse' : ''} />
                  <span>{pickingScript ? '选择中...' : '选择脚本文件'}</span>
                </button>
              </div>
              <textarea
                required
                rows={2}
                placeholder="例如: npm run dev 或 python -m http.server 8080"
                value={command}
                onChange={e => setCommand(e.target.value)}
                className="w-full h-14 p-2.5 text-xs font-mono leading-relaxed rounded-xl border bg-[var(--card-2)] focus:bg-[var(--card)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all outline-none resize-none"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* 服务专属配置：端口与打开路径 */}
            {kind === 'service' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                      监听端口
                    </label>
                    <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>自动识别/可选</span>
                  </div>
                  <input
                    type="number"
                    placeholder="例如: 3000 / 8080"
                    value={port}
                    onChange={e => setPort(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-9 px-3 text-xs font-mono rounded-xl border bg-[var(--card-2)] focus:bg-[var(--card)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all outline-none"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--ink-2)' }}>
                      自定义打开路径 (URL)
                    </label>
                    <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>子路径或URL</span>
                  </div>
                  <input
                    type="text"
                    placeholder="例如 /docs 或完整本机 URL"
                    value={openUrl}
                    onChange={e => setOpenUrl(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl border bg-[var(--card-2)] focus:bg-[var(--card)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all outline-none"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
                  />
                </div>
              </div>
            )}

            {/* 卡片图标与外观配置 */}
            <div
              className="p-2.5 rounded-xl border space-y-2"
              style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line-2)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <label className="text-xs font-semibold tracking-wide shrink-0" style={{ color: 'var(--ink-2)' }}>
                    卡片图标与外观
                  </label>
                  {customIconSource && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        iconType === 'preset'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20'
                      }`}
                      title={customIconSource}
                    >
                      {customIconSource}
                    </span>
                  )}
                  {iconPathDisplay && (
                    <span
                      className="text-[10px] font-mono text-[var(--ink-3)] truncate max-w-[190px] sm:max-w-[270px] select-all bg-[var(--card)] px-1.5 py-0.5 rounded border border-[var(--line)] cursor-text"
                      title={`图标路径: ${iconPathDisplay}`}
                    >
                      {iconPathDisplay}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".ico,.png,.jpg,.jpeg,.webp,image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg text-[var(--accent)] bg-[var(--card)] hover:bg-[var(--accent-light)] border border-[var(--line)] transition-all cursor-pointer shadow-2xs"
                  >
                    <Upload size={12} />
                    <span>{customIconPreviewUrl ? '更换图标' : '上传自定义图标'}</span>
                  </button>
                  {(customIconPreviewUrl || (isEdit && editingApp?.icon && !removeStoredIcon)) && (
                    <button
                      type="button"
                      onClick={handleClearIcon}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-lg text-[var(--ink-3)] hover:text-red-500 bg-[var(--card)] hover:bg-red-500/10 border border-[var(--line)] transition-all cursor-pointer shadow-2xs"
                      title="清除自定义图片，恢复系统自带图标"
                    >
                      <RotateCcw size={11} />
                      <span>恢复默认</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 实时预览与系统自带 Glyph 网格 */}
              <div className="flex items-center gap-2.5">
                {/* 实时图标预览方块 */}
                <div
                  className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border overflow-hidden shadow-xs"
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--line)',
                    color: 'var(--accent)',
                  }}
                  title="当前图标预览"
                >
                  {customIconPreviewUrl ? (
                    <img
                      src={customIconPreviewUrl}
                      alt="icon preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : glyph ? (
                    <GlyphIcon name={glyph} size={22} />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                      {(name.trim() || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* 系统自带图标（Glyph 网格） */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--ink-4)' }}>
                    <span>系统自带图标（点击选用）：</span>
                    <span className="font-semibold text-[var(--accent)]">
                      {customIconPreviewUrl
                        ? (iconType === 'preset' ? '已使用项目预设图标' : '已使用配置图标')
                        : (glyph || '默认')}
                    </span>
                  </div>
                  <div className="grid grid-cols-9 gap-1">
                    {GLYPH_OPTIONS.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleSelectGlyph(g)}
                        className={`h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          !customIconPreviewUrl && glyph === g
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-xs'
                            : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--accent)] text-[var(--ink-3)] hover:text-[var(--ink)]'
                        }`}
                        title={g}
                      >
                        <GlyphIcon name={g} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部动作栏：固定在底部，绝不被切断遮挡 */}
          <div
            className="h-14 px-6 border-t flex items-center justify-end gap-2.5 shrink-0 bg-[var(--card)]"
            style={{ borderColor: 'var(--line)' }}
          >
            <button
              type="button"
              onClick={closeAppEdit}
              className="h-9 px-4 rounded-xl border text-xs font-medium hover:bg-[var(--card-2)] transition-colors cursor-pointer"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? '处理中...' : isEdit ? '保存更改' : '立即创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
