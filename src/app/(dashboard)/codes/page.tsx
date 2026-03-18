"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import type { Game, Collection, Item, Admin, Code, CodeStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, NEXT_STATUS, PREV_STATUS } from "@/lib/types";

interface CodesResponse {
  codes: Code[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AppliedFilters {
  gameFilter: string;
  collectionFilter: string;
  itemFilter: string;
  statusFilter: string;
  adminFilter: string;
  search: string;
}

export default function CodesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-neutral-400">로딩 중...</div>}>
      <CodesPageContent />
    </Suspense>
  );
}

function CodesPageContent() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [data, setData] = useState<CodesResponse>({ codes: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });

  // Pending filter state (UI only, no API call)
  const [gameFilter, setGameFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Applied filter state (drives API calls)
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    gameFilter: "",
    collectionFilter: "",
    itemFilter: "",
    statusFilter: "",
    adminFilter: "",
    search: "",
  });

  // Load reference data + set initial filters from URL params
  useEffect(() => {
    Promise.all([
      fetch("/api/games").then((r) => r.json()),
      fetch("/api/collections").then((r) => r.json()),
      fetch("/api/items").then((r) => r.json()),
      fetch("/api/admins").then((r) => r.json()),
    ]).then(([g, col, it, a]) => {
      setGames(g);
      setAllCollections(col);
      setAllItems(it);
      setAdmins(a);

      const colId = searchParams.get("collection_id") || "";
      const itemId = searchParams.get("item_id") || "";
      let gameId = "";
      let resolvedColId = colId;

      if (itemId && !colId) {
        // Resolve collection and game from item_id
        const item = it.find((i: Item) => i.id === Number(itemId));
        if (item) {
          resolvedColId = String(item.collection_id);
          const c = col.find((c: Collection) => c.id === item.collection_id);
          if (c) gameId = String(c.game_id);
        }
      } else if (colId) {
        const c = col.find((c: Collection) => c.id === Number(colId));
        if (c) gameId = String(c.game_id);
      }

      // Set pending state
      setGameFilter(gameId);
      setCollectionFilter(resolvedColId);
      setItemFilter(itemId);
      setCollections(gameId ? col.filter((c: Collection) => c.game_id === Number(gameId)) : col);
      if (resolvedColId) {
        setFilteredItems(it.filter((i: Item) => i.collection_id === Number(resolvedColId)));
      }

      // Set applied state (triggers fetch)
      setAppliedFilters({
        gameFilter: gameId,
        collectionFilter: resolvedColId,
        itemFilter: itemId,
        statusFilter: "",
        adminFilter: "",
        search: "",
      });
    });
  }, [searchParams]);

  const fetchCodes = useCallback(() => {
    const params = new URLSearchParams();
    // Priority: itemFilter > collectionFilter > gameFilter
    if (appliedFilters.itemFilter) params.set("item_id", appliedFilters.itemFilter);
    else if (appliedFilters.collectionFilter) params.set("collection_id", appliedFilters.collectionFilter);
    else if (appliedFilters.gameFilter) params.set("game_id", appliedFilters.gameFilter);
    if (appliedFilters.statusFilter) params.set("status", appliedFilters.statusFilter);
    if (appliedFilters.adminFilter) params.set("admin_id", appliedFilters.adminFilter);
    if (appliedFilters.search) params.set("search", appliedFilters.search);
    params.set("page", String(page));
    params.set("pageSize", "20");
    fetch(`/api/codes?${params}`).then((r) => r.json()).then(setData);
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Explicit handlers for cascade resets (no useEffect cascade)
  const handleGameChange = (value: string) => {
    setGameFilter(value);
    setCollectionFilter("");
    setItemFilter("");
    setFilteredItems([]);
    if (value) {
      setCollections(allCollections.filter((c) => c.game_id === Number(value)));
    } else {
      setCollections(allCollections);
    }
  };

  const handleCollectionChange = (value: string) => {
    setCollectionFilter(value);
    setItemFilter("");
    if (value) {
      setFilteredItems(allItems.filter((i) => i.collection_id === Number(value)));
    } else {
      setFilteredItems([]);
    }
  };

  const handleSearch = () => {
    setAppliedFilters({
      gameFilter,
      collectionFilter,
      itemFilter,
      statusFilter,
      adminFilter,
      search,
    });
    setPage(1);
  };

  const handleStatusChange = async (codeId: number, newStatus: CodeStatus) => {
    await fetch("/api/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: codeId, status: newStatus }),
    });
    fetchCodes();
  };

  const itemName = (id: number) => allItems.find((i) => i.id === id)?.name ?? "";
  const collectionNameForItem = (itemId: number) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return "";
    return allCollections.find((c) => c.id === item.collection_id)?.name ?? "";
  };
  const gameName = (itemId: number) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return "";
    const collection = allCollections.find((c) => c.id === item.collection_id);
    if (!collection) return "";
    return games.find((g) => g.id === collection.game_id)?.name ?? "";
  };

  const exportCsv = () => {
    const rows = [
      ["코드", "게임", "컬렉션", "아이템", "상태", "만료일", "등록일"],
      ...data.codes.map((c) => [
        c.code,
        gameName(c.item_id),
        collectionNameForItem(c.item_id),
        itemName(c.item_id),
        STATUS_LABELS[c.status],
        c.expires_at ? formatDate(c.expires_at) : "",
        formatDate(c.created_at),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codes_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">코드 관리</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          CSV 내보내기
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectNative
              value={gameFilter}
              onChange={(e) => handleGameChange(e.target.value)}
              placeholder="전체 게임"
              options={games.map((g) => ({ value: String(g.id), label: g.name }))}
            />
            <SelectNative
              value={collectionFilter}
              onChange={(e) => handleCollectionChange(e.target.value)}
              placeholder="전체 컬렉션"
              options={collections.map((c) => ({ value: String(c.id), label: c.name }))}
              disabled={!gameFilter}
            />
            <SelectNative
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              placeholder="전체 아이템"
              options={filteredItems.map((i) => ({ value: String(i.id), label: i.name }))}
              disabled={!collectionFilter}
            />
            <SelectNative
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="전체 상태"
              options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <SelectNative
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              placeholder="전체 담당자"
              options={admins.map((a) => ({ value: String(a.id), label: a.name }))}
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="코드번호 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              />
            </div>
            <div className="flex items-center lg:col-span-2">
              <Button onClick={handleSearch} className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                검색
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            코드 목록 <span className="text-sm font-normal text-neutral-400">({formatNumber(data.total)}건)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-300">코드</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">게임</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">컬렉션</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">아이템</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">상태</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">만료일</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">등록일</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">액션</th>
                </tr>
              </thead>
              <tbody>
                {data.codes.map((code) => (
                  <tr key={code.id} className="border-b border-neutral-700/50 last:border-0 hover:bg-neutral-700/50">
                    <td className="px-3 py-2 font-mono text-xs text-neutral-200">{code.code}</td>
                    <td className="px-3 py-2 text-neutral-200">{gameName(code.item_id)}</td>
                    <td className="px-3 py-2 text-neutral-400">{collectionNameForItem(code.item_id)}</td>
                    <td className="px-3 py-2 text-neutral-200">{itemName(code.item_id)}</td>
                    <td className="px-3 py-2">
                      <Badge className={STATUS_COLORS[code.status]}>{STATUS_LABELS[code.status]}</Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-400">{code.expires_at ? formatDate(code.expires_at) : "-"}</td>
                    <td className="px-3 py-2 text-neutral-400">{formatDate(code.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {PREV_STATUS[code.status] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(code.id, PREV_STATUS[code.status]!)}
                            className="text-xs text-neutral-400 hover:text-neutral-200"
                          >
                            ← {STATUS_LABELS[PREV_STATUS[code.status]!]}
                          </Button>
                        )}
                        {NEXT_STATUS[code.status] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(code.id, NEXT_STATUS[code.status]!)}
                            className="text-xs"
                          >
                            → {STATUS_LABELS[NEXT_STATUS[code.status]!]}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.codes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">코드가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-neutral-400">
                {formatNumber((data.page - 1) * data.pageSize + 1)} - {formatNumber(Math.min(data.page * data.pageSize, data.total))} / {formatNumber(data.total)}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <Button key={p} variant={p === page ? "default" : "outline"} size="icon" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
