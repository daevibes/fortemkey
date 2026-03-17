"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { Package, AlertTriangle, Upload, Code2, Clock, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { UploadBatch, Game, Admin, Collection, InventoryMetrics, InventorySummary, ExpiryAlert, SyncLog } from "@/lib/types";
import { SYNC_STATUS_COLORS, SYNC_STATUS_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [syncStatus, setSyncStatus] = useState<{ running: boolean; latest: SyncLog | null }>({ running: false, latest: null });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshDashboard = useCallback(() => {
    Promise.all([
      fetch("/api/inventory").then((r) => r.json()).catch(() => null),
      fetch("/api/batches").then((r) => r.json()).catch(() => []),
      fetch("/api/games").then((r) => r.json()).catch(() => []),
      fetch("/api/admins").then((r) => r.json()).catch(() => []),
      fetch("/api/collections").then((r) => r.json()).catch(() => []),
      fetch("/api/expiry-alerts").then((r) => r.json()).catch(() => []),
      fetch("/api/sync?status=true").then((r) => r.json()).catch(() => ({ running: false, latest: null })),
    ]).then(([inv, bat, gam, adm, col, exp, sync]) => {
      setMetrics(inv);
      setBatches(Array.isArray(bat) ? bat : []);
      setGames(Array.isArray(gam) ? gam : []);
      setAdmins(Array.isArray(adm) ? adm : []);
      setCollections(Array.isArray(col) ? col : []);
      setExpiryAlerts(Array.isArray(exp) ? exp : []);
      setSyncStatus(sync || { running: false, latest: null });
    });
  }, []);

  // Initial load
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Browser polling: trigger sync at configured interval
  useEffect(() => {
    // Read polling interval from localStorage
    let intervalMinutes = 0;
    try {
      const saved = localStorage.getItem("fortem_sync_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        intervalMinutes = parsed.pollingInterval ?? 0;
      }
    } catch {}

    // Clear previous interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (intervalMinutes <= 0) return;

    const intervalMs = intervalMinutes * 60 * 1000;

    pollingRef.current = setInterval(async () => {
      try {
        // Read API settings
        let apiUrl = "";
        let apiKey = "";
        try {
          const saved = localStorage.getItem("fortem_sync_settings");
          if (saved) {
            const parsed = JSON.parse(saved);
            apiUrl = parsed.apiUrl || "";
            apiKey = parsed.apiKey || "";
          }
        } catch {}

        // Trigger sync
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiUrl, apiKey }),
        });

        // Refresh dashboard data after sync
        refreshDashboard();
      } catch {
        // Silently ignore polling errors
      }
    }, intervalMs);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [refreshDashboard]);

  const totalCodes = metrics?.totalCodes ?? 0;
  const totalReceived = metrics?.received ?? 0;
  const totalRegistered = metrics?.registered ?? 0;
  const totalSold = metrics?.sold ?? 0;

  const allItems: InventorySummary[] = metrics?.games.flatMap((g) => g.collections.flatMap((c) => c.items)) ?? [];
  const lowStock = allItems.filter((r) => {
    const sellable = r.registered + r.sold;
    return sellable > 0 && r.registered / sellable <= 0.1;
  });

  const gameName = (id: number) => games.find((g) => g.id === id)?.name ?? "";
  const adminName = (id: number) => admins.find((a) => a.id === id)?.name ?? "";
  const collectionName = (gameId: number) => {
    const col = collections.find((c) => c.game_id === gameId);
    return col?.name ?? "";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-100">대시보드</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">전체 코드</CardTitle>
            <Code2 className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-100">{formatNumber(totalCodes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">대기 중</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-100">{formatNumber(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">등록 완료</CardTitle>
            <Upload className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-100">{formatNumber(totalRegistered)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">판매 완료</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-100">{formatNumber(totalSold)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {syncStatus.latest && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-neutral-400">
              <RefreshCw className="h-4 w-4" />
              마켓플레이스 동기화
            </CardTitle>
            <Badge className={SYNC_STATUS_COLORS[syncStatus.latest.status]}>
              {SYNC_STATUS_LABELS[syncStatus.latest.status]}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-300">
                  마지막 동기화: {formatDateTime(syncStatus.latest.started_at)}
                </p>
                {syncStatus.latest.status === "success" && (
                  <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                    코드 {formatNumber(syncStatus.latest.total_fetched)}건 확인, 신규 판매 {formatNumber(syncStatus.latest.new_sold)}건 반영
                  </p>
                )}
                {syncStatus.latest.status === "failed" && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {syncStatus.latest.error_message || "동기화 실패"}
                  </p>
                )}
                {syncStatus.latest.status === "running" && (
                  <p className="mt-1 text-xs text-blue-400">동기화 진행 중...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              재고 부족 경고
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-neutral-400">재고 부족 아이템이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((row) => (
                  <div key={row.item.id} className="flex items-center justify-between rounded-lg border border-orange-900/50 bg-orange-900/20 p-3">
                    <div>
                      <p className="font-medium text-sm text-neutral-100">{row.game.name} - {row.item.name}</p>
                      <p className="text-xs text-neutral-400">{row.collection.name} · 남은 재고: {row.received + row.registered}건</p>
                    </div>
                    <Badge className="bg-orange-900/30 text-orange-400">부족</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-400" />
              만료 임박
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiryAlerts.length === 0 ? (
              <p className="text-sm text-neutral-400">만료 임박 아이템이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {expiryAlerts.map((alert) => (
                  <div key={alert.item.id} className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-900/20 p-3">
                    <div>
                      <p className="font-medium text-sm text-neutral-100">{alert.game.name} - {alert.item.name}</p>
                      <p className="text-xs text-neutral-400">{alert.collection.name} · 미판매 {formatNumber(alert.unsoldCount)}건</p>
                    </div>
                    <Badge className={alert.daysLeft <= 3 ? "bg-red-900/30 text-red-400" : "bg-yellow-900/30 text-yellow-400"}>
                      D-{alert.daysLeft}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>최근 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {batches.slice(0, 5).map((batch) => (
              <div key={batch.id} className="flex items-center justify-between border-b border-neutral-700/50 pb-3 last:border-0">
                <div>
                  <p className="font-medium text-sm text-neutral-100">{batch.file_name}</p>
                  <p className="text-xs text-neutral-400">
                    {gameName(batch.game_id)} · {adminName(batch.admin_id)} · {formatDateTime(batch.uploaded_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-100">{formatNumber(batch.valid_count)}건</p>
                  {batch.duplicate_count > 0 && (
                    <p className="text-xs text-red-400">중복 {batch.duplicate_count}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
