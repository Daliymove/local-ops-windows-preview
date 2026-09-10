import { useState, useEffect, useRef, useCallback } from 'react';
import type { StateResponse, AppItem } from '../types/console';
import { api, currentMutationEpoch } from '../services/api';
import { useModal } from '../context/ModalContext';

const DEFAULT_POLL_INTERVAL_SEC = 2;

function getStoredPollIntervalSec(): number {
  try {
    const stored = localStorage.getItem('console-poll-interval');
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_POLL_INTERVAL_SEC;
}

export function useConsoleState() {
  const [data, setData] = useState<StateResponse | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [view, setViewState] = useState<'launchpad' | 'services'>(() => {
    return (localStorage.getItem('console-view') as 'launchpad' | 'services') || 'launchpad';
  });
  const [pollIntervalSec, setPollIntervalState] = useState<number>(getStoredPollIntervalSec);

  const setPollIntervalSec = useCallback((sec: number) => {
    const validSec = Number.isInteger(sec) && sec > 0 ? sec : DEFAULT_POLL_INTERVAL_SEC;
    setPollIntervalState(validSec);
    try {
      localStorage.setItem('console-poll-interval', String(validSec));
    } catch {}
  }, []);

  const { showToast } = useModal();
  const previousAppsRef = useRef<Map<string, AppItem>>(new Map());
  const inFlightRef = useRef<boolean>(false);
  const isRestartingRef = useRef<boolean>(false);
  const restartProbeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const pollRef = useRef<(isManual?: boolean) => Promise<void>>(async () => {});
  const pollControllerRef = useRef<AbortController | null>(null);
  const scheduledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<number>(pollIntervalSec);
  const consecutiveFailsRef = useRef<number>(0);

  useEffect(() => {
    pollIntervalRef.current = pollIntervalSec;
  }, [pollIntervalSec]);

  const poll = useCallback(async (isManual = false) => {
    if (isRestartingRef.current) return;

    if (isManual && inFlightRef.current && pollControllerRef.current) {
      pollControllerRef.current.abort();
      inFlightRef.current = false;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const controller = new AbortController();
    pollControllerRef.current = controller;
    const epochBefore = currentMutationEpoch();

    try {
      const res = await api.fetchState(controller.signal);
      // 如果本请求已被主动中止，直接退出，严禁触发断连提示或修改数据
      if (controller.signal.aborted) {
        return;
      }

      if (!res) {
        consecutiveFailsRef.current += 1;
        if (consecutiveFailsRef.current >= 2) {
          setConnected(false);
        }
      } else {
        consecutiveFailsRef.current = 0;
        setConnected(true);
        setLastUpdate(new Date());

        if (currentMutationEpoch() === epochBefore || isManual) {
          setData(res);
          notifyTaskCompletions(res.apps || []);
        } else {
          setTimeout(() => {
            pollRef.current(true);
          }, 50);
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError'))) {
        return;
      }
      consecutiveFailsRef.current += 1;
      if (consecutiveFailsRef.current >= 2) {
        setConnected(false);
      }
    } finally {
      if (!controller.signal.aborted && pollControllerRef.current === controller) {
        inFlightRef.current = false;
        pollControllerRef.current = null;
      }
    }
  }, [notifyTaskCompletions]);

  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const scheduleNextPoll = useCallback(() => {
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current);
    }
    scheduledTimerRef.current = setTimeout(async () => {
      await poll(false);
      scheduleNextPoll();
    }, pollIntervalRef.current * 1000);
  }, [poll]);

  const triggerPoll = useCallback(async () => {
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current);
      scheduledTimerRef.current = null;
    }
    await poll(true);
    scheduleNextPoll();
  }, [poll, scheduleNextPoll]);

  useEffect(() => {
    poll(false);
    scheduleNextPoll();
    return () => {
      if (scheduledTimerRef.current) {
        clearTimeout(scheduledTimerRef.current);
        scheduledTimerRef.current = null;
      }
      if (pollControllerRef.current) {
        pollControllerRef.current.abort();
      }
      if (restartProbeTimerRef.current) {
        clearInterval(restartProbeTimerRef.current);
        restartProbeTimerRef.current = null;
      }
    };
  }, [poll, scheduleNextPoll, pollIntervalSec]);

  const mutateData = useCallback((updater: (prev: StateResponse | null) => StateResponse | null) => {
    setData(prev => updater(prev));
  }, []);

  const restartConsole = useCallback(async (): Promise<boolean> => {
    const oldPid = data?.consolePid;

    // 1. 立即清除页面所有数据为初始状态，并标记为重启中
    setData(null);
    setIsRestarting(true);
    isRestartingRef.current = true;
    setConnected(true);

    // 2. 中止当前正在运行的普通轮询与定时器
    if (pollControllerRef.current) {
      pollControllerRef.current.abort();
      pollControllerRef.current = null;
      inFlightRef.current = false;
    }
    if (scheduledTimerRef.current) {
      clearTimeout(scheduledTimerRef.current);
      scheduledTimerRef.current = null;
    }
    if (restartProbeTimerRef.current) {
      clearInterval(restartProbeTimerRef.current);
      restartProbeTimerRef.current = null;
    }

    try {
      const res = await api.restartConsole();
      const isNetworkTransition =
        !res.ok &&
        (res.error === 'Failed to fetch' ||
         res.error === '网络请求失败' ||
         (typeof res.error === 'string' && (
           res.error.toLowerCase().includes('fetch') ||
           res.error.toLowerCase().includes('network') ||
           res.error.toLowerCase().includes('abort') ||
           res.error.toLowerCase().includes('connection')
         )));

      if (!res.ok && !res.alreadyScheduled && !isNetworkTransition) {
        setIsRestarting(false);
        isRestartingRef.current = false;
        showToast('重启未执行：' + (res.error || '未知错误'), 4000);
        triggerPoll();
        return false;
      }
    } catch (err) {
      console.warn('重启通知连接关闭（正常过渡）:', err);
    }

    // 3. 开启快速探测（单飞顺序探测，彻底杜绝并发堆叠重复提醒）
    const startTime = Date.now();
    const maxWaitMs = 25000;
    let probeActive = true;

    const probe = async () => {
      if (!probeActive || !isRestartingRef.current) return;

      if (Date.now() - startTime > maxWaitMs) {
        probeActive = false;
        if (restartProbeTimerRef.current) {
          clearTimeout(restartProbeTimerRef.current);
          restartProbeTimerRef.current = null;
        }
        setIsRestarting(false);
        isRestartingRef.current = false;
        setConnected(false);
        showToast('重启响应超时，请检查控制台后台进程', 5000);
        scheduleNextPoll();
        return;
      }

      try {
        const state = await api.fetchState();
        if (!probeActive || !isRestartingRef.current) return;

        if (state && Array.isArray(state.apps) && (!oldPid || state.consolePid !== oldPid)) {
          probeActive = false;
          if (restartProbeTimerRef.current) {
            clearTimeout(restartProbeTimerRef.current);
            restartProbeTimerRef.current = null;
          }
          setIsRestarting(false);
          isRestartingRef.current = false;
          setConnected(true);
          setData(state);
          setLastUpdate(new Date());
          showToast('✅ 总控台重启成功，服务已就绪', 4000);
          scheduleNextPoll();
          return;
        }
      } catch {
        // 重启中忽略网络断开，继续等待新服务上线
      }

      if (probeActive && isRestartingRef.current) {
        restartProbeTimerRef.current = setTimeout(probe, 600);
      }
    };

    restartProbeTimerRef.current = setTimeout(probe, 600);

    return true;
  }, [data?.consolePid, showToast, triggerPoll, scheduleNextPoll]);

  return {
    data,
    connected,
    isRestarting,
    lastUpdate,
    view,
    setView,
    triggerPoll,
    pollIntervalSec,
    setPollIntervalSec,
    mutateData,
    restartConsole,
  };
}
