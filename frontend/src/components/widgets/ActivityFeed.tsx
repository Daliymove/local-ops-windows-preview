import React from 'react';
import type { StateResponse } from '../../types/console';
import { Activity } from 'lucide-react';

interface ActivityFeedProps {
  data: StateResponse | null;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ data }) => {
  const apps = data?.apps || [];
  const runningApps = apps.filter(a => a.running);
  const tasksWithExit = apps.filter(a => a.kind === 'task' && a.lastExit);

  return (
    <div
      className="p-4 rounded-2xl border space-y-3"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-2">
        <Activity size={16} style={{ color: 'var(--accent)' }} />
        <h4 className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
          运行状态摘要
        </h4>
      </div>

      <div className="space-y-2 text-xs">
        <div
          className="p-2.5 rounded-xl border flex items-center justify-between"
          style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
        >
          <span style={{ color: 'var(--ink-2)' }}>受管应用总数</span>
          <strong className="mono" style={{ color: 'var(--ink)' }}>{apps.length}</strong>
        </div>

        <div
          className="p-2.5 rounded-xl border flex items-center justify-between"
          style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
        >
          <span style={{ color: 'var(--ink-2)' }}>正在运行服务</span>
          <strong className="mono text-emerald-500">{runningApps.length}</strong>
        </div>

        <div
          className="p-2.5 rounded-xl border flex items-center justify-between"
          style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
        >
          <span style={{ color: 'var(--ink-2)' }}>最近批处理结果</span>
          <strong className="mono" style={{ color: 'var(--ink)' }}>{tasksWithExit.length} 项</strong>
        </div>
      </div>
    </div>
  );
};
