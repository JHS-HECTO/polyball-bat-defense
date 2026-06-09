// 12 슬롯 위치 (경로/캐릭터 영역과 겹치지 않게 잔디 영역 분포)
// S-커브 경로 (PATH_POINTS)는 메인 영역 중앙을 가로지름.
// 슬롯은 경로 사이사이 잔디 빈 공간 + 하단 영역에 배치.

import type { Unit } from './Unit';

export type SlotPosition = { index: number; x: number; y: number };

// 화면 540×1170 기준, HUD 위 140 / 패널 아래 220 제외 → 가용 y 140~950
// 12개 위치. 경로 회피.
export const SLOT_POSITIONS: SlotPosition[] = [
  { index: 0, x: 80, y: 250 },
  { index: 1, x: 200, y: 200 },
  { index: 2, x: 460, y: 200 },
  { index: 3, x: 80, y: 380 },
  { index: 4, x: 180, y: 380 },
  { index: 5, x: 410, y: 410 },
  { index: 6, x: 380, y: 520 },
  { index: 7, x: 200, y: 580 },
  { index: 8, x: 460, y: 620 },
  { index: 9, x: 80, y: 700 },
  { index: 10, x: 350, y: 720 },
  { index: 11, x: 80, y: 850 },
];

export class SlotGrid {
  private occupied: Map<number, Unit> = new Map();

  positions(): SlotPosition[] {
    return SLOT_POSITIONS;
  }

  emptySlots(): SlotPosition[] {
    return SLOT_POSITIONS.filter((p) => !this.occupied.has(p.index));
  }

  randomEmptySlot(): SlotPosition | null {
    const empties = this.emptySlots();
    if (empties.length === 0) return null;
    const idx = Math.floor(Math.random() * empties.length);
    return empties[idx] ?? null;
  }

  place(unit: Unit, slot: SlotPosition): void {
    this.occupied.set(slot.index, unit);
    unit.slotIndex = slot.index;
    unit.setPosition(slot.x, slot.y);
  }

  remove(unit: Unit): void {
    this.occupied.delete(unit.slotIndex);
  }

  getAt(slotIndex: number): Unit | null {
    return this.occupied.get(slotIndex) ?? null;
  }

  positionOf(slotIndex: number): SlotPosition | undefined {
    return SLOT_POSITIONS.find((p) => p.index === slotIndex);
  }

  findSlotAt(x: number, y: number, tolerance = 50): SlotPosition | null {
    let best: SlotPosition | null = null;
    let bestDist = tolerance * tolerance;
    for (const p of SLOT_POSITIONS) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  allUnits(): Unit[] {
    return Array.from(this.occupied.values());
  }

  isOccupied(slotIndex: number): boolean {
    return this.occupied.has(slotIndex);
  }

  count(): number {
    return this.occupied.size;
  }

  isFull(): boolean {
    return this.occupied.size >= SLOT_POSITIONS.length;
  }

  reset(): void {
    this.occupied.clear();
  }
}
