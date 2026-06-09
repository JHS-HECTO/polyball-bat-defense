// 12 슬롯 — 가로 path (y=520) 위/아래 잔디 영역에 분포.
// 위: 3 cols × 2 rows = 6, 아래: 3 cols × 2 rows = 6.

import type { Unit } from './Unit';

export type SlotPosition = { index: number; x: number; y: number };

export const SLOT_POSITIONS: SlotPosition[] = [
  // 위쪽 (y=220, 360 / x=120, 270, 420)
  { index: 0, x: 120, y: 220 },
  { index: 1, x: 270, y: 220 },
  { index: 2, x: 420, y: 360 },
  { index: 3, x: 120, y: 360 },
  { index: 4, x: 270, y: 360 },
  { index: 5, x: 420, y: 220 },
  // 아래쪽 (y=680, 820 / x=120, 270, 420)
  { index: 6, x: 120, y: 680 },
  { index: 7, x: 270, y: 680 },
  { index: 8, x: 420, y: 680 },
  { index: 9, x: 120, y: 820 },
  { index: 10, x: 270, y: 820 },
  { index: 11, x: 420, y: 820 },
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

  findSlotAt(x: number, y: number, tolerance = 60): SlotPosition | null {
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
