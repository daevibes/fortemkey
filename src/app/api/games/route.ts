import { NextRequest, NextResponse } from "next/server";
import { getGames, addGame, updateGame, deleteGame } from "@/lib/supabase-queries";

export async function GET() {
  const data = await getGames();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, publisher } = body;
  if (!name || !publisher) {
    return NextResponse.json({ error: "name과 publisher는 필수입니다." }, { status: 400 });
  }
  const game = await addGame({ name, publisher });
  return NextResponse.json(game, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const game = await updateGame(id, data);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game);
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const result = await deleteGame(id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
