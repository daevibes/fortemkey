import { NextRequest, NextResponse } from "next/server";
import { findCodeByValue, updateCodeStatus } from "@/lib/supabase-queries";

/**
 * Webhook endpoint for ForTem marketplace
 * 포템 마켓에서 코드 판매 시 호출
 *
 * POST /api/codes/webhook
 * Body: { code: string }            — 단건
 *   or: { codes: string[] }         — 다건
 *   or: { code: string, status: "sold" | "redeemed" }  — 상태 지정
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const codeValues: string[] = body.codes
      ? body.codes
      : body.code
        ? [body.code]
        : [];

    if (codeValues.length === 0) {
      return NextResponse.json(
        { error: "code 또는 codes 필드가 필요합니다." },
        { status: 400 }
      );
    }

    const targetStatus = body.status || "sold";
    if (!["sold", "redeemed"].includes(targetStatus)) {
      return NextResponse.json(
        { error: "status는 sold 또는 redeemed만 가능합니다." },
        { status: 400 }
      );
    }

    const results: { code: string; success: boolean; error?: string }[] = [];

    for (const codeValue of codeValues) {
      const trimmed = codeValue.trim();
      const found = await findCodeByValue(trimmed);

      if (!found) {
        results.push({ code: trimmed, success: false, error: "코드를 찾을 수 없습니다." });
        continue;
      }

      if (found.status === "sold" && targetStatus === "sold") {
        results.push({ code: trimmed, success: false, error: "이미 판매 처리된 코드입니다." });
        continue;
      }

      const updated = await updateCodeStatus(found.id, targetStatus);
      results.push({
        code: trimmed,
        success: !!updated,
        error: updated ? undefined : "상태 변경 실패",
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 }
    );
  }
}
