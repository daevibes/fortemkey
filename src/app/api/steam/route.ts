import { NextRequest, NextResponse } from "next/server";
import type { SteamAssets } from "@/lib/types";

const STEAM_API = "https://store.steampowered.com/api/appdetails";

export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("app_id");
  if (!appId) {
    return NextResponse.json({ error: "app_id 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const res = await fetch(`${STEAM_API}?appids=${appId}`, {
      next: { revalidate: 3600 }, // 1시간 캐시
    });
    const json = await res.json();
    const entry = json[appId];

    if (!entry?.success) {
      return NextResponse.json({ error: "Steam에서 게임 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    const data = entry.data;

    const assets: SteamAssets = {
      name: data.name || "",
      header_image: data.header_image || null,
      capsule_image: data.capsule_image || null,
      capsule_wide: data.capsule_imagev5 || null,
      screenshots: (data.screenshots || []).map((ss: { id: number; path_thumbnail: string; path_full: string }) => ({
        id: ss.id,
        thumbnail: ss.path_thumbnail,
        full: ss.path_full,
      })),
      movies: (data.movies || []).map((m: { id: number; name: string; thumbnail: string }) => ({
        id: m.id,
        name: m.name,
        thumbnail: m.thumbnail,
        mp4_url: `http://cdn.akamai.steamstatic.com/steam/apps/${m.id}/movie_max.mp4`,
      })),
      short_description: data.short_description || "",
      developers: data.developers || [],
      publishers: data.publishers || [],
      genres: (data.genres || []).map((g: { description: string }) => g.description),
      release_date: data.release_date?.date || "",
    };

    return NextResponse.json(assets);
  } catch (err) {
    console.error("[api/steam] error:", err);
    return NextResponse.json({ error: "Steam API 호출 실패" }, { status: 500 });
  }
}
