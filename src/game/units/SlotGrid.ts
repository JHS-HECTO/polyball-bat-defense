// 12 슬롯: 직선 path (왼쪽 x=120 lane)의 오른쪽 영역에 3×4 그리드.
// 슬롯 칸 크기 ~110×170. 슬롯 사거리가 path lane 까지 도달 가능 (좌측거리 90~170px).

import type { Unit } from './Unit';

export type SlotPosition = { index: number; x: number; y: number };

export const SLOT_POSITIONS: SlotPosition[] = [
  // 3 col (x=230, 340, 450) × 4 row (y=230, 390, 560, 730)
  { index: 0, x: 230, y: 230 },
  { index: 1, x: 340, y: 230 },
  { index: 2, x: 450, y: 230 },
  { index: 3, x: 230, y: 390 },
  { index: 4, x: 340, y: 390 },
  { index: 5, x: 450, y: 390 },
  { index: 6, x: 230, y: 560 },
  { index: 7, x: 340, y: 560 },
  { index: 8, x: 450, y: 560 },
  { index: 9, x: 230, y: 730 },
  { index: 10, x: 340, y: 730 },
  { index: 11, x: 450, y: 730 },
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
