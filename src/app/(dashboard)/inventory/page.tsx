"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, formatDate } from "@/lib/utils";
import Link from "next/link";
import { AlertTriangle, DollarSign, Package, ShoppingCart, TrendingUp, BarChart3, ChevronRight, ChevronDown, Layers, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Game, InventoryMetrics, CollectionMetrics } from "@/lib/types";

const PIE_COLORS = ["#facc15", "#3b82f6", "#22c55e"];

type ViewMode = "overall" | "game";
type ChartTab = "collection" | "item";

export default function InventoryPage() {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("overall");
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<number>>(new Set());
  const [chartTab, setChartTab] = useState<ChartTab>("collection");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchMetrics = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (viewMode === "game" && selectedGameId) params.set("game_id", String(selectedGameId));
    const qs = params.toString();
    fetch(`/api/inventory${qs ? `?${qs}` : ""}`).then((r) => r.json()).then(setMetrics);
  }, [dateFrom, dateTo, viewMode, selectedGameId]);

  useEffect(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const selectGame = (gameId: number) => {
    setSelectedGameId(gameId);
    setViewMode("game");
    setExpandedCollections(new Set());
  };

  const goOverall = () => {
    setSelectedGameId(null);
    setViewMode("overall");
    setExpandedCollections(new Set());
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
  };

  const toggleCollection = (colId: number) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  if (!metrics) return <div className="p-6 text-neutral-400">로딩 중...</div>;

  const selectedGameName = selectedGameId ? games.find((g) => g.id === selectedGameId)?.name : null;

  // Pie data
  const pieData = [
    { name: "대기", value: metrics.received },
    { name: "등록", value: metrics.registered },
    { name: "판매", value: metrics.sold },
  ].filter((d) => d.value > 0);

  // Top 5 collections / items by revenue
  type RankEntry = { name: string; sub: string; 매출: number; 판매수: number; gameId: number; collectionId: number };
  const allCollections: RankEntry[] = metrics.games.flatMap((g) =>
    g.collections.map((c) => ({ name: c.collection.name, sub: g.game.name, 매출: c.revenue, 판매수: c.sold, gameId: g.game.id, collectionId: c.collection.id }))
  );
  const top5Collections = [...allCollections].sort((a, b) => b.매출 - a.매출).slice(0, 8);

  const allItems: RankEntry[] = metrics.games.flatMap((g) =>
    g.collections.flatMap((c) =>
      c.items.map((i) => ({ name: i.item.name, sub: c.collection.name, 매출: i.revenue, 판매수: i.sold, gameId: g.game.id, collectionId: c.collection.id }))
    )
  );
  const top5Items = [...allItems].sort((a, b) => b.매출 - a.매출).slice(0, 8);

  const chartData: RankEntry[] = chartTab === "collection" ? top5Collections : top5Items;

  const handleChartClick = (entry: RankEntry) => {
    setSelectedGameId(entry.gameId);
    setViewMode("game");
    setExpandedCollections(new Set([entry.collectionId]));
    // Scroll to detail section after state update
    setTimeout(() => {
      document.getElementById(`col-${entry.collectionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-100">재고 현황</h1>
          {viewMode === "game" && selectedGameName && (
            <>
              <ChevronRight className="h-5 w-5 text-neutral-500" />
              <span className="text-lg font-medium text-neutral-300">{selectedGameName}</span>
            </>
          )}
        </div>

        {/* View mode tabs */}
        <div className="flex gap-1 rounded-lg bg-neutral-800 p-1">
          <button
            onClick={goOverall}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "overall" ? "bg-neutral-700 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            전체
          </button>
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => selectGame(g.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "game" && selectedGameId === g.id
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Date filter */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <span className="text-sm font-medium text-neutral-300">기간 설정</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-neutral-500">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
          {(dateFrom || dateTo) && (
            <Button variant="outline" size="sm" onClick={clearDates}>
              초기화
            </Button>
          )}
          <span className="text-xs text-neutral-500">
            {dateFrom || dateTo ? "선택된 기간의 판매/매출이 표시됩니다" : "전체 기간"}
          </span>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-lg bg-blue-900/30 p-3">
              <Package className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-400">전체 코드</p>
              <p className="text-2xl font-bold text-neutral-100">{formatNumber(metrics.totalCodes)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-lg bg-green-900/30 p-3">
              <ShoppingCart className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-400">판매 수</p>
              <p className="text-2xl font-bold text-neutral-100">{formatNumber(metrics.sold)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-lg bg-emerald-900/30 p-3">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-400">매출</p>
              <p className="text-2xl font-bold text-neutral-100">${formatNumber(Math.round(metrics.revenue * 100) / 100)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="rounded-lg bg-yellow-900/30 p-3">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-400">판매율</p>
              <p className="text-2xl font-bold text-neutral-100">
                {metrics.totalCodes > 0 ? ((metrics.sold / metrics.totalCodes) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar chart — collection/item tab */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                매출 TOP 8
              </CardTitle>
              <div className="flex gap-1 rounded-lg bg-neutral-800 p-0.5">
                <button
                  onClick={() => setChartTab("collection")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartTab === "collection" ? "bg-neutral-700 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  컬렉션별
                </button>
                <button
                  onClick={() => setChartTab("item")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartTab === "item" ? "bg-neutral-700 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  아이템별
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="flex h-64 items-center justify-center text-sm text-neutral-500">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxRevenue = Math.max(...chartData.map((d) => d.매출), 1);
                  return chartData.map((d, i) => (
                    <div
                      key={i}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-neutral-800/60"
                      onClick={() => handleChartClick(d)}
                    >
                      <span className="w-[90px] flex-shrink-0 truncate text-right text-xs text-neutral-300">{d.name}</span>
                      <div className="relative h-7 flex-1">
                        <div className="absolute inset-0 rounded bg-neutral-800" />
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-emerald-500/80 transition-all"
                          style={{ width: `${Math.max((d.매출 / maxRevenue) * 60, 2)}%` }}
                        />
                        <span className="absolute inset-y-0 flex items-center pl-2 text-xs font-medium text-neutral-100" style={{ left: `${Math.max((d.매출 / maxRevenue) * 60, 2)}%` }}>
                          ${formatNumber(Math.round(d.매출 * 100) / 100)}
                        </span>
                      </div>
                      <span className="w-14 flex-shrink-0 text-right text-xs text-neutral-500">{formatNumber(d.판매수)}건</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle>상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={12}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#232323", border: "1px solid #333", borderRadius: "8px", color: "#ededed" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-yellow-400" /> 대기 {formatNumber(metrics.received)}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-500" /> 등록 {formatNumber(metrics.registered)}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-500" /> 판매 {formatNumber(metrics.sold)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail section */}
      {viewMode === "overall" ? (
        /* === Overall: Game cards with salesRate === */
        <>
          <h2 className="text-lg font-semibold text-neutral-100">게임별 상세</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {metrics.games.map((g) => {
              const sellable = g.registered + g.sold;
              const isLowStock = sellable > 0 && g.registered / sellable <= 0.1;
              return (
                <Card
                  key={g.game.id}
                  className="cursor-pointer transition-colors hover:border-neutral-500"
                  onClick={() => selectGame(g.game.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{g.game.name}</CardTitle>
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    </div>
                    <p className="text-xs text-neutral-400">{g.game.publisher}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-neutral-500">전체 코드</p>
                        <p className="text-xl font-bold text-neutral-100">{formatNumber(g.totalCodes)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">매출</p>
                        <p className="text-xl font-bold text-emerald-400">${formatNumber(Math.round(g.revenue * 100) / 100)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">판매율</p>
                        <p className="text-xl font-bold text-blue-400">{g.salesRate}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded bg-yellow-900/20 px-2 py-1.5 text-center">
                        <span className="text-neutral-400">대기</span>
                        <p className="font-medium text-neutral-100">{formatNumber(g.received)}</p>
                      </div>
                      <div className="rounded bg-blue-900/20 px-2 py-1.5 text-center">
                        <span className="text-neutral-400">등록</span>
                        <p className="font-medium text-neutral-100">{formatNumber(g.registered)}</p>
                      </div>
                      <div className="rounded bg-green-900/20 px-2 py-1.5 text-center">
                        <span className="text-neutral-400">판매</span>
                        <p className="font-medium text-neutral-100">{formatNumber(g.sold)}</p>
                      </div>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-neutral-700">
                      {g.totalCodes > 0 && (
                        <>
                          <div className="bg-yellow-400" style={{ width: `${(g.received / g.totalCodes) * 100}%` }} />
                          <div className="bg-blue-500" style={{ width: `${(g.registered / g.totalCodes) * 100}%` }} />
                          <div className="bg-green-500" style={{ width: `${(g.sold / g.totalCodes) * 100}%` }} />
                        </>
                      )}
                    </div>
                    {isLowStock && (
                      <Badge className="bg-orange-900/30 text-orange-400">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        가용 재고 부족 ({formatNumber(g.registered)})
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        /* === Game view: Collection → Item drill-down === */
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-100">컬렉션별 상세</h2>
            <Button variant="outline" size="sm" onClick={goOverall}>
              전체 보기
            </Button>
          </div>

          {/* Collection cards */}
          <div className="space-y-4">
            {[...(metrics.games[0]?.collections ?? [])].sort((a, b) => b.revenue - a.revenue).map((col) => (
              <CollectionCard
                key={col.collection.id}
                col={col}
                expanded={expandedCollections.has(col.collection.id)}
                onToggle={() => toggleCollection(col.collection.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CollectionCard({ col, expanded, onToggle }: { col: CollectionMetrics; expanded: boolean; onToggle: () => void }) {
  const sellable = col.registered + col.sold;
  const isLowStock = sellable > 0 && col.registered / sellable <= 0.1;

  return (
    <Card id={`col-${col.collection.id}`}>
      {/* Collection header — clickable to expand */}
      <div
        className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-800/50"
        onClick={onToggle}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/30">
          <Layers className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-neutral-100">{col.collection.name}</p>
          <p className="text-xs text-neutral-400">{col.items.length}개 아이템 · {formatNumber(col.totalCodes)}건</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-xs text-neutral-500">매출</p>
            <p className="font-semibold text-emerald-400">${formatNumber(Math.round(col.revenue * 100) / 100)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">판매율</p>
            <p className="font-semibold text-blue-400">{col.salesRate}%</p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div className="hidden sm:flex gap-2 text-xs">
              <Badge className="bg-yellow-900/30 text-yellow-400">{formatNumber(col.received)}</Badge>
              <Badge className="bg-blue-900/30 text-blue-400">{formatNumber(col.registered)}</Badge>
              <Badge className="bg-green-900/30 text-green-400">{formatNumber(col.sold)}</Badge>
            </div>
            {isLowStock && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      {/* Expanded: item list */}
      {expanded && (
        <CardContent className="border-t border-neutral-700/50 pt-0">
          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...col.items].sort((a, b) => b.revenue - a.revenue).map((row) => {
              const itemSellable = row.registered + row.sold;
              const isLow = itemSellable > 0 && row.registered / itemSellable <= 0.1;
              const isExpiringSoon = row.expiryDaysLeft != null && row.expiryDaysLeft <= 14;
              const borderClass = isExpiringSoon && row.expiryDaysLeft! <= 3 ? "border-red-800" : isExpiringSoon ? "border-yellow-800" : isLow ? "border-orange-800" : "border-neutral-700/50";
              return (
                <div
                  key={row.item.id}
                  className={`rounded-lg border p-4 ${borderClass}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-100">{row.item.name}</p>
                      <p className="text-xs text-neutral-400">${row.item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isExpiringSoon && (
                        <Badge className={row.expiryDaysLeft! <= 3 ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}>
                          D-{row.expiryDaysLeft}
                        </Badge>
                      )}
                      {isLow && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      <Link
                        href={`/codes?item_id=${row.item.id}`}
                        className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-blue-400"
                        title="코드 관리"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">전체</p>
                      <p className="text-lg font-bold text-neutral-100">{formatNumber(row.total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">매출</p>
                      <p className="text-lg font-bold text-emerald-400">${formatNumber(Math.round(row.revenue * 100) / 100)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-neutral-500">판매율</p>
                      <p className="text-lg font-bold text-blue-400">{row.salesRate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="flex items-center justify-between rounded bg-yellow-900/20 px-2 py-1">
                      <span className="text-neutral-400">대기</span>
                      <span className="font-medium text-neutral-100">{formatNumber(row.received)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-blue-900/20 px-2 py-1">
                      <span className="text-neutral-400">등록</span>
                      <span className="font-medium text-neutral-100">{formatNumber(row.registered)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-green-900/20 px-2 py-1">
                      <span className="text-neutral-400">판매</span>
                      <span className="font-medium text-neutral-100">{formatNumber(row.sold)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-neutral-700">
                    {row.total > 0 && (
                      <>
                        <div className="bg-yellow-400" style={{ width: `${(row.received / row.total) * 100}%` }} />
                        <div className="bg-blue-500" style={{ width: `${(row.registered / row.total) * 100}%` }} />
                        <div className="bg-green-500" style={{ width: `${(row.sold / row.total) * 100}%` }} />
                      </>
                    )}
                  </div>

                  {isLow && (
                    <p className="mt-2 text-xs text-orange-400">재고 부족 (남은: {formatNumber(row.registered)})</p>
                  )}
                  {isExpiringSoon && (
                    <p className={`mt-1 text-xs ${row.expiryDaysLeft! <= 3 ? "text-red-400" : "text-yellow-400"}`}>
                      만료 임박 · {formatDate(row.earliestExpiry!)} ({row.expiryDaysLeft}일 남음)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
