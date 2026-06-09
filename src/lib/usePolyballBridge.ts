'use client';

import { useEffect } from 'react';
import { attachDevMockParent } from './devMockParent';
import {
  MSG_PREFIX,
  sendToParent,
  subscribe,
  type InboundMessage,
} from './messageBridge';
import { useDaily } from './useDaily';
import { usePlayer } from './usePlayer';

// 마운트 시 부모와 핸드셰이크 + inbound dispatch
export const usePolyballBridge = (): void => {
  const setPlayer = usePlayer((s) => s.setPlayer);
  const setTickets = useDaily((s) => s.setTickets);

  useEffect(() => {
    attachDevMockParent();

    const unsubscribe = subscribe((msg: InboundMessage) => {
      switch (msg.type) {
        case `${MSG_PREFIX}:SET_PLAYER`:
          setPlayer(msg.player, msg.total_score);
          break;
        case `${MSG_PREFIX}:TICKET_GRANTED`:
          setTickets(msg.count);
          break;
        case `${MSG_PREFIX}:TICKET_REJECTED`:
        case `${MSG_PREFIX}:AD_REWARDED_COMPLETED`:
        case `${MSG_PREFIX}:AD_REWARDED_FAILED`:
          // 화면 레벨 처리는 호출자 측 별도 구독으로
          break;
      }
    });

    sendToParent({ type: `${MSG_PREFIX}:READY` });

    return unsubscribe;
  }, [setPlayer, setTickets]);
};
