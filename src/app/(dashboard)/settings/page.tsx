"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Users, Trash2, RefreshCw, Globe, Key, Clock, Loader2 } from "lucide-react";
import type { Admin, SyncLog } from "@/lib/types";
import { SYNC_STATUS_COLORS, SYNC_STATUS_LABELS } from "@/lib/types";

export default function SettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [myRole, setMyRole] = useState<"admin" | "manager" | null>(null);

  // Sync settings
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [pollingInterval, setPollingInterval] = useState(5);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ running: boolean; latest: SyncLog | null }>({ running: false, latest: null });
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const fetchAdmins = () => {
    fetch("/api/admins")
      .then((r) => r.json())
      .then((data) => setAdmins(Array.isArray(data) ? data : []))
      .catch(() => setAdmins([]));
  };

  const fetchSyncStatus = useCallback(() => {
    fetch("/api/sync?status=true")
      .then((r) => r.json())
      .then((data) => setSyncStatus(data))
      .catch(() => {});
    fetch("/api/sync?limit=5")
      .then((r) => r.json())
      .then((data) => setSyncLogs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchSyncStatus();
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => { if (data.role) setMyRole(data.role); })
      .catch(() => {});

    // Load saved settings from localStorage
    const saved = localStorage.getItem("fortem_sync_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiUrl) setApiUrl(parsed.apiUrl);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.pollingInterval !== undefined) setPollingInterval(parsed.pollingInterval);
      } catch {}
    }
  }, [fetchSyncStatus]);

  // Save settings to localStorage when changed
  const saveSettings = () => {
    localStorage.setItem("fortem_sync_settings", JSON.stringify({ apiUrl, apiKey, pollingInterval }));
    setMessage({ type: "success", text: "API 설정이 저장되었습니다." });
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "동기화 실패" });
      } else {
        setMessage({
          type: "success",
          text: `동기화 완료: ${data.total_fetched}건 확인, 신규 판매 ${data.new_sold}건 반영` +
            (data.not_found > 0 ? `, 미확인 ${data.not_found}건` : ""),
        });
      }
      fetchSyncStatus();
    } catch {
      setMessage({ type: "error", text: "동기화 요청 실패" });
    } finally {
      setSyncing(false);
    }
  };

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
      <h1 className="text-2xl font-bold text-neutral-100">설정</h1>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === "error"
            ? "bg-red-900/30 text-red-400 border border-red-800/50"
            : "bg-green-900/30 text-green-400 border border-green-800/50"
        }`}>
          {message.text}
        </div>
      )}

      {/* Marketplace API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            마켓플레이스 API 연동
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                API 엔드포인트 URL
              </label>
              <Input
                type="url"
                placeholder="https://api.marketplace.example.com/v1/sold-codes"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                API Key
              </label>
              <Input
                type="password"
                placeholder="API 키를 입력하세요"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                폴링 주기
              </label>
              <SelectNative
                value={String(pollingInterval)}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                options={[
                  { value: "5", label: "5분" },
                  { value: "10", label: "10분" },
                  { value: "30", label: "30분" },
                  { value: "0", label: "수동만" },
                ]}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={saveSettings} variant="outline" className="h-10">
                설정 저장
              </Button>
              <Button onClick={handleSync} disabled={syncing} className="h-10">
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    지금 동기화
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sync Status */}
          {syncStatus.latest && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-300">
                  마지막 동기화: {formatDateTime(syncStatus.latest.started_at)}
                </div>
                <Badge className={SYNC_STATUS_COLORS[syncStatus.latest.status]}>
                  {SYNC_STATUS_LABELS[syncStatus.latest.status]}
                </Badge>
              </div>
              {syncStatus.latest.status === "success" && (
                <p className="mt-1 text-xs text-neutral-400">
                  코드 {syncStatus.latest.total_fetched}건 확인, 신규 판매 {syncStatus.latest.new_sold}건 반영
                  {syncStatus.latest.not_found > 0 && `, 미확인 ${syncStatus.latest.not_found}건`}
                </p>
              )}
              {syncStatus.latest.status === "failed" && syncStatus.latest.error_message && (
                <p className="mt-1 text-xs text-red-400">{syncStatus.latest.error_message}</p>
              )}
            </div>
          )}

          {/* Recent Sync Logs */}
          {syncLogs.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-300">최근 동기화 이력</h3>
              <div className="space-y-2">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded border border-neutral-700/50 bg-neutral-800/30 px-3 py-2 text-sm">
                    <div>
                      <span className="text-neutral-400">{formatDateTime(log.started_at)}</span>
                      {log.status === "success" && (
                        <span className="ml-2 text-neutral-300">
                          확인 {log.total_fetched}건 / 신규 {log.new_sold}건
                        </span>
                      )}
                      {log.status === "failed" && log.error_message && (
                        <span className="ml-2 text-red-400">{log.error_message}</span>
                      )}
                    </div>
                    <Badge className={`text-xs ${SYNC_STATUS_COLORS[log.status]}`}>
                      {SYNC_STATUS_LABELS[log.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin List */}
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
                  <th className="px-3 py-2 font-medium text-neutral-300">비활성화</th>
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
                      {myRole === "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(admin)}
                          className="text-red-400 text-xs hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
