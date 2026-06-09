'use client';

import { useEffect } from 'react';
import {
  BUS_EVENTS,
  gameBus,
  type BossKilledPayload,
} from 'game/gameBus';
import { DAILY_CAP, useDaily } from './useDaily';
import { sendToParent, subscribe, MSG_PREFIX, type InboundMessage } from './messageBridge';

// 보스 처치 → 응모권 청구 흐름
// 1) 오늘 응모권 cap 도달: 청구 X, 토스트 안내
// 2) 첫 응모권: 즉시 CLAIM_TICKET (adWatched: false)
// 3) 2~3번째: PLAY_AD_REWARDED 요청 → AD_REWARDED_COMPLETED 수신 → CLAIM_TICKET (adWatched: true)
//    실패 시 AD_REWARDED_FAILED → 토스트 안내
// 응답 TICKET_GRANTED/REJECTED는 usePolyballBridge가 store 업데이트. 여기선 토스트만.

export const useBossReward = (): void => {
  useEffect(() => {
    const tossToast = (text: string, variant: 'info' | 'success' | 'warn' | 'reward', durationMs = 1600) => {
      gameBus.emit(BUS_EVENTS.toast, { text, variant, durationMs });
    };

    let pendingReason: string | null = null;

    const onBoss = (payload: BossKilledPayload) => {
      if (!payload.ticketEligible) return;
      const tickets = useDaily.getState().ticketsToday;
      if (tickets >= DAILY_CAP) {
        tossToast(`오늘 응모권 모두 받음 (${tickets}/${DAILY_CAP})`, 'info', 1800);
        return;
      }
      if (tickets === 0) {
        sendToParent({
          type: `${MSG_PREFIX}:CLAIM_TICKET`,
          source: 'boss_kill',
          adWatched: false,
          stage: payload.stage,
        });
      } else {
        pendingReason = tickets === 1 ? 'ticket_2nd' : 'ticket_3rd';
        sendToParent({
          type: `${MSG_PREFIX}:PLAY_AD_REWARDED`,
          reason: pendingReason,
        });
        tossToast('광고 시청 후 응모권 지급', 'info', 1400);
      }
    };

    const inboundSub = subscribe((msg: InboundMessage) => {
      switch (msg.type) {
        case `${MSG_PREFIX}:AD_REWARDED_COMPLETED`:
          if (pendingReason) {
            sendToParent({
              type: `${MSG_PREFIX}:CLAIM_TICKET`,
              source: 'boss_kill',
              adWatched: true,
            });
            pendingReason = null;
          }
          break;
        case `${MSG_PREFIX}:AD_REWARDED_FAILED`:
          tossToast('광고 시청 실패', 'warn', 1600);
          pendingReason = null;
          break;
        case `${MSG_PREFIX}:TICKET_GRANTED`:
          tossToast(`응모권 +1 (${msg.count}/${DAILY_CAP})`, 'reward', 1800);
          break;
        case `${MSG_PREFIX}:TICKET_REJECTED`: {
          const msgText =
            msg.reason === 'cap_reached'
              ? `오늘 응모권 cap 도달 (${DAILY_CAP}/${DAILY_CAP})`
              : '응모권 지급 실패';
          tossToast(msgText, 'warn', 1800);
          break;
        }
      }
    });

    gameBus.on(BUS_EVENTS.bossKilled, onBoss);

    return () => {
      gameBus.off(BUS_EVENTS.bossKilled, onBoss);
      inboundSub();
    };
  }, []);
};
