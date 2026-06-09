'use client';

import { useEffect, useState } from 'react';
import { BUS_EVENTS, gameBus, type ToastPayload } from 'game/gameBus';

export type ToastEntry = ToastPayload & { id: number };

let counter = 0;

export const useToastBus = (): ToastEntry[] => {
  const [items, setItems] = useState<ToastEntry[]>([]);
  useEffect(() => {
    const handler = (p: ToastPayload) => {
      const id = ++counter;
      const entry: ToastEntry = { ...p, id };
      setItems((arr) => [...arr, entry]);
      const dur = p.durationMs ?? 1200;
      window.setTimeout(() => {
        setItems((arr) => arr.filter((it) => it.id !== id));
      }, dur);
    };
    gameBus.on(BUS_EVENTS.toast, handler);
    return () => {
      gameBus.off(BUS_EVENTS.toast, handler);
    };
  }, []);
  return items;
};
