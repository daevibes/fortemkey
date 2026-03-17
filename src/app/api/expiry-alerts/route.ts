import { NextRequest, NextResponse } from "next/server";
import { getExpiryAlerts } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") || "14");
  return NextResponse.json(await getExpiryAlerts(days));
}
