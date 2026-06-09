// Stable Horde 병렬 일괄 — 모든 자산 동시 제출, 동시 폴링, 완료 즉시 다운로드.
// 익명 큐 공유 BUT 워커는 병렬 → 1장 소요 시간 ≈ 전체 소요 시간.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HORDE = 'https://stablehorde.net/api/v2';
const HEADERS = {
  apikey: '0000000000',
  'Client-Agent': 'polyball-bat-defense:1.0:dev',
  'Content-Type': 'application/json',
};

const STYLE =
  ', 3D rendered Animal Crossing New Horizons style, low-poly vinyl figure, PBR matte clay, soft Pixar lighting, centered, white background, high quality, no text';
const NEG = 'pixel art, anime, line art, sharp shadows, neon, photo realism, multiple characters, text, blurry';

const ASSETS = [
  // 일반 몹
  { name: '30_mob_slime', prompt: 'cute round translucent green slime monster with big friendly eyes, sitting pose', size: 512 },
  { name: '31_mob_bat', prompt: 'cute small purple cartoon bat monster with spread wings, friendly eyes, tiny fangs, hovering', size: 512 },
  { name: '32_mob_skull', prompt: 'cute friendly off-white skeleton skull monster with rounded jaw, big eye sockets, tiny teeth, floating', size: 512 },
  { name: '33_mob_orc', prompt: 'cute chubby green orc monster with tiny tusks, brown leather wrap clothing, standing', size: 512 },
  { name: '34_mob_ghost', prompt: 'cute pale blue translucent ghost monster with big friendly eyes, wavy bottom, floating', size: 512 },
  // 보스
  { name: '40_boss_lava_drake', prompt: 'cute chibi mini red dragon boss with small folded wings, two curved horns, glowing yellow eyes, sitting', size: 512 },
  { name: '41_boss_frost_yeti', prompt: 'cute fluffy snow-white yeti boss with blue ice crystal on forehead, ice-tipped claws, standing', size: 512 },
  { name: '42_boss_dark_knight', prompt: 'cute chubby black-armored knight boss with glowing red eye slit, holding giant cartoon sword, red feather plume', size: 512 },
  // 환경
  { name: '50_egg', prompt: 'cute glowing red dragon egg with golden speckles, subtle warm aura', size: 512 },
  { name: '51_castle', prompt: 'cute mini fantasy stone castle with twin towers, red conical roofs, wooden gate, banner on top', size: 512 },
  { name: '52_flag', prompt: 'small wooden flagpole with black flag bearing white skull mark', size: 512 },
  // UI
  { name: '60_ui_ticket', prompt: 'cute yellow raffle ticket icon with curved torn edge and large numeral 1, small star', size: 512 },
  { name: '61_ui_gold', prompt: 'cute shiny gold coin icon with baseball insignia, warm glow', size: 512 },
  { name: '62_ui_hp', prompt: 'cute soft red 3D heart icon with slight gloss, rounded shape', size: 512 },
  // 빠따 5종
  { name: '20_bat_t1', prompt: 'simple wooden baseball bat at 45 degree angle, light brown wood with grain', size: 512 },
  { name: '21_bat_t2', prompt: 'aluminum baseball bat at 45 degree angle, silver metallic finish with red rubber grip', size: 512 },
  { name: '22_bat_t3', prompt: 'golden baseball bat at 45 degree angle, polished gold body with engraved patterns, black leather grip, warm glow', size: 512 },
  { name: '23_bat_t4', prompt: 'enchanted baseball bat at 45 degree angle, cyan-silver metallic body with glowing blue runes, wrapped leather grip, soft cyan magical aura', size: 512 },
  { name: '24_bat_t5', prompt: 'legendary dragon bone baseball bat at 45 degree angle, crimson with spikes and golden trim, glowing red gem at head, black grip with gold thread, red glow aura', size: 512 },
  // 배경 타일
  { name: '01_bg_grass', prompt: 'top-down seamless tileable grass field texture with small wildflowers, warm sunny green' },
  { name: '02_bg_path', prompt: 'top-down seamless tileable dirt path texture, warm sandy brown with pebbles' },
  // 이펙트
  { name: '70_fx_swing', prompt: 'curved motion blur arc, soft white to yellow gradient crescent, fast swing motion effect' },
];

const submit = async (a) => {
  const body = {
    prompt: `${a.prompt}${STYLE} ### ${NEG}`,
    params: {
      sampler_name: 'k_euler',
      cfg_scale: 7.5,
      width: a.size ?? 512,
      height: a.size ?? 512,
      steps: 25,
      n: 1,
    },
    models: ['stable_diffusion'],
    nsfw: false,
    trusted_workers: false,
    censor_nsfw: true,
  };
  const r = await fetch(`${HORDE}/generate/async`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`submit ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.id;
};

const checkStatus = async (id) => {
  try {
    const r = await fetch(`${HORDE}/generate/status/${id}`, { headers: HEADERS });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
};

const downloadAndSave = async (url, outPath) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const r = await fetch(url);
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).png().toFile(outPath);
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

const main = async () => {
  const outDir = path.join(process.cwd(), 'public', 'images', 'sprites');
  await fs.mkdir(outDir, { recursive: true });

  // 이미 있는 파일 스킵
  const pending = [];
  for (const a of ASSETS) {
    const out = path.join(outDir, `${a.name}.png`);
    try {
      await fs.access(out);
      console.log(`[skip] ${a.name}`);
    } catch {
      pending.push({ ...a, outPath: out });
    }
  }
  console.log(`\n총 ${pending.length}장 제출 시작...`);

  // 병렬 제출
  const submitted = await Promise.allSettled(
    pending.map(async (a) => {
      const id = await submit(a);
      console.log(`  [submit] ${a.name} → ${id}`);
      return { ...a, id };
    }),
  );

  const inFlight = submitted
    .filter((s) => s.status === 'fulfilled')
    .map((s) => s.value);
  const failed = submitted
    .filter((s) => s.status === 'rejected')
    .map((s, i) => ({ name: pending[i]?.name ?? '?', err: s.reason?.message ?? 'unknown' }));
  for (const f of failed) console.log(`  [submit fail] ${f.name}: ${f.err}`);
  console.log(`\n제출 성공: ${inFlight.length}, 실패: ${failed.length}`);

  if (inFlight.length === 0) {
    console.log('아무것도 제출 안됨');
    return;
  }

  // 폴링 루프 — 모두 완료까지
  const completed = new Set();
  let elapsed = 0;
  const POLL = 12000;
  const MAX = 60 * 60 * 1000; // 1시간

  while (completed.size < inFlight.length && elapsed < MAX) {
    await new Promise((res) => setTimeout(res, POLL));
    elapsed += POLL;

    let done = 0;
    let processing = 0;
    let queued = 0;
    for (const a of inFlight) {
      if (completed.has(a.name)) {
        done += 1;
        continue;
      }
      const s = await checkStatus(a.id);
      if (!s) continue;
      if (s.done) {
        const url = s.generations?.[0]?.img;
        if (url) {
          try {
            await downloadAndSave(url, a.outPath);
            const st = await fs.stat(a.outPath);
            console.log(`  ✓ ${a.name} (${Math.round(st.size / 1024)}KB)`);
            completed.add(a.name);
          } catch (e) {
            console.log(`  ✗ ${a.name} 다운로드 실패: ${e.message}`);
          }
        } else {
          console.log(`  ✗ ${a.name}: 결과에 이미지 없음`);
          completed.add(a.name); // 포기
        }
      } else if (s.faulted) {
        console.log(`  ✗ ${a.name}: faulted`);
        completed.add(a.name);
      } else {
        if (s.processing > 0) processing += 1;
        else queued += 1;
      }
    }
    console.log(`[${Math.round(elapsed / 1000)}s] 완료:${done}/${inFlight.length} 처리중:${processing} 대기:${queued}`);
  }

  console.log(`\n전체 완료. ${completed.size}/${inFlight.length} 성공`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
