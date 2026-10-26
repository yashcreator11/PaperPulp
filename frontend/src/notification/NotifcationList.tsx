import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Filter,
  Search,
  CheckCheck,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RcaModal, { type AlertRcaData } from "@/components/RcaModal";
import AssetTelemetryGraphModal, { type AssetTelemetryAlertData } from "@/components/AssetTelemetryGraphModal";

export const NotificationList = () => {
  const {
    notifications,
    markAllRead,
    markRead,
    activeTab,
    setActiveTab,
    loadMore,
    hasMore,
    loading,
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread" | "read" | "critical">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlertForRca, setSelectedAlertForRca] = useState<AlertRcaData | null>(null);
  const [selectedAlertForGraph, setSelectedAlertForGraph] = useState<AssetTelemetryAlertData | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString() : "-";

  const timeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const diffSec = (Date.now() - new Date(dateStr).getTime()) / 1000;
      if (diffSec < 20) return "Just now";
      if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return new Date(dateStr).toLocaleString();
    } catch {
      return "-";
    }
  };

  const parsePayload = (notif: any) => {
    try {
      return typeof notif.text === "string" ? JSON.parse(notif.text) : notif.text;
    } catch {
      return null;
    }
  };

  const isResolvedLike = (data: any) =>
    !!data && (data.status === "NORMAL" || typeof data.durationSeconds === "number" || (data.from && data.to));

  const isStartLike = (data: any) =>
    !!data && !isResolvedLike(data) && (!!data.status || typeof data.value === "number" || typeof data.percent === "number");

  const filtered = notifications.filter((n: any) => {
    const data = parsePayload(n);
    const isCritical = data?.status === "HIGH";

    // Tab filter
    if (filter === "read" && !n.isRead) return false;
    if (filter === "unread" && n.isRead) return false;
    if (filter === "critical" && !isCritical) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (n.title || "").toLowerCase().includes(q);
      const assetMatch = (data?.asset || "").toLowerCase().includes(q);
      const signalMatch = (data?.signal || "").toLowerCase().includes(q);
      const messageMatch = (data?.message || "").toLowerCase().includes(q);
      return titleMatch || assetMatch || signalMatch || messageMatch;
    }

    return true;
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const criticalCount = notifications.filter((n: any) => {
    const d = parsePayload(n);
    return d?.status === "HIGH";
  }).length;
  const resolvedCount = notifications.filter((n: any) => {
    const d = parsePayload(n);
    return isResolvedLike(d);
  }).length;

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.4 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ===================== CONTROL ROOM HERO METRICS ===================== */}
      <div className="p-6 pb-4 border-b border-border bg-card/60 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Mill Supervisory Notifications
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Live DCS process alarms, equipment drift notifications, and predictive break warnings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="text-xs gap-1.5 border-border/80"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* 4 Summary Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Logged
            </span>
            <span className="text-xl font-black text-foreground font-mono mt-0.5 block">
              {notifications.length}
            </span>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Unread Alarms
            </span>
            <span className="text-xl font-black text-amber-500 font-mono mt-0.5 block">
              {unreadCount}
            </span>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Critical Hazards
            </span>
            <span className="text-xl font-black text-rose-500 font-mono mt-0.5 block">
              {criticalCount}
            </span>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Restored Normal
            </span>
            <span className="text-xl font-black text-emerald-500 font-mono mt-0.5 block">
              {resolvedCount}
            </span>
          </div>
        </div>
      </div>

      {/* ===================== FILTER & SEARCH BAR ===================== */}
      <div className="px-6 py-3 border-b border-border bg-card/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "unread"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "critical"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Critical Hazards ({criticalCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "read"
                ? "bg-muted text-foreground border border-border shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Archived
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search asset, tag, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ===================== NOTIFICATION CARDS FEED ===================== */}
      <div className="flex-1 p-6 space-y-4 max-w-5xl mx-auto w-full">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-card/30">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Matching Notifications</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              There are no process notifications matching your filter criteria. Mill operations are steady.
            </p>
          </div>
        ) : (
          filtered.map((notif: any) => {
            const data = parsePayload(notif);
            const resolved = isResolvedLike(data);
            const isStart = isStartLike(data);
            const isHigh = data?.status === "HIGH";
            const isLow = data?.status === "LOW";
            const timeLabel = timeAgo(data?.timestamp || notif.createdAt);

            /* ------------------ ACTIVE PROCESS ALARM CARD ------------------ */
            if (isStart) {
              const percent = typeof data?.percent === "number" ? data.percent : 24;
              const absDev = Math.abs(percent);

              return (
                <div
                  key={notif.id}
                  className={`relative rounded-2xl border p-5 transition-all shadow-sm ${
                    !notif.isRead
                      ? isHigh
                        ? "bg-gradient-to-r from-rose-950/20 via-card to-card border-rose-500/50 shadow-rose-950/10"
                        : "bg-gradient-to-r from-amber-950/20 via-card to-card border-amber-500/40 shadow-amber-950/10"
                      : "bg-card border-border/80 hover:border-border"
                  }`}
                >
                  {/* Left severity indicator bar */}
                  <div
                    className={`absolute left-0 top-4 bottom-4 w-1.5 rounded-r ${
                      isHigh ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-cyan-500"
                    }`}
                  />

                  <div className="pl-2">
                    {/* Header Row: Badges & Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-black uppercase font-mono tracking-wider ${
                            isHigh
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {data.status || "ALERT"}
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {data.asset || "PM-01-PAPER-MACHINE"}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-foreground">
                          {data.signal || "Operational Variable"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeLabel}</span>
                        </div>
                        {!notif.isRead && (
                          <button
                            onClick={() => markRead(notif.recipientId || notif.id)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Alert Message */}
                    {data.message && (
                      <p className="text-xs text-foreground/90 mt-2 font-medium">
                        {data.message}
                      </p>
                    )}

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 bg-muted/30 p-3 rounded-xl border border-border/40">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Current Value
                        </span>
                        <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                          {fmt(data.value)} {data.unit || ""}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Deviation
                        </span>
                        <span
                          className={`text-sm font-mono font-bold mt-0.5 block ${
                            isHigh ? "text-rose-400" : "text-amber-400"
                          }`}
                        >
                          {percent > 0 ? `+${fmt(percent)}%` : `${fmt(percent)}%`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Safe Minimum
                        </span>
                        <span className="text-sm font-mono font-medium text-muted-foreground mt-0.5 block">
                          {fmt(data.min)} {data.unit || ""}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Safe Maximum
                        </span>
                        <span className="text-sm font-mono font-medium text-muted-foreground mt-0.5 block">
                          {fmt(data.max)} {data.unit || ""}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHigh ? "bg-rose-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(20, absDev))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Break hazard risk elevated. Advance lead time available.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedAlertForGraph({
                              assetName: data.asset || notif.title || "PM-01-PAPER-MACHINE",
                              signalName: data.signal || "Operational Variable",
                              severity: isHigh ? "Critical" : "Medium",
                              observedValue: data.value,
                              thresholdValue: isHigh ? data.max : data.min,
                              minThreshold: data.min,
                              maxThreshold: data.max,
                              unit: data.unit || "%",
                              deviationPercent: data.percent ?? 24,
                              timestamp: data.timestamp || notif.createdAt,
                              message: data.message,
                            })
                          }
                          className="text-xs font-semibold gap-1.5 h-8 border-border hover:bg-muted"
                        >
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          View Telemetry Graph
                        </Button>

                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedAlertForRca({
                              assetName: data.asset || notif.title || "PM-01-PAPER-MACHINE",
                              signalName: data.signal || "Operational Variable",
                              severity: isHigh ? "Critical" : "Medium",
                              observedValue: data.value,
                              thresholdValue: isHigh ? data.max : data.min,
                              unit: data.unit || "%",
                              deviationPercent: data.percent ?? 24,
                              timestamp: data.timestamp || notif.createdAt,
                            })
                          }
                          className="text-xs font-bold gap-1.5 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Investigate with AI RCA
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            /* ------------------ RESOLVED / NORMALIZED CARD ------------------ */
            if (resolved) {
              return (
                <div
                  key={notif.id}
                  className="relative rounded-2xl border border-emerald-500/30 bg-card p-5 transition-all shadow-sm"
                >
                  <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-r bg-emerald-500" />

                  <div className="pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {data?.asset || "PM-01-PAPER-MACHINE"}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-foreground">
                          {data?.signal || "Process Variable"} Restored
                        </span>
                      </div>

                      <span className="text-xs text-muted-foreground font-mono">
                        {timeLabel}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Operating telemetry returned to baseline tolerance. Break risk subdued.
                    </p>
                  </div>
                </div>
              );
            }

            /* ------------------ GENERIC / SYSTEM CARD ------------------ */
            return (
              <div
                key={notif.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{notif.title || "Notification"}</span>
                  <span className="text-xs text-muted-foreground">{timeLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground">{notif.text}</p>
              </div>
            );
          })
        )}

        {hasMore && (
          <div
            ref={loaderRef}
            className="h-10 flex items-center justify-center text-xs text-muted-foreground"
          >
            {loading ? "Loading more notifications..." : "Scroll for more"}
          </div>
        )}
      </div>

      {/* AI Root Cause Analysis (RCA) Modal Dialog */}
      <RcaModal
        isOpen={!!selectedAlertForRca}
        onClose={() => setSelectedAlertForRca(null)}
        alert={selectedAlertForRca}
      />

      {/* Asset Telemetry Deviation Graph Modal */}
      <AssetTelemetryGraphModal
        isOpen={!!selectedAlertForGraph}
        onClose={() => setSelectedAlertForGraph(null)}
        alert={selectedAlertForGraph}
        onOpenRca={(alertData) => {
          setSelectedAlertForRca({
            assetName: alertData.assetName,
            signalName: alertData.signalName,
            severity: alertData.severity,
            observedValue: alertData.observedValue,
            thresholdValue: alertData.thresholdValue,
            unit: alertData.unit,
            deviationPercent: alertData.deviationPercent,
            timestamp: alertData.timestamp,
            message: alertData.message,
          });
        }}
      />
    </div>
  );
};
