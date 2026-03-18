import { NextRequest, NextResponse } from "next/server";
import { getBatch } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batchId = Number(id);
  if (!batchId) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }

  const batch = await getBatch(batchId);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (!batch.file_path) {
    return NextResponse.json({ error: "원본 CSV 파일이 저장되지 않은 배치입니다." }, { status: 404 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Supabase가 연결되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await supabase.storage
    .from("csv-uploads")
    .download(batch.file_path);

  if (error || !data) {
    return NextResponse.json({ error: "파일 다운로드 실패" }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(batch.file_name)}"`,
    },
  });
}
