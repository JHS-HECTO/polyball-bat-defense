# 빠따 디펜스 — Gemini Imagen 자산 프롬프트 시트

이 문서는 모든 게임 자산을 Gemini Imagen으로 생성하기 위한 프롬프트 모음.
각 자산은 코드블록 1개 = 한 번 복붙 = 1장 PNG 생성. 결과 PNG를 `public/images/`에 지정된 파일명으로 저장.

## 공통 톤 가이드 (모든 프롬프트에 자동 적용 - 한 번만 보고 익히기)

- **3D rendered Nintendo Switch game screenshot in Animal Crossing: New Horizons visual style**
- PBR matte plastic/clay material, low-poly with smoothed edges, vinyl figure quality
- Soft Pixar-like ambient lighting, warm golden hour
- **Avoid**: 2D illustration, flat vector, anime, line art, glossy, neon, sharp shadows, hard outlines, cel-shading lines, pixel art, photo realism

## 누끼 / 후처리

1. 모든 PNG는 `scripts/remove-bg.py` (rembg + U2Net) 실행 후 저장. 단, **풀스크린 배경 (`bg-*.png`)은 SKIP**.
2. Gemini 우하단 워터마크는 `scripts/dewatermark.py` (PIL mirror inpaint) 실행.
3. 최종 PNG는 `public/images/{prefix}_{slug}.png` 경로 저장 — Phaser preload 키와 일치.

---

## 1. 배경 / 환경

### 01_bg_grass_field.png — 풀밭 배경 타일

```
A top-down 3D rendered seamless tileable grass field texture, 512×512 px, low-poly Animal Crossing: New Horizons style.
Warm sunny green grass with small wildflowers (white, yellow). Subtle clay-shaded terrain bumps. No path, no objects, no border.
PBR matte material, soft Pixar lighting, warm golden hour. Seamless edges for tiling.
```

### 02_bg_path_dirt.png — 흙길 타일

```
A top-down 3D rendered seamless tileable dirt path texture, 512×512 px, low-poly Animal Crossing: New Horizons style.
Warm sandy brown earth with pebbles and grass tufts on the edges. Soft Pixar lighting. PBR matte material. Seamless tile.
```

### 03_bg_lane_decor_left.png — 출발 게이트 데코

```
A 3D rendered cartoon dungeon portal entry, low-poly Animal Crossing style, vertical orientation, transparent background.
Rounded stone arch with glowing purple mist seeping out. Cute, friendly vibe. 256×384 px. PBR matte clay.
```

### 04_bg_lane_decor_right.png — 도착 게이트 데코

```
A 3D rendered cartoon wooden castle gate, low-poly Animal Crossing style, vertical orientation, transparent background.
Rounded wooden double-door with iron studs and a red banner above. Friendly cartoon. 256×384 px. PBR matte clay.
```

---

## 2. 캐릭터 (플레이어)

### 10_char_baseball_idle.png — 캐릭터 베이스 (빠따 들고 대기)

```
A 3D rendered cute cartoon baseball player character, front 3/4 view, low-poly Animal Crossing: New Horizons style, transparent background.
Wearing a red baseball cap with curved brim, blue baseball jersey with white number on chest, simple short pants. Holding a wooden baseball bat resting on right shoulder. Friendly smiling face, small eyes, no mouth detail. Vinyl figure quality. 384×512 px.
PBR matte plastic, soft Pixar lighting. NO outline, NO 2D, NO line art, NO pixel art.
```

### 11_char_baseball_swing_a.png — 스윙 모션 프레임 A

```
Same character as 10_char_baseball_idle, identical proportions and outfit. Mid-swing pose, bat horizontal, arms extended forward. Side 3/4 view. Transparent background. 384×512 px. Same Animal Crossing 3D rendered style.
```

### 12_char_baseball_swing_b.png — 스윙 모션 프레임 B

```
Same character as 10_char_baseball_idle. Follow-through pose: bat raised behind right shoulder, body rotated. Transparent background. 384×512 px. Same style.
```

---

## 3. 빠따 5종 (티어별 진화)

### 20_bat_t1_wood.png — 티어 1: 나무 빠따

```
A 3D rendered cartoon wooden baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Simple light brown wood with grain detail. Plain, beginner equipment. PBR matte. Soft Pixar lighting.
```

### 21_bat_t2_aluminum.png — 티어 2: 알루미늄

```
A 3D rendered cartoon aluminum baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Silver metallic finish with red rubber grip. Slightly thicker than wood. PBR matte clay metal. Soft lighting.
```

### 22_bat_t3_gold.png — 티어 3: 골드 빠따

```
A 3D rendered cartoon golden baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Polished gold body with engraved patterns. Black leather grip. Slight warm glow. PBR matte clay.
```

### 23_bat_t4_mythril.png — 티어 4: 미스릴 (마법)

```
A 3D rendered cartoon enchanted baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Cyan-silver metallic body with glowing blue runes etched along the length. Wrapped leather grip. Soft cyan magical aura. PBR matte clay.
```

### 24_bat_t5_dragon.png — 티어 5: 드래곤본 (최종)

```
A 3D rendered cartoon legendary baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Crimson dragon bone with spikes along the length, golden trim, glowing red gem at the head. Black grip wrapped in gold thread. Subtle red glow aura. PBR matte clay.
```

---

## 4. 일반 몹 5종

### 30_mob_slime.png — 슬라임

```
A 3D rendered cute cartoon slime monster, low-poly Animal Crossing: New Horizons style, transparent background, 256×256 px.
Round translucent green blob shape, two large friendly eyes, no mouth. Sitting pose, slight squish. PBR matte. Soft Pixar lighting.
```

### 31_mob_bat.png — 박쥐

```
A 3D rendered cute cartoon bat monster, low-poly Animal Crossing style, transparent background, 256×256 px.
Small purple bat with rounded wings spread, friendly large eyes, tiny fangs. Front view, hovering pose. PBR matte clay. Soft lighting.
```

### 32_mob_skull.png — 해골

```
A 3D rendered cute cartoon skeleton head monster, low-poly Animal Crossing style, transparent background, 256×256 px.
Friendly off-white skull with rounded jaw, large dark eye sockets, tiny teeth showing. Floating pose. PBR matte clay.
```

### 33_mob_orc.png — 오크

```
A 3D rendered cute cartoon orc monster, low-poly Animal Crossing style, transparent background, 256×256 px.
Green-skinned chubby orc with tiny tusks, wearing brown leather wrap. Friendly menacing expression. Standing pose. PBR matte clay.
```

### 34_mob_ghost.png — 유령

```
A 3D rendered cute cartoon ghost monster, low-poly Animal Crossing style, transparent background, 256×256 px.
Soft pale blue translucent ghost shape, two large friendly eyes, small open mouth. Floating pose with wavy bottom. PBR matte clay (with slight translucency).
```

---

## 5. 보스 몹 5종 (스테이지 10/20/30/40/50)

### 40_boss_lava_drake.png — 보스 1 (Stage 10): 용암 드레이크

```
A 3D rendered cute cartoon mini dragon boss, low-poly Animal Crossing: New Horizons style, transparent background, 512×512 px.
Crimson red dragon with rounded body, small folded wings, two curved horns, glowing yellow eyes, tiny fangs. Sitting pose breathing small flame. Friendly menacing. PBR matte clay. Soft warm lighting.
```

### 41_boss_frost_yeti.png — 보스 2 (Stage 20): 얼음 예티

```
A 3D rendered cute cartoon yeti boss, low-poly Animal Crossing style, transparent background, 512×512 px.
Big fluffy snow-white yeti with rounded belly, blue ice crystal on forehead, friendly fierce face, large hands with ice tipped claws. Standing pose. PBR matte clay. Cool soft lighting.
```

### 42_boss_dark_knight.png — 보스 3 (Stage 30): 흑기사

```
A 3D rendered cute cartoon armored knight boss, low-poly Animal Crossing style, transparent background, 512×512 px.
Chubby black-armored knight with glowing red eye slit, holding a giant cartoon sword. Round helm with red feather plume. Heroic friendly menacing pose. PBR matte clay metal.
```

### 43_boss_kraken.png — 보스 4 (Stage 40): 크라켄

```
A 3D rendered cute cartoon octopus kraken boss, low-poly Animal Crossing style, transparent background, 512×512 px.
Deep purple-blue kraken with rounded body, eight curling tentacles, large yellow friendly menacing eyes, small fangs. Pose with tentacles spread. PBR matte clay.
```

### 44_boss_demon_lord.png — 보스 5 (Stage 50): 마왕

```
A 3D rendered cute cartoon mini demon lord boss, low-poly Animal Crossing style, transparent background, 512×512 px.
Round chibi demon with two curved horns, glowing red eyes, tiny bat wings on back, holding a small flaming trident. Black and crimson outfit. Friendly evil expression. PBR matte clay.
```

---

## 6. UI 아이콘

### 50_ui_ticket.png — 응모권 아이콘

```
A 3D rendered cute cartoon raffle ticket icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Yellow paper ticket with curved torn edge, large numeral "1" on it, small star on the corner. PBR matte clay paper.
```

### 51_ui_gold.png — 골드 코인 아이콘

```
A 3D rendered cute cartoon gold coin icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Shiny gold coin with bat-and-ball insignia embossed on the front. Slight warm glow. PBR matte clay metal.
```

### 52_ui_hp_heart.png — HP 하트 아이콘

```
A 3D rendered cute cartoon heart icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Soft red 3D heart with slight gloss highlight. Friendly, rounded shape. PBR matte clay.
```

---

## 7. 이펙트 (선택, 없으면 프로시저럴 유지)

### 60_fx_swing_arc.png — 스윙 잔상

```
A 3D rendered curved motion blur arc, low-poly Animal Crossing style, transparent background, 512×256 px.
Soft white-to-yellow gradient crescent shape, slight transparency at edges. PBR matte. Suggesting fast swing motion.
```

### 61_fx_hit_spark.png — 타격 스파크

```
A 3D rendered cartoon impact burst effect, low-poly Animal Crossing style, transparent background, 256×256 px.
Yellow and white star-shaped burst with small radiating lines. Cute, friendly impact. PBR matte clay.
```

---

## Phaser 텍스처 키 매핑

생성한 PNG를 `public/images/` 저장 후 `src/game/scenes/PreloadScene.ts`의 `preload()`에서 로드:

```ts
this.load.image('tile-grass', 'images/01_bg_grass_field.png');
this.load.image('tile-path', 'images/02_bg_path_dirt.png');
this.load.image('char-idle', 'images/10_char_baseball_idle.png');
this.load.image('char-swing-a', 'images/11_char_baseball_swing_a.png');
this.load.image('char-swing-b', 'images/12_char_baseball_swing_b.png');
this.load.image('bat-t1', 'images/20_bat_t1_wood.png');
// ... (티어별)
this.load.image('mob-slime', 'images/30_mob_slime.png');
this.load.image('mob-bat', 'images/31_mob_bat.png');
this.load.image('mob-skull', 'images/32_mob_skull.png');
this.load.image('mob-orc', 'images/33_mob_orc.png');
this.load.image('mob-ghost', 'images/34_mob_ghost.png');
this.load.image('boss-1', 'images/40_boss_lava_drake.png');
// ... (보스별)
```

Phaser entity 클래스 (`Mob.ts`, `Character.ts`)는 `this.add.image(0, 0, 'key')`로 절차적 그래픽 대체.
교체 PR은 코드 변경 최소화 — 키 동일 유지.

---

## 작업 순서 제안

1. 1번 (배경) 2장 먼저 → 가장 큰 시각 충격 + 톤 검증
2. 캐릭터 (10) → 톤 확정 후 빠따 5종 (20~24)
3. 일반 몹 5종 (30~34) → 게임 풍부도
4. 보스 5종 (40~44) → 진행 보상감
5. UI 아이콘 (50~52) → 마무리 디테일
6. 이펙트 (60~61) → 선택, 시간 남으면

## 일일 cap & 광고 정책 재확인

- 응모권 자동 트리거: 보스 처치 시
- 1번째: CLAIM_TICKET (adWatched: false) — 무료
- 2~3번째: PLAY_AD_REWARDED → AD_REWARDED_COMPLETED → CLAIM_TICKET (adWatched: true)
- 4번째 이상: TICKET_REJECTED { reason: 'cap_reached' } 토스트
- 자정 자동 리셋 — 게임 측 `useDailyResetSync` 훅이 1분 폴링 + visibilitychange + focus
- 서버 권위: 실 폴리볼 백엔드가 `INTEGRATION.md` 명세대로 인서트
