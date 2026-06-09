# 폴리볼 통합 명세 — 빠따 디펜스

폴리볼 본 앱에서 iframe으로 임베드. 게임 ↔ 부모 통신은 `postMessage`, prefix `DEF:`.
이 문서를 기준으로 폴리볼 개발팀이 부모측 메시지 핸들러 + 서버 응모권 API를 구현한다.

## 1. 임베드 방법

```html
<iframe
  src="https://polyball-bat-defense.vercel.app/"
  width="100%"
  height="100%"
  allow="autoplay; vibrate; clipboard-read; clipboard-write"
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="no-referrer"
></iframe>
```

- 게임은 9:19.5 폰 비율로 자체 letterbox 처리. 부모는 컨테이너만 제공.
- `sandbox`는 `allow-scripts allow-same-origin` 둘 다 필요 (Phaser WebGL + localStorage).

## 2. 메시지 프로토콜

모든 메시지는 `{ type: 'DEF:...', ...payload }` 형태. 직렬화 가능한 평탄 객체.

### 2-1. 게임 → 부모 (outbound)

| `type` | payload | 의미 |
|---|---|---|
| `DEF:READY` | — | 게임 마운트 완료. 부모는 `DEF:SET_PLAYER`로 응답. |
| `DEF:PLAY_AD_REWARDED` | `{ reason: 'ticket_2nd' \| 'ticket_3rd' }` | 보상형 광고 시청 요청. 부모는 `DEF:AD_REWARDED_COMPLETED` 또는 `DEF:AD_REWARDED_FAILED`로 응답. |
| `DEF:CLAIM_TICKET` | `{ source: 'boss_kill', adWatched: boolean, stage?: number }` | 응모권 적립 요청. 서버 권위 검증 후 `DEF:TICKET_GRANTED` 또는 `DEF:TICKET_REJECTED`로 응답. |
| `DEF:SCORE_UPDATE` | `{ total_score: number }` | (선택) 누적 점수 갱신 전달. 서버 저장 또는 무시. |

### 2-2. 부모 → 게임 (inbound)

| `type` | payload | 의미 |
|---|---|---|
| `DEF:SET_PLAYER` | `{ player: { nickname, team?, user_id? }, total_score?: number }` | 플레이어 정보 + 누적 점수 inject. `READY` 직후 1회 + 닉/팀 변경 시. |
| `DEF:AD_REWARDED_COMPLETED` | `{ reason: string }` | 광고 시청 완료. 게임은 즉시 `CLAIM_TICKET(adWatched: true)`로 후속 요청. |
| `DEF:AD_REWARDED_FAILED` | `{ reason: string, cause?: string }` | 광고 실패. 게임은 토스트로 안내. |
| `DEF:TICKET_GRANTED` | `{ count: number, source?: string }` | 응모권 적립 성공. `count`는 오늘 누적 (1~3). |
| `DEF:TICKET_REJECTED` | `{ reason: 'cap_reached' \| string }` | 응모권 적립 거부. cap 도달 또는 검증 실패. |

## 3. 일일 응모권 정책

- **하루 최대 3장.** 자정 (KST 00:00) 자동 리셋.
- **1번째**: 보스 처치 → 무료. `CLAIM_TICKET (adWatched: false)`.
- **2~3번째**: 보스 처치 → 광고 시청 후. `PLAY_AD_REWARDED` → 완료 콜백 → `CLAIM_TICKET (adWatched: true)`.
- **4장 이상**: `TICKET_REJECTED { reason: 'cap_reached' }` 응답. 게임은 토스트 안내.
- **서버 권위**: 게임이 보내는 `count`/`adWatched`는 신뢰 X. 서버는 `user_id + date` 키로 직접 검증.

## 4. 표준 시나리오 (E2E)

### 4-1. 게임 진입

```
[iframe load]
game  → parent: DEF:READY
parent → game:  DEF:SET_PLAYER { player: {nickname, team, user_id}, total_score }
```

### 4-2. 첫 응모권 (무료)

```
[유저가 stage 10 보스 처치]
game  → parent: DEF:CLAIM_TICKET { source: 'boss_kill', adWatched: false, stage: 10 }
parent → server: POST /api/games/def/claim { adWatched: false }
server → parent: { count: 1 }
parent → game:  DEF:TICKET_GRANTED { count: 1, source: 'boss_kill' }
[게임 토스트: "응모권 +1 (1/3)"]
```

### 4-3. 2번째 응모권 (광고)

```
[stage 20 보스 처치]
game  → parent: DEF:PLAY_AD_REWARDED { reason: 'ticket_2nd' }
parent → ad SDK: 보상형 광고 노출
[유저 광고 시청 완료]
parent → game:  DEF:AD_REWARDED_COMPLETED { reason: 'ticket_2nd' }
game  → parent: DEF:CLAIM_TICKET { source: 'boss_kill', adWatched: true }
parent → server: POST /api/games/def/claim { adWatched: true }
server → parent: { count: 2 }
parent → game:  DEF:TICKET_GRANTED { count: 2 }
```

### 4-4. cap 도달 후 보스 처치

```
[stage 40 보스 처치, 이미 3/3]
game  → parent: DEF:CLAIM_TICKET { ... }
parent → server: claim → cap_reached
parent → game:  DEF:TICKET_REJECTED { reason: 'cap_reached' }
[게임 토스트: "오늘 응모권 cap 도달 (3/3)"]
```

## 5. 서버 API (폴리볼 백엔드 - 권장)

### POST `/api/games/def/claim`

요청 (parent → server):
```json
{
  "user_id": "...",
  "source": "boss_kill",
  "adWatched": true,
  "stage": 20,
  "game_id": "DEF"
}
```

응답 200 (성공):
```json
{ "count": 2, "remaining": 1 }
```

응답 409 (cap 도달):
```json
{ "error": "cap_reached", "count": 3 }
```

### DB 스키마 (예시)

```sql
CREATE TABLE polyball_minigame_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,        -- 'DEF', 'BBADA', 'FISH' 등
  ticket_date DATE NOT NULL,    -- KST 기준 일자
  source TEXT NOT NULL,         -- 'boss_kill' 등
  ad_watched BOOLEAN NOT NULL,
  stage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ux_def_user_date_idx ON polyball_minigame_tickets (user_id, game_id, ticket_date, id);
CREATE INDEX ix_def_user_date ON polyball_minigame_tickets (user_id, game_id, ticket_date);
```

검증 SQL (예시):
```sql
SELECT COUNT(*) FROM polyball_minigame_tickets
 WHERE user_id = $1 AND game_id = 'DEF' AND ticket_date = CURRENT_DATE;
-- result < 3 일 때 INSERT 허용
```

## 6. 보안 / 검증

- `postMessage`의 `event.origin`을 **반드시 부모쪽에서 화이트리스트 검증**. 게임 도메인 (`polyball-bat-defense.vercel.app` 등) 외 무시.
- `adWatched` 플래그는 게임이 거짓말 가능. 서버는 광고 SDK의 콜백 토큰을 같이 받아 검증할 것.
- `source: 'boss_kill'` 외 값은 서버에서 거부 권장 (확장 시 화이트리스트 추가).

## 7. 광고 정책 (필수)

- **Rewarded 전용**. 인터스티셜/자동 광고 금지 (게임 몰입 방해 — 사용자 거부감 큼).
- 광고 노출 빈도: 일 최대 2회 (응모권 2번째/3번째 요청 시점에만).
- 광고 실패 시 응모권 청구 절차 중단. 게임 측 토스트 안내만.

## 8. 변경 이력 / 호환성

- `DEF:` prefix는 게임 식별자. 다른 미니게임 (BBADA, FISH 등)과 충돌 없음.
- 이 문서는 게임 코드 `src/lib/messageBridge.ts`와 동기화. 변경 시 양쪽 PR 같이.

## 9. 데모 / 검증 URL

- **Live**: https://polyball-bat-defense.vercel.app
- **Repo**: https://github.com/JHS-HECTO/polyball-bat-defense
- **devMockParent**: 게임을 단독 (parent === self) 로드 시 자동 활성. 부모 메시지 시뮬레이션으로 전체 흐름 검증 가능. localStorage 상태는 콘솔 `__defMockReset()` 으로 초기화.
