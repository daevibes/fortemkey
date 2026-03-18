"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { History, Download, FileSpreadsheet } from "lucide-react";
import type { UploadBatch, Game, Admin, Item } from "@/lib/types";

function getDefaultDateFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/batches").then((r) => r.json()).catch(() => []),
      fetch("/api/games").then((r) => r.json()).catch(() => []),
      fetch("/api/admins").then((r) => r.json()).catch(() => []),
      fetch("/api/items").then((r) => r.json()).catch(() => []),
    ]).then(([bat, gam, adm, itm]) => {
      setBatches(Array.isArray(bat) ? bat : []);
      setGames(Array.isArray(gam) ? gam : []);
      setAdmins(Array.isArray(adm) ? adm : []);
      setItems(Array.isArray(itm) ? itm : []);
      setLoading(false);
    });
  }, []);

  const gameName = (id: number) => games.find((g) => g.id === id)?.name ?? "-";
  const adminName = (id: number) => admins.find((a) => a.id === id)?.name ?? "-";
  const itemName = (id: number) => items.find((i) => i.id === id)?.name ?? "-";

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const d = new Date(b.uploaded_at);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [batches, dateFrom, dateTo]);

  const handleDownload = async (batchId: number) => {
    const res = await fetch(`/api/batches/${batchId}/download`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "다운로드 실패" }));
      alert(err.error || "다운로드 실패");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    a.download = match ? decodeURIComponent(match[1]) : `batch_${batchId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isAllPeriod = !dateFrom && !dateTo;

  const togglePeriod = () => {
    if (isAllPeriod) {
      setDateFrom(getDefaultDateFrom());
      setDateTo("");
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  const totalStats = useMemo(() => {
    return filtered.reduce(
      (acc, b) => ({
        total: acc.total + b.total_count,
        valid: acc.valid + b.valid_count,
        duplicate: acc.duplicate + b.duplicate_count,
        error: acc.error + b.error_count,
      }),
      { total: 0, valid: 0, duplicate: 0, error: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
          <History className="h-6 w-6 text-neutral-400" />
          업로드 이력
        </h1>
      </div>

      {/* Filters */}
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
          <Button variant="outline" size="sm" onClick={togglePeriod}>
            {isAllPeriod ? "최근 1개월" : "전체 기간"}
          </Button>
          <span className="text-xs text-neutral-500">
            {isAllPeriod ? "전체 기간 조회 중" : "선택된 기간의 업로드 이력이 표시됩니다"}
          </span>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-neutral-100">{formatNumber(filtered.length)}</p>
            <p className="text-xs text-neutral-400">업로드 횟수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-green-400">{formatNumber(totalStats.valid)}</p>
            <p className="text-xs text-neutral-400">유효 코드</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-yellow-400">{formatNumber(totalStats.duplicate)}</p>
            <p className="text-xs text-neutral-400">중복</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-2xl font-bold text-red-400">{formatNumber(totalStats.error)}</p>
            <p className="text-xs text-neutral-400">오류</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-neutral-400" />
            배치 목록
            <span className="text-sm font-normal text-neutral-500">({formatNumber(filtered.length)}건)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-neutral-400">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-neutral-400">해당 기간에 업로드 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">파일명</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">게임</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">아이템</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">업로더</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">업로드일시</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">유효</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">중복</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">오류</th>
                    <th className="px-4 py-3 text-center text-neutral-300 font-medium">CSV</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((batch) => (
                    <tr key={batch.id} className="border-t border-neutral-700/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3 text-neutral-100 font-medium">{batch.file_name}</td>
                      <td className="px-4 py-3 text-neutral-300">{gameName(batch.game_id)}</td>
                      <td className="px-4 py-3 text-neutral-300">{itemName(batch.item_id)}</td>
                      <td className="px-4 py-3 text-neutral-300">{adminName(batch.admin_id)}</td>
                      <td className="px-4 py-3 text-neutral-400">{formatDateTime(batch.uploaded_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge className="bg-green-900/30 text-green-400">{formatNumber(batch.valid_count)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {batch.duplicate_count > 0 ? (
                          <Badge className="bg-yellow-900/30 text-yellow-400">{formatNumber(batch.duplicate_count)}</Badge>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {batch.error_count > 0 ? (
                          <Badge className="bg-red-900/30 text-red-400">{formatNumber(batch.error_count)}</Badge>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {batch.file_path ? (
                          <button
                            onClick={() => handleDownload(batch.id)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/20 transition-colors"
                            title="원본 CSV 다운로드"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-neutral-600 text-xs" title="원본 파일 없음">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
