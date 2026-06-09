'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { GameStatePayload } from 'game/gameBus';

const Ctx = createContext<GameStatePayload | null | undefined>(undefined);

type ProviderProps = {
  value: GameStatePayload | null;
  children: ReactNode;
};

export const GameStateProvider = ({ value, children }: ProviderProps) => {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// undefined = no override (use bus). null = override with empty.
export const useGameStateOverride = (): GameStatePayload | null | undefined => useContext(Ctx);
