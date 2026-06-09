// 부모 폴리볼 앱 미장착시 자동 활성 (window.parent === window)
// 게임이 보낸 outbound 메시지를 가로채 inbound로 시뮬레이션 응답
// 실 iframe 환경에선 자동 inert (return)

import {
  MSG_PREFIX,
  type InboundMessage,
  type OutboundMessage,
  type PlayerInfo,
} from './messageBridge';

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.parent === window;
};

const STORAGE_KEY = 'def-mock-parent-state';

type MockState = {
  ticketsToday: number;
  date: string;
};

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadState = (): MockState => {
  if (typeof window === 'undefined') return { ticketsToday: 0, date: todayKey() };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ticketsToday: 0, date: todayKey() };
    const parsed = JSON.parse(raw) as Partial<MockState>;
    const date = parsed.date ?? todayKey();
    if (date !== todayKey()) return { ticketsToday: 0, date: todayKey() };
    return { ticketsToday: parsed.ticketsToday ?? 0, date };
  } catch {
    return { ticketsToday: 0, date: todayKey() };
  }
};

const saveState = (state: MockState): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const reply = (msg: InboundMessage, delay = 120): void => {
  window.setTimeout(() => {
    window.postMessage(msg, '*');
  }, delay);
};

const MOCK_PLAYER: PlayerInfo = {
  nickname: '테스트유저',
  team: 'LG 트윈스',
  user_id: 'mock-user-001',
};

const DAILY_CAP = 3;

let attached = false;

export const attachDevMockParent = (): void => {
  if (!isStandalone() || attached) return;
  attached = true;

  // 마운트 직후 SET_PLAYER 주입
  window.setTimeout(() => {
    const inbound: InboundMessage = {
      type: `${MSG_PREFIX}:SET_PLAYER`,
      player: MOCK_PLAYER,
      total_score: 0,
    };
    window.postMessage(inbound, '*');
  }, 300);

  window.addEventListener('message', (ev: MessageEvent<unknown>) => {
    if (typeof ev.data !== 'object' || ev.data === null) return;
    const msg = ev.data as OutboundMessage;
    if (typeof msg.type !== 'string' || !msg.type.startsWith(`${MSG_PREFIX}:`)) return;

    switch (msg.type) {
      case `${MSG_PREFIX}:READY`:
        // noop — 이미 SET_PLAYER 보냈음
        break;

      case `${MSG_PREFIX}:PLAY_AD_REWARDED`: {
        const out = msg as Extract<OutboundMessage, { type: `${typeof MSG_PREFIX}:PLAY_AD_REWARDED` }>;
        reply(
          {
            type: `${MSG_PREFIX}:AD_REWARDED_COMPLETED`,
            reason: out.reason,
          },
          1200,
        );
        break;
      }

      case `${MSG_PREFIX}:CLAIM_TICKET`: {
        const out = msg as Extract<OutboundMessage, { type: `${typeof MSG_PREFIX}:CLAIM_TICKET` }>;
        const state = loadState();
        if (state.ticketsToday >= DAILY_CAP) {
          reply({ type: `${MSG_PREFIX}:TICKET_REJECTED`, reason: 'cap_reached' });
          return;
        }
        state.ticketsToday += 1;
        saveState(state);
        reply({
          type: `${MSG_PREFIX}:TICKET_GRANTED`,
          count: state.ticketsToday,
          source: out.source,
        });
        break;
      }

      case `${MSG_PREFIX}:SCORE_UPDATE`:
        // mock parent: noop
        break;
    }
  });

  // 디버그용 — 콘솔에서 상태 리셋 가능
  Object.assign(window, {
    __defMockReset: () => {
      saveState({ ticketsToday: 0, date: todayKey() });
    },
  });
};
