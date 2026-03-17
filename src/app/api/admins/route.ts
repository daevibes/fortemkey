import { NextRequest, NextResponse } from "next/server";
import { getAdmins, addAdmin, updateAdmin, deleteAdmin } from "@/lib/supabase-queries";
import { createServiceSupabase } from "@/lib/supabase-auth";

export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get("active") === "true";
    return NextResponse.json(await getAdmins(activeOnly));
  } catch (err) {
    console.error("[admins GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const admin = await addAdmin(body);
    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `관리자 등록 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}` },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const admin = await updateAdmin(id, data);
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(admin);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const result = await deleteAdmin(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  // Supabase Auth 유저도 삭제
  if (result.email) {
    const serviceSupabase = createServiceSupabase();
    if (serviceSupabase) {
      // email로 Auth 유저 찾기
      const { data: { users } } = await serviceSupabase.auth.admin.listUsers();
      const authUser = users.find((u) => u.email === result.email);
      if (authUser) {
        await serviceSupabase.auth.admin.deleteUser(authUser.id);
      }
    }
  }

  return NextResponse.json({ success: true });
}
