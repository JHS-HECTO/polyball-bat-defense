'use client';

import { useEffect } from 'react';
import { useDaily } from './useDaily';

// 자정 자동 리셋 — 1분 폴링 + visibilitychange + focus
export const useDailyResetSync = (): void => {
  const resetIfStale = useDaily((s) => s.resetIfStale);

  useEffect(() => {
    resetIfStale();

    const interval = window.setInterval(resetIfStale, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') resetIfStale();
    };
    const onFocus = () => resetIfStale();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [resetIfStale]);
};
