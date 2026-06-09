# 빠따 디펜스 (polyball-bat-defense)

폴리볼 미니게임 — 몰려오는 몹을 빠따로 자동 처치하는 타워디펜스.
Phaser 3 + Next.js 16 iframe. **prefix: `DEF:`**

- **Live**: https://polyball-bat-defense.vercel.app
- **Repo**: https://github.com/JHS-HECTO/polyball-bat-defense
- **QA 갤러리**: https://polyball-bat-defense.vercel.app/qa
- **통합 명세**: [`INTEGRATION.md`](./INTEGRATION.md) — 폴리볼 본 앱 개발자용
- **서버 한페이지 요약**: [`server-spec.html`](./server-spec.html) — 백엔드 개발자용
- **자산 프롬프트 시트**: [`Gemini_프롬프트_DEF_전체.md`](./Gemini_프롬프트_DEF_전체.md)

## 정책 요약

- **메커닉**: 캐릭이 근접 AOE 자동 스윙. 몹이 사거리에 들어오면 자동 타격.
- **진화 (세션 내 누적)**: 몹 처치 → 골드 → 4종 업그레이드
  - 데미지 (+50%/티어)
  - 공속 (-18% 쿨다운/티어)
  - 사거리 (+18%/티어)
  - 빠따 교체 (×1.6 데미지/티어, 5단계 시각 진화)
- **세션 종료**: 몹이 끝까지 도달하면 라이프 -1. 라이프 0 → 게임 오버.
- **보스**: 10스테이지마다 1마리. 처치 시 응모권 1장 청구.
- **일일 응모권**: 하루 3장 cap (1장 무료, 2~3장 광고). 서버 권위.
- **광고**: Rewarded 전용. 인터스티셜/자동 광고 없음.

## 기술 스택

- Next.js 16.2 (App Router) + React 19.2 + React Compiler
- TypeScript strict++ (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Phaser 3.90** — 게임 캔버스 (Arcade Physics, Tweens, Graphics API)
- Zustand 5 (persist) — 플레이어/일일 상태
- framer-motion — UI 토스트 애니메이션
- gsap, lottie-react — 설치만 (필요시 확장)
- SCSS Modules + CSS 변수 (Tailwind 없음)
- pnpm 11 / Node 20+

## 개발

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build && pnpm start
pnpm test             # vitest
```

부모 폴리볼 앱 없이 단독 실행 가능. `devMockParent` 자동 활성화 (`window.parent === window` 감지).
콘솔에서 `__defMockReset()` 호출로 일일 cap 시뮬 상태 초기화.

## 디렉터리

```
src/
  app/
    layout.tsx                 # 루트
    page.tsx                   # 게임 메인 (/)
    qa/page.tsx                # QA 갤러리 (/qa)
  components/
    AppShell.tsx               # 전체 래퍼 (브리지 훅 + 캔버스 + UI)
    PhaserCanvas.tsx           # Phaser 캔버스 dynamic import (ssr:false)
    Hud.tsx                    # 닉/팀/티켓 cap/스테이지/점수/HP/골드
    UpgradePanel.tsx           # 4 업그레이드 버튼
    GameOverModal.tsx          # 게임 오버 + 재시작
    ToastStack.tsx             # framer-motion 토스트
    QaGallery.tsx              # /qa 페이지 본체
  game/
    config.ts                  # 캔버스/팔레트/스탯/스테이지/점수 상수
    createGame.ts              # Phaser.Game 인스턴스 생성
    gameBus.ts                 # React ↔ Phaser 이벤트 버스 (SSR-safe)
    state.ts                   # 업그레이드/스테이지/HP 계산 헬퍼
    scenes/
      BootScene.ts
      PreloadScene.ts          # 프로시저럴 텍스처 생성
      MainScene.ts             # 게임 루프 + 스폰 + 공격 + 점수
    entities/
      Character.ts             # 플레이어 (자동 스윙)
      Mob.ts                   # 몹 5변형 + 보스
  lib/
    messageBridge.ts           # DEF: postMessage 타입 + send/subscribe
    devMockParent.ts           # 부모 미장착 시뮬레이션
    usePlayer.ts               # zustand: 닉/팀/누적점수
    useDaily.ts                # zustand persist: 일일 응모권
    useDailyResetSync.ts       # 자정 자동 리셋 (1분 폴링 + visibilitychange + focus)
    usePolyballBridge.ts       # mount 시 핸드셰이크 + dispatch
    useBossReward.ts           # 보스 처치 → 응모권 청구 흐름 오케스트레이션
    useGameState.ts            # Phaser 상태 React 구독
    useToastBus.ts             # 토스트 큐
    GameStateContext.tsx       # /qa용 상태 오버라이드
    routes.ts                  # 경로 상수
public/
  images/                      # 게임 자산 (Gemini 생성 PNG 드롭 위치)
```

## 컴포넌트 구조 / 데이터 흐름

```
[Phaser MainScene] -- emit 'state' / 'bossKilled' / 'toast' --> [gameBus] --> [React Hud / UpgradePanel / ToastStack]
[React UpgradePanel] -- emit 'upgradeRequest' --> [gameBus] --> [Phaser MainScene]
[React useBossReward] -- sendToParent CLAIM_TICKET --> [parent / devMockParent]
[parent] -- TICKET_GRANTED postMessage --> [React useDaily store] --> [Hud cap 표시]
```

## 단계별 시행착오 (다음 게임에서 피하기)

이 게임에서 검증된 패턴:
- ✅ `gameBus`는 Phaser 의존성 제거하고 자체 EventEmitter — Next.js SSR 충돌 회피
- ✅ `gameBus`의 'state' 이벤트는 마지막 값 캐싱 → 신규 구독자 즉시 hydrate (race 회피)
- ✅ PhaserCanvas는 `next/dynamic` + `ssr:false`로 dynamic import
- ✅ React Compiler 활성. 수동 useMemo/useCallback 최소화
- ✅ `appFrame`은 `aspect-ratio: 9 / 19.5` + `contain: layout paint style` + `transform: translateZ(0)`. Container queries 안 씀.
- ✅ Phaser `Scale.FIT` + 논리좌표 540×1170 — 어느 화면이든 비율 유지

## 인계 체크리스트

- [x] 폴리볼 frame (48rem 컬럼, 9:19.5 비율)
- [x] DEF: postMessage 브리지 + devMockParent
- [x] 일일 응모권 cap 3 표준 로직 + 자정 자동 리셋
- [x] Phaser 게임 (자동 스윙, wave, 보스, 업그레이드 4종, HP/골드/스코어)
- [x] React HUD + 업그레이드 패널 + 게임오버 + 토스트
- [x] /qa 갤러리
- [x] Gemini 프롬프트 시트 (자산 교체 가이드)
- [x] INTEGRATION.md + server-spec.html
- [x] GitHub repo + Vercel 자동 배포
- [ ] Gemini로 자산 생성 후 PNG 드롭 (`public/images/`) — 사용자 작업 (Phase B)
- [ ] 폴리볼 본 앱에 iframe 임베드 + parent 메시지 핸들러 구현 — 폴리볼 개발팀
- [ ] 서버 `/api/games/def/claim` 구현 + DB 마이그레이션 — 백엔드 개발자
