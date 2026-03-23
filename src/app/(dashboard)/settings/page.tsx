"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Users, Trash2 } from "lucide-react";
import type { Admin } from "@/lib/types";

export default function SettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAdmins = () => {
    fetch("/api/admins")
      .then((r) => r.json())
      .then((data) => setAdmins(Array.isArray(data) ? data : []))
      .catch(() => setAdmins([]));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const toggleActive = async (admin: Admin) => {
    setMessage(null);
    const res = await fetch("/api/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, is_active: !admin.is_active }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "상태 변경 실패" });
      return;
    }
    setMessage({
      type: "success",
      text: `${admin.name} 관리자가 ${admin.is_active ? "비활성화" : "활성화"}되었습니다.`,
    });
    fetchAdmins();
  };

  const changeRole = async (admin: Admin, role: "admin" | "manager") => {
    setMessage(null);
    const res = await fetch("/api/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, role }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "역할 변경 실패" });
      return;
    }
    setMessage({ type: "success", text: `${admin.name} 관리자의 역할이 ${role}(으)로 변경되었습니다.` });
    fetchAdmins();
  };

  const handleDelete = async (admin: Admin) => {
    if (!confirm(`"${admin.name}" (${admin.email}) 관리자를 삭제하시겠습니까?\nSupabase Auth 계정도 함께 삭제됩니다.`)) return;
    setMessage(null);
    const res = await fetch("/api/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "삭제 실패" });
      return;
    }
    setMessage({ type: "success", text: `${admin.name} 관리자가 삭제되었습니다.` });
    fetchAdmins();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-100">관리자</h1>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === "error"
            ? "bg-red-900/30 text-red-400 border border-red-800/50"
            : "bg-green-900/30 text-green-400 border border-green-800/50"
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            관리자 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-800/50 text-left">
                  <th className="px-3 py-2 font-medium text-neutral-300">이름</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">이메일</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">역할</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">상태</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">등록일</th>
                  <th className="px-3 py-2 font-medium text-neutral-300">삭제</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-neutral-700/50 last:border-0 hover:bg-neutral-700/50">
                    <td className="px-3 py-2 font-medium text-neutral-100">{admin.name}</td>
                    <td className="px-3 py-2 text-neutral-400">{admin.email}</td>
                    <td className="px-3 py-2">
                      <SelectNative
                        value={admin.role}
                        onChange={(e) => changeRole(admin, e.target.value as "admin" | "manager")}
                        options={[
                          { value: "admin", label: "Admin" },
                          { value: "manager", label: "Manager" },
                        ]}
                        className="h-8 w-28 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        className={`cursor-pointer transition-opacity hover:opacity-80 ${admin.is_active ? "bg-green-900/30 text-green-400" : "bg-neutral-700 text-neutral-400"}`}
                        onClick={() => toggleActive(admin)}
                      >
                        {admin.is_active ? "활성" : "비활성"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-400">{formatDate(admin.created_at)}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(admin)}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
