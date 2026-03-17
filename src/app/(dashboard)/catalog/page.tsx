"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Upload,
  ChevronRight,
  X,
  Check,
  Layers,
  ImageIcon,
} from "lucide-react";
import type { Game, Collection, Item } from "@/lib/types";

export default function CatalogPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [codeCounts, setCodeCounts] = useState<Record<number, { total: number; available: number; registered: number; sold: number; revenue: number; salesRate: number; earliestExpiry: string | null; expiryDaysLeft: number | null }>>({});

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  // Inline add/edit states
  const [newGame, setNewGame] = useState<{ name: string; publisher: string } | null>(null);
  const [editingGame, setEditingGame] = useState<{ id: number; name: string; publisher: string } | null>(null);
  const [newCollection, setNewCollection] = useState<{ name: string; description: string; image_url: string | null } | null>(null);
  const [editingCollection, setEditingCollection] = useState<{ id: number; name: string; description: string; image_url: string | null } | null>(null);
  const [newItem, setNewItem] = useState<{ name: string; description: string; price: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: number; name: string; description: string; price: string } | null>(null);

  const [error, setError] = useState("");

  const fetchGames = useCallback(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  const fetchCollections = useCallback((gameId: number) => {
    fetch(`/api/collections?game_id=${gameId}`).then((r) => r.json()).then(setCollections);
  }, []);

  const fetchItems = useCallback((collectionId: number) => {
    fetch(`/api/items?collection_id=${collectionId}`).then((r) => r.json()).then(setItems);
  }, []);

  const fetchInventory = useCallback(() => {
    fetch("/api/inventory").then((r) => r.json()).then((metrics: { games: { collections: { items: { item: Item; received: number; registered: number; sold: number; total: number; revenue: number; salesRate: number; earliestExpiry: string | null; expiryDaysLeft: number | null }[] }[] }[] }) => {
      const counts: Record<number, { total: number; available: number; registered: number; sold: number; revenue: number; salesRate: number; earliestExpiry: string | null; expiryDaysLeft: number | null }> = {};
      for (const game of metrics.games) {
        for (const col of game.collections) {
          for (const row of col.items) {
            counts[row.item.id] = {
              total: row.total,
              available: row.received + row.registered,
              registered: row.registered,
              sold: row.sold,
              revenue: row.revenue,
              salesRate: row.salesRate,
              earliestExpiry: row.earliestExpiry,
              expiryDaysLeft: row.expiryDaysLeft,
            };
          }
        }
      }
      setCodeCounts(counts);
    });
  }, []);

  useEffect(() => {
    fetchGames();
    fetchInventory();
  }, [fetchGames, fetchInventory]);

  useEffect(() => {
    if (selectedGameId) {
      fetchCollections(selectedGameId);
      setSelectedCollectionId(null);
      setItems([]);
    }
  }, [selectedGameId, fetchCollections]);

  useEffect(() => {
    if (selectedCollectionId) {
      fetchItems(selectedCollectionId);
    }
  }, [selectedCollectionId, fetchItems]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  // Game CRUD
  const handleAddGame = async () => {
    if (!newGame?.name || !newGame?.publisher) return;
    await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGame),
    });
    setNewGame(null);
    fetchGames();
  };

  const handleUpdateGame = async () => {
    if (!editingGame) return;
    await fetch("/api/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingGame),
    });
    setEditingGame(null);
    fetchGames();
  };

  const handleDeleteGame = async (id: number) => {
    const res = await fetch(`/api/games?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      showError(data.error);
      return;
    }
    if (selectedGameId === id) {
      setSelectedGameId(null);
      setCollections([]);
      setItems([]);
    }
    fetchGames();
  };

  // Collection CRUD
  const handleAddCollection = async () => {
    if (!newCollection?.name || !selectedGameId) return;
    await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCollection, image_url: newCollection.image_url || null, game_id: selectedGameId }),
    });
    setNewCollection(null);
    fetchCollections(selectedGameId);
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;
    await fetch("/api/collections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingCollection, image_url: editingCollection.image_url }),
    });
    setEditingCollection(null);
    if (selectedGameId) fetchCollections(selectedGameId);
  };

  const handleCollectionImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "new" | "edit"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (target === "new" && newCollection) {
        setNewCollection({ ...newCollection, image_url: dataUrl });
      } else if (target === "edit" && editingCollection) {
        setEditingCollection({ ...editingCollection, image_url: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteCollection = async (id: number) => {
    const res = await fetch(`/api/collections?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      showError(data.error);
      return;
    }
    if (selectedCollectionId === id) {
      setSelectedCollectionId(null);
      setItems([]);
    }
    if (selectedGameId) fetchCollections(selectedGameId);
  };

  // Item CRUD
  const handleAddItem = async () => {
    if (!newItem?.name || !newItem?.price || !selectedCollectionId) return;
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newItem, price: Number(newItem.price), collection_id: selectedCollectionId }),
    });
    setNewItem(null);
    fetchItems(selectedCollectionId);
    fetchInventory();
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editingItem, price: Number(editingItem.price) }),
    });
    setEditingItem(null);
    if (selectedCollectionId) fetchItems(selectedCollectionId);
  };

  const handleDeleteItem = async (id: number) => {
    const res = await fetch(`/api/items?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      showError(data.error);
      return;
    }
    if (selectedCollectionId) fetchItems(selectedCollectionId);
    fetchInventory();
  };

  // Count helpers
  const gameCollectionCount = (gameId: number) => collections.filter((c) => c.game_id === gameId).length;
  const gameCodeCount = (gameId: number) => {
    // sum code counts for all items in this game's collections
    // We need all collections for this, so use the full fetch
    return 0; // Will show from inventory
  };

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">카탈로그 관리</h1>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-neutral-400">
          <span className={selectedGameId ? "cursor-pointer hover:text-neutral-200" : "text-neutral-200"} onClick={() => { setSelectedGameId(null); setSelectedCollectionId(null); setItems([]); setCollections([]); }}>
            게임
          </span>
          {selectedGame && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className={selectedCollectionId ? "cursor-pointer hover:text-neutral-200" : "text-neutral-200"} onClick={() => { setSelectedCollectionId(null); setItems([]); }}>
                {selectedGame.name}
              </span>
            </>
          )}
          {selectedCollection && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-200">{selectedCollection.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* === Games Table === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">게임 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-300">게임명</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">퍼블리셔</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">등록일</th>
                  <th className="px-3 py-2 font-medium text-neutral-300 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr
                    key={game.id}
                    className={`border-b border-neutral-700/50 last:border-0 cursor-pointer transition-colors ${
                      selectedGameId === game.id ? "bg-neutral-700/70" : "hover:bg-neutral-700/30"
                    }`}
                    onClick={() => setSelectedGameId(game.id)}
                  >
                    {editingGame?.id === game.id ? (
                      <>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <Input value={editingGame.name} onChange={(e) => setEditingGame({ ...editingGame, name: e.target.value })} className="h-7 text-sm" />
                        </td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <Input value={editingGame.publisher} onChange={(e) => setEditingGame({ ...editingGame, publisher: e.target.value })} className="h-7 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-neutral-400">{formatDate(game.created_at)}</td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUpdateGame}><Check className="h-3.5 w-3.5 text-green-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGame(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-neutral-200 font-medium">{game.name}</td>
                        <td className="px-3 py-2 text-neutral-400">{game.publisher}</td>
                        <td className="px-3 py-2 text-neutral-400">{formatDate(game.created_at)}</td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGame({ id: game.id, name: game.name, publisher: game.publisher })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteGame(game.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {/* Inline add row */}
                {newGame ? (
                  <tr className="border-b border-neutral-700/50 bg-neutral-800/30">
                    <td className="px-3 py-2">
                      <Input placeholder="게임명" value={newGame.name} onChange={(e) => setNewGame({ ...newGame, name: e.target.value })} className="h-7 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <Input placeholder="퍼블리셔" value={newGame.publisher} onChange={(e) => setNewGame({ ...newGame, publisher: e.target.value })} className="h-7 text-sm" />
                    </td>
                    <td className="px-3 py-2 text-neutral-500 text-xs">자동 생성</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddGame}><Check className="h-3.5 w-3.5 text-green-400" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewGame(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-2">
                      <button onClick={() => setNewGame({ name: "", publisher: "" })} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> 게임 추가
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* === Collections (shown when game is selected) === */}
      {selectedGameId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-blue-400" />
                컬렉션 — {selectedGame?.name}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {collections.filter((c) => c.game_id === selectedGameId).map((col) => (
                <div
                  key={col.id}
                  className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                    selectedCollectionId === col.id
                      ? "border-blue-600 ring-1 ring-blue-600/50"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                  onClick={() => setSelectedCollectionId(col.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-800">
                    {col.image_url ? (
                      <img src={col.image_url} alt={col.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-750">
                        <ImageIcon className="h-6 w-6 text-neutral-600" />
                      </div>
                    )}
                    {/* Hover actions */}
                    <div className="absolute top-1 right-1 flex items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        className="rounded bg-neutral-800/80 p-1 text-neutral-300 hover:text-neutral-100"
                        onClick={(e) => { e.stopPropagation(); setEditingCollection({ id: col.id, name: col.name, description: col.description, image_url: col.image_url }); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="rounded bg-neutral-800/80 p-1 text-red-400 hover:text-red-300"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="bg-neutral-800/80 px-2 py-1.5">
                    <p className="text-xs font-medium text-neutral-100 truncate">{col.name}</p>
                  </div>
                </div>
              ))}

              {/* Add collection card */}
              {newCollection ? (
                <div className="overflow-hidden rounded-lg border border-dashed border-neutral-600 bg-neutral-800/30">
                  <div className="relative aspect-square w-full overflow-hidden bg-neutral-800">
                    {newCollection.image_url ? (
                      <img src={newCollection.image_url} alt="미리보기" className="h-full w-full object-cover" />
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-neutral-500 hover:text-neutral-300 transition-colors">
                        <ImageIcon className="h-5 w-5" />
                        <span className="text-[10px]">이미지</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCollectionImageUpload(e, "new")} />
                      </label>
                    )}
                    {newCollection.image_url && (
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <span className="text-[10px] text-white">변경</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCollectionImageUpload(e, "new")} />
                      </label>
                    )}
                  </div>
                  <div className="space-y-1.5 px-2 py-1.5">
                    <Input placeholder="컬렉션명" value={newCollection.name} onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })} className="h-6 text-[11px]" />
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddCollection}><Check className="h-3 w-3 text-green-400" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewCollection(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNewCollection({ name: "", description: "", image_url: null })}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-600 text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-200"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px]">추가</span>
                </button>
              )}
            </div>

            {/* Edit collection modal inline */}
            {editingCollection && (
              <div className="mt-4 rounded-lg border border-neutral-600 bg-neutral-800/50 p-4">
                <p className="mb-3 text-sm font-medium text-neutral-200">컬렉션 수정</p>
                <div className="flex gap-4">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-700">
                    {editingCollection.image_url ? (
                      <img src={editingCollection.image_url} alt="미리보기" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-neutral-500" />
                      </div>
                    )}
                    <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <span className="text-xs text-white">변경</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCollectionImageUpload(e, "edit")} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input value={editingCollection.name} onChange={(e) => setEditingCollection({ ...editingCollection, name: e.target.value })} className="h-8 text-sm" placeholder="컬렉션명" />
                    <Input value={editingCollection.description} onChange={(e) => setEditingCollection({ ...editingCollection, description: e.target.value })} className="h-8 text-sm" placeholder="설명" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateCollection}><Check className="mr-1 h-3 w-3" />저장</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCollection(null)}>취소</Button>
                      {editingCollection.image_url && (
                        <Button size="sm" variant="outline" onClick={() => setEditingCollection({ ...editingCollection, image_url: null })}>이미지 삭제</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Items Table (shown when collection is selected) === */}
      {selectedCollectionId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              아이템 — {selectedCollection?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 bg-neutral-800/50 text-left">
                    <th className="px-3 py-2 font-medium text-neutral-300">아이템명</th>
                    <th className="px-3 py-2 font-medium text-neutral-300">가격</th>
                    <th className="px-3 py-2 font-medium text-neutral-300">가용재고</th>
                    <th className="px-3 py-2 font-medium text-neutral-300">판매</th>
                    <th className="px-3 py-2 font-medium text-neutral-300">매출</th>
                    <th className="px-3 py-2 font-medium text-neutral-300">만료일</th>
                    <th className="px-3 py-2 font-medium text-neutral-300 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const counts = codeCounts[item.id] || { total: 0, available: 0, registered: 0, sold: 0, revenue: 0, salesRate: 0, earliestExpiry: null, expiryDaysLeft: null };
                    const isExpiring = counts.expiryDaysLeft != null && counts.expiryDaysLeft <= 14;
                    return (
                      <tr key={item.id} className="border-b border-neutral-700/50 last:border-0 hover:bg-neutral-700/30">
                        {editingItem?.id === item.id ? (
                          <>
                            <td className="px-3 py-2">
                              <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="h-7 text-sm" />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })} className="h-7 w-20 text-sm" />
                            </td>
                            <td className="px-3 py-2 text-neutral-400">{formatNumber(counts.available)}</td>
                            <td className="px-3 py-2 text-neutral-400">{formatNumber(counts.sold)}</td>
                            <td className="px-3 py-2 text-neutral-400">${formatNumber(Math.round(counts.revenue * 100) / 100)}</td>
                            <td className="px-3 py-2 text-neutral-400">{counts.earliestExpiry ? formatDate(counts.earliestExpiry) : "-"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUpdateItem}><Check className="h-3.5 w-3.5 text-green-400" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(null)}><X className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-neutral-200 font-medium">{item.name}</td>
                            <td className="px-3 py-2 text-neutral-200">{item.price > 0 ? `$${item.price.toFixed(2)}` : <span className="text-neutral-500">Free</span>}</td>
                            <td className="px-3 py-2">
                              <Badge className={counts.registered + counts.sold > 0 && counts.registered / (counts.registered + counts.sold) <= 0.1 ? "bg-orange-900/30 text-orange-400" : "bg-neutral-700 text-neutral-300"}>
                                {formatNumber(counts.available)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-neutral-400">{formatNumber(counts.sold)} <span className="text-neutral-600">({counts.salesRate}%)</span></td>
                            <td className="px-3 py-2 text-emerald-400">${formatNumber(Math.round(counts.revenue * 100) / 100)}</td>
                            <td className="px-3 py-2">
                              {counts.earliestExpiry ? (
                                <span className={isExpiring ? (counts.expiryDaysLeft! <= 3 ? "text-red-400" : "text-yellow-400") : "text-neutral-400"}>
                                  {formatDate(counts.earliestExpiry)}
                                  {isExpiring && <span className="ml-1 text-xs">(D-{counts.expiryDaysLeft})</span>}
                                </span>
                              ) : (
                                <span className="text-neutral-600">없음</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="코드 보기" asChild>
                                  <a href={`/codes?collection_id=${selectedCollectionId}&item_id=${item.id}`}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="업로드" asChild>
                                  <a href={`/upload?game_id=${selectedGameId}&collection_id=${selectedCollectionId}`}>
                                    <Upload className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem({ id: item.id, name: item.name, description: item.description, price: String(item.price) })}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {/* Inline add row */}
                  {newItem ? (
                    <tr className="border-b border-neutral-700/50 bg-neutral-800/30">
                      <td className="px-3 py-2">
                        <Input placeholder="아이템명" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-7 text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" placeholder="가격" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="h-7 w-20 text-sm" />
                      </td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">-</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">-</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">-</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">-</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddItem}><Check className="h-3.5 w-3.5 text-green-400" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewItem(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-2">
                        <button onClick={() => setNewItem({ name: "", description: "", price: "" })} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                          <Plus className="h-3.5 w-3.5" /> 아이템 추가
                        </button>
                      </td>
                    </tr>
                  )}
                  {items.length === 0 && !newItem && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">이 컬렉션에 아이템이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
