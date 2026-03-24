"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Film,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Save,
  Check,
  X,
} from "lucide-react";
import type { Game, SteamAssets } from "@/lib/types";

export default function AssetsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [assets, setAssets] = useState<SteamAssets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Steam App ID 편집
  const [editingId, setEditingId] = useState<number | null>(null);
  const [steamIdInput, setSteamIdInput] = useState("");
  const [saving, setSaving] = useState(false);

  // 라이트박스
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  const fetchAssets = async (game: Game) => {
    setSelectedGame(game);
    setAssets(null);
    setError("");

    if (!game.steam_app_id) {
      setError("Steam App ID가 설정되지 않았습니다. 게임 옆 편집 버튼으로 ID를 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/steam?app_id=${game.steam_app_id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "에셋을 가져올 수 없습니다.");
        return;
      }
      setAssets(data);
    } catch {
      setError("Steam API 호출에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const saveSteamId = async (gameId: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gameId,
          steam_app_id: steamIdInput ? Number(steamIdInput) : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGames((prev) => prev.map((g) => (g.id === gameId ? updated : g)));
        if (selectedGame?.id === gameId) {
          setSelectedGame(updated);
        }
        setEditingId(null);
        setSteamIdInput("");
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // 직접 링크로 폴백
      window.open(url, "_blank");
    }
  };

  const downloadAllImages = async () => {
    if (!assets || !selectedGame) return;
    // 개별 다운로드 트리거
    if (assets.header_image) {
      await downloadFile(assets.header_image, `${selectedGame.name}_header.jpg`);
    }
    for (let i = 0; i < assets.screenshots.length; i++) {
      await downloadFile(
        assets.screenshots[i].full,
        `${selectedGame.name}_screenshot_${String(i + 1).padStart(2, "0")}.jpg`
      );
    }
  };

  // ─── 게임 목록 뷰 ───
  if (!selectedGame) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">게임 에셋</h1>
          <p className="mt-1 text-sm text-neutral-500">
            게임을 선택하면 Steam에서 이미지와 영상 에셋을 가져옵니다
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="group relative overflow-hidden rounded-xl border border-neutral-700/50 bg-neutral-800/40 transition-all hover:border-neutral-600 hover:bg-neutral-800/70"
            >
              <button
                onClick={() => fetchAssets(game)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-neutral-100 group-hover:text-white">
                      {game.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-neutral-500">{game.publisher}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {game.steam_app_id ? (
                      <Badge className="bg-emerald-900/30 text-emerald-400 text-xs">
                        ID: {game.steam_app_id}
                      </Badge>
                    ) : (
                      <Badge className="bg-neutral-700/50 text-neutral-500 text-xs">
                        ID 미설정
                      </Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Steam ID 편집 */}
              <div className="border-t border-neutral-700/30 px-4 py-2">
                {editingId === game.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Steam App ID"
                      value={steamIdInput}
                      onChange={(e) => setSteamIdInput(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <button
                      onClick={() => saveSteamId(game.id)}
                      disabled={saving}
                      className="rounded p-1 text-emerald-400 hover:bg-emerald-900/20"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setSteamIdInput(""); }}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-700/50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(game.id);
                      setSteamIdInput(game.steam_app_id ? String(game.steam_app_id) : "");
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {game.steam_app_id ? "Steam ID 변경" : "Steam ID 설정"}
                  </button>
                )}
              </div>
            </div>
          ))}

          {games.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-neutral-500">
              등록된 게임이 없습니다. 카탈로그에서 게임을 추가하세요.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── 에셋 상세 뷰 ───
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setSelectedGame(null); setAssets(null); setError(""); }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          목록
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-neutral-100">
            {selectedGame.name}
          </h1>
          <p className="text-sm text-neutral-500">
            {selectedGame.publisher}
            {selectedGame.steam_app_id && (
              <a
                href={`https://store.steampowered.com/app/${selectedGame.steam_app_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                Steam 스토어 <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        </div>
        {!selectedGame.steam_app_id && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Steam App ID 입력"
              value={steamIdInput}
              onChange={(e) => setSteamIdInput(e.target.value)}
              className="h-9 w-40"
            />
            <Button
              size="sm"
              onClick={async () => {
                await saveSteamId(selectedGame.id);
                if (steamIdInput) {
                  fetchAssets({ ...selectedGame, steam_app_id: Number(steamIdInput) });
                }
              }}
              disabled={!steamIdInput || saving}
            >
              <Save className="mr-1 h-4 w-4" />
              저장 후 불러오기
            </Button>
          </div>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
          <span className="ml-3 text-neutral-400">Steam에서 에셋을 가져오는 중...</span>
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
            <p className="text-sm text-neutral-400">{error}</p>
            {!selectedGame.steam_app_id && (
              <p className="mt-2 text-xs text-neutral-600">
                Steam 스토어 URL의 숫자가 App ID입니다.
                예: store.steampowered.com/app/<strong>730</strong>/
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 에셋 콘텐츠 */}
      {assets && !loading && (
        <div className="space-y-6">
          {/* 게임 정보 + 헤더 */}
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {assets.header_image && (
                <div className="relative">
                  <img
                    src={assets.header_image}
                    alt={assets.name}
                    className="w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="text-lg font-bold text-white drop-shadow-lg">{assets.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {assets.genres.map((g) => (
                        <Badge key={g} className="bg-white/10 text-white/80 text-xs backdrop-blur-sm">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2 p-4">
                <p className="text-sm leading-relaxed text-neutral-300">{assets.short_description}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
                  <span>개발: {assets.developers.join(", ")}</span>
                  <span>배급: {assets.publishers.join(", ")}</span>
                  <span>출시: {assets.release_date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 이미지 에셋 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  이미지
                  <Badge className="bg-neutral-700 text-neutral-300 text-xs ml-1">
                    {assets.screenshots.length + (assets.header_image ? 1 : 0) + (assets.capsule_image ? 1 : 0)}개
                  </Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadAllImages}>
                  <Download className="mr-1 h-4 w-4" />
                  전체 다운로드
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 캡슐/헤더 이미지 */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {assets.header_image && (
                  <div className="group relative shrink-0">
                    <img
                      src={assets.header_image}
                      alt="Header"
                      className="h-28 w-auto cursor-pointer rounded-lg border border-neutral-700 object-cover transition-transform hover:scale-[1.02]"
                      onClick={() => setLightboxUrl(assets.header_image)}
                    />
                    <div className="absolute bottom-1 left-1">
                      <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm">Header</Badge>
                    </div>
                    <button
                      onClick={() => downloadFile(assets.header_image!, `${selectedGame.name}_header.jpg`)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                {assets.capsule_image && (
                  <div className="group relative shrink-0">
                    <img
                      src={assets.capsule_image}
                      alt="Capsule"
                      className="h-28 w-auto cursor-pointer rounded-lg border border-neutral-700 object-cover transition-transform hover:scale-[1.02]"
                      onClick={() => setLightboxUrl(assets.capsule_image)}
                    />
                    <div className="absolute bottom-1 left-1">
                      <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm">Capsule</Badge>
                    </div>
                    <button
                      onClick={() => downloadFile(assets.capsule_image!, `${selectedGame.name}_capsule.jpg`)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
                {assets.capsule_wide && (
                  <div className="group relative shrink-0">
                    <img
                      src={assets.capsule_wide}
                      alt="Capsule Wide"
                      className="h-28 w-auto cursor-pointer rounded-lg border border-neutral-700 object-cover transition-transform hover:scale-[1.02]"
                      onClick={() => setLightboxUrl(assets.capsule_wide)}
                    />
                    <div className="absolute bottom-1 left-1">
                      <Badge className="bg-black/60 text-white text-[10px] backdrop-blur-sm">Wide</Badge>
                    </div>
                    <button
                      onClick={() => downloadFile(assets.capsule_wide!, `${selectedGame.name}_capsule_wide.jpg`)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    >
                      <Download className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {/* 스크린샷 그리드 */}
              {assets.screenshots.length > 0 && (
                <>
                  <p className="text-xs font-medium text-neutral-400">스크린샷</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {assets.screenshots.map((ss, i) => (
                      <div key={ss.id} className="group relative overflow-hidden rounded-lg border border-neutral-700/50">
                        <img
                          src={ss.thumbnail}
                          alt={`Screenshot ${i + 1}`}
                          className="aspect-video w-full cursor-pointer object-cover transition-transform hover:scale-105"
                          onClick={() => setLightboxUrl(ss.full)}
                        />
                        <button
                          onClick={() =>
                            downloadFile(ss.full, `${selectedGame.name}_ss_${String(i + 1).padStart(2, "0")}.jpg`)
                          }
                          className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                        >
                          <Download className="h-3 w-3 text-white" />
                        </button>
                        <div className="absolute bottom-1 left-1">
                          <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 영상 에셋 */}
          {assets.movies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  트레일러
                  <Badge className="bg-neutral-700 text-neutral-300 text-xs ml-1">
                    {assets.movies.length}개
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {assets.movies.map((movie) => (
                    <div
                      key={movie.id}
                      className="group overflow-hidden rounded-lg border border-neutral-700/50 bg-neutral-800/30"
                    >
                      <div className="relative">
                        <img
                          src={movie.thumbnail}
                          alt={movie.name}
                          className="aspect-video w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                            <Film className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <span className="truncate text-sm font-medium text-neutral-200">
                          {movie.name}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(movie.mp4_url, `${selectedGame.name}_${movie.name}.mp4`)}
                          className="shrink-0 ml-2"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          MP4
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-neutral-800 p-2 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const name = selectedGame?.name || "image";
              downloadFile(lightboxUrl, `${name}_full.jpg`);
            }}
            className="absolute bottom-6 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            <Download className="mr-2 inline h-4 w-4" />
            원본 다운로드
          </button>
        </div>
      )}
    </div>
  );
}
