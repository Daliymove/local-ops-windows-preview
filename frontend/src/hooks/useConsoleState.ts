import { useState, useEffect, useRef, useCallback } from 'react';
import type { StateResponse, AppItem } from '../types/console';
import { api, currentMutationEpoch } from '../services/api';
import { useModal } from '../context/ModalContext';

const POLL_INTERVAL_MS = 2000;

export function useConsoleState() {
  const [data, setData] = useState<StateResponse | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [view, setViewState] = useState<'launchpad' | 'services'>(() => {
    return (localStorage.getItem('console-view') as 'launchpad' | 'services') || 'launchpad';
  });

  const { showToast } = useModal();
  const previousAppsRef = useRef<Map<string, AppItem>>(new Map());
  const inFlightRef = useRef<boolean>(false);
  const scheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setView = (newView: 'launchpad' | 'services') => {
    setViewState(newView);
    localStorage.setItem('console-view', newView);
  };

  const notifyTaskCompletions = useCallback((currentApps: AppItem[]) => {
    const prevMap = previousAppsRef.current;
    if (prevMap.size === 0) {
      const map = new Map<string, AppItem>();
      currentApps.forEach(a => map.set(a.id, a));
      previousAppsRef.current = map;
      return;
    }

    currentApps.forEach(app => {
      if (app.kind !== 'task' || !app.lastExit) return;
      const prev = prevMap.get(app.id);
      if (!prev) return;

      const prevExit = prev.lastExit;
      const currExit = app.lastExit;
      const isNewExit =
        !prevExit ||
        prevExit.at !== currExit.at ||
        prevExit.status !== currExit.status ||
        prevExit.code !== currExit.code;

      if (isNewExit) {
        const name = app.name || '批处理任务';
        const dur = currExit.durationSec != null ? `，用时 ${currExit.durationSec.toFixed(1)}s` : '';
        if (currExit.status === 'succeeded') {
          showToast(`✅ ${name} 运行成功${dur}`, 4000);
        } else if (currExit.status === 'canceled') {
          showToast(`⏹️ ${name} 已取消${dur}`, 3000);
        } else if (currExit.status === 'failed') {
          showToast(`❌ ${name} 运行失败 (exit ${currExit.code})${dur}`, 5000);
        }
      }
    });

    const newMap = new Map<string, AppItem>();
    currentApps.forEach(a => newMap.set(a.id, a));
    previousAppsRef.current = newMap;
  }, [showToast]);

  const pollRef = useRef<() => Promise<void>>(async () => {});

  const poll = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const epochBefore = currentMutationEpoch();

    try {
      const res = await api.fetchState();
      if (!res) {
        setConnected(false);
      } else {
        setConnected(true);
        setLastUpdate(new Date());

        if (currentMutationEpoch() === epochBefore) {
          setData(res);
          notifyTaskCompletions(res.apps || []);
        } else {
          setTimeout(() => {
            pollRef.current();
          }, 50);
        }
      }
    } catch {
      setConnected(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [notifyTaskCompletions]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const triggerPoll = useCallback(() => {
    if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);
    poll();
  }, [poll]);

  useEffect(() => {
    poll();
    const interval = setInterval(() => {
      poll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [poll]);

  return {
    data,
    connected,
    lastUpdate,
    view,
    setView,
    triggerPoll,
  };
}
