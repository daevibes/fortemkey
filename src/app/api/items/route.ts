import { NextRequest, NextResponse } from "next/server";
import { getItems, getItemsByGameId, addItem, updateItem, deleteItem } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  const collectionId = req.nextUrl.searchParams.get("collection_id");
  const gameId = req.nextUrl.searchParams.get("game_id");

  if (collectionId) {
    return NextResponse.json(await getItems(Number(collectionId)));
  }
  if (gameId) {
    return NextResponse.json(await getItemsByGameId(Number(gameId)));
  }
  return NextResponse.json(await getItems());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { collection_id, name, description, price } = body;
  if (!collection_id || !name || price == null) {
    return NextResponse.json({ error: "collection_id, name, price는 필수입니다." }, { status: 400 });
  }
  const item = await addItem({ collection_id, name, description: description || "", price });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const item = await updateItem(id, data);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const result = await deleteItem(id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
