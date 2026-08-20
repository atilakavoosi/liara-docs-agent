"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Database, KeyRound, RotateCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TOKEN_KEY = "liarayar:admin-token";

interface UsageRecord {
  requestId: string;
  ts: number;
  route: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  cacheHit: boolean;
  durationMs: number;
}

interface Stats {
  usage: {
    totalRequests: number;
    cacheHits: number;
    cacheHitRate: number;
    tokensIn: number;
    tokensOut: number;
    avgDurationMs: number;
    estimatedCost: number | null;
    costCurrency: string | null;
    recent: UsageRecord[];
  };
  cache: {
    entries: number;
    totalLookups: number;
    totalHits: number;
    hitRate: number;
    topEntries: Array<{ query: string; hits: number; createdAt: number }>;
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <Icon className="size-4 shrink-0 text-primary" />
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "خطای نامشخص");
        setStats(null);
        return;
      }
      setStats(body);
      window.localStorage.setItem(TOKEN_KEY, t);
    } catch {
      setError("اتصال به سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
      fetchStats(saved);
    }
  }, [fetchStats]);

  if (!stats) {
    return (
      <div className="flex h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              ورود به داشبورد ادمین
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="ADMIN_TOKEN"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchStats(token)}
              dir="ltr"
              className="text-left"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={() => fetchStats(token)} disabled={loading || !token}>
              {loading ? "در حال بررسی…" : "ورود"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { usage, cache } = stats;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">داشبورد مصرف و هزینه</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetchStats(token)}>
          <RotateCw className="size-3.5" />
          به‌روزرسانی
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Activity} label="کل درخواست‌ها" value={String(usage.totalRequests)} />
        <StatCard
          icon={Zap}
          label="نرخ اصابت کش"
          value={`${Math.round(usage.cacheHitRate * 100)}٪`}
          hint={`${usage.cacheHits} از ${usage.totalRequests}`}
        />
        <StatCard
          icon={Database}
          label="توکن (ورودی/خروجی)"
          value={`${usage.tokensIn.toLocaleString("fa-IR")} / ${usage.tokensOut.toLocaleString("fa-IR")}`}
        />
        <StatCard
          icon={Activity}
          label="میانگین زمان پاسخ"
          value={`${(usage.avgDurationMs / 1000).toFixed(1)}s`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>هزینه‌ی تخمینی</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.estimatedCost !== null ? (
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {usage.estimatedCost.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}{" "}
              {usage.costCurrency}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              قیمت مدل‌ها در env تنظیم نشده (<code dir="ltr">PRICE_&lt;MODEL&gt;_IN_PER_1M</code> و{" "}
              <code dir="ltr">PRICE_&lt;MODEL&gt;_OUT_PER_1M</code>)، پس به‌جای عدد ساختگی چیزی
              نشون داده نمی‌شه.
            </p>
          )}
        </CardContent>
      </Card>

      {cache.topEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>پرتکرارترین سؤال‌های کش‌شده</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cache.topEntries.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{e.query}</span>
                <Badge variant="secondary" className="shrink-0">
                  {e.hits} برخورد
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>درخواست‌های اخیر</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-2 pb-2 font-medium first:ps-0">زمان</th>
                <th className="px-2 pb-2 font-medium">مدل</th>
                <th className="px-2 pb-2 font-medium">توکن ورودی</th>
                <th className="px-2 pb-2 font-medium">توکن خروجی</th>
                <th className="px-2 pb-2 font-medium">مدت</th>
                <th className="px-2 pb-2 font-medium last:pe-0">کش</th>
              </tr>
            </thead>
            <tbody>
              {usage.recent.map((r) => (
                <tr key={r.requestId} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-1.5 text-xs text-muted-foreground ps-0" dir="ltr">
                    {new Date(r.ts).toLocaleTimeString("fa-IR")}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-foreground" dir="ltr">
                    {r.model ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{r.tokensIn.toLocaleString("fa-IR")}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.tokensOut.toLocaleString("fa-IR")}</td>
                  <td className="px-2 py-1.5 tabular-nums">{(r.durationMs / 1000).toFixed(1)}s</td>
                  <td className="px-2 py-1.5 pe-0">
                    {r.cacheHit ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">کش</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">مدل</span>
                    )}
                  </td>
                </tr>
              ))}
              {usage.recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">
                    هنوز درخواستی ثبت نشده.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
