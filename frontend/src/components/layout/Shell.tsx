import React from 'react';
import { RailNav } from './RailNav';
import { TopBar } from './TopBar';
import { RightSidebar } from '../widgets/RightSidebar';
import { useConsoleState } from '../../hooks/useConsoleState';
import { useTheme } from '../../hooks/useTheme';
import { LaunchpadView } from '../launchpad/LaunchpadView';
import { ServicesView } from '../services/ServicesView';
import { AppEditModal } from '../overlays/AppEditModal';
import { LogDrawer } from '../overlays/LogDrawer';
import { ConfirmDialog } from '../overlays/ConfirmDialog';
import { CmdkModal } from '../overlays/CmdkModal';
import { SettingsModal } from '../overlays/SettingsModal';
import { PortDiagnosticModal } from '../launchpad/PortDiagnosticModal';
import { AppDiagnosticModal } from '../launchpad/AppDiagnosticModal';
import { ToastContainer } from '../common/ToastContainer';
import { AlertCircle } from 'lucide-react';

export const Shell: React.FC = () => {
  const { data, connected, view, setView, triggerPoll } = useConsoleState();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none">
      {!connected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 shadow-md">
          <AlertCircle size={14} />
          <span>控制台连接断开，正在自动尝试重连…</span>
        </div>
      )}

      <RailNav
        currentView={view}
        onViewChange={setView}
        connected={connected}
        data={data}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopBar
          currentView={view}
          onViewChange={setView}
          data={data}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 min-w-0">
            <div key={view} className="animate-page-enter h-full">
              {view === 'launchpad' ? (
                <LaunchpadView data={data} onRefresh={triggerPoll} />
              ) : (
                <ServicesView data={data} onRefresh={triggerPoll} />
              )}
            </div>
          </main>

          <RightSidebar data={data} onRefresh={triggerPoll} />
        </div>
      </div>

      <AppEditModal onUpdated={triggerPoll} iconsDir={data?.iconsDir} />
      <LogDrawer />
      <ConfirmDialog />
      <CmdkModal data={data} onViewChange={setView} />
      <SettingsModal data={data} />
      <PortDiagnosticModal onUpdated={triggerPoll} />
      <AppDiagnosticModal />
      <ToastContainer />
    </div>
  );
};
