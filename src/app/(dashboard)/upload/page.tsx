"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { Upload, FileCheck, AlertCircle, Download, Plus, Check } from "lucide-react";
import type { Game, Collection, Item, Admin, ParsedItemGroup, MultiItemUploadResult } from "@/lib/types";

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="p-6 text-neutral-400">로딩 중...</div>}>
      <UploadPageContent />
    </Suspense>
  );
}

function UploadPageContent() {
  const searchParams = useSearchParams();

  const [games, setGames] = useState<Game[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);

  const [selectedGame, setSelectedGame] = useState(searchParams.get("game_id") || "");
  const [selectedCollection, setSelectedCollection] = useState(searchParams.get("collection_id") || "");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedGroups, setParsedGroups] = useState<ParsedItemGroup[]>([]);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Inline new game/collection
  const [showNewGame, setShowNewGame] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGamePublisher, setNewGamePublisher] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<MultiItemUploadResult | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/games").then((r) => r.json()),
      fetch("/api/admins?active=true").then((r) => r.json()),
    ]).then(([g, a]) => {
      setGames(g);
      setAdmins(a);
    });
  }, []);

  // Load collections when game changes
  useEffect(() => {
    if (selectedGame && selectedGame !== "__new__") {
      fetch(`/api/collections?game_id=${selectedGame}`).then((r) => r.json()).then(setCollections);
      if (!searchParams.get("collection_id")) setSelectedCollection("");
    } else {
      setCollections([]);
      setSelectedCollection("");
    }
    setExistingItems([]);
  }, [selectedGame, searchParams]);

  // Load existing items when collection changes
  useEffect(() => {
    if (selectedCollection && selectedCollection !== "__new__") {
      fetch(`/api/items?collection_id=${selectedCollection}`).then((r) => r.json()).then((items: Item[]) => {
        setExistingItems(items);
        // Re-match parsed groups against new items
        if (parsedGroups.length > 0) {
          setParsedGroups((prev) => matchGroupsToItems(prev, items));
        }
      });
    } else {
      setExistingItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection]);

  const matchGroupsToItems = (groups: ParsedItemGroup[], items: Item[]): ParsedItemGroup[] => {
    return groups.map((g) => {
      const match = items.find((i) => i.name.trim().toLowerCase() === g.itemName.trim().toLowerCase());
      return {
        ...g,
        existingItemId: match ? match.id : null,
        existingPrice: match ? match.price : null,
        isNew: !match,
        checked: !match ? g.checked : false,
      };
    });
  };

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setParseError("");
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const hasItemName = headers.some((h) => h.trim() === "아이템명");
        const hasCode = headers.some((h) => h.trim() === "코드");

        if (!hasItemName || !hasCode) {
          setParseError("CSV에 '아이템명', '코드' 컬럼이 필요합니다.");
          setParsedGroups([]);
          return;
        }

        const rows = results.data as Record<string, string>[];
        const groupMap = new Map<string, { codes: string[]; price: number }>();

        for (const row of rows) {
          const itemName = (row["아이템명"] || "").trim();
          const code = (row["코드"] || "").trim();
          const price = parseFloat(row["가격"] || "0") || 0;

          if (!itemName || !code) continue;

          if (!groupMap.has(itemName)) {
            groupMap.set(itemName, { codes: [], price });
          }
          groupMap.get(itemName)!.codes.push(code);
        }

        if (groupMap.size === 0) {
          setParseError("유효한 데이터가 없습니다.");
          setParsedGroups([]);
          return;
        }

        const groups: ParsedItemGroup[] = Array.from(groupMap.entries()).map(([itemName, data]) => ({
          itemName,
          codes: data.codes,
          price: data.price,
          existingItemId: null,
          existingPrice: null,
          isNew: true,
          checked: true,
        }));

        // Match against existing items if collection is selected
        setParsedGroups(matchGroupsToItems(groups, existingItems));
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingItems]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleGroupCheck = (idx: number) => {
    setParsedGroups((prev) =>
      prev.map((g, i) => (i === idx && g.isNew ? { ...g, checked: !g.checked } : g))
    );
  };

  const toggleSelectAll = () => {
    const newGroups = parsedGroups.filter((g) => g.isNew);
    const allChecked = newGroups.every((g) => g.checked);
    setParsedGroups((prev) =>
      prev.map((g) => (g.isNew ? { ...g, checked: !allChecked } : g))
    );
  };

  const hasExistingItems = parsedGroups.some((g) => !g.isNew);
  const hasCheckedNew = parsedGroups.some((g) => g.isNew && g.checked);
  const activeGroups = parsedGroups.filter((g) => !g.isNew || g.checked);
  const totalActiveCodes = activeGroups.reduce((sum, g) => sum + g.codes.length, 0);

  const gameReady = selectedGame && selectedGame !== "__new__";
  const collectionReady = selectedCollection && selectedCollection !== "__new__";
  const expiryReady = noExpiry || !!expiresAt;
  const canUpload = gameReady && collectionReady && selectedAdmin && expiryReady && parsedGroups.length > 0 && (hasExistingItems || hasCheckedNew) && !uploading;

  const handleGameSelect = (val: string) => {
    if (val === "__new__") {
      setShowNewGame(true);
      setSelectedGame("");
    } else {
      setShowNewGame(false);
      setSelectedGame(val);
    }
  };

  const handleCollectionSelect = (val: string) => {
    if (val === "__new__") {
      setShowNewCollection(true);
      setSelectedCollection("");
    } else {
      setShowNewCollection(false);
      setSelectedCollection(val);
    }
  };

  const createNewGame = async () => {
    if (!newGameName.trim() || !newGamePublisher.trim()) return;
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGameName.trim(), publisher: newGamePublisher.trim() }),
    });
    const game = await res.json();
    setGames((prev) => [...prev, game]);
    setSelectedGame(String(game.id));
    setShowNewGame(false);
    setNewGameName("");
    setNewGamePublisher("");
  };

  const createNewCollection = async () => {
    if (!newCollectionName.trim() || !selectedGame) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_id: Number(selectedGame), name: newCollectionName.trim() }),
    });
    const collection = await res.json();
    setCollections((prev) => [...prev, collection]);
    setSelectedCollection(String(collection.id));
    setShowNewCollection(false);
    setNewCollectionName("");
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    try {
      const uploadGroups = activeGroups.map((g) => ({
        itemName: g.itemName,
        codes: g.codes,
        price: g.price,
        existingItemId: g.existingItemId,
      }));

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: uploadGroups,
          collectionId: Number(selectedCollection),
          gameId: Number(selectedGame),
          adminId: Number(selectedAdmin),
          fileName,
          expiresAt: noExpiry ? null : (expiresAt || null),
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrors = () => {
    if (!result) return;
    const rows: string[][] = [["아이템명", "코드", "사유"]];
    for (const ir of result.itemResults) {
      for (const e of ir.validation.errorCodes) {
        rows.push([ir.itemName, e.code, e.reason]);
      }
      for (const c of ir.validation.duplicateCodes) {
        rows.push([ir.itemName, c, "중복"]);
      }
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "error_codes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const newItemGroups = parsedGroups.filter((g) => g.isNew);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-100">코드 업로드</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>CSV 파일 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meta Info — Game, Collection, Admin, Expiry (선행 설정) */}
            <div className="space-y-3">
              {/* Game */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">게임</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SelectNative
                      value={selectedGame}
                      onChange={(e) => handleGameSelect(e.target.value)}
                      placeholder="게임 선택"
                      options={[
                        ...games.map((g) => ({ value: String(g.id), label: g.name })),
                        { value: "__new__", label: "+ 새로 추가" },
                      ]}
                    />
                  </div>
                </div>
                {showNewGame && (
                  <div className="mt-2 space-y-2 rounded-lg border border-neutral-600 bg-neutral-800/50 p-3">
                    <Input
                      placeholder="게임 이름"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                    />
                    <Input
                      placeholder="퍼블리셔"
                      value={newGamePublisher}
                      onChange={(e) => setNewGamePublisher(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={createNewGame} disabled={!newGameName.trim() || !newGamePublisher.trim()}>
                        <Plus className="mr-1 h-3 w-3" />
                        생성
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowNewGame(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Collection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">컬렉션</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SelectNative
                      value={selectedCollection}
                      onChange={(e) => handleCollectionSelect(e.target.value)}
                      placeholder="컬렉션 선택"
                      options={[
                        ...collections.map((c) => ({ value: String(c.id), label: c.name })),
                        ...(gameReady ? [{ value: "__new__", label: "+ 새로 추가" }] : []),
                      ]}
                      disabled={!gameReady}
                    />
                  </div>
                </div>
                {showNewCollection && (
                  <div className="mt-2 space-y-2 rounded-lg border border-neutral-600 bg-neutral-800/50 p-3">
                    <Input
                      placeholder="컬렉션 이름"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={createNewCollection} disabled={!newCollectionName.trim()}>
                        <Plus className="mr-1 h-3 w-3" />
                        생성
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowNewCollection(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">담당자</label>
                <SelectNative
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  placeholder="담당자 선택"
                  options={admins.map((a) => ({ value: String(a.id), label: `${a.name} (${a.email})` }))}
                />
              </div>

              {/* Expiry */}
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-200">만료일</label>
                  <button
                    type="button"
                    onClick={() => { setNoExpiry(!noExpiry); if (!noExpiry) setExpiresAt(""); }}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                      noExpiry
                        ? "bg-blue-900/30 text-blue-400"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {noExpiry && <Check className="h-3 w-3" />}
                    만료일 없음
                  </button>
                </div>
                {!noExpiry && (
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                )}
                {noExpiry && (
                  <p className="text-xs text-neutral-500">유통기한 없이 등록됩니다.</p>
                )}
              </div>
            </div>

            {/* CSV Upload — 게임/컬렉션 선택 후 활성화 */}
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-xs text-neutral-400">
              <p className="mb-1 font-medium text-neutral-300">CSV 양식</p>
              <code className="block whitespace-pre text-neutral-500">아이템명,코드,가격{"\n"}골드 1000,ABC-123-DEF,5.00{"\n"}스킨 팩,MNO-789-PQR,15.00</code>
              <p className="mt-1 text-neutral-500">* 가격 컬럼은 선택 (없으면 0)</p>
            </div>

            {collectionReady ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                  isDragging ? "border-blue-400 bg-blue-900/20" : "border-neutral-600"
                }`}
              >
                <Upload className="mb-2 h-8 w-8 text-neutral-500" />
                <p className="text-sm text-neutral-400">CSV 파일을 드래그하거나</p>
                <label className="mt-2 cursor-pointer text-sm font-medium text-blue-400 hover:underline">
                  파일 선택
                  <input type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
                </label>
                {fileName && !parseError && (
                  <p className="mt-3 text-sm font-medium text-neutral-100">
                    {fileName} ({formatNumber(parsedGroups.reduce((s, g) => s + g.codes.length, 0))}건 파싱됨, {parsedGroups.length}개 아이템)
                  </p>
                )}
                {parseError && (
                  <p className="mt-3 flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {parseError}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-800/30 p-8">
                <Upload className="mb-2 h-8 w-8 text-neutral-600" />
                <p className="text-sm text-neutral-500">게임과 컬렉션을 먼저 선택해주세요</p>
                <p className="mt-1 text-xs text-neutral-600">CSV 파싱 시 기존/신규 아이템 구분에 필요합니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validation / Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              {result ? "업로드 결과" : "CSV 분석 결과"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && parsedGroups.length === 0 ? (
              <p className="text-sm text-neutral-400">CSV 파일을 업로드하면 아이템별 분석 결과가 표시됩니다.</p>
            ) : !result ? (
              /* Pre-upload analysis */
              <div className="space-y-4">
                {/* Select all toggle for new items */}
                {newItemGroups.length > 0 && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={newItemGroups.every((g) => g.checked)}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-blue-500"
                    />
                    전체 선택 (신규 아이템 {newItemGroups.length}개)
                  </label>
                )}

                {/* Item summary table */}
                <div className="overflow-hidden rounded-lg border border-neutral-700">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-800/80">
                      <tr>
                        <th className="w-10 px-3 py-2"></th>
                        <th className="px-3 py-2 text-left text-neutral-300">아이템명</th>
                        <th className="px-3 py-2 text-right text-neutral-300">코드 수</th>
                        <th className="px-3 py-2 text-right text-neutral-300">가격</th>
                        <th className="px-3 py-2 text-center text-neutral-300">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedGroups.map((g, idx) => (
                        <tr key={idx} className="border-t border-neutral-700/50">
                          <td className="px-3 py-2 text-center">
                            {g.isNew ? (
                              <input
                                type="checkbox"
                                checked={g.checked}
                                onChange={() => toggleGroupCheck(idx)}
                                className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-blue-500"
                              />
                            ) : null}
                          </td>
                          <td className="px-3 py-2 font-medium text-neutral-100">{g.itemName}</td>
                          <td className="px-3 py-2 text-right text-neutral-300">{formatNumber(g.codes.length)}건</td>
                          <td className="px-3 py-2 text-right">
                            {g.isNew ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-neutral-500">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={g.price || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setParsedGroups((prev) => prev.map((p, i) => i === idx ? { ...p, price: val } : p));
                                  }}
                                  placeholder="Free"
                                  className="w-16 rounded border border-neutral-600 bg-neutral-800 px-1.5 py-0.5 text-right text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                            ) : (
                              <span className="text-neutral-300">${(g.existingPrice ?? g.price).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {g.isNew ? (
                              <Badge className="bg-yellow-900/30 text-yellow-400 text-xs">신규</Badge>
                            ) : (
                              <Badge className="bg-blue-900/30 text-blue-400 text-xs">기존</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-neutral-800/50 p-3 text-sm text-neutral-300">
                  <p>
                    전체: <span className="font-medium text-neutral-100">{formatNumber(parsedGroups.reduce((s, g) => s + g.codes.length, 0))}건</span>
                    {" · "}기존 아이템: <span className="font-medium text-neutral-100">{parsedGroups.filter((g) => !g.isNew).length}</span>
                    {" · "}신규 아이템: <span className="font-medium text-neutral-100">{newItemGroups.length}</span>
                  </p>
                  {hasCheckedNew && (
                    <p className="mt-1 text-xs text-yellow-400">
                      체크된 신규 아이템은 저장 시 자동 생성됩니다.
                    </p>
                  )}
                  {parsedGroups.some((g) => g.isNew && g.checked && g.price <= 0) && (
                    <p className="mt-1 text-xs text-yellow-400">
                      가격 미입력 아이템은 Free(무료)로 등록됩니다.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">
                    업로드 대상: {formatNumber(totalActiveCodes)}건 ({activeGroups.length}개 아이템)
                  </p>
                </div>

                <Button onClick={handleUpload} disabled={!canUpload} className="w-full">
                  {uploading ? "업로드 중..." : "코드 저장"}
                </Button>
              </div>
            ) : (
              /* Post-upload result */
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-green-900/20 p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{formatNumber(result.summary.totalValid)}</p>
                    <p className="text-xs text-green-500">정상</p>
                  </div>
                  <div className="rounded-lg bg-yellow-900/20 p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{formatNumber(result.summary.totalDuplicate)}</p>
                    <p className="text-xs text-yellow-500">중복</p>
                  </div>
                  <div className="rounded-lg bg-red-900/20 p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{formatNumber(result.summary.totalError)}</p>
                    <p className="text-xs text-red-500">오류</p>
                  </div>
                </div>

                {/* Overall info */}
                <div className="rounded-lg bg-neutral-800/50 p-3 text-sm text-neutral-300">
                  <p>파일: <span className="font-medium text-neutral-100">{fileName}</span></p>
                  <p>전체: {formatNumber(result.summary.totalCodes)}건</p>
                  {result.summary.newItemsCreated > 0 && (
                    <p>신규 아이템 생성: <span className="font-medium text-green-400">{result.summary.newItemsCreated}개</span></p>
                  )}
                </div>

                {/* Per-item results */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-200">아이템별 결과</p>
                  <div className="overflow-hidden rounded-lg border border-neutral-700">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-800/80">
                        <tr>
                          <th className="px-3 py-2 text-left text-neutral-300">아이템</th>
                          <th className="px-3 py-2 text-right text-neutral-300">정상</th>
                          <th className="px-3 py-2 text-right text-neutral-300">중복</th>
                          <th className="px-3 py-2 text-right text-neutral-300">오류</th>
                          <th className="px-3 py-2 text-center text-neutral-300">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.itemResults.map((ir, idx) => (
                          <tr key={idx} className="border-t border-neutral-700/50">
                            <td className="px-3 py-2 text-neutral-100">{ir.itemName}</td>
                            <td className="px-3 py-2 text-right text-green-400">{formatNumber(ir.validation.validCodes.length)}</td>
                            <td className="px-3 py-2 text-right text-yellow-400">{formatNumber(ir.validation.duplicateCodes.length)}</td>
                            <td className="px-3 py-2 text-right text-red-400">{formatNumber(ir.validation.errorCodes.length)}</td>
                            <td className="px-3 py-2 text-center">
                              {ir.isNew ? (
                                <Badge className="bg-green-900/30 text-green-400 text-xs">생성됨</Badge>
                              ) : (
                                <Badge className="bg-blue-900/30 text-blue-400 text-xs">기존</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Download errors */}
                {(result.summary.totalDuplicate > 0 || result.summary.totalError > 0) && (
                  <Button variant="outline" size="sm" onClick={downloadErrors} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    오류/중복 코드 다운로드
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
