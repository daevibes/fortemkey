// In-memory store for demo/development without Supabase
// Replace with Supabase queries when connecting to a real database

import type {
  Game,
  Collection,
  Item,
  Code,
  Admin,
  UploadBatch,
  CodeStatus,
  InventorySummary,
  InventoryMetrics,
  CollectionMetrics,
  ExpiryAlert,
  MultiItemUploadResult,
  ValidationResult,
  SyncLog,
  SyncStatus,
} from "./types";

// --- Seed Data ---

const games: Game[] = [
  { id: 1, name: "Lost Ark", publisher: "Smilegate RPG", created_at: "2026-01-15" },
  { id: 2, name: "MapleStory", publisher: "Nexon", created_at: "2026-01-20" },
  { id: 3, name: "PUBG", publisher: "Krafton", created_at: "2026-02-01" },
];

const collections: Collection[] = [
  { id: 1, game_id: 1, name: "런칭 기념 이벤트", description: "Lost Ark 런칭 기념", image_url: null, created_at: "2026-01-15" },
  { id: 2, game_id: 1, name: "서머 2026 특별관", description: "여름 한정 아이템", image_url: null, created_at: "2026-06-01" },
  { id: 3, game_id: 2, name: "20주년 이벤트", description: "MapleStory 20주년", image_url: null, created_at: "2026-01-20" },
  { id: 4, game_id: 3, name: "시즌 15", description: "PUBG 시즌 15", image_url: null, created_at: "2026-02-01" },
];

const items: Item[] = [
  { id: 1, collection_id: 1, name: "골드 1000", description: "게임 내 골드 1000개", price: 5.0 },
  { id: 2, collection_id: 1, name: "스킨 팩", description: "한정판 스킨 팩", price: 15.0 },
  { id: 3, collection_id: 3, name: "메소 10000", description: "메소 10000개", price: 3.0 },
  { id: 4, collection_id: 3, name: "펫 교환권", description: "랜덤 펫 교환권", price: 10.0 },
  { id: 5, collection_id: 4, name: "BP 500", description: "배틀포인트 500", price: 2.0 },
  { id: 6, collection_id: 4, name: "무기 스킨", description: "M416 스킨", price: 8.0 },
  { id: 7, collection_id: 2, name: "서머 코스튬", description: "여름 한정 코스튬 세트", price: 12.0 },
  { id: 8, collection_id: 2, name: "강화석 50개", description: "장비 강화석 50개 묶음", price: 7.5 },
];

const admins: Admin[] = [
  { id: 1, name: "김운영", email: "kim@fortem.io", role: "admin", is_active: true, created_at: "2026-01-01" },
  { id: 2, name: "이매니저", email: "lee@fortem.io", role: "manager", is_active: true, created_at: "2026-01-05" },
  { id: 3, name: "박담당", email: "park@fortem.io", role: "manager", is_active: true, created_at: "2026-02-10" },
];

// Generate sample codes
function generateCodes(): Code[] {
  const codes: Code[] = [];
  let id = 1;
  const statuses: CodeStatus[] = ["received", "registered", "sold"];

  // Items with near-expiry dates for demo alerts (item ids 2, 5)
  const nearExpiryItemIds = new Set([2, 5]);
  const today = new Date();
  const nearExpiry = new Date(today);
  nearExpiry.setDate(today.getDate() + 10);
  const nearExpiryStr = nearExpiry.toISOString().split("T")[0];

  for (const item of items) {
    const count = 50 + Math.floor(Math.random() * 100);
    const expiresAt = nearExpiryItemIds.has(item.id) ? nearExpiryStr : "2026-12-31";
    for (let i = 0; i < count; i++) {
      const statusIdx = Math.floor(Math.random() * statuses.length);
      const status = statuses[statusIdx];
      codes.push({
        id: id++,
        code: `${item.name.substring(0, 2).toUpperCase()}-${String(id).padStart(6, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        item_id: item.id,
        status,
        batch_id: Math.ceil(i / 50),
        expires_at: expiresAt,
        sold_at: status === "sold" ? "2026-03-10" : null,
        created_at: "2026-03-01",
      });
    }
  }
  return codes;
}

const batches: UploadBatch[] = [
  { id: 1, game_id: 1, item_id: 1, admin_id: 1, file_name: "lostark_gold_codes.csv", total_count: 500, valid_count: 498, duplicate_count: 2, error_count: 0, uploaded_at: "2026-03-01T10:30:00" },
  { id: 2, game_id: 1, item_id: 2, admin_id: 2, file_name: "lostark_skin_codes.csv", total_count: 200, valid_count: 200, duplicate_count: 0, error_count: 0, uploaded_at: "2026-03-05T14:00:00" },
  { id: 3, game_id: 2, item_id: 3, admin_id: 1, file_name: "maple_meso_codes.csv", total_count: 1000, valid_count: 995, duplicate_count: 3, error_count: 2, uploaded_at: "2026-03-08T09:15:00" },
  { id: 4, game_id: 3, item_id: 5, admin_id: 3, file_name: "pubg_bp_codes.csv", total_count: 300, valid_count: 300, duplicate_count: 0, error_count: 0, uploaded_at: "2026-03-14T16:45:00" },
];

// --- Store singleton ---

class Store {
  games: Game[] = [...games];
  collections: Collection[] = [...collections];
  items: Item[] = [...items];
  codes: Code[] = generateCodes();
  admins: Admin[] = [...admins];
  batches: UploadBatch[] = [...batches];
  syncLogs: SyncLog[] = [];

  private nextId(arr: { id: number }[]): number {
    return arr.length > 0 ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
  }

  // Games
  getGames() { return this.games; }
  getGame(id: number) { return this.games.find((g) => g.id === id); }
  addGame(data: Omit<Game, "id" | "created_at">) {
    const game: Game = { ...data, id: this.nextId(this.games), created_at: new Date().toISOString() };
    this.games.push(game);
    return game;
  }
  updateGame(id: number, data: Partial<Omit<Game, "id" | "created_at">>) {
    const idx = this.games.findIndex((g) => g.id === id);
    if (idx < 0) return null;
    this.games[idx] = { ...this.games[idx], ...data };
    return this.games[idx];
  }
  deleteGame(id: number): { success: boolean; error?: string } {
    const hasCollections = this.collections.some((c) => c.game_id === id);
    if (hasCollections) return { success: false, error: "컬렉션이 있는 게임은 삭제할 수 없습니다." };
    this.games = this.games.filter((g) => g.id !== id);
    return { success: true };
  }

  // Collections
  getCollections(gameId?: number) {
    return gameId ? this.collections.filter((c) => c.game_id === gameId) : this.collections;
  }
  getCollection(id: number) { return this.collections.find((c) => c.id === id); }
  addCollection(data: Omit<Collection, "id" | "created_at">) {
    const collection: Collection = { ...data, image_url: data.image_url || null, id: this.nextId(this.collections), created_at: new Date().toISOString() };
    this.collections.push(collection);
    return collection;
  }
  updateCollection(id: number, data: Partial<Omit<Collection, "id" | "created_at">>) {
    const idx = this.collections.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    this.collections[idx] = { ...this.collections[idx], ...data };
    return this.collections[idx];
  }
  deleteCollection(id: number): { success: boolean; error?: string } {
    const hasItems = this.items.some((i) => i.collection_id === id);
    if (hasItems) return { success: false, error: "아이템이 있는 컬렉션은 삭제할 수 없습니다." };
    this.collections = this.collections.filter((c) => c.id !== id);
    return { success: true };
  }

  // Items
  getItems(collectionId?: number) {
    return collectionId ? this.items.filter((i) => i.collection_id === collectionId) : this.items;
  }
  getItemsByGameId(gameId: number) {
    const collectionIds = this.collections.filter((c) => c.game_id === gameId).map((c) => c.id);
    return this.items.filter((i) => collectionIds.includes(i.collection_id));
  }
  getItem(id: number) { return this.items.find((i) => i.id === id); }
  addItem(data: Omit<Item, "id">) {
    const item: Item = { ...data, id: this.nextId(this.items) };
    this.items.push(item);
    return item;
  }
  updateItem(id: number, data: Partial<Omit<Item, "id">>) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    this.items[idx] = { ...this.items[idx], ...data };
    return this.items[idx];
  }
  deleteItem(id: number): { success: boolean; error?: string } {
    const hasCodes = this.codes.some((c) => c.item_id === id);
    if (hasCodes) return { success: false, error: "코드가 있는 아이템은 삭제할 수 없습니다." };
    this.items = this.items.filter((i) => i.id !== id);
    return { success: true };
  }

  // Admins
  getAdmins(activeOnly = false) {
    return activeOnly ? this.admins.filter((a) => a.is_active) : this.admins;
  }
  addAdmin(data: Omit<Admin, "id" | "created_at">) {
    const admin: Admin = { ...data, id: this.nextId(this.admins), created_at: new Date().toISOString() };
    this.admins.push(admin);
    return admin;
  }
  updateAdmin(id: number, data: Partial<Admin>) {
    const idx = this.admins.findIndex((a) => a.id === id);
    if (idx >= 0) this.admins[idx] = { ...this.admins[idx], ...data };
    return this.admins[idx];
  }

  // Codes
  getCodes(filters?: { game_id?: number; collection_id?: number; item_id?: number; status?: CodeStatus; search?: string; admin_id?: number; page?: number; pageSize?: number }) {
    let filtered = [...this.codes];

    if (filters?.item_id) {
      filtered = filtered.filter((c) => c.item_id === filters.item_id);
    } else if (filters?.collection_id) {
      const itemIds = this.items.filter((i) => i.collection_id === filters.collection_id).map((i) => i.id);
      filtered = filtered.filter((c) => itemIds.includes(c.item_id));
    } else if (filters?.game_id) {
      const collectionIds = this.collections.filter((col) => col.game_id === filters.game_id).map((col) => col.id);
      const itemIds = this.items.filter((i) => collectionIds.includes(i.collection_id)).map((i) => i.id);
      filtered = filtered.filter((c) => itemIds.includes(c.item_id));
    }

    if (filters?.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((c) => c.code.toLowerCase().includes(q));
    }

    if (filters?.admin_id) {
      const batchIds = this.batches.filter((b) => b.admin_id === filters.admin_id).map((b) => b.id);
      filtered = filtered.filter((c) => batchIds.includes(c.batch_id));
    }

    const total = filtered.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const start = (page - 1) * pageSize;

    return {
      codes: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  updateCodeStatus(id: number, status: CodeStatus) {
    const code = this.codes.find((c) => c.id === id);
    if (!code) return null;
    code.status = status;
    if (status === "sold") code.sold_at = new Date().toISOString();
    return code;
  }

  // Bulk add codes from CSV upload
  addCodes(rawCodes: string[], itemId: number, adminId: number, fileName: string, expiresAt: string | null) {
    const existingSet = new Set(this.codes.map((c) => c.code));
    const validCodes: string[] = [];
    const duplicateCodes: string[] = [];
    const errorCodes: { code: string; reason: string }[] = [];

    for (const raw of rawCodes) {
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

    const batchId = this.nextId(this.batches);
    const item = this.getItem(itemId);
    // Resolve game_id via collection
    let gameId = 0;
    if (item) {
      const collection = this.getCollection(item.collection_id);
      if (collection) gameId = collection.game_id;
    }

    const batch: UploadBatch = {
      id: batchId,
      game_id: gameId,
      item_id: itemId,
      admin_id: adminId,
      file_name: fileName,
      total_count: rawCodes.length,
      valid_count: validCodes.length,
      duplicate_count: duplicateCodes.length,
      error_count: errorCodes.length,
      uploaded_at: new Date().toISOString(),
    };
    this.batches.push(batch);

    for (const code of validCodes) {
      this.codes.push({
        id: this.nextId(this.codes),
        code,
        item_id: itemId,
        status: "received",
        batch_id: batchId,
        expires_at: expiresAt,
        sold_at: null,
        created_at: new Date().toISOString(),
      });
    }

    return {
      batch,
      validation: { validCodes, duplicateCodes, errorCodes },
    };
  }

  // Multi-item bulk add from CSV
  addCodesMultiItem(
    groups: { itemName: string; codes: string[]; price: number; existingItemId: number | null }[],
    collectionId: number,
    gameId: number,
    adminId: number,
    fileName: string,
    expiresAt: string | null
  ): MultiItemUploadResult {
    const allBatches: UploadBatch[] = [];
    const itemResults: MultiItemUploadResult["itemResults"] = [];
    let totalCodes = 0;
    let totalValid = 0;
    let totalDuplicate = 0;
    let totalError = 0;
    let newItemsCreated = 0;

    const existingSet = new Set(this.codes.map((c) => c.code));

    for (const group of groups) {
      let itemId: number;
      let isNew = false;

      if (group.existingItemId != null) {
        itemId = group.existingItemId;
        // Update price from CSV if provided
        if (group.price > 0) {
          this.updateItem(itemId, { price: group.price });
        }
      } else {
        const newItem = this.addItem({
          collection_id: collectionId,
          name: group.itemName,
          description: "",
          price: group.price,
        });
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

      const batchId = this.nextId(this.batches);
      const batch: UploadBatch = {
        id: batchId,
        game_id: gameId,
        item_id: itemId,
        admin_id: adminId,
        file_name: fileName,
        total_count: group.codes.length,
        valid_count: validCodes.length,
        duplicate_count: duplicateCodes.length,
        error_count: errorCodes.length,
        uploaded_at: new Date().toISOString(),
      };
      this.batches.push(batch);
      allBatches.push(batch);

      for (const code of validCodes) {
        this.codes.push({
          id: this.nextId(this.codes),
          code,
          item_id: itemId,
          status: "received",
          batch_id: batchId,
          expires_at: expiresAt,
          sold_at: null,
          created_at: new Date().toISOString(),
        });
      }

      const validation: ValidationResult = { validCodes, duplicateCodes, errorCodes };
      itemResults.push({ itemName: group.itemName, itemId, isNew, batch, validation });

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

  // Batches
  getBatches() { return this.batches.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()); }

  // Inventory
  getInventorySummary(): InventorySummary[] {
    const result: InventorySummary[] = [];
    for (const item of this.items) {
      const collection = this.getCollection(item.collection_id);
      if (!collection) continue;
      const game = this.getGame(collection.game_id);
      if (!game) continue;
      const itemCodes = this.codes.filter((c) => c.item_id === item.id);
      result.push({
        game,
        collection,
        item,
        total: itemCodes.length,
        received: itemCodes.filter((c) => c.status === "received").length,
        registered: itemCodes.filter((c) => c.status === "registered").length,
        sold: itemCodes.filter((c) => c.status === "sold").length,
      });
    }
    return result;
  }

  // Inventory metrics with date filtering, revenue, and collection-level grouping
  getInventoryMetrics(dateFrom?: string, dateTo?: string, gameId?: number): InventoryMetrics {
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
    const hasDateFilter = !!(dateFrom || dateTo);
    const rate = (sold: number, total: number) => total > 0 ? Math.round((sold / total) * 1000) / 10 : 0;

    const targetGames = gameId ? this.games.filter((g) => g.id === gameId) : this.games;

    let totalCodes = 0, totalReceived = 0, totalRegistered = 0, totalSold = 0, totalRevenue = 0;
    const gameResults: InventoryMetrics["games"] = [];

    for (const game of targetGames) {
      const gameCollections = this.collections.filter((c) => c.game_id === game.id);
      let gTotal = 0, gReceived = 0, gRegistered = 0, gSold = 0, gRevenue = 0;
      const collectionResults: CollectionMetrics[] = [];

      for (const collection of gameCollections) {
        const colItems = this.items.filter((i) => i.collection_id === collection.id);
        let cTotal = 0, cReceived = 0, cRegistered = 0, cSold = 0, cRevenue = 0;
        const itemResults: CollectionMetrics["items"] = [];

        for (const item of colItems) {
          const itemCodes = this.codes.filter((c) => c.item_id === item.id);
          const received = itemCodes.filter((c) => c.status === "received").length;
          const registered = itemCodes.filter((c) => c.status === "registered").length;
          const sold = hasDateFilter
            ? itemCodes.filter(inRange).length
            : itemCodes.filter((c) => c.status === "sold").length;
          const revenue = sold * item.price;

          // Find earliest expiry among unsold codes
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
            revenue, salesRate: rate(sold, itemCodes.length),
            earliestExpiry, expiryDaysLeft,
          });
        }

        gTotal += cTotal; gReceived += cReceived; gRegistered += cRegistered; gSold += cSold; gRevenue += cRevenue;

        collectionResults.push({
          collection,
          totalCodes: cTotal, received: cReceived, registered: cRegistered, sold: cSold,
          revenue: cRevenue, salesRate: rate(cSold, cTotal),
          items: itemResults,
        });
      }

      totalCodes += gTotal; totalReceived += gReceived; totalRegistered += gRegistered; totalSold += gSold; totalRevenue += gRevenue;

      gameResults.push({
        game,
        totalCodes: gTotal, received: gReceived, registered: gRegistered, sold: gSold,
        revenue: gRevenue, salesRate: rate(gSold, gTotal),
        collections: collectionResults,
      });
    }

    return {
      totalCodes, received: totalReceived, registered: totalRegistered, sold: totalSold, revenue: totalRevenue,
      games: gameResults,
    };
  }

  // Expiry alerts: items with unsold codes expiring within `days` days
  getExpiryAlerts(days = 14): ExpiryAlert[] {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() + days);

    // Group codes by item, find earliest expiry for unsold codes
    const itemExpiryMap = new Map<number, { expiresAt: string; unsoldCount: number }>();

    for (const code of this.codes) {
      if (code.status === "sold" || !code.expires_at) continue;
      const exp = new Date(code.expires_at);
      if (exp > threshold) continue; // not expiring soon

      const prev = itemExpiryMap.get(code.item_id);
      if (!prev) {
        itemExpiryMap.set(code.item_id, { expiresAt: code.expires_at, unsoldCount: 1 });
      } else {
        prev.unsoldCount++;
        if (new Date(code.expires_at) < new Date(prev.expiresAt)) {
          prev.expiresAt = code.expires_at;
        }
      }
    }

    const alerts: ExpiryAlert[] = [];
    for (const [itemId, data] of itemExpiryMap) {
      const item = this.getItem(itemId);
      if (!item) continue;
      const collection = this.getCollection(item.collection_id);
      if (!collection) continue;
      const game = this.getGame(collection.game_id);
      if (!game) continue;
      const daysLeft = Math.ceil((new Date(data.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({ game, collection, item, expiresAt: data.expiresAt, daysLeft, unsoldCount: data.unsoldCount });
    }

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // Sync logs
  createSyncLog(): SyncLog {
    const log: SyncLog = {
      id: this.nextId(this.syncLogs),
      started_at: new Date().toISOString(),
      finished_at: null,
      status: "running",
      total_fetched: 0,
      new_sold: 0,
      not_found: 0,
      error_message: null,
      details: null,
    };
    this.syncLogs.push(log);
    return log;
  }

  updateSyncLog(id: number, data: Partial<Omit<SyncLog, "id" | "started_at">>): SyncLog | null {
    const idx = this.syncLogs.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    this.syncLogs[idx] = { ...this.syncLogs[idx], ...data };
    return this.syncLogs[idx];
  }

  getSyncLogs(limit = 10): SyncLog[] {
    return [...this.syncLogs]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);
  }

  getLatestSyncLog(): SyncLog | null {
    if (this.syncLogs.length === 0) return null;
    return [...this.syncLogs].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
  }

  hasRunningSyncLog(): boolean {
    return this.syncLogs.some((l) => l.status === "running");
  }

  // Bulk update codes to sold by code values — returns { found, notFound }
  bulkMarkSold(codeValues: string[]): { soldCodes: string[]; notFoundCodes: string[] } {
    const soldCodes: string[] = [];
    const notFoundCodes: string[] = [];

    for (const val of codeValues) {
      const code = this.codes.find((c) => c.code === val);
      if (!code) {
        notFoundCodes.push(val);
        continue;
      }
      if (code.status === "sold") continue; // already sold, skip
      code.status = "sold";
      code.sold_at = new Date().toISOString();
      soldCodes.push(val);
    }

    return { soldCodes, notFoundCodes };
  }

  // Helper: get game_id for an item (via collection)
  getGameIdForItem(itemId: number): number | null {
    const item = this.getItem(itemId);
    if (!item) return null;
    const collection = this.getCollection(item.collection_id);
    return collection?.game_id ?? null;
  }
}

// Singleton
let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
  }
  return storeInstance;
}
