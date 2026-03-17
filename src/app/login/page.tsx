"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-auth";
import { Package, Mail } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  callback_failed: "인증에 실패했습니다. 다시 시도해 주세요.",
  confirm_failed: "인증 확인에 실패했습니다. 다시 시도해 주세요.",
  not_admin: "관리자 권한이 없습니다. 관리자에게 문의하세요.",
};

function MagicLinkForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam]);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Supabase가 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm`,
      },
    });

    if (otpError) {
      setError(`매직 링크 발송 실패: ${otpError.message}`);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-900/50 p-4 text-center">
        <Mail className="mx-auto mb-2 h-8 w-8 text-blue-400" />
        <p className="text-sm font-medium text-neutral-200">
          로그인 링크를 보냈습니다
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          <span className="text-neutral-300">{email}</span>의 받은편지함을
          확인하세요
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="mt-3 text-xs text-neutral-500 underline hover:text-neutral-400"
        >
          다른 이메일로 다시 보내기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="admin@example.com"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "발송 중..." : "로그인 링크 보내기"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#171717]">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="flex flex-col items-center gap-2">
          <Package className="h-10 w-10 text-blue-400" />
          <h1 className="text-xl font-bold text-neutral-100">ForTem</h1>
          <p className="text-sm text-neutral-500">코드 관리 대시보드</p>
        </div>
        <Suspense>
          <MagicLinkForm />
        </Suspense>
        <p className="text-center text-xs text-neutral-600">
          등록된 이메일로 로그인 링크를 받아 접속할 수 있습니다
        </p>
      </div>
    </div>
  );
}
