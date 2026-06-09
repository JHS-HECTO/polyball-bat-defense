// 폴리볼 ↔ 빠따 디펜스 postMessage 브리지
// prefix: DEF
// 메시지 타입은 INTEGRATION.md와 동기화 유지

export const MSG_PREFIX = 'DEF';

type WithType<T extends string> = { type: `${typeof MSG_PREFIX}:${T}` };

// 게임 → 부모 (outbound)
export type OutboundReady = WithType<'READY'>;
export type OutboundPlayAdRewarded = WithType<'PLAY_AD_REWARDED'> & {
  reason: 'ticket_2nd' | 'ticket_3rd' | 'extra_continue' | string;
};
export type OutboundClaimTicket = WithType<'CLAIM_TICKET'> & {
  source: 'boss_kill' | 'special' | string;
  adWatched: boolean;
  stage?: number;
};
export type OutboundScoreUpdate = WithType<'SCORE_UPDATE'> & {
  total_score: number;
};

export type OutboundMessage =
  | OutboundReady
  | OutboundPlayAdRewarded
  | OutboundClaimTicket
  | OutboundScoreUpdate;

// 부모 → 게임 (inbound)
export type PlayerInfo = {
  nickname: string;
  team?: string;
  user_id?: string;
};

export type InboundSetPlayer = WithType<'SET_PLAYER'> & {
  player: PlayerInfo;
  total_score?: number;
};
export type InboundAdRewardedCompleted = WithType<'AD_REWARDED_COMPLETED'> & {
  reason: string;
};
export type InboundAdRewardedFailed = WithType<'AD_REWARDED_FAILED'> & {
  reason: string;
  cause?: string;
};
export type InboundTicketGranted = WithType<'TICKET_GRANTED'> & {
  count: number;
  source?: string;
};
export type InboundTicketRejected = WithType<'TICKET_REJECTED'> & {
  reason: 'cap_reached' | 'invalid' | string;
};

export type InboundMessage =
  | InboundSetPlayer
  | InboundAdRewardedCompleted
  | InboundAdRewardedFailed
  | InboundTicketGranted
  | InboundTicketRejected;

export type InboundType = InboundMessage['type'];

const isInbound = (data: unknown): data is InboundMessage => {
  if (typeof data !== 'object' || data === null) return false;
  const rec = data as Record<string, unknown>;
  return typeof rec.type === 'string' && rec.type.startsWith(`${MSG_PREFIX}:`);
};

export type InboundHandler = (msg: InboundMessage) => void;

export const sendToParent = (msg: OutboundMessage): void => {
  if (typeof window === 'undefined') return;
  const target = window.parent ?? window;
  target.postMessage(msg, '*');
};

export const subscribe = (handler: InboundHandler): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const onMessage = (ev: MessageEvent<unknown>) => {
    if (!isInbound(ev.data)) return;
    handler(ev.data);
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
};
