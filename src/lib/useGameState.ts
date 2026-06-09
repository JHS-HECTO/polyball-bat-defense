'use client';

import { useEffect, useState } from 'react';
import { BUS_EVENTS, gameBus, type GameStatePayload } from 'game/gameBus';

export const useGameState = (): GameStatePayload | null => {
  const [state, setState] = useState<GameStatePayload | null>(null);
  useEffect(() => {
    const handler = (s: GameStatePayload) => setState(s);
    gameBus.on(BUS_EVENTS.state, handler);
    return () => {
      gameBus.off(BUS_EVENTS.state, handler);
    };
  }, []);
  return state;
};
