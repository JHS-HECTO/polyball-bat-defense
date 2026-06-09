// Stable Horde 익명 이미지 생성 (CC0).
// 27 자산 일괄 생성 + WebP → PNG 변환 + public/images/ 저장.
// node scripts/gen-assets.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const HORDE = 'https://stablehorde.net/api/v2';
const HEADERS = {
  apikey: '0000000000',
  'Client-Agent': 'polyball-bat-defense:1.0:dev',
  'Content-Type': 'application/json',
};

const STYLE_SUFFIX =
  ', 3D rendered Animal Crossing New Horizons style, low-poly vinyl figure, PBR matte clay, soft Pixar lighting, centered character, clean simple background, high quality';

const NEG = 'pixel art, anime, line art, sharp shadows, neon, photo realism, multiple characters, text';

const ASSETS = [
  // 캐릭터 (4)
  { name: '10_char_melee', prompt: 'cute chibi baseball player kid holding wooden baseball bat on shoulder, red cap, blue jersey, white background', size: 512 },
  { name: '13_char_ranged', prompt: 'cute chibi archer kid holding wooden longbow drawn back with arrow, green tunic, brown feather cap, white background', size: 512 },
  { name: '14_char_magic', prompt: 'cute chibi young mage holding wooden staff with glowing blue crystal orb, purple wizard robe, pointed wizard hat with yellow star, white background', size: 512 },
  { name: '15_char_bomb', prompt: 'cute chibi ninja kid holding round black bomb with lit fuse, dark outfit, black headband, white background', size: 512 },
  // 일반 몹 (5)
  { name: '30_mob_slime', prompt: 'cute round translucent green slime monster with big friendly eyes, sitting pose, white background', size: 384 },
  { name: '31_mob_bat', prompt: 'cute small purple cartoon bat monster with spread wings, friendly eyes, tiny fangs, hovering, white background', size: 384 },
  { name: '32_mob_skull', prompt: 'cute friendly off-white skull monster with rounded jaw, big eye sockets, tiny teeth, floating, white background', size: 384 },
  { name: '33_mob_orc', prompt: 'cute chubby green orc monster with tiny tusks, brown leather wrap clothing, standing, white background', size: 384 },
  { name: '34_mob_ghost', prompt: 'cute pale blue translucent ghost monster with big friendly eyes, wavy bottom, floating, white background', size: 384 },
  // 보스 (3 — 우선 3종)
  { name: '40_boss_lava_drake', prompt: 'cute chibi mini red dragon boss with small folded wings, two curved horns, glowing yellow eyes, breathing small flame, sitting, white background', size: 512 },
  { name: '41_boss_frost_yeti', prompt: 'cute fluffy snow-white yeti boss with blue ice crystal on forehead, ice-tipped claws, standing, white background', size: 512 },
  { name: '42_boss_dark_knight', prompt: 'cute chubby black-armored knight boss with glowing red eye slit, holding giant cartoon sword, red feather plume, white background', size: 512 },
  // 환경 (3)
  { name: '50_egg', prompt: 'cute glowing red dragon egg with golden speckles, subtle warm aura, white background', size: 384 },
  { name: '51_castle', prompt: 'cute mini fantasy stone castle with twin towers, red conical roofs, wooden gate, banner on top, white background', size: 384 },
  { name: '52_flag', prompt: 'small wooden flagpole with black flag bearing skull mark, white background', size: 384 },
  // UI 아이콘 (3)
  { name: '60_ui_ticket', prompt: 'cute yellow raffle ticket icon with curved torn edge and large numeral 1, small star, white background', size: 256 },
  { name: '61_ui_gold', prompt: 'cute shiny gold coin icon with baseball bat-and-ball insignia embossed, warm glow, white background', size: 256 },
  { name: '62_ui_hp', prompt: 'cute soft red 3D heart icon with slight gloss, rounded, white background', size: 256 },
  // 빠따 5종
  { name: '20_bat_t1', prompt: 'simple wooden baseball bat icon, light brown wood with grain, white background, centered at 45 degree angle', size: 256 },
  { name: '21_bat_t2', prompt: 'aluminum baseball bat icon, silver metallic finish with red rubber grip, white background, 45 degree angle', size: 256 },
  { name: '22_bat_t3', prompt: 'golden baseball bat icon, polished gold body with engraved patterns, black leather grip, slight warm glow, white background, 45 degree angle', size: 256 },
  { name: '23_bat_t4', prompt: 'enchanted baseball bat icon, cyan-silver metallic body with glowing blue runes, wrapped leather grip, soft cyan magical aura, white background, 45 degree angle', size: 256 },
  { name: '24_bat_t5', prompt: 'legendary dragon bone baseball bat icon, crimson with spikes and golden trim, glowing red gem at head, black grip with gold thread, red glow aura, white background, 45 degree angle', size: 256 },
  // 배경 타일 (2)
  { name: '01_bg_grass', prompt: 'top-down seamless tileable grass field texture with small white and yellow wildflowers, warm sunny green', size: 512 },
  { name: '02_bg_path', prompt: 'top-down seamless tileable dirt path texture, warm sandy brown with pebbles and grass edges', size: 512 },
  // 이펙트 1종 (잔상)
  { name: '70_fx_swing', prompt: 'curved motion blur arc, soft white-to-yellow gradient crescent, slight transparency at edges, fast swing motion effect, white background', size: 512 },
];

const submit = async (prompt, size) => {
  const r = await fetch(`${HORDE}/generate/async`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      prompt: `${prompt}${STYLE_SUFFIX} ### ${NEG}`,
      params: {
        sampler_name: 'k_euler',
        cfg_scale: 7.5,
        width: size,
        height: size,
        steps: 25,
        n: 1,
      },
      models: ['stable_diffusion'],
      nsfw: false,
      trusted_workers: false,
      censor_nsfw: true,
    }),
  });
  if (!r.ok) throw new Error(`submit ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.id;
};

const wait = async (id, label) => {
  for (let i = 0; i < 120; i += 1) {
    const r = await fetch(`${HORDE}/generate/status/${id}`, { headers: HEADERS });
    const j = await r.json();
    if (j.done) return j;
    if (j.faulted) throw new Error(`faulted: ${JSON.stringify(j)}`);
    process.stdout.write(`\r  [${label}] wait=${j.wait_time}s queue=${j.queue_position} processing=${j.processing}`);
    await new Promise((res) => setTimeout(res, 6000));
  }
  throw new Error(`timeout: ${id}`);
};

const downloadAndConvert = async (url, outPath) => {
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  await sharp(buf).png().toFile(outPath);
};

const main = async () => {
  const outDir = path.join(process.cwd(), 'public', 'images', 'sprites');
  await fs.mkdir(outDir, { recursive: true });

  const errors = [];
  for (const [i, a] of ASSETS.entries()) {
    const out = path.join(outDir, `${a.name}.png`);
    try {
      // 이미 있으면 스킵
      await fs.access(out);
      console.log(`[${i + 1}/${ASSETS.length}] ${a.name} — SKIP (exists)`);
      continue;
    } catch {
      /* not exist, proceed */
    }
    console.log(`\n[${i + 1}/${ASSETS.length}] ${a.name} — submit (size ${a.size})`);
    try {
      const id = await submit(a.prompt, a.size);
      console.log(`  id=${id}`);
      const status = await wait(id, a.name);
      const img = status.generations?.[0]?.img;
      if (!img) throw new Error('no img in result');
      console.log(`\n  download...`);
      await downloadAndConvert(img, out);
      const stat = await fs.stat(out);
      console.log(`  ✓ ${out} (${Math.round(stat.size / 1024)}KB)`);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      errors.push({ name: a.name, err: String(e) });
    }
    // 다음 제출 전 짧은 대기 (horde queue 친절)
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (errors.length > 0) {
    console.log(`\n실패 ${errors.length}건:`);
    for (const e of errors) console.log(`  - ${e.name}: ${e.err}`);
  } else {
    console.log('\n전체 완료!');
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
