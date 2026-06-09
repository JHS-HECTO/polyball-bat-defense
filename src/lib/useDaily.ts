'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DAILY_CAP = 3;

type DailyState = {
  date: string;
  ticketsToday: number;
  setTickets: (count: number, date?: string) => void;
  resetIfStale: () => void;
};

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useDaily = create<DailyState>()(
  persist(
    (set, get) => ({
      date: todayKey(),
      ticketsToday: 0,
      setTickets: (count, date) => set({ ticketsToday: count, date: date ?? todayKey() }),
      resetIfStale: () => {
        const today = todayKey();
        if (get().date !== today) {
          set({ date: today, ticketsToday: 0 });
        }
      },
    }),
    { name: 'def-daily' },
  ),
);
