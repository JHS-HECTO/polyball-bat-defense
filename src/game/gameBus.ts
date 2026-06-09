// React ↔ Phaser 이벤트 버스
// SSR 호환을 위해 Phaser 의존성 제거. 자체 EventEmitter.
// 'state' 이벤트는 마지막 값을 캐싱 → 신규 구독자가 즉시 마지막 상태 수신.

export type UpgradeKind = 'damage' | 'speed' | 'range' | 'bat';

export type GameStatePayload = {
  hp: number;
  hpMax: number;
  gold: number;
  stage: number;
  score: number;
  isBossStage: boolean;
  isGameOver: boolean;
  mobsRemaining: number;
  damageTier: number;
  speedTier: number;
  rangeTier: number;
  batTier: number;
  damageCost: number | null;
  speedCost: number | null;
  rangeCost: number | null;
  batCost: number | null;
  damage: number;
  attackCooldown: number;
  range: number;
};

export type BossKilledPayload = {
  stage: number;
  ticketEligible: boolean;
};

export type ToastPayload = {
  text: string;
  variant: 'info' | 'success' | 'warn' | 'reward';
  durationMs?: number;
};

export const BUS_EVENTS = {
  state: 'state',
  bossKilled: 'bossKilled',
  upgradeRequest: 'upgradeRequest',
  restart: 'restart',
  toast: 'toast',
} as const;

type Handler = (payload: unknown) => void;

// 캐시 대상 이벤트 (신규 구독자에게 replay)
const REPLAY_EVENTS = new Set<string>([BUS_EVENTS.state]);

class Emitter {
  private map = new Map<string, Set<Handler>>();
  private lastValue = new Map<string, unknown>();

  on(event: string, fn: Handler): void {
    const set = this.map.get(event) ?? new Set();
    set.add(fn);
    this.map.set(event, set);
    if (REPLAY_EVENTS.has(event) && this.lastValue.has(event)) {
      // 마지막 값 즉시 전달 (비동기로 - state setter 안전)
      Promise.resolve().then(() => fn(this.lastValue.get(event)));
    }
  }

  off(event: string, fn: Handler): void {
    this.map.get(event)?.delete(fn);
  }

  emit(event: string, payload?: unknown): void {
    if (REPLAY_EVENTS.has(event)) this.lastValue.set(event, payload);
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of set) fn(payload);
  }
}

export const gameBus = new Emitter();
