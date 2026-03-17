import { NextResponse } from "next/server";
import { getBatches } from "@/lib/supabase-queries";

export async function GET() {
  return NextResponse.json(await getBatches());
}
