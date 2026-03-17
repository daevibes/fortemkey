import { NextRequest, NextResponse } from "next/server";
import { getInventoryMetrics } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  const dateFrom = req.nextUrl.searchParams.get("date_from") || undefined;
  const dateTo = req.nextUrl.searchParams.get("date_to") || undefined;
  const gameId = req.nextUrl.searchParams.get("game_id");

  return NextResponse.json(
    await getInventoryMetrics(dateFrom, dateTo, gameId ? Number(gameId) : undefined)
  );
}
