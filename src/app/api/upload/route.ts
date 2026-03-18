import { NextRequest, NextResponse } from "next/server";
import { addCodesMultiItem } from "@/lib/supabase-queries";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  let groups: { itemName: string; codes: string[]; price: number; existingItemId: number | null }[];
  let collectionId: number;
  let gameId: number;
  let adminId: number;
  let fileName: string;
  let expiresAt: string | null;
  let filePath: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    // FormData with CSV file
    const formData = await req.formData();
    const jsonStr = formData.get("data") as string;
    if (!jsonStr) {
      return NextResponse.json({ error: "Missing data field" }, { status: 400 });
    }
    const body = JSON.parse(jsonStr);
    groups = body.groups;
    collectionId = body.collectionId;
    gameId = body.gameId;
    adminId = body.adminId;
    fileName = body.fileName;
    expiresAt = body.expiresAt || null;

    // Upload CSV file to Supabase Storage if available
    const csvFile = formData.get("file") as File | null;
    if (csvFile && supabase) {
      const storagePath = `${gameId}/${Date.now()}_${csvFile.name}`;
      const buffer = Buffer.from(await csvFile.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("csv-uploads")
        .upload(storagePath, buffer, {
          contentType: "text/csv",
          upsert: false,
        });

      if (!uploadError) {
        filePath = storagePath;
      }
      // If storage upload fails, continue without file_path (non-blocking)
    }
  } else {
    // Legacy JSON body (backwards compatible)
    const body = await req.json();
    groups = body.groups;
    collectionId = body.collectionId;
    gameId = body.gameId;
    adminId = body.adminId;
    fileName = body.fileName;
    expiresAt = body.expiresAt || null;
  }

  if (!groups || !Array.isArray(groups) || !collectionId || !gameId || !adminId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await addCodesMultiItem(groups, collectionId, gameId, adminId, fileName, expiresAt, filePath);
  return NextResponse.json(result, { status: 201 });
}
