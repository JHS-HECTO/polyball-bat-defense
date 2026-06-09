# 빠따 디펜스 (polyball-bat-defense)

폴리볼 미니게임 — 몰려오는 몹을 빠따로 자동 처치하는 타워디펜스. Phaser 3 + Next.js 16 iframe.

## 정책 요약

- **메커닉**: 캐릭이 근접 AOE 자동 스윙. 몹이 사거리에 들어오면 자동 타격.
- **진화**: 세션 내 누적. 몹 처치 → 골드 → 데미지/속도/사거리/빠따 교체.
- **세션 종료**: 몹이 끝까지 도달하면 HP 감소. HP 0 → 게임 오버.
- **보상**: 10스테이지마다 보스. 보스 처치 시 응모권 1장 청구.
- **일일 cap**: 하루 3장 (1장 무료, 2~3장 광고). 서버 권위.
- **광고**: Rewarded 전용. 인터스티셜/자동 광고 없음.

## 기술 스택

- Next.js 16.2 (App Router) + React 19.2 + React Compiler
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Phaser 3 (게임 캔버스)
- Zustand (persist) — 플레이어/일일 상태
- SCSS Modules — Tailwind 없음
- pnpm

## 개발

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build && pnpm start
pnpm test
```

## 폴리볼 통합

`INTEGRATION.md` 참조. 메시지 prefix는 `DEF:`.

## 디렉터리

```
src/
  app/            # Next.js 라우트
  components/     # React UI
  game/           # Phaser 씬/엔진
  lib/            # 메시지 브리지, 스토어, 훅
  styles/         # 글로벌 SCSS, 토큰
public/
  images/         # 게임 자산
```
