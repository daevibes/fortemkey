import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase-auth";
import { getAdmins } from "@/lib/supabase-queries";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabase(cookieStore);

    if (!supabase) {
      // Supabase 미설정 시 데모 모드: 첫 번째 admin 반환
      const admins = await getAdmins();
      const admin = admins.find((a) => a.role === "admin") || admins[0];
      if (!admin) return NextResponse.json({ error: "관리자 없음" }, { status: 404 });
      return NextResponse.json(admin);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const admins = await getAdmins();
    const admin = admins.find((a) => a.email === user.email);
    if (!admin) {
      return NextResponse.json({ error: "관리자 권한 없음" }, { status: 403 });
    }

    return NextResponse.json(admin);
  } catch (err) {
    console.error("[me GET]", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
