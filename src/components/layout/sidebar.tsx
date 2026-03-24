"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase-auth";
import {
  LayoutDashboard,
  Upload,
  Code2,
  Package,
  Users,
  BookOpen,
  LogOut,
  History,
  ImageIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/catalog", label: "카탈로그", icon: BookOpen },
  { href: "/upload", label: "코드 업로드", icon: Upload },
  { href: "/batches", label: "업로드 이력", icon: History },
  { href: "/codes", label: "코드 관리", icon: Code2 },
  { href: "/inventory", label: "재고 현황", icon: Package },
  { href: "/assets", label: "게임 에셋", icon: ImageIcon },
  { href: "/settings", label: "관리자", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-neutral-700 bg-neutral-900 flex flex-col">
      <div className="flex h-14 items-center border-b border-neutral-700 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-neutral-100">
          <Package className="h-6 w-6 text-blue-400" />
          <span>ForTem</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-700 p-3 space-y-2">
        {email && (
          <p className="truncate px-3 text-xs text-neutral-500" title={email}>
            {email}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
