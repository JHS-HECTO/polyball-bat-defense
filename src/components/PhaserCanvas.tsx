'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import styles from './PhaserCanvas.module.scss';

export const PhaserCanvas = () => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    const parent = parentRef.current;
    if (!parent) return;

    (async () => {
      const { createGame } = await import('game/createGame');
      if (cancelled) return;
      gameRef.current = createGame(parent);
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={parentRef} className={styles.canvasHost} />;
};
