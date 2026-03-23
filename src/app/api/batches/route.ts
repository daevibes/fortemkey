import { NextRequest, NextResponse } from "next/server";
import { getBatches, updateBatchPromotions, getBatchStatusSummary } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  const statusSummary = req.nextUrl.searchParams.get("status_summary");
  if (statusSummary === "true") {
    return NextResponse.json(await getBatchStatusSummary());
  }
  return NextResponse.json(await getBatches());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, promotions } = body;

  if (!id || !Array.isArray(promotions)) {
    return NextResponse.json({ error: "id와 promotions 배열이 필요합니다." }, { status: 400 });
  }

  const result = await updateBatchPromotions(id, promotions);
  if (!result) {
    return NextResponse.json({ error: "배치를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(result);
}
