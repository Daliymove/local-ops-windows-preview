import { createContext } from 'react';
import type { AppItem } from '../types/console';

export interface ConfirmOptions {
  title: string;
  message: string;
  okText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  showForce?: boolean;
  onConfirm: (force?: boolean) => Promise<void> | void;
}

export interface AppEditOptions {
  mode: 'create' | 'edit';
  app?: AppItem;
  initialKind?: 'service' | 'task';
  attachPid?: number;
  initialCwd?: string;
  initialPort?: number;
  initialCommand?: string;
  initialName?: string;
}

export interface LogDrawerOptions {
  appId?: string;
  appName?: string;
  isConsole?: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  duration: number;
}

export interface ModalContextType {
  confirmState: ConfirmOptions | null;
  openConfirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;

  appEditState: AppEditOptions | null;
  openAppEdit: (options?: AppEditOptions) => void;
  closeAppEdit: () => void;

  logDrawerState: LogDrawerOptions | null;
  openLogDrawer: (options: LogDrawerOptions) => void;
  closeLogDrawer: () => void;

  portDiagApp: AppItem | null;
  openPortDiag: (app: AppItem) => void;
  closePortDiag: () => void;

  appDiagApp: AppItem | null;
  openAppDiag: (app: AppItem) => void;
  closeAppDiag: () => void;

  isCmdkOpen: boolean;
  setCmdkOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  toasts: ToastItem[];
  showToast: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const ModalContext = createContext<ModalContextType | null>(null);

export { useModal } from '../hooks/useModal';
