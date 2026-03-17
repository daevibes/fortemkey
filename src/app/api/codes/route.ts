import { NextRequest, NextResponse } from "next/server";
import { getCodes, updateCodeStatus } from "@/lib/supabase-queries";
import type { CodeStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await getCodes({
    game_id: sp.get("game_id") ? Number(sp.get("game_id")) : undefined,
    collection_id: sp.get("collection_id") ? Number(sp.get("collection_id")) : undefined,
    item_id: sp.get("item_id") ? Number(sp.get("item_id")) : undefined,
    status: (sp.get("status") as CodeStatus) || undefined,
    search: sp.get("search") || undefined,
    admin_id: sp.get("admin_id") ? Number(sp.get("admin_id")) : undefined,
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
  });
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const code = await updateCodeStatus(body.id, body.status);
  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(code);
}
