import { NextRequest, NextResponse } from "next/server";
import { changeBatchStatus } from "@/lib/supabase-queries";
import type { CodeStatus } from "@/lib/types";

const VALID_STATUSES: CodeStatus[] = ["received", "registered", "sold"];

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { batchId, status } = body;

  if (!batchId || !status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "batchId와 유효한 status가 필요합니다." }, { status: 400 });
  }

  const result = await changeBatchStatus(batchId, status);
  return NextResponse.json(result);
}
