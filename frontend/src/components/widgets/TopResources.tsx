import React, { useState } from 'react';
import type { StateResponse } from '../../types/console';

interface TopResourcesProps {
  data: StateResponse | null;
}

export const TopResources: React.FC<TopResourcesProps> = ({ data }) => {
  const [metric, setMetric] = useState<'cpu' | 'mem'>('mem');

  const services = data?.services || [];

  const topItems = [...services]
    .sort((a, b) => {
      const valA = metric === 'cpu' ? a.cpu || 0 : a.mem || 0;
      const valB = metric === 'cpu' ? b.cpu || 0 : b.mem || 0;
      return valB - valA;
    })
    .slice(0, 5);

  return (
    <div
      className="p-4 rounded-2xl border space-y-3"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold" style={{ color: 'var(--ink)' }}>
          负载 TOP 5
        </h4>

        <div
          className="flex items-center p-0.5 rounded-lg border text-[11px]"
          style={{ backgroundColor: 'var(--card-2)', borderColor: 'var(--line)' }}
        >
          <button
            type="button"
            onClick={() => setMetric('cpu')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              metric === 'cpu'
                ? 'bg-[var(--card)] font-bold text-[var(--accent)] shadow-xs'
                : 'text-[var(--ink-3)]'
            }`}
          >
            CPU
          </button>
          <button
            type="button"
            onClick={() => setMetric('mem')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              metric === 'mem'
                ? 'bg-[var(--card)] font-bold text-[var(--accent)] shadow-xs'
                : 'text-[var(--ink-3)]'
            }`}
          >
            内存
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {topItems.length > 0 ? (
          topItems.map(svc => {
            const val = metric === 'cpu' ? svc.cpu || 0 : svc.mem || 0;
            const pct = Math.min(Math.max(val, 2), 100);

            return (
              <div key={svc.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate max-w-[150px]" style={{ color: 'var(--ink)' }}>
                    {svc.name}
                    <span className="mono text-[10px] ml-1.5" style={{ color: 'var(--ink-4)' }}>
                      :{svc.port}
                    </span>
                  </span>
                  <span className="mono font-semibold" style={{ color: 'var(--ink-2)' }}>
                    {val.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--line)' }}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      val > 80 ? 'bg-red-500' : val > 50 ? 'bg-amber-500' : 'bg-[var(--accent)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs" style={{ color: 'var(--ink-4)' }}>
            暂无负载数据
          </div>
        )}
      </div>
    </div>
  );
};
