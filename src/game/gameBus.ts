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

// 캐시 대상 이벤트 (신규 구독자에게 replay)
const REPLAY_EVENTS = new Set<string>([BUS_EVENTS.state]);

// 핸들러를 unknown으로 들고 다니다 호출 시점에 그대로 패스. 콜백 측에서 타입 좁힘.
// on/off는 generic으로 받아 호출자에게 자연스러운 타입 추론 제공.
type AnyHandler = (payload: never) => void;

class Emitter {
  private map = new Map<string, Set<AnyHandler>>();
  private lastValue = new Map<string, unknown>();

  on<T>(event: string, fn: (payload: T) => void): void {
    const set = this.map.get(event) ?? new Set<AnyHandler>();
    set.add(fn as unknown as AnyHandler);
    this.map.set(event, set);
    if (REPLAY_EVENTS.has(event) && this.lastValue.has(event)) {
      const cached = this.lastValue.get(event) as T;
      Promise.resolve().then(() => fn(cached));
    }
  }

  off<T>(event: string, fn: (payload: T) => void): void {
    this.map.get(event)?.delete(fn as unknown as AnyHandler);
  }

  emit<T>(event: string, payload?: T): void {
    if (REPLAY_EVENTS.has(event)) this.lastValue.set(event, payload);
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of set) (fn as unknown as (p: T | undefined) => void)(payload);
  }
}

export const gameBus = new Emitter();
