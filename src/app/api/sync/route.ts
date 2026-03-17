import { NextRequest, NextResponse } from "next/server";
import {
  createSyncLog,
  updateSyncLog,
  getSyncLogs,
  getLatestSyncLog,
  hasRunningSyncLog,
  bulkMarkSold,
  getLastSuccessfulSyncLog,
} from "@/lib/supabase-queries";

/**
 * GET /api/sync — 최근 동기화 이력 조회
 * GET /api/sync?status=true — 현재 동기화 상태 (running/idle)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  if (sp.get("status") === "true") {
    const running = await hasRunningSyncLog();
    const latest = await getLatestSyncLog();
    return NextResponse.json({ running, latest });
  }

  const limit = Number(sp.get("limit")) || 10;
  const logs = await getSyncLogs(limit);
  return NextResponse.json(logs);
}

/**
 * POST /api/sync — 수동/브라우저 폴링 동기화 트리거
 *
 * 마켓플레이스 API 스펙이 확정되기 전에는 mock 구조로 동작.
 * 실제 연동 시 fetchSoldCodesFromMarketplace()를 실제 API 호출로 교체.
 */
export async function POST(req: NextRequest) {
  // Prevent duplicate runs
  const running = await hasRunningSyncLog();
  if (running) {
    return NextResponse.json(
      { error: "이미 동기화가 진행 중입니다." },
      { status: 409 }
    );
  }

  // Read settings from request body (manual trigger / browser polling)
  const body = await req.json().catch(() => ({}));
  const apiUrl = (body as Record<string, string>).apiUrl || process.env.MARKETPLACE_API_URL || "";
  const apiKey = (body as Record<string, string>).apiKey || process.env.MARKETPLACE_API_KEY || "";

  // Determine since value from last successful sync
  const lastSuccess = await getLastSuccessfulSyncLog();
  const since = lastSuccess?.started_at || null;

  // Create sync log
  const syncLog = await createSyncLog();
  const startTime = Date.now();

  try {
    // Fetch sold codes from marketplace
    const soldCodes = await fetchSoldCodesFromMarketplace(apiUrl, apiKey, since);

    // Compare with our DB and update
    const { soldCodes: newSold, notFoundCodes } = await bulkMarkSold(soldCodes);

    const elapsed = Date.now() - startTime;

    await updateSyncLog(syncLog.id, {
      finished_at: new Date().toISOString(),
      status: "success",
      total_fetched: soldCodes.length,
      new_sold: newSold.length,
      not_found: notFoundCodes.length,
      details: {
        new_sold_codes: newSold.slice(0, 100), // limit stored detail
        not_found_codes: notFoundCodes.slice(0, 100),
        api_response_time_ms: elapsed,
        since: since || "full",
      },
    });

    return NextResponse.json({
      status: "success",
      total_fetched: soldCodes.length,
      new_sold: newSold.length,
      not_found: notFoundCodes.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    await updateSyncLog(syncLog.id, {
      finished_at: new Date().toISOString(),
      status: "failed",
      error_message: message,
    });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * 마켓플레이스 API에서 sold 코드 목록을 가져오는 함수.
 *
 * TODO: 마켓플레이스 API 스펙 확정 후 실제 API 호출로 교체
 * 현재는 mock — API URL이 설정되어 있으면 실제 호출, 없으면 빈 배열 반환
 */
async function fetchSoldCodesFromMarketplace(
  apiUrl: string,
  apiKey: string,
  since: string | null
): Promise<string[]> {
  if (!apiUrl) {
    // Mock mode: API URL이 설정되지 않은 경우 빈 배열 반환
    return [];
  }

  // 실제 API 호출
  const allCodes: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(apiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "1000");
    if (since) {
      url.searchParams.set("since", since);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`마켓플레이스 API 오류 (${res.status}): ${text}`);
    }

    const json = await res.json();

    // Adapt to actual API response shape
    // Expected: { data: [{ code: string, ... }], pagination: { page, per_page, total } }
    const data = json.data || json.codes || json;
    if (Array.isArray(data)) {
      for (const item of data) {
        const code = typeof item === "string" ? item : item.code;
        if (code) allCodes.push(code);
      }
    }

    // Pagination — 전체 수집 (페이지 상한 없음)
    const pagination = json.pagination || json.meta;
    if (pagination && pagination.total) {
      hasMore = page * (pagination.per_page || 1000) < pagination.total;
    } else {
      hasMore = Array.isArray(data) && data.length >= 1000;
    }
    page++;
  }

  return allCodes;
}
