import React from 'react';
import type { StateResponse } from '../../types/console';
import { QuickActions } from './QuickActions';
import { TopResources } from './TopResources';
import { ActivityFeed } from './ActivityFeed';

interface RightSidebarProps {
  data: StateResponse | null;
  onRefresh: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ data, onRefresh }) => {
  return (
    <aside
      className="hidden xl:flex flex-col w-72 shrink-0 border-l p-5 space-y-4 overflow-y-auto select-none"
      style={{
        backgroundColor: 'var(--card-2)',
        borderColor: 'var(--line)',
      }}
    >
      <QuickActions onRefresh={onRefresh} />
      <TopResources data={data} />
      <ActivityFeed data={data} />
    </aside>
  );
};
