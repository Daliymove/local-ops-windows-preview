import React, { useState, useCallback } from 'react';
import type { AppItem } from '../types/console';
import {
  ModalContext,
  type ConfirmOptions,
  type AppEditOptions,
  type LogDrawerOptions,
  type ToastItem,
} from './ModalContext';

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [appEditState, setAppEditState] = useState<AppEditOptions | null>(null);
  const [logDrawerState, setLogDrawerState] = useState<LogDrawerOptions | null>(null);
  const [portDiagApp, setPortDiagApp] = useState<AppItem | null>(null);
  const [appDiagApp, setAppDiagApp] = useState<AppItem | null>(null);
  const [isCmdkOpen, setCmdkOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const openConfirm = useCallback((options: ConfirmOptions) => setConfirmState(options), []);
  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const openAppEdit = useCallback((options?: AppEditOptions) => {
    setAppEditState(options || { mode: 'create' });
  }, []);
  const closeAppEdit = useCallback(() => setAppEditState(null), []);

  const openLogDrawer = useCallback((options: LogDrawerOptions) => setLogDrawerState(options), []);
  const closeLogDrawer = useCallback(() => setLogDrawerState(null), []);

  const openPortDiag = useCallback((app: AppItem) => setPortDiagApp(app), []);
  const closePortDiag = useCallback(() => setPortDiagApp(null), []);

  const openAppDiag = useCallback((app: AppItem) => setAppDiagApp(app), []);
  const closeAppDiag = useCallback(() => setAppDiagApp(null), []);

  const showToast = useCallback((message: string, duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => {
      if (prev.some(t => t.message === message)) {
        return prev;
      }
      const trimmed = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
      return [...trimmed, { id, message, duration }];
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ModalContext.Provider
      value={{
        confirmState,
        openConfirm,
        closeConfirm,
        appEditState,
        openAppEdit,
        closeAppEdit,
        logDrawerState,
        openLogDrawer,
        closeLogDrawer,
        portDiagApp,
        openPortDiag,
        closePortDiag,
        appDiagApp,
        openAppDiag,
        closeAppDiag,
        isCmdkOpen,
        setCmdkOpen,
        isSettingsOpen,
        setSettingsOpen,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
