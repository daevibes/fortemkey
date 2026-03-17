import { NextRequest, NextResponse } from "next/server";
import { getCollections, addCollection, updateCollection, deleteCollection } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("game_id");
  const data = await getCollections(gameId ? Number(gameId) : undefined);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { game_id, name, description, image_url } = body;
  if (!game_id || !name) {
    return NextResponse.json({ error: "game_id와 name은 필수입니다." }, { status: 400 });
  }
  const collection = await addCollection({ game_id, name, description: description || "", image_url: image_url || null });
  return NextResponse.json(collection, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const collection = await updateCollection(id, data);
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(collection);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const result = await deleteCollection(id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
