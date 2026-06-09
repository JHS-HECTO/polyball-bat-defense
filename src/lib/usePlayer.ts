'use client';

import { create } from 'zustand';
import type { PlayerInfo } from './messageBridge';

type PlayerState = {
  player: PlayerInfo | null;
  totalScore: number;
  setPlayer: (player: PlayerInfo, totalScore?: number) => void;
  addScore: (delta: number) => void;
};

export const usePlayer = create<PlayerState>((set) => ({
  player: null,
  totalScore: 0,
  setPlayer: (player, totalScore) =>
    set({ player, totalScore: totalScore ?? 0 }),
  addScore: (delta) =>
    set((s) => ({ totalScore: s.totalScore + delta })),
}));
