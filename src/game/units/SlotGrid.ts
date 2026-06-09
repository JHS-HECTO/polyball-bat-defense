// 12 슬롯 — 사각 loop 안쪽 중앙 영역.
// loop 좌표 (240~800 y, 80~460 x) 내부 (320~720 y, 140~400 x)에 배치.

import type { Unit } from './Unit';

export type SlotPosition = { index: number; x: number; y: number };

export const SLOT_POSITIONS: SlotPosition[] = [
  // 3 cols (x=160, 270, 380) × 4 rows (y=340, 460, 580, 700) = 12
  { index: 0, x: 160, y: 340 },
  { index: 1, x: 270, y: 340 },
  { index: 2, x: 380, y: 340 },
  { index: 3, x: 160, y: 460 },
  { index: 4, x: 270, y: 460 },
  { index: 5, x: 380, y: 460 },
  { index: 6, x: 160, y: 580 },
  { index: 7, x: 270, y: 580 },
  { index: 8, x: 380, y: 580 },
  { index: 9, x: 160, y: 700 },
  { index: 10, x: 270, y: 700 },
  { index: 11, x: 380, y: 700 },
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

  findSlotAt(x: number, y: number, tolerance = 64): SlotPosition | null {
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
