'use client';

import { useEffect, useState } from 'react';
import { BUS_EVENTS, gameBus, type GameStatePayload } from 'game/gameBus';
import { useGameStateOverride } from './GameStateContext';

export const useGameState = (): GameStatePayload | null => {
  const override = useGameStateOverride();
  const [state, setState] = useState<GameStatePayload | null>(null);
  useEffect(() => {
    if (override !== undefined) return;
    const handler = (s: unknown) => setState(s as GameStatePayload);
    gameBus.on(BUS_EVENTS.state, handler);
    return () => {
      gameBus.off(BUS_EVENTS.state, handler);
    };
  }, [override]);
  if (override !== undefined) return override;
  return state;
};
