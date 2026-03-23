import { NextRequest, NextResponse } from "next/server";
import { markBatchSold } from "@/lib/supabase-queries";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { batchIds } = body;

  if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ error: "batchIds 배열이 필요합니다." }, { status: 400 });
  }

  const result = await markBatchSold(batchIds);
  return NextResponse.json(result);
}
