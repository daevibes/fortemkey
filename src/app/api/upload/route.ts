import { NextRequest, NextResponse } from "next/server";
import { addCodesMultiItem } from "@/lib/supabase-queries";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { groups, collectionId, gameId, adminId, fileName, expiresAt } = body;

  if (!groups || !Array.isArray(groups) || !collectionId || !gameId || !adminId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await addCodesMultiItem(groups, collectionId, gameId, adminId, fileName, expiresAt || null);
  return NextResponse.json(result, { status: 201 });
}
