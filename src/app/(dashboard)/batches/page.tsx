"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { History, Download, FileSpreadsheet, ChevronDown, ChevronUp, AlertTriangle, Copy, CheckCircle, Plus, Tag, X, Save } from "lucide-react";
import type { UploadBatch, Game, Admin, Item } from "@/lib/types";

function getDefaultDateFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

type DetailType = "duplicate" | "error" | "promo" | "info";

export default function BatchesPage() {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState("");

  // Track which batch+type is expanded: "batchId-duplicate" or "batchId-error"
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [batchStatuses, setBatchStatuses] = useState<Record<number, { received: number; registered: number; sold: number }>>({});

  const fetchData = () => {
    Promise.all([
      fetch("/api/batches").then((r) => r.json()).catch(() => []),
      fetch("/api/games").then((r) => r.json()).catch(() => []),
      fetch("/api/admins").then((r) => r.json()).catch(() => []),
      fetch("/api/items").then((r) => r.json()).catch(() => []),
      fetch("/api/batches?status_summary=true").then((r) => r.json()).catch(() => ({})),
    ]).then(([bat, gam, adm, itm, statuses]) => {
      setBatches(Array.isArray(bat) ? bat : []);
      setGames(Array.isArray(gam) ? gam : []);
      setAdmins(Array.isArray(adm) ? adm : []);
      setItems(Array.isArray(itm) ? itm : []);
      setBatchStatuses(statuses || {});
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getBatchStatus = (batchId: number): "received" | "registered" | "sold" | null => {
    const s = batchStatuses[batchId];
    if (!s) return null;
    if (s.sold > 0 && s.received === 0 && s.registered === 0) return "sold";
    if (s.registered > 0 && s.received === 0 && s.sold === 0) return "registered";
    if (s.received > 0 && s.registered === 0 && s.sold === 0) return "received";
    // Mixed state — show dominant
    if (s.sold >= s.registered && s.sold >= s.received) return "sold";
    if (s.registered >= s.received) return "registered";
    return "received";
  };

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    received: { label: "대기", className: "bg-yellow-900/30 text-yellow-400" },
    registered: { label: "등록", className: "bg-blue-900/30 text-blue-400" },
    sold: { label: "판매완료", className: "bg-green-900/30 text-green-400" },
  };

  const handleStatusChange = async (batchId: number, newStatus: string) => {
    const res = await fetch("/api/batches/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, status: newStatus }),
    });
    if (res.ok) {
      fetchData();
    }
  };

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

  const toggleBatch = (id: number) => {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedBatches.size === filtered.length) {
      setSelectedBatches(new Set());
    } else {
      setSelectedBatches(new Set(filtered.map((b) => b.id)));
    }
  };

  const handleBatchSold = async () => {
    if (!confirm(`선택한 ${selectedBatches.size}개 배치의 모든 코드를 판매완료 처리하시겠습니까?`)) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/batches/sold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchIds: Array.from(selectedBatches) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.updatedCount}건의 코드가 판매완료 처리되었습니다.`);
        setSelectedBatches(new Set());
        fetchData();
      } else {
        alert(data.error || "처리 실패");
      }
    } finally {
      setProcessing(false);
    }
  };

  // Promo editing
  const [editingPromos, setEditingPromos] = useState<{ count: number; discount: number }[]>([]);
  const [savingPromo, setSavingPromo] = useState(false);

  const openPromoEdit = (batch: UploadBatch) => {
    setEditingPromos(batch.promotions ? [...batch.promotions] : []);
    const key = `${batch.id}-promo`;
    setExpandedDetail((prev) => (prev === key ? null : key));
  };

  const addPromoRow = () => {
    setEditingPromos((prev) => [...prev, { count: 0, discount: 0 }]);
  };

  const updatePromoRow = (idx: number, field: "count" | "discount", value: number) => {
    setEditingPromos((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePromoRow = (idx: number) => {
    setEditingPromos((prev) => prev.filter((_, i) => i !== idx));
  };

  const savePromos = async (batchId: number) => {
    setSavingPromo(true);
    try {
      const validPromos = editingPromos.filter((p) => p.count > 0 && p.discount > 0);
      const res = await fetch("/api/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: batchId, promotions: validPromos }),
      });
      if (res.ok) {
        fetchData();
        setExpandedDetail(null);
      }
    } finally {
      setSavingPromo(false);
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

  const toggleDetail = (batchId: number, type: DetailType) => {
    const key = `${batchId}-${type}`;
    setExpandedDetail((prev) => (prev === key ? null : key));
  };

  const renderDetailCard = (batch: UploadBatch) => {
    const dupKey = `${batch.id}-duplicate`;
    const errKey = `${batch.id}-error`;
    const promoKey = `${batch.id}-promo`;
    const infoKey = `${batch.id}-info`;
    const showDup = expandedDetail === dupKey;
    const showErr = expandedDetail === errKey;
    const showPromo = expandedDetail === promoKey;
    const showInfo = expandedDetail === infoKey;

    if (!showDup && !showErr && !showPromo && !showInfo) return null;

    const details = batch.validation_details;

    return (
      <tr>
        <td colSpan={12} className="px-0 py-0">
          <div className="mx-4 my-3 rounded-lg border border-neutral-700/50 bg-neutral-800/50 p-4">
            {showInfo ? (
              <div className="space-y-4">
                {/* Batch info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neutral-500">게임:</span>{" "}
                    <span className="text-neutral-200">{gameName(batch.game_id)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">아이템:</span>{" "}
                    <span className="text-neutral-200">{itemName(batch.item_id)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">업로더:</span>{" "}
                    <span className="text-neutral-200">{adminName(batch.admin_id)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">코드:</span>{" "}
                    <span className="text-neutral-200">{formatNumber(batch.valid_count)}건 유효 / {formatNumber(batch.total_count)}건 전체</span>
                  </div>
                </div>

                {/* Promotions summary */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">프로모션 이력</span>
                  </div>
                  {!batch.promotions || batch.promotions.length === 0 ? (
                    <p className="text-sm text-neutral-500">등록된 프로모션이 없습니다.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {batch.promotions.map((promo, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded border border-purple-900/30 bg-purple-900/10 px-3 py-2 text-sm">
                          <Badge className="bg-purple-900/30 text-purple-400">{formatNumber(promo.count)}건</Badge>
                          <span className="text-neutral-300">{promo.discount}% 할인</span>
                          <span className="text-neutral-500 text-xs">
                            (할인액 약 ${formatNumber(Math.round(promo.count * (items.find((i) => i.id === batch.item_id)?.price ?? 0) * promo.discount / 100 * 100) / 100)})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : showPromo ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">프로모션 관리</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={addPromoRow} className="text-xs h-7">
                      <Plus className="mr-1 h-3 w-3" />
                      추가
                    </Button>
                    <Button size="sm" onClick={() => savePromos(batch.id)} disabled={savingPromo} className="text-xs h-7">
                      <Save className="mr-1 h-3 w-3" />
                      {savingPromo ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </div>
                {editingPromos.length === 0 ? (
                  <p className="text-sm text-neutral-500">프로모션이 없습니다. &quot;추가&quot; 버튼으로 추가하세요.</p>
                ) : (
                  <div className="space-y-2">
                    {editingPromos.map((promo, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded border border-neutral-700/50 bg-neutral-900/50 px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={promo.count || ""}
                          onChange={(e) => updatePromoRow(idx, "count", parseInt(e.target.value) || 0)}
                          placeholder="코드 수"
                          className="w-24 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-sm text-neutral-400">건</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={promo.discount || ""}
                          onChange={(e) => updatePromoRow(idx, "discount", parseInt(e.target.value) || 0)}
                          placeholder="할인율"
                          className="w-20 rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                        />
                        <span className="text-sm text-neutral-400">% 할인</span>
                        <button onClick={() => removePromoRow(idx)} className="ml-auto text-neutral-500 hover:text-red-400 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : !details ? (
              <p className="text-sm text-neutral-500">상세 내역 없음 (이전 업로드 데이터)</p>
            ) : showDup ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">중복 코드 목록</span>
                  <span className="text-xs text-neutral-500">({details.duplicateCodes.length}건)</span>
                </div>
                {details.duplicateCodes.length === 0 ? (
                  <p className="text-sm text-neutral-500">중복 코드가 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {details.duplicateCodes.map((code, i) => (
                      <Badge key={i} className="bg-yellow-900/20 text-yellow-400 border border-yellow-800/30 font-mono text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : showErr ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">오류 코드 목록</span>
                  <span className="text-xs text-neutral-500">({details.errorCodes.length}건)</span>
                </div>
                {details.errorCodes.length === 0 ? (
                  <p className="text-sm text-neutral-500">오류 코드가 없습니다.</p>
                ) : (
                  <div className="space-y-1.5">
                    {details.errorCodes.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Badge className="bg-red-900/20 text-red-400 border border-red-800/30 font-mono text-xs shrink-0">
                          {item.code || "(빈 값)"}
                        </Badge>
                        <span className="text-neutral-500">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-neutral-400" />
            배치 목록
            <span className="text-sm font-normal text-neutral-500">({formatNumber(filtered.length)}건)</span>
          </CardTitle>
          {selectedBatches.size > 0 && (
            <Button onClick={handleBatchSold} disabled={processing} size="sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              {processing ? "처리 중..." : `선택 배치 판매완료 (${selectedBatches.size}개)`}
            </Button>
          )}
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
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedBatches.size === filtered.length}
                        onChange={toggleAll}
                        className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500/30"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">파일명</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">게임</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">아이템</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">업로더</th>
                    <th className="px-4 py-3 text-left text-neutral-300 font-medium">업로드일시</th>
                    <th className="px-4 py-3 text-center text-neutral-300 font-medium">상태</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">유효</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">중복</th>
                    <th className="px-4 py-3 text-right text-neutral-300 font-medium">오류</th>
                    <th className="px-4 py-3 text-center text-neutral-300 font-medium">프로모션</th>
                    <th className="px-4 py-3 text-center text-neutral-300 font-medium">CSV</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((batch) => {
                    const dupExpanded = expandedDetail === `${batch.id}-duplicate`;
                    const errExpanded = expandedDetail === `${batch.id}-error`;

                    return (
                      <>
                        <tr key={batch.id} className="border-t border-neutral-700/50 hover:bg-neutral-800/30 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedBatches.has(batch.id)}
                              onChange={() => toggleBatch(batch.id)}
                              className="rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500/30"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleDetail(batch.id, "info")}
                              className="text-neutral-100 font-medium hover:text-blue-400 transition-colors text-left"
                            >
                              {batch.file_name}
                              {expandedDetail === `${batch.id}-info` ? (
                                <ChevronUp className="ml-1 h-3 w-3 inline text-neutral-500" />
                              ) : (
                                <ChevronDown className="ml-1 h-3 w-3 inline text-neutral-500" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-neutral-300">{gameName(batch.game_id)}</td>
                          <td className="px-4 py-3 text-neutral-300">{itemName(batch.item_id)}</td>
                          <td className="px-4 py-3 text-neutral-300">{adminName(batch.admin_id)}</td>
                          <td className="px-4 py-3 text-neutral-400">{formatDateTime(batch.uploaded_at)}</td>
                          <td className="px-4 py-3 text-center">
                            <SelectNative
                              value={getBatchStatus(batch.id) || "received"}
                              onChange={(e) => handleStatusChange(batch.id, e.target.value)}
                              options={[
                                { value: "received", label: "대기" },
                                { value: "registered", label: "등록" },
                                { value: "sold", label: "판매완료" },
                              ]}
                              className={`h-7 w-24 text-xs font-medium ${
                                {
                                  received: "text-yellow-400",
                                  registered: "text-blue-400",
                                  sold: "text-green-400",
                                }[getBatchStatus(batch.id) || "received"]
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge className="bg-green-900/30 text-green-400">{formatNumber(batch.valid_count)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {batch.duplicate_count > 0 ? (
                              <button
                                onClick={() => toggleDetail(batch.id, "duplicate")}
                                className="inline-flex items-center gap-1 rounded transition-colors hover:ring-1 hover:ring-yellow-700/50"
                              >
                                <Badge className="bg-yellow-900/30 text-yellow-400 cursor-pointer">
                                  {formatNumber(batch.duplicate_count)}
                                  {dupExpanded ? (
                                    <ChevronUp className="ml-1 h-3 w-3 inline" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3 inline" />
                                  )}
                                </Badge>
                              </button>
                            ) : (
                              <span className="text-neutral-600">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {batch.error_count > 0 ? (
                              <button
                                onClick={() => toggleDetail(batch.id, "error")}
                                className="inline-flex items-center gap-1 rounded transition-colors hover:ring-1 hover:ring-red-700/50"
                              >
                                <Badge className="bg-red-900/30 text-red-400 cursor-pointer">
                                  {formatNumber(batch.error_count)}
                                  {errExpanded ? (
                                    <ChevronUp className="ml-1 h-3 w-3 inline" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3 inline" />
                                  )}
                                </Badge>
                              </button>
                            ) : (
                              <span className="text-neutral-600">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openPromoEdit(batch)}
                              className="inline-flex items-center gap-1 rounded transition-colors hover:ring-1 hover:ring-purple-700/50"
                            >
                              {batch.promotions && batch.promotions.length > 0 ? (
                                <Badge className="bg-purple-900/30 text-purple-400 cursor-pointer">
                                  {batch.promotions.length}건
                                  {expandedDetail === `${batch.id}-promo` ? (
                                    <ChevronUp className="ml-1 h-3 w-3 inline" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-3 w-3 inline" />
                                  )}
                                </Badge>
                              ) : (
                                <Badge className="bg-neutral-800 text-neutral-500 cursor-pointer">
                                  <Plus className="mr-1 h-3 w-3 inline" />
                                  추가
                                </Badge>
                              )}
                            </button>
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
                        {renderDetailCard(batch)}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
