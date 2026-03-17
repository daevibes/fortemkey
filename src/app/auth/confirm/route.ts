import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // token_hash도 code도 없으면 로그인으로
  if (!tokenHash && !code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const response = NextResponse.redirect(new URL("/", origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Token Hash 플로우 (invite, magiclink, email)
  if (tokenHash) {
    const otpType = (type as "magiclink" | "email") || "magiclink";
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      console.error("[auth/confirm] verifyOtp error:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=confirm_failed", origin)
      );
    }

    return response;
  }

  // PKCE 플로우 (code 교환)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/confirm] exchangeCode error:", error.message);
      return NextResponse.redirect(
        new URL("/login?error=confirm_failed", origin)
      );
    }

    return response;
  }

  return NextResponse.redirect(new URL("/login", origin));
}
