// React ↔ Phaser 이벤트 버스 (머지 TD)

export type GameStatePayload = {
  hp: number;
  hpMax: number;
  gold: number;
  stage: number;
  score: number;
  isBossStage: boolean;
  isGameOver: boolean;
  mobsRemaining: number;
  unitsPlaced: number;
  unitsMax: number;
  buyCost: number;
  buyAffordable: boolean;
  fieldFull: boolean;
  selectedUnitId: number | null;
  selectedUnitInfo: SelectedUnitInfo | null;
};

export type SelectedUnitInfo = {
  id: number;
  type: 'melee' | 'ranged' | 'magic' | 'bomb';
  level: number;
  damage: number;
  range: number;
  cooldown: number;
  sellRefund: number;
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
  buyRequest: 'buyRequest',
  sellRequest: 'sellRequest',
  restart: 'restart',
  toast: 'toast',
  unitSelected: 'unitSelected',
  unitDeselected: 'unitDeselected',
} as const;

const REPLAY_EVENTS = new Set<string>([BUS_EVENTS.state]);

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
