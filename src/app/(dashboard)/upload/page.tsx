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
import { Upload, FileCheck, AlertCircle, Download, Plus, Check, CheckCircle2 } from "lucide-react";
import type { Game, Collection, Item, Admin, MultiItemUploadResult } from "@/lib/types";

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
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [initialStatus, setInitialStatus] = useState<"received" | "registered">("received");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsedCodes, setParsedCodes] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Inline new game/collection/item
  const [showNewGame, setShowNewGame] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGamePublisher, setNewGamePublisher] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<MultiItemUploadResult | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [createError, setCreateError] = useState("");

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
    setSelectedItem("");
  }, [selectedGame, searchParams]);

  // Load existing items when collection changes
  useEffect(() => {
    if (selectedCollection && selectedCollection !== "__new__") {
      fetch(`/api/items?collection_id=${selectedCollection}`).then((r) => r.json()).then((items: Item[]) => {
        setExistingItems(items);
      });
    } else {
      setExistingItems([]);
    }
    setSelectedItem("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection]);

  const handleFile = useCallback((file: File) => {
    setCsvFile(file);
    setFileName(file.name);
    setParseError("");
    setResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const hasProductCode = headers.some((h) => h.trim() === "product_code");

        if (!hasProductCode) {
          setParseError("CSV에 'product_code' 컬럼이 필요합니다.");
          setParsedCodes([]);
          return;
        }

        const rows = results.data as Record<string, string>[];
        const codes: string[] = [];

        for (const row of rows) {
          const code = (row["product_code"] || "").trim();
          if (code) codes.push(code);
        }

        if (codes.length === 0) {
          setParseError("유효한 코드가 없습니다.");
          setParsedCodes([]);
          return;
        }

        setParsedCodes(codes);
      },
    });
  }, []);

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

  const gameReady = selectedGame && selectedGame !== "__new__";
  const collectionReady = selectedCollection && selectedCollection !== "__new__";
  const itemReady = (selectedItem && selectedItem !== "__new__") || (showNewItem && newItemName.trim());
  const expiryReady = noExpiry || !!expiresAt;
  const canUpload = gameReady && collectionReady && itemReady && selectedAdmin && expiryReady && parsedCodes.length > 0 && !uploading;

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

  const handleItemSelect = (val: string) => {
    if (val === "__new__") {
      setShowNewItem(true);
      setSelectedItem("");
    } else {
      setShowNewItem(false);
      setSelectedItem(val);
    }
  };

  const createNewGame = async () => {
    if (!newGameName.trim() || !newGamePublisher.trim()) return;
    setCreateError("");
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGameName.trim(), publisher: newGamePublisher.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || `게임 생성 실패 (${res.status})`);
        return;
      }
      setGames((prev) => [...prev, data]);
      setSelectedGame(String(data.id));
      setShowNewGame(false);
      setNewGameName("");
      setNewGamePublisher("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "게임 생성 중 오류가 발생했습니다.");
    }
  };

  const createNewCollection = async () => {
    if (!newCollectionName.trim() || !selectedGame) return;
    setCreateError("");
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: Number(selectedGame), name: newCollectionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || `컬렉션 생성 실패 (${res.status})`);
        return;
      }
      setCollections((prev) => [...prev, data]);
      setSelectedCollection(String(data.id));
      setShowNewCollection(false);
      setNewCollectionName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "컬렉션 생성 중 오류가 발생했습니다.");
    }
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    setUploadError("");
    try {
      // Determine item info
      let itemName: string;
      let price: number;
      let existingItemId: number | null;

      if (selectedItem && selectedItem !== "__new__") {
        const item = existingItems.find((i) => i.id === Number(selectedItem));
        itemName = item?.name || "";
        price = item?.price || 0;
        existingItemId = Number(selectedItem);
      } else {
        itemName = newItemName.trim();
        price = parseFloat(newItemPrice) || 0;
        existingItemId = null;
      }

      const jsonData = JSON.stringify({
        groups: [{ itemName, codes: parsedCodes, price, existingItemId }],
        collectionId: Number(selectedCollection),
        gameId: Number(selectedGame),
        adminId: Number(selectedAdmin),
        fileName,
        expiresAt: noExpiry ? null : (expiresAt || null),
        initialStatus,
      });

      const formData = new FormData();
      formData.append("data", jsonData);
      if (csvFile) {
        formData.append("file", csvFile);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || `업로드 실패 (${res.status})`);
        return;
      }

      setResult(data);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const downloadErrors = () => {
    if (!result) return;
    const rows: string[][] = [["코드", "사유"]];
    for (const ir of result.itemResults) {
      for (const e of ir.validation.errorCodes) {
        rows.push([e.code, e.reason]);
      }
      for (const c of ir.validation.duplicateCodes) {
        rows.push([c, "중복"]);
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

  // Get selected item info for display
  const selectedItemObj = selectedItem ? existingItems.find((i) => i.id === Number(selectedItem)) : null;

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
            {createError && (
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              </div>
            )}
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

              {/* Item */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">아이템</label>
                <SelectNative
                  value={selectedItem}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  placeholder="아이템 선택"
                  options={[
                    ...existingItems.map((i) => ({ value: String(i.id), label: `${i.name} ($${i.price})` })),
                    ...(collectionReady ? [{ value: "__new__", label: "+ 새로 추가" }] : []),
                  ]}
                  disabled={!collectionReady}
                />
                {showNewItem && (
                  <div className="mt-2 space-y-2 rounded-lg border border-neutral-600 bg-neutral-800/50 p-3">
                    <Input
                      placeholder="아이템 이름"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="가격 (0이면 무료)"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        className="flex-1"
                      />
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

              {/* Initial Status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-200">초기 상태</label>
                <SelectNative
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as "received" | "registered")}
                  options={[
                    { value: "received", label: "대기 (received)" },
                    { value: "registered", label: "등록 (registered)" },
                  ]}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {initialStatus === "registered"
                    ? "이미 마켓에 등록한 코드로 간주됩니다."
                    : "업로드 후 대기 상태로 저장됩니다."}
                </p>
              </div>
            </div>

            {/* CSV format guide */}
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-xs text-neutral-400">
              <p className="mb-1 font-medium text-neutral-300">CSV 양식</p>
              <code className="block whitespace-pre text-neutral-500">product_code{"\n"}ABCD-1234-EFGH-5678{"\n"}IJKL-5678-MNOP-9012</code>
              <p className="mt-1 text-neutral-500">* 헤더는 반드시 product_code</p>
            </div>

            {/* CSV drop zone */}
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
                    {fileName} ({formatNumber(parsedCodes.length)}건 파싱됨)
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis / Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              {result ? "업로드 결과" : "업로드 준비"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && parsedCodes.length === 0 ? (
              <p className="text-sm text-neutral-400">CSV 파일을 업로드하면 분석 결과가 표시됩니다.</p>
            ) : !result ? (
              /* Pre-upload summary */
              <div className="space-y-4">
                <div className="rounded-lg bg-neutral-800/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">파싱된 코드</span>
                    <span className="font-medium text-neutral-100">{formatNumber(parsedCodes.length)}건</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">아이템</span>
                    <span className="font-medium text-neutral-100">
                      {selectedItemObj ? (
                        <>{selectedItemObj.name} <Badge className="ml-1 bg-blue-900/30 text-blue-400 text-xs">기존</Badge></>
                      ) : showNewItem && newItemName.trim() ? (
                        <>{newItemName.trim()} <Badge className="ml-1 bg-yellow-900/30 text-yellow-400 text-xs">신규</Badge></>
                      ) : (
                        <span className="text-neutral-500">미선택</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">가격</span>
                    <span className="font-medium text-neutral-100">
                      ${selectedItemObj ? selectedItemObj.price.toFixed(2) : (parseFloat(newItemPrice) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">초기 상태</span>
                    <Badge className={initialStatus === "registered" ? "bg-blue-900/30 text-blue-400" : "bg-yellow-900/30 text-yellow-400"}>
                      {initialStatus === "registered" ? "등록" : "대기"}
                    </Badge>
                  </div>
                </div>

                {showNewItem && newItemName.trim() && (
                  <p className="text-xs text-yellow-400">
                    신규 아이템 &quot;{newItemName.trim()}&quot;이(가) 저장 시 자동 생성됩니다.
                  </p>
                )}

                {uploadError && (
                  <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!canUpload} className="w-full">
                  {uploading ? "업로드 중..." : `코드 ${formatNumber(parsedCodes.length)}건 저장`}
                </Button>
              </div>
            ) : (
              /* Post-upload result */
              <div className="space-y-4">
                {/* Success banner */}
                <div className="flex items-center gap-3 rounded-lg border border-green-800 bg-green-900/20 p-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">업로드 완료</p>
                    <p className="text-xs text-green-500/80">
                      {formatNumber(result.summary.totalValid)}건의 코드가 저장되었습니다.
                    </p>
                  </div>
                </div>

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

                <div className="rounded-lg bg-neutral-800/50 p-3 text-sm text-neutral-300">
                  <p>파일: <span className="font-medium text-neutral-100">{fileName}</span></p>
                  <p>전체: {formatNumber(result.summary.totalCodes)}건</p>
                  {result.summary.newItemsCreated > 0 && (
                    <p>신규 아이템 생성: <span className="font-medium text-green-400">{result.summary.newItemsCreated}개</span></p>
                  )}
                </div>

                {(result.summary.totalDuplicate > 0 || result.summary.totalError > 0) && (
                  <Button variant="outline" size="sm" onClick={downloadErrors} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    오류/중복 코드 다운로드
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setCsvFile(null);
                    setFileName("");
                    setParsedCodes([]);
                    setUploadError("");
                  }}
                  className="w-full"
                >
                  새 업로드
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
