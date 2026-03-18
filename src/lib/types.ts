export type CodeStatus = "received" | "registered" | "sold";

export interface Game {
  id: number;
  name: string;
  publisher: string;
  created_at: string;
}

export interface Collection {
  id: number;
  game_id: number;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

export interface Item {
  id: number;
  collection_id: number;
  name: string;
  description: string;
  price: number;
}

export interface Code {
  id: number;
  code: string;
  item_id: number;
  status: CodeStatus;
  batch_id: number;
  expires_at: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager";
  is_active: boolean;
  created_at: string;
}

export interface UploadBatch {
  id: number;
  game_id: number;
  item_id: number;
  admin_id: number;
  file_name: string;
  total_count: number;
  valid_count: number;
  duplicate_count: number;
  error_count: number;
  file_path?: string;
  uploaded_at: string;
}

export interface ValidationResult {
  validCodes: string[];
  duplicateCodes: string[];
  errorCodes: { code: string; reason: string }[];
}

export interface InventorySummary {
  game: Game;
  collection: Collection;
  item: Item;
  total: number;
  received: number;
  registered: number;
  sold: number;
}

export interface ExpiryAlert {
  game: Game;
  collection: Collection;
  item: Item;
  expiresAt: string;
  daysLeft: number;
  unsoldCount: number;
}

export const STATUS_LABELS: Record<CodeStatus, string> = {
  received: "대기",
  registered: "등록",
  sold: "판매",
};

export const STATUS_COLORS: Record<CodeStatus, string> = {
  received: "bg-yellow-900/30 text-yellow-400",
  registered: "bg-blue-900/30 text-blue-400",
  sold: "bg-green-900/30 text-green-400",
};

export const NEXT_STATUS: Partial<Record<CodeStatus, CodeStatus>> = {
  received: "registered",
  registered: "sold",
};

export const PREV_STATUS: Partial<Record<CodeStatus, CodeStatus>> = {
  registered: "received",
  sold: "registered",
};

export interface CollectionMetrics {
  collection: Collection;
  totalCodes: number;
  received: number;
  registered: number;
  sold: number;
  revenue: number;
  salesRate: number;
  items: (InventorySummary & { revenue: number; salesRate: number; earliestExpiry: string | null; expiryDaysLeft: number | null })[];
}

export interface InventoryMetrics {
  totalCodes: number;
  received: number;
  registered: number;
  sold: number;
  revenue: number;
  games: {
    game: Game;
    totalCodes: number;
    received: number;
    registered: number;
    sold: number;
    revenue: number;
    salesRate: number;
    collections: CollectionMetrics[];
  }[];
}

export type SyncStatus = "running" | "success" | "failed";

export interface SyncLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: SyncStatus;
  total_fetched: number;
  new_sold: number;
  not_found: number;
  error_message: string | null;
  details: {
    new_sold_codes?: string[];
    not_found_codes?: string[];
    api_response_time_ms?: number;
    since?: string;
  } | null;
}

export interface SyncSettings {
  apiUrl: string;
  apiKey: string;
  pollingInterval: number; // minutes: 5, 10, 30, or 0 (manual only)
}

export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  running: "bg-blue-900/30 text-blue-400",
  success: "bg-green-900/30 text-green-400",
  failed: "bg-red-900/30 text-red-400",
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  running: "실행 중",
  success: "성공",
  failed: "실패",
};

export interface ParsedItemGroup {
  itemName: string;
  codes: string[];
  price: number;
  existingItemId: number | null;
  existingPrice: number | null;
  isNew: boolean;
  checked: boolean;
}

export interface MultiItemUploadResult {
  batches: UploadBatch[];
  itemResults: {
    itemName: string;
    itemId: number;
    isNew: boolean;
    batch: UploadBatch;
    validation: ValidationResult;
  }[];
  summary: {
    totalCodes: number;
    totalValid: number;
    totalDuplicate: number;
    totalError: number;
    newItemsCreated: number;
  };
}
