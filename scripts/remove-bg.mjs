// sprites/*.png 의 단색 배경을 투명으로 변환.
// 가장자리 4 모서리 픽셀 평균색을 BG로 추정, 임계값 이내 픽셀 알파 = 0.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.join(process.cwd(), 'public', 'images', 'sprites');
const DST = path.join(process.cwd(), 'public', 'images', 'sprites_nobg');

const THRESHOLD = 60;  // 색 거리 임계값
const FEATHER = 25;    // 가장자리 페더링 거리

const process_one = async (file) => {
  const inPath = path.join(SRC, file);
  const outPath = path.join(DST, file);
  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // 4 모서리 평균 BG 색
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [cx, cy] of corners) {
    const i = (cy * width + cx) * channels;
    br += data[i];
    bg += data[i + 1];
    bb += data[i + 2];
  }
  br = br / corners.length;
  bg = bg / corners.length;
  bb = bb / corners.length;

  // 픽셀별 알파 마스킹
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
    if (dist < THRESHOLD) {
      data[i + 3] = 0;
    } else if (dist < THRESHOLD + FEATHER) {
      // 페더링
      const t = (dist - THRESHOLD) / FEATHER;
      data[i + 3] = Math.round(data[i + 3] * t);
    }
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log(`✓ ${file} (bg avg ${Math.round(br)},${Math.round(bg)},${Math.round(bb)})`);
};

const main = async () => {
  await fs.mkdir(DST, { recursive: true });
  const files = (await fs.readdir(SRC)).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    try {
      await process_one(f);
    } catch (e) {
      console.error(`✗ ${f}: ${e.message}`);
    }
  }
};

main();
