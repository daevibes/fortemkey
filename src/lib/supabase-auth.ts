import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function isConfigured() {
  return !!(supabaseUrl && supabaseAnonKey);
}

/** 클라이언트 컴포넌트용 (로그인, 로그아웃) */
export function createBrowserSupabase() {
  if (!isConfigured()) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** 미들웨어/서버용 (세션 확인) */
export function createServerSupabase(cookieStore: ReadonlyRequestCookies) {
  if (!isConfigured()) return null;
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서 호출 시 무시 (읽기 전용)
        }
      },
    },
  });
}

/** 서버 전용, service_role 키 (관리자 관리용) */
export function createServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
