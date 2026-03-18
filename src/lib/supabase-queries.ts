// Supabase query helpers — 1:1 mapping to Store methods
// Falls back to in-memory Store when Supabase is not configured

import { supabase } from "./supabase";
import { getStore } from "./store";
import type {
  Game,
  Collection,
  Item,
  Code,
  Admin,
  UploadBatch,
  CodeStatus,
  InventoryMetrics,
  CollectionMetrics,
  ExpiryAlert,
  MultiItemUploadResult,
  ValidationResult,
  SyncLog,
} from "./types";

// ─── Helper ───

function isConnected() {
  return !!supabase;
}

// ─── Games ───

export async function getGames(): Promise<Game[]> {
  if (!isConnected()) return getStore().getGames();
  const { data, error } = await supabase!.from("games").select("*").order("id");
  if (error) throw new Error(error.message);
  return data as Game[];
}

export async function getGame(id: number): Promise<Game | undefined> {
  if (!isConnected()) return getStore().getGame(id);
  const { data, error } = await supabase!.from("games").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as Game;
}

export async function addGame(input: Omit<Game, "id" | "created_at">): Promise<Game> {
  if (!isConnected()) return getStore().addGame(input);
  const { data, error } = await supabase!.from("games").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Game;
}

export async function updateGame(id: number, input: Partial<Omit<Game, "id" | "created_at">>): Promise<Game | null> {
  if (!isConnected()) return getStore().updateGame(id, input) ?? null;
  const { data, error } = await supabase!.from("games").update(input).eq("id", id).select().single();
  if (error) return null;
  return data as Game;
}

export async function deleteGame(id: number): Promise<{ success: boolean; error?: string }> {
  if (!isConnected()) return getStore().deleteGame(id);
  // Check for child collections
  const { count } = await supabase!.from("collections").select("id", { count: "exact", head: true }).eq("game_id", id);
  if (count && count > 0) return { success: false, error: "컬렉션이 있는 게임은 삭제할 수 없습니다." };
  const { error } = await supabase!.from("games").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Collections ───

export async function getCollections(gameId?: number): Promise<Collection[]> {
  if (!isConnected()) return getStore().getCollections(gameId);
  let query = supabase!.from("collections").select("*").order("id");
  if (gameId) query = query.eq("game_id", gameId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Collection[];
}

export async function getCollection(id: number): Promise<Collection | undefined> {
  if (!isConnected()) return getStore().getCollection(id);
  const { data, error } = await supabase!.from("collections").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as Collection;
}

export async function addCollection(input: Omit<Collection, "id" | "created_at">): Promise<Collection> {
  if (!isConnected()) return getStore().addCollection(input);
  const { data, error } = await supabase!.from("collections").insert({
    ...input,
    image_url: input.image_url || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data as Collection;
}

export async function updateCollection(id: number, input: Partial<Omit<Collection, "id" | "created_at">>): Promise<Collection | null> {
  if (!isConnected()) return getStore().updateCollection(id, input) ?? null;
  const { data, error } = await supabase!.from("collections").update(input).eq("id", id).select().single();
  if (error) return null;
  return data as Collection;
}

export async function deleteCollection(id: number): Promise<{ success: boolean; error?: string }> {
  if (!isConnected()) return getStore().deleteCollection(id);
  const { count } = await supabase!.from("items").select("id", { count: "exact", head: true }).eq("collection_id", id);
  if (count && count > 0) return { success: false, error: "아이템이 있는 컬렉션은 삭제할 수 없습니다." };
  const { error } = await supabase!.from("collections").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Items ───

export async function getItems(collectionId?: number): Promise<Item[]> {
  if (!isConnected()) return getStore().getItems(collectionId);
  let query = supabase!.from("items").select("*").order("id");
  if (collectionId) query = query.eq("collection_id", collectionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Item[];
}

export async function getItemsByGameId(gameId: number): Promise<Item[]> {
  if (!isConnected()) return getStore().getItemsByGameId(gameId);
  // Get collection ids for this game, then items
  const { data: cols, error: colErr } = await supabase!.from("collections").select("id").eq("game_id", gameId);
  if (colErr) throw new Error(colErr.message);
  const colIds = (cols as { id: number }[]).map((c) => c.id);
  if (colIds.length === 0) return [];
  const { data, error } = await supabase!.from("items").select("*").in("collection_id", colIds).order("id");
  if (error) throw new Error(error.message);
  return data as Item[];
}

export async function getItem(id: number): Promise<Item | undefined> {
  if (!isConnected()) return getStore().getItem(id);
  const { data, error } = await supabase!.from("items").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as Item;
}

export async function addItem(input: Omit<Item, "id">): Promise<Item> {
  if (!isConnected()) return getStore().addItem(input);
  const { data, error } = await supabase!.from("items").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Item;
}

export async function updateItem(id: number, input: Partial<Omit<Item, "id">>): Promise<Item | null> {
  if (!isConnected()) return getStore().updateItem(id, input) ?? null;
  const { data, error } = await supabase!.from("items").update(input).eq("id", id).select().single();
  if (error) return null;
  return data as Item;
}

export async function deleteItem(id: number): Promise<{ success: boolean; error?: string }> {
  if (!isConnected()) return getStore().deleteItem(id);
  const { count } = await supabase!.from("codes").select("id", { count: "exact", head: true }).eq("item_id", id);
  if (count && count > 0) return { success: false, error: "코드가 있는 아이템은 삭제할 수 없습니다." };
  const { error } = await supabase!.from("items").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Admins ───

export async function getAdmins(activeOnly = false): Promise<Admin[]> {
  if (!isConnected()) return getStore().getAdmins(activeOnly);
  let query = supabase!.from("admins").select("*").order("id");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Admin[];
}

export async function addAdmin(input: Omit<Admin, "id" | "created_at">): Promise<Admin> {
  if (!isConnected()) return getStore().addAdmin(input);
  const { data, error } = await supabase!.from("admins").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as Admin;
}

export async function updateAdmin(id: number, input: Partial<Admin>): Promise<Admin | null> {
  if (!isConnected()) return getStore().updateAdmin(id, input) ?? null;
  const { id: _id, ...rest } = input;
  const { data, error } = await supabase!.from("admins").update(rest).eq("id", id).select().single();
  if (error) return null;
  return data as Admin;
}

export async function deleteAdmin(id: number): Promise<{ success: boolean; email?: string; error?: string }> {
  if (!isConnected()) {
    const store = getStore();
    const admin = store.getAdmins().find((a) => a.id === id);
    if (!admin) return { success: false, error: "관리자를 찾을 수 없습니다." };
    // In-memory store doesn't have deleteAdmin, so toggle inactive
    store.updateAdmin(id, { is_active: false });
    return { success: true, email: admin.email };
  }
  // Get email before deleting (for Auth user removal)
  const { data: admin } = await supabase!.from("admins").select("email").eq("id", id).single();
  if (!admin) return { success: false, error: "관리자를 찾을 수 없습니다." };
  const { error } = await supabase!.from("admins").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, email: admin.email };
}

// ─── Batches ───

export async function getBatches(): Promise<UploadBatch[]> {
  if (!isConnected()) return getStore().getBatches();
  const { data, error } = await supabase!.from("upload_batches").select("*").order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as UploadBatch[];
}

export async function getBatch(id: number): Promise<UploadBatch | undefined> {
  if (!isConnected()) return getStore().getBatches().find((b) => b.id === id);
  const { data, error } = await supabase!.from("upload_batches").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as UploadBatch;
}

// ─── Codes ───

export async function getCodes(filters?: {
  game_id?: number;
  collection_id?: number;
  item_id?: number;
  status?: CodeStatus;
  search?: string;
  admin_id?: number;
  page?: number;
  pageSize?: number;
}): Promise<{ codes: Code[]; total: number; page: number; pageSize: number; totalPages: number }> {
  if (!isConnected()) return getStore().getCodes(filters);

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;

  // Build item_id filter from game/collection chain if needed
  let itemIds: number[] | null = null;

  if (filters?.item_id) {
    itemIds = [filters.item_id];
  } else if (filters?.collection_id) {
    const { data: items } = await supabase!.from("items").select("id").eq("collection_id", filters.collection_id);
    itemIds = (items || []).map((i: { id: number }) => i.id);
  } else if (filters?.game_id) {
    const { data: cols } = await supabase!.from("collections").select("id").eq("game_id", filters.game_id);
    const colIds = (cols || []).map((c: { id: number }) => c.id);
    if (colIds.length > 0) {
      const { data: items } = await supabase!.from("items").select("id").in("collection_id", colIds);
      itemIds = (items || []).map((i: { id: number }) => i.id);
    } else {
      itemIds = [];
    }
  }

  // admin_id → batch_ids
  let batchIds: number[] | null = null;
  if (filters?.admin_id) {
    const { data: batches } = await supabase!.from("upload_batches").select("id").eq("admin_id", filters.admin_id);
    batchIds = (batches || []).map((b: { id: number }) => b.id);
  }

  // Count query
  let countQuery = supabase!.from("codes").select("id", { count: "exact", head: true });
  if (itemIds !== null) {
    if (itemIds.length === 0) return { codes: [], total: 0, page, pageSize, totalPages: 0 };
    countQuery = countQuery.in("item_id", itemIds);
  }
  if (filters?.status) countQuery = countQuery.eq("status", filters.status);
  if (filters?.search) countQuery = countQuery.ilike("code", `%${filters.search}%`);
  if (batchIds !== null) {
    if (batchIds.length === 0) return { codes: [], total: 0, page, pageSize, totalPages: 0 };
    countQuery = countQuery.in("batch_id", batchIds);
  }

  const { count: total } = await countQuery;
  const totalCount = total ?? 0;

  // Data query
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase!.from("codes").select("*").order("id").range(from, to);
  if (itemIds !== null) dataQuery = dataQuery.in("item_id", itemIds);
  if (filters?.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters?.search) dataQuery = dataQuery.ilike("code", `%${filters.search}%`);
  if (batchIds !== null) dataQuery = dataQuery.in("batch_id", batchIds);

  const { data, error } = await dataQuery;
  if (error) throw new Error(error.message);

  return {
    codes: data as Code[],
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function updateCodeStatus(id: number, status: CodeStatus): Promise<Code | null> {
  if (!isConnected()) return getStore().updateCodeStatus(id, status) ?? null;
  const updateData: Record<string, unknown> = { status };
  if (status === "sold") updateData.sold_at = new Date().toISOString();
  const { data, error } = await supabase!.from("codes").update(updateData).eq("id", id).select().single();
  if (error) return null;
  return data as Code;
}

// ─── Webhook: find code by value ───

export async function findCodeByValue(codeValue: string): Promise<Code | null> {
  if (!isConnected()) {
    const result = getStore().getCodes({ search: codeValue, pageSize: 1 });
    return result.codes.find((c) => c.code === codeValue) ?? null;
  }
  const { data, error } = await supabase!.from("codes").select("*").eq("code", codeValue).single();
  if (error) return null;
  return data as Code;
}

// ─── Upload: multi-item bulk add ───

export async function addCodesMultiItem(
  groups: { itemName: string; codes: string[]; price: number; existingItemId: number | null }[],
  collectionId: number,
  gameId: number,
  adminId: number,
  fileName: string,
  expiresAt: string | null,
  filePath?: string
): Promise<MultiItemUploadResult> {
  if (!isConnected()) return getStore().addCodesMultiItem(groups, collectionId, gameId, adminId, fileName, expiresAt, filePath);

  // Get all existing code values for dedup
  const { data: existingCodesData } = await supabase!.from("codes").select("code");
  const existingSet = new Set((existingCodesData || []).map((c: { code: string }) => c.code));

  const allBatches: UploadBatch[] = [];
  const itemResults: MultiItemUploadResult["itemResults"] = [];
  let totalCodes = 0, totalValid = 0, totalDuplicate = 0, totalError = 0, newItemsCreated = 0;

  for (const group of groups) {
    let itemId: number;
    let isNew = false;

    if (group.existingItemId != null) {
      itemId = group.existingItemId;
      if (group.price > 0) {
        await supabase!.from("items").update({ price: group.price }).eq("id", itemId);
      }
    } else {
      const { data: newItem, error } = await supabase!.from("items").insert({
        collection_id: collectionId,
        name: group.itemName,
        description: "",
        price: group.price,
      }).select().single();
      if (error) throw new Error(error.message);
      itemId = newItem.id;
      isNew = true;
      newItemsCreated++;
    }

    // Validate codes
    const validCodes: string[] = [];
    const duplicateCodes: string[] = [];
    const errorCodes: { code: string; reason: string }[] = [];

    for (const raw of group.codes) {
      const trimmed = raw.trim();
      if (!trimmed) {
        errorCodes.push({ code: raw, reason: "빈 값" });
      } else if (trimmed.length < 4) {
        errorCodes.push({ code: trimmed, reason: "코드 형식 오류 (4자 미만)" });
      } else if (existingSet.has(trimmed)) {
        duplicateCodes.push(trimmed);
      } else {
        validCodes.push(trimmed);
        existingSet.add(trimmed);
      }
    }

    // Create batch
    const { data: batch, error: batchErr } = await supabase!.from("upload_batches").insert({
      game_id: gameId,
      item_id: itemId,
      admin_id: adminId,
      file_name: fileName,
      total_count: group.codes.length,
      valid_count: validCodes.length,
      duplicate_count: duplicateCodes.length,
      error_count: errorCodes.length,
      ...(filePath ? { file_path: filePath } : {}),
    }).select().single();
    if (batchErr) throw new Error(batchErr.message);
    const batchData = batch as UploadBatch;
    allBatches.push(batchData);

    // Bulk insert codes in chunks of 1000
    for (let i = 0; i < validCodes.length; i += 1000) {
      const chunk = validCodes.slice(i, i + 1000).map((code) => ({
        code,
        item_id: itemId,
        status: "received" as const,
        batch_id: batchData.id,
        expires_at: expiresAt,
        sold_at: null,
      }));
      const { error: insertErr } = await supabase!.from("codes").insert(chunk);
      if (insertErr) throw new Error(insertErr.message);
    }

    const validation: ValidationResult = { validCodes, duplicateCodes, errorCodes };
    itemResults.push({ itemName: group.itemName, itemId, isNew, batch: batchData, validation });

    totalCodes += group.codes.length;
    totalValid += validCodes.length;
    totalDuplicate += duplicateCodes.length;
    totalError += errorCodes.length;
  }

  return {
    batches: allBatches,
    itemResults,
    summary: { totalCodes, totalValid, totalDuplicate, totalError, newItemsCreated },
  };
}

// ─── Inventory Metrics ───

export async function getInventoryMetrics(dateFrom?: string, dateTo?: string, gameId?: number): Promise<InventoryMetrics> {
  if (!isConnected()) return getStore().getInventoryMetrics(dateFrom, dateTo, gameId);

  // Fetch all needed data
  let gamesQuery = supabase!.from("games").select("*").order("id");
  if (gameId) gamesQuery = gamesQuery.eq("id", gameId);
  const { data: gamesData } = await gamesQuery;
  const games = (gamesData || []) as Game[];

  const gameIds = games.map((g) => g.id);
  if (gameIds.length === 0) return { totalCodes: 0, received: 0, registered: 0, sold: 0, revenue: 0, games: [] };

  const { data: colsData } = await supabase!.from("collections").select("*").in("game_id", gameIds).order("id");
  const collections = (colsData || []) as Collection[];

  const colIds = collections.map((c) => c.id);
  if (colIds.length === 0) return { totalCodes: 0, received: 0, registered: 0, sold: 0, revenue: 0, games: [] };

  const { data: itemsData } = await supabase!.from("items").select("*").in("collection_id", colIds).order("id");
  const items = (itemsData || []) as Item[];

  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) return { totalCodes: 0, received: 0, registered: 0, sold: 0, revenue: 0, games: [] };

  // Fetch all codes for these items
  const { data: codesData } = await supabase!.from("codes").select("*").in("item_id", itemIds);
  const codes = (codesData || []) as Code[];

  // Group codes by item_id
  const codesByItem = new Map<number, Code[]>();
  for (const code of codes) {
    const arr = codesByItem.get(code.item_id) || [];
    arr.push(code);
    codesByItem.set(code.item_id, arr);
  }

  const hasDateFilter = !!(dateFrom || dateTo);
  const inRange = (code: Code) => {
    if (code.status !== "sold" || !code.sold_at) return false;
    const d = new Date(code.sold_at);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };
  const rate = (sold: number, total: number) => total > 0 ? Math.round((sold / total) * 1000) / 10 : 0;

  let totalCodes = 0, totalReceived = 0, totalRegistered = 0, totalSold = 0, totalRevenue = 0;
  const gameResults: InventoryMetrics["games"] = [];

  for (const game of games) {
    const gameCollections = collections.filter((c) => c.game_id === game.id);
    let gTotal = 0, gReceived = 0, gRegistered = 0, gSold = 0, gRevenue = 0;
    const collectionResults: CollectionMetrics[] = [];

    for (const collection of gameCollections) {
      const colItems = items.filter((i) => i.collection_id === collection.id);
      let cTotal = 0, cReceived = 0, cRegistered = 0, cSold = 0, cRevenue = 0;
      const itemResults: CollectionMetrics["items"] = [];

      for (const item of colItems) {
        const itemCodes = codesByItem.get(item.id) || [];
        const received = itemCodes.filter((c) => c.status === "received").length;
        const registered = itemCodes.filter((c) => c.status === "registered").length;
        const sold = hasDateFilter
          ? itemCodes.filter(inRange).length
          : itemCodes.filter((c) => c.status === "sold").length;
        const revenue = sold * item.price;

        const unsoldWithExpiry = itemCodes.filter((c) => c.status !== "sold" && c.expires_at);
        let earliestExpiry: string | null = null;
        let expiryDaysLeft: number | null = null;
        if (unsoldWithExpiry.length > 0) {
          earliestExpiry = unsoldWithExpiry.reduce((min, c) => c.expires_at! < min ? c.expires_at! : min, unsoldWithExpiry[0].expires_at!);
          expiryDaysLeft = Math.ceil((new Date(earliestExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        }

        cTotal += itemCodes.length;
        cReceived += received;
        cRegistered += registered;
        cSold += sold;
        cRevenue += revenue;

        itemResults.push({
          game, collection, item,
          total: itemCodes.length, received, registered, sold,
          revenue, salesRate: rate(sold, registered + sold),
          earliestExpiry, expiryDaysLeft,
        });
      }

      gTotal += cTotal; gReceived += cReceived; gRegistered += cRegistered; gSold += cSold; gRevenue += cRevenue;
      collectionResults.push({
        collection,
        totalCodes: cTotal, received: cReceived, registered: cRegistered, sold: cSold,
        revenue: cRevenue, salesRate: rate(cSold, cRegistered + cSold),
        items: itemResults,
      });
    }

    totalCodes += gTotal; totalReceived += gReceived; totalRegistered += gRegistered; totalSold += gSold; totalRevenue += gRevenue;
    gameResults.push({
      game,
      totalCodes: gTotal, received: gReceived, registered: gRegistered, sold: gSold,
      revenue: gRevenue, salesRate: rate(gSold, gRegistered + gSold),
      collections: collectionResults,
    });
  }

  return { totalCodes, received: totalReceived, registered: totalRegistered, sold: totalSold, revenue: totalRevenue, games: gameResults };
}

// ─── Expiry Alerts ───

export async function getExpiryAlerts(days = 14): Promise<ExpiryAlert[]> {
  if (!isConnected()) return getStore().getExpiryAlerts(days);

  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(now.getDate() + days);

  // Get unsold codes with expiry within threshold
  const { data: codesData, error } = await supabase!
    .from("codes")
    .select("*")
    .neq("status", "sold")
    .not("expires_at", "is", null)
    .lte("expires_at", threshold.toISOString());
  if (error) throw new Error(error.message);
  const codes = (codesData || []) as Code[];

  // Group by item_id
  const itemExpiryMap = new Map<number, { expiresAt: string; unsoldCount: number }>();
  for (const code of codes) {
    const prev = itemExpiryMap.get(code.item_id);
    if (!prev) {
      itemExpiryMap.set(code.item_id, { expiresAt: code.expires_at!, unsoldCount: 1 });
    } else {
      prev.unsoldCount++;
      if (new Date(code.expires_at!) < new Date(prev.expiresAt)) {
        prev.expiresAt = code.expires_at!;
      }
    }
  }

  if (itemExpiryMap.size === 0) return [];

  // Fetch items, collections, games for the alert items
  const itemIds = Array.from(itemExpiryMap.keys());
  const { data: itemsData } = await supabase!.from("items").select("*").in("id", itemIds);
  const items = (itemsData || []) as Item[];

  const colIds = [...new Set(items.map((i) => i.collection_id))];
  const { data: colsData } = await supabase!.from("collections").select("*").in("id", colIds);
  const collectionsArr = (colsData || []) as Collection[];

  const gameIds = [...new Set(collectionsArr.map((c) => c.game_id))];
  const { data: gamesData } = await supabase!.from("games").select("*").in("id", gameIds);
  const gamesArr = (gamesData || []) as Game[];

  const colMap = new Map(collectionsArr.map((c) => [c.id, c]));
  const gameMap = new Map(gamesArr.map((g) => [g.id, g]));

  const alerts: ExpiryAlert[] = [];
  for (const item of items) {
    const data = itemExpiryMap.get(item.id);
    if (!data) continue;
    const collection = colMap.get(item.collection_id);
    if (!collection) continue;
    const game = gameMap.get(collection.game_id);
    if (!game) continue;
    const daysLeft = Math.ceil((new Date(data.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({ game, collection, item, expiresAt: data.expiresAt, daysLeft, unsoldCount: data.unsoldCount });
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ─── Sync Logs ───

export async function createSyncLog(): Promise<SyncLog> {
  if (!isConnected()) return getStore().createSyncLog();
  const { data, error } = await supabase!.from("sync_logs").insert({}).select().single();
  if (error) throw new Error(error.message);
  return data as SyncLog;
}

export async function updateSyncLog(id: number, input: Partial<Omit<SyncLog, "id" | "started_at">>): Promise<SyncLog | null> {
  if (!isConnected()) return getStore().updateSyncLog(id, input);
  const { data, error } = await supabase!.from("sync_logs").update(input).eq("id", id).select().single();
  if (error) return null;
  return data as SyncLog;
}

export async function getSyncLogs(limit = 10): Promise<SyncLog[]> {
  if (!isConnected()) return getStore().getSyncLogs(limit);
  const { data, error } = await supabase!.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data as SyncLog[];
}

export async function getLatestSyncLog(): Promise<SyncLog | null> {
  if (!isConnected()) return getStore().getLatestSyncLog();
  const { data, error } = await supabase!.from("sync_logs").select("*").order("started_at", { ascending: false }).limit(1).single();
  if (error) return null;
  return data as SyncLog;
}

export async function getLastSuccessfulSyncLog(): Promise<SyncLog | null> {
  if (!isConnected()) {
    const logs = getStore().getSyncLogs(100);
    return logs.find((l) => l.status === "success") ?? null;
  }
  const { data, error } = await supabase!
    .from("sync_logs")
    .select("*")
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as SyncLog;
}

export async function hasRunningSyncLog(): Promise<boolean> {
  if (!isConnected()) return getStore().hasRunningSyncLog();
  const { count } = await supabase!.from("sync_logs").select("id", { count: "exact", head: true }).eq("status", "running");
  return (count ?? 0) > 0;
}

export async function bulkMarkSold(codeValues: string[]): Promise<{ soldCodes: string[]; notFoundCodes: string[] }> {
  if (!isConnected()) return getStore().bulkMarkSold(codeValues);

  const soldCodes: string[] = [];
  const notFoundCodes: string[] = [];

  // Process in chunks to avoid query size limits
  for (let i = 0; i < codeValues.length; i += 1000) {
    const chunk = codeValues.slice(i, i + 1000);
    const { data: found } = await supabase!.from("codes").select("id, code, status").in("code", chunk);
    const foundMap = new Map((found || []).map((c: { id: number; code: string; status: string }) => [c.code, c]));

    const toUpdate: number[] = [];
    for (const val of chunk) {
      const code = foundMap.get(val);
      if (!code) {
        notFoundCodes.push(val);
        continue;
      }
      if (code.status === "sold") continue;
      toUpdate.push(code.id);
      soldCodes.push(val);
    }

    if (toUpdate.length > 0) {
      await supabase!.from("codes").update({ status: "sold", sold_at: new Date().toISOString() }).in("id", toUpdate);
    }
  }

  return { soldCodes, notFoundCodes };
}
