# 빠따 디펜스 — Gemini Imagen 자산 프롬프트 시트

모든 게임 자산을 Gemini Imagen으로 생성. 각 코드블록 = 1장 PNG.
생성한 PNG는 `public/images/` 경로에 지정 파일명으로 저장 → Phaser preload 키 자동 매칭.

## ⚠️ 사이즈 규격 (필수)

| 카테고리              | 원본 PNG 사이즈 | 종횡비   | Phaser displaySize | 비고                |
| ---------------------- | ---------------- | -------- | -------------------- | --------------------- |
| 배경 타일 (seamless)   | **1024×1024**   | 1:1      | 64×64 tile           | 무한 타일링. 끊김 X |
| 풀스크린 배경 (옵션)   | **1080×2340**   | 9:19.5   | full frame           | 누끼 처리 SKIP        |
| 캐릭터 (idle)          | **512×512**     | 1:1      | 44×44 unit              | 정사각 캔버스 중앙   |
| 캐릭터 스윙 프레임    | **512×512**     | 1:1      | 44×44 unit              | idle과 동일 사이즈  |
| 빠따 / 무기 (idle)    | **256×256**     | 1:1      | 28×28 weapon          | 작은 아이콘          |
| 일반 몹                | **384×384**     | 1:1      | 42×42 mob               | 정사각                |
| 보스                  | **640×640**     | 1:1      | 80×80 boss              | 큰 정사각            |
| UI 아이콘 (티켓/골드) | **128×128**     | 1:1      | 18×18 hud icon        | 작은 픽토그램        |
| 알 (egg)              | **256×320**     | 4:5      | 48×60 egg               | 세로 약간 김         |
| 성채 (castle)          | **384×384**     | 1:1      | 72×72                   | 정사각                |
| 깃발 (flag)           | **192×256**     | 3:4      | 38×50                   | 세로 살짝 김         |
| 이펙트 잔상          | **512×256**     | 2:1      | 80×40 fx              | 가로형 호 모션      |
| 타격 스파크            | **256×256**     | 1:1      | 64×64 fx              | 정사각 burst         |

**Imagen 호출 시 사이즈 지정 방법** (Gemini 사용 시):
- Gemini Imagen 4: `imageSize: "1024x1024"` 또는 `"768x1408"` 등 지원 사이즈
- 위 표가 Imagen 지원 사이즈에 없을 때 → 가장 가까운 사이즈로 생성 후 후처리 리사이즈
- 또는 모두 1024×1024 정사각으로 생성 → 자르고 리사이즈

**모든 PNG 후처리**:
1. 누끼 (`scripts/remove-bg.py`, rembg + U2Net). 단 풀스크린 배경 `bg-*` 는 SKIP.
2. 워터마크 제거 (`scripts/dewatermark.py`, PIL mirror inpaint).
3. 위 사이즈 표로 다운스케일 (`sharp` 또는 ImageMagick).
4. `public/images/{prefix}_{slug}.png` 저장 — Phaser preload 키와 일치.

---

## 공통 톤 가이드 (한 번만 보고 익히기)

모든 프롬프트에 자동 적용:
- **3D rendered Nintendo Switch game screenshot in Animal Crossing: New Horizons visual style**
- PBR matte plastic/clay material, low-poly with smoothed edges, vinyl figure quality
- Soft Pixar-like ambient lighting, warm golden hour
- **Avoid**: 2D illustration, flat vector, anime, line art, glossy, neon, sharp shadows, hard outlines, cel-shading lines, pixel art, photo realism

---

## 1. 배경 / 환경 (1024×1024 seamless tile)

### 01_bg_grass_field.png — 풀밭 타일

`Size: 1024×1024 px. Seamless tileable.`

```
A top-down 3D rendered seamless tileable grass field texture, 1024×1024 px, low-poly Animal Crossing: New Horizons style.
Warm sunny green grass with small wildflowers (white, yellow). Subtle clay-shaded terrain bumps. No path, no objects, no border.
PBR matte material, soft Pixar lighting, warm golden hour. Seamless edges for tiling.
```

### 02_bg_path_dirt.png — 흙길 타일

`Size: 1024×1024 px. Seamless tileable.`

```
A top-down 3D rendered seamless tileable dirt path texture, 1024×1024 px, low-poly Animal Crossing: New Horizons style.
Warm sandy brown earth with pebbles and grass tufts on the edges. Soft Pixar lighting. PBR matte material. Seamless tile.
```

---

## 2. 캐릭터 (플레이어 유닛)

각 캐릭터는 `512×512 px` 정사각, 캐릭터가 중앙에 위치, 머리부터 발끝까지 전부 보임, 투명 배경.

### 10_char_baseball_idle.png — 빠따 캐릭터 (idle)

`Size: 512×512 px. Centered character. Transparent background.`

```
A 3D rendered cute cartoon baseball player character, front 3/4 view, low-poly Animal Crossing: New Horizons style, transparent background.
Wearing a red baseball cap with curved brim, blue baseball jersey with white number on chest, simple short pants. Holding a wooden baseball bat resting on right shoulder. Friendly smiling face, small eyes, no mouth detail. Vinyl figure quality.
Image size 512×512 px. Character centered, occupying ~80% of frame, head at top, feet at bottom.
PBR matte plastic, soft Pixar lighting. NO outline, NO 2D, NO line art, NO pixel art.
```

### 11_char_baseball_swing_a.png — 스윙 프레임 A

`Size: 512×512 px. Same character/style as 10. Mid-swing pose.`

```
Same character as 10_char_baseball_idle, identical proportions and outfit. Mid-swing pose, bat horizontal, arms extended forward. Side 3/4 view. Transparent background. 512×512 px. Same Animal Crossing 3D rendered style.
```

### 12_char_baseball_swing_b.png — 스윙 프레임 B

`Size: 512×512 px.`

```
Same character as 10_char_baseball_idle. Follow-through pose: bat raised behind right shoulder, body rotated. Transparent background. 512×512 px. Same style.
```

### 13_char_archer.png — 활 캐릭터 (ranged)

`Size: 512×512 px. Transparent.`

```
A 3D rendered cute cartoon archer character, low-poly Animal Crossing: New Horizons style, transparent background, 512×512 px.
Wearing a green tunic with brown belt, dark green feather cap (Robin Hood style), soft brown pants. Holding a wooden longbow drawn back with an arrow. Front 3/4 view, smiling friendly face. PBR matte clay. Centered, occupying ~80% of frame.
```

### 14_char_mage.png — 마법사 (magic)

`Size: 512×512 px. Transparent.`

```
A 3D rendered cute cartoon young mage character, low-poly Animal Crossing: New Horizons style, transparent background, 512×512 px.
Wearing a purple wizard robe with golden trim, tall pointed wizard hat with a yellow star. Holding a wooden staff with a glowing blue crystal orb on top. Front 3/4 view, friendly face. PBR matte clay. Centered.
```

### 15_char_bomber.png — 폭탄병 (bomb)

`Size: 512×512 px. Transparent.`

```
A 3D rendered cute cartoon ninja-like bomber character, low-poly Animal Crossing: New Horizons style, transparent background, 512×512 px.
Wearing a black ninja headband and dark red outfit. Holding a round black bomb with a lit fuse (small ember at the tip). Front 3/4 view, focused friendly expression. PBR matte clay. Centered.
```

---

## 3. 빠따 5종 (티어별 진화)

`Size: 256×256 px. Transparent background. Single weapon centered.`

### 20_bat_t1_wood.png — 나무

```
A 3D rendered cartoon wooden baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Simple light brown wood with grain detail. Plain, beginner equipment. PBR matte. Soft Pixar lighting. Bat angled at 45 degrees, centered in frame.
```

### 21_bat_t2_aluminum.png — 알루미늄

```
A 3D rendered cartoon aluminum baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Silver metallic finish with red rubber grip. Slightly thicker than wood. PBR matte clay metal. Soft lighting. Centered, 45 deg angle.
```

### 22_bat_t3_gold.png — 골드

```
A 3D rendered cartoon golden baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Polished gold body with engraved patterns. Black leather grip. Slight warm glow. PBR matte clay. Centered, 45 deg.
```

### 23_bat_t4_mythril.png — 미스릴 (마법)

```
A 3D rendered cartoon enchanted baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Cyan-silver metallic body with glowing blue runes etched along the length. Wrapped leather grip. Soft cyan magical aura. PBR matte clay. Centered, 45 deg.
```

### 24_bat_t5_dragon.png — 드래곤본

```
A 3D rendered cartoon legendary baseball bat icon, low-poly Animal Crossing style, transparent background, 256×256 px.
Crimson dragon bone with spikes along the length, golden trim, glowing red gem at the head. Black grip wrapped in gold thread. Subtle red glow aura. PBR matte clay. Centered, 45 deg.
```

---

## 4. 일반 몹 5종

`Size: 384×384 px. Transparent background. Single monster centered.`

### 30_mob_slime.png

```
A 3D rendered cute cartoon slime monster, low-poly Animal Crossing: New Horizons style, transparent background, 384×384 px.
Round translucent green blob shape, two large friendly eyes, no mouth. Sitting pose, slight squish. PBR matte. Soft Pixar lighting. Centered, ~70% of frame.
```

### 31_mob_bat.png

```
A 3D rendered cute cartoon bat monster, low-poly Animal Crossing style, transparent background, 384×384 px.
Small purple bat with rounded wings spread, friendly large eyes, tiny fangs. Front view, hovering pose. PBR matte clay. Centered.
```

### 32_mob_skull.png

```
A 3D rendered cute cartoon skeleton head monster, low-poly Animal Crossing style, transparent background, 384×384 px.
Friendly off-white skull with rounded jaw, large dark eye sockets, tiny teeth showing. Floating pose. PBR matte clay. Centered.
```

### 33_mob_orc.png

```
A 3D rendered cute cartoon orc monster, low-poly Animal Crossing style, transparent background, 384×384 px.
Green-skinned chubby orc with tiny tusks, wearing brown leather wrap. Friendly menacing expression. Standing pose. PBR matte clay. Centered.
```

### 34_mob_ghost.png

```
A 3D rendered cute cartoon ghost monster, low-poly Animal Crossing style, transparent background, 384×384 px.
Soft pale blue translucent ghost shape, two large friendly eyes, small open mouth. Floating pose with wavy bottom. PBR matte clay (slight translucency). Centered.
```

---

## 5. 보스 5종 (10스테이지마다)

`Size: 640×640 px. Transparent background. Boss centered, ~75% of frame.`

### 40_boss_lava_drake.png — Stage 10

```
A 3D rendered cute cartoon mini dragon boss, low-poly Animal Crossing: New Horizons style, transparent background, 640×640 px.
Crimson red dragon with rounded body, small folded wings, two curved horns, glowing yellow eyes, tiny fangs. Sitting pose breathing small flame. Friendly menacing. PBR matte clay. Soft warm lighting. Centered.
```

### 41_boss_frost_yeti.png — Stage 20

```
A 3D rendered cute cartoon yeti boss, low-poly Animal Crossing style, transparent background, 640×640 px.
Big fluffy snow-white yeti with rounded belly, blue ice crystal on forehead, friendly fierce face, large hands with ice tipped claws. Standing pose. PBR matte clay. Cool soft lighting. Centered.
```

### 42_boss_dark_knight.png — Stage 30

```
A 3D rendered cute cartoon armored knight boss, low-poly Animal Crossing style, transparent background, 640×640 px.
Chubby black-armored knight with glowing red eye slit, holding a giant cartoon sword. Round helm with red feather plume. Heroic friendly menacing pose. PBR matte clay metal. Centered.
```

### 43_boss_kraken.png — Stage 40

```
A 3D rendered cute cartoon octopus kraken boss, low-poly Animal Crossing style, transparent background, 640×640 px.
Deep purple-blue kraken with rounded body, eight curling tentacles, large yellow friendly menacing eyes, small fangs. Pose with tentacles spread. PBR matte clay. Centered.
```

### 44_boss_demon_lord.png — Stage 50

```
A 3D rendered cute cartoon mini demon lord boss, low-poly Animal Crossing style, transparent background, 640×640 px.
Round chibi demon with two curved horns, glowing red eyes, tiny bat wings on back, holding a small flaming trident. Black and crimson outfit. Friendly evil expression. PBR matte clay. Centered.
```

---

## 6. 환경 오브젝트 (알/성/깃발)

### 50_egg.png — 알 (디펜드 목표)

`Size: 256×320 px (4:5 세로). Transparent.`

```
A 3D rendered cute cartoon glowing dragon egg, low-poly Animal Crossing: New Horizons style, transparent background, 256×320 px.
Crimson red egg with golden glowing speckles, subtle warm aura around it. Slight inner light. PBR matte clay. Centered, occupying ~75% of frame vertically.
```

### 51_castle.png — 작은 성채

`Size: 384×384 px. Transparent.`

```
A 3D rendered cute cartoon mini fantasy castle, low-poly Animal Crossing style, transparent background, 384×384 px.
Small stone castle with twin towers, red conical roofs, wooden gate, banner on top. Friendly fairytale style. PBR matte clay. Centered.
```

### 52_flag.png — 깃발

`Size: 192×256 px (3:4 세로). Transparent.`

```
A 3D rendered cute cartoon enemy flag, low-poly Animal Crossing style, transparent background, 192×256 px.
Wooden pole with a black flag bearing a small skull mark, slight wave to the cloth. PBR matte clay. Centered.
```

---

## 7. UI 아이콘

`Size: 128×128 px. Transparent. Centered.`

### 60_ui_ticket.png — 응모권

```
A 3D rendered cute cartoon raffle ticket icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Yellow paper ticket with curved torn edge, large numeral "1" on it, small star on the corner. PBR matte clay paper.
```

### 61_ui_gold.png — 골드 코인

```
A 3D rendered cute cartoon gold coin icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Shiny gold coin with bat-and-ball insignia embossed on the front. Slight warm glow. PBR matte clay metal.
```

### 62_ui_hp_heart.png — HP 하트

```
A 3D rendered cute cartoon heart icon, low-poly Animal Crossing style, transparent background, 128×128 px.
Soft red 3D heart with slight gloss highlight. Friendly, rounded shape. PBR matte clay.
```

---

## 8. 이펙트 (선택)

### 70_fx_swing_arc.png — 스윙 잔상

`Size: 512×256 px (2:1 가로). Transparent.`

```
A 3D rendered curved motion blur arc, low-poly Animal Crossing style, transparent background, 512×256 px.
Soft white-to-yellow gradient crescent shape, slight transparency at edges. PBR matte. Suggesting fast swing motion. Centered horizontally.
```

### 71_fx_hit_spark.png — 타격 스파크

`Size: 256×256 px. Transparent.`

```
A 3D rendered cartoon impact burst effect, low-poly Animal Crossing style, transparent background, 256×256 px.
Yellow and white star-shaped burst with small radiating lines. Cute, friendly impact. PBR matte clay. Centered.
```

---

## Phaser 텍스처 키 매핑

생성한 PNG를 `public/images/` 저장 후 `src/game/scenes/BootScene.ts`의 `preload()`에 추가:

```ts
// 배경 (Twemoji 대체)
this.load.image('tile-grass', 'images/01_bg_grass_field.png');
this.load.image('tile-path', 'images/02_bg_path_dirt.png');

// 캐릭터 — 4종 타입별
this.load.image('char-melee', 'images/10_char_baseball_idle.png');
this.load.image('char-ranged', 'images/13_char_archer.png');
this.load.image('char-magic', 'images/14_char_mage.png');
this.load.image('char-bomb', 'images/15_char_bomber.png');

// 빠따 (5 티어)
this.load.image('bat-t1', 'images/20_bat_t1_wood.png');
this.load.image('bat-t2', 'images/21_bat_t2_aluminum.png');
this.load.image('bat-t3', 'images/22_bat_t3_gold.png');
this.load.image('bat-t4', 'images/23_bat_t4_mythril.png');
this.load.image('bat-t5', 'images/24_bat_t5_dragon.png');

// 일반 몹
this.load.image('mob-slime', 'images/30_mob_slime.png');
this.load.image('mob-bat', 'images/31_mob_bat.png');
this.load.image('mob-skull', 'images/32_mob_skull.png');
this.load.image('mob-orc', 'images/33_mob_orc.png');
this.load.image('mob-ghost', 'images/34_mob_ghost.png');

// 보스 (스테이지 10/20/30/40/50)
this.load.image('boss-1', 'images/40_boss_lava_drake.png');
this.load.image('boss-2', 'images/41_boss_frost_yeti.png');
this.load.image('boss-3', 'images/42_boss_dark_knight.png');
this.load.image('boss-4', 'images/43_boss_kraken.png');
this.load.image('boss-5', 'images/44_boss_demon_lord.png');

// 환경
this.load.image('egg', 'images/50_egg.png');
this.load.image('castle', 'images/51_castle.png');
this.load.image('flag', 'images/52_flag.png');

// UI 아이콘
this.load.image('ui-ticket', 'images/60_ui_ticket.png');
this.load.image('ui-gold', 'images/61_ui_gold.png');
this.load.image('ui-hp', 'images/62_ui_hp_heart.png');

// 이펙트
this.load.image('fx-swing', 'images/70_fx_swing_arc.png');
this.load.image('fx-spark', 'images/71_fx_hit_spark.png');
```

Phaser entity (`Mob.ts`, `Unit.ts`) 등에서 `setDisplaySize(w, h)` 호출 시 위 매핑 표의 displaySize 사용.

---

## 작업 순서 제안

1. 배경 2장 (1024×1024) → 가장 큰 시각 충격 + 톤 검증
2. 캐릭터 4종 (512×512) → 톤 확정
3. 빠따 5종 (256×256) → Lv 진화감
4. 일반 몹 5종 (384×384) → 게임 풍부도
5. 보스 5종 (640×640) → 보상감
6. 환경 (알/성/깃발) → 핵심 시각 랜드마크
7. UI 아이콘 3종 (128×128) → 마무리 디테일
8. 이펙트 2종 → 시간 남으면

총 27장. 한 장당 Imagen ~5초 + 후처리 (rembg + resize + watermark) ~15초 = 약 10분.

---

## 빠른 체크리스트

- [ ] 배경 2장 (tile-grass, tile-path)
- [ ] 캐릭터 4종 (melee/ranged/magic/bomb)
- [ ] 빠따 5종 (t1~t5)
- [ ] 일반 몹 5종
- [ ] 보스 5종
- [ ] 환경 3종 (egg/castle/flag)
- [ ] UI 3종 (ticket/gold/hp)
- [ ] 이펙트 2종 (swing arc/hit spark)

모든 PNG `public/images/` 저장 + BootScene.preload 등록 → 자동 교체.
