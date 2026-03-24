#!/usr/bin/env node
/**
 * Steam 게임 에셋 다운로드 스크립트
 *
 * 사용법:
 *   node scripts/download-steam-assets.mjs
 *
 * 아래 GAMES 배열에 다운받을 게임의 Steam App ID를 추가하세요.
 * Steam 스토어 URL에서 확인: https://store.steampowered.com/app/{APP_ID}/
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// ─── 여기에 게임 추가 ───
const GAMES = [
  { appId: 730, name: "Counter-Strike 2" },
  // { appId: 1245620, name: "Elden Ring" },
  // { appId: 570,     name: "Dota 2" },
];

// ─── 설정 ───
const OUTPUT_DIR = join(process.cwd(), "assets");
const STEAM_API = "https://store.steampowered.com/api/appdetails";

// ─── 헬퍼 ───
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function downloadFile(url, dest) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buffer);
    return true;
  } catch (err) {
    console.error(`  ✗ 다운로드 실패: ${url} — ${err.message}`);
    return false;
  }
}

function sanitize(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

// ─── 메인 ───
async function downloadGameAssets(appId, gameName) {
  console.log(`\n━━━ ${gameName} (App ID: ${appId}) ━━━`);

  // Steam API 호출
  const json = await fetchJson(`${STEAM_API}?appids=${appId}`);
  const entry = json[String(appId)];
  if (!entry?.success) {
    console.error(`  ✗ Steam API에서 정보를 가져올 수 없습니다.`);
    return;
  }
  const data = entry.data;

  // 폴더 생성
  const gameDir = join(OUTPUT_DIR, sanitize(gameName));
  const ssDir = join(gameDir, "screenshots");
  const mvDir = join(gameDir, "movies");
  for (const dir of [gameDir, ssDir, mvDir]) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }

  let count = 0;

  // 1) 헤더 이미지
  if (data.header_image) {
    process.stdout.write("  → header.jpg ... ");
    if (await downloadFile(data.header_image, join(gameDir, "header.jpg"))) {
      console.log("✓");
      count++;
    }
  }

  // 2) 캡슐 이미지
  if (data.capsule_image) {
    process.stdout.write("  → capsule.jpg ... ");
    if (await downloadFile(data.capsule_image, join(gameDir, "capsule.jpg"))) {
      console.log("✓");
      count++;
    }
  }

  // 3) 캡슐 와이드 이미지
  if (data.capsule_imagev5) {
    process.stdout.write("  → capsule_wide.jpg ... ");
    if (await downloadFile(data.capsule_imagev5, join(gameDir, "capsule_wide.jpg"))) {
      console.log("✓");
      count++;
    }
  }

  // 4) 스크린샷
  if (data.screenshots?.length) {
    console.log(`  → 스크린샷 ${data.screenshots.length}개 다운로드 중...`);
    for (let i = 0; i < data.screenshots.length; i++) {
      const ss = data.screenshots[i];
      const url = ss.path_full;
      const filename = `${String(i + 1).padStart(2, "0")}.jpg`;
      process.stdout.write(`    ${filename} ... `);
      if (await downloadFile(url, join(ssDir, filename))) {
        console.log("✓");
        count++;
      }
    }
  }

  // 5) 트레일러 영상 (mp4) — Steam CDN 고정 URL 패턴 사용
  if (data.movies?.length) {
    console.log(`  → 트레일러 ${data.movies.length}개 다운로드 중...`);
    for (const movie of data.movies) {
      const movieId = movie.id;
      // Steam CDN mp4 직접 다운로드 URL 패턴
      const mp4Url = `http://cdn.akamai.steamstatic.com/steam/apps/${movieId}/movie_max.mp4`;
      const filename = `${sanitize(movie.name)}.mp4`;
      process.stdout.write(`    ${filename} ... `);
      if (await downloadFile(mp4Url, join(mvDir, filename))) {
        console.log("✓");
        count++;
      }
    }
  }

  // 6) 게임 정보 텍스트 저장
  const info = [
    `게임: ${data.name}`,
    `App ID: ${appId}`,
    `개발사: ${data.developers?.join(", ") || "N/A"}`,
    `퍼블리셔: ${data.publishers?.join(", ") || "N/A"}`,
    `장르: ${data.genres?.map((g) => g.description).join(", ") || "N/A"}`,
    `출시일: ${data.release_date?.date || "N/A"}`,
    ``,
    `설명:`,
    data.short_description || "",
    ``,
    `Steam 스토어: https://store.steampowered.com/app/${appId}/`,
  ].join("\n");
  await writeFile(join(gameDir, "info.txt"), info, "utf-8");

  console.log(`  ✓ 완료 — ${count}개 파일 다운로드됨 → ${gameDir}`);
}

// ─── 실행 ───
console.log("Steam 에셋 다운로드 시작");
console.log(`출력 폴더: ${OUTPUT_DIR}`);

for (const game of GAMES) {
  await downloadGameAssets(game.appId, game.name);
}

console.log("\n모든 다운로드 완료!");
