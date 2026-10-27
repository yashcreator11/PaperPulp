import React, { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell,
  Check,
  CheckCheck,
  Eye,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Gauge,
  SlidersHorizontal,
  X,
  Volume2,
  Layers,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import RcaModal, { type AlertRcaData } from "@/components/RcaModal";
import AssetTelemetryGraphModal, { type AssetTelemetryAlertData } from "@/components/AssetTelemetryGraphModal";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onOpenChange }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [selectedAlertForRca, setSelectedAlertForRca] = useState<AlertRcaData | null>(null);
  const [selectedAlertForGraph, setSelectedAlertForGraph] = useState<AssetTelemetryAlertData | null>(null);
  const [filter, setFilter] = useState<"all" | "alerts" | "resolved">("all");

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
      return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
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

  const filteredNotifications = notifications.filter((notif: any) => {
    const data = parsePayload(notif);
    const resolved = isResolvedLike(data);
    const alert = isStartLike(data);

    if (filter === "alerts") return alert;
    if (filter === "resolved") return resolved;
    return true;
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetOverlay className="bg-black/60 backdrop-blur-md backdrop-saturate-150 transition-all" />

        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col max-h-screen bg-card/95 backdrop-blur-2xl border-l border-border/80 shadow-2xl z-[150]"
        >
          {/* ===================== CONTROL ROOM HEADER ===================== */}
          <SheetHeader className="p-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Bell className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    Mill Telemetry & Alarms
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        {unreadCount} new
                      </span>
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Live operational events from DCS & AI Break Predictor
                  </SheetDescription>
                </div>
              </div>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Mark all
                </Button>
              )}
            </div>

            {/* Quick Filter Segmented Tabs */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("alerts")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filter === "alerts"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Active Alarms
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  filter === "resolved"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Normal / Restored
              </button>
            </div>
          </SheetHeader>

          {/* ===================== NOTIFICATION CARDS LIST ===================== */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">All Systems Operating Normally</p>
                  <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
                    No active drift alerts or process threshold breaches detected across paper machine lines.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif: any) => {
                const data = parsePayload(notif);
                const resolved = isResolvedLike(data);
                const isStart = isStartLike(data);
                const isHigh = data?.status === "HIGH";
                const isLow = data?.status === "LOW";
                const timeLabel = timeAgo(data?.timestamp || notif.createdAt);

                /* ----------------- 1. ACTIVE PROCESS ALARM CARD ----------------- */
                if (isStart) {
                  const percent = typeof data?.percent === "number" ? data.percent : 20;
                  const absDev = Math.abs(percent);

                  return (
                    <div
                      key={notif.id}
                      className={`relative rounded-xl border p-3.5 transition-all shadow-sm ${
                        !notif.isRead
                          ? isHigh
                            ? "bg-gradient-to-br from-rose-950/20 via-background to-rose-950/10 border-rose-500/50 shadow-rose-950/10"
                            : "bg-gradient-to-br from-amber-950/20 via-background to-amber-950/10 border-amber-500/40 shadow-amber-950/10"
                          : "bg-card border-border/70 hover:border-border"
                      }`}
                    >
                      {/* Left vertical severity strip */}
                      <div
                        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                          isHigh ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-cyan-500"
                        }`}
                      />

                      {/* Top Bar: Asset Tag + Status Badge + Time */}
                      <div className="flex items-center justify-between gap-2 pl-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-wider ${
                              isHigh
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {data.status || "ALERT"}
                          </span>
                          <span className="text-xs font-mono font-bold text-foreground truncate">
                            {data.asset || "PM-01"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          <span>{timeLabel}</span>
                          {!notif.isRead && (
                            <button
                              onClick={() => markRead(notif.recipientId || notif.id)}
                              className="p-1 hover:text-primary transition"
                              title="Mark as read"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: Signal Name & Deviation */}
                      <div className="mt-2 pl-2">
                        <h4 className="text-xs font-bold text-foreground leading-snug">
                          {data.signal || notif.title || "Parameter Deviation"}
                        </h4>

                        {data.message && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {data.message}
                          </p>
                        )}
                      </div>

                      {/* Value and Tolerance Metric Badges */}
                      <div className="mt-2.5 pl-2 grid grid-cols-2 gap-2 bg-muted/40 p-2 rounded-lg border border-border/40 text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-muted-foreground block font-medium">Observed Value</span>
                          <span className="font-mono font-bold text-foreground">
                            {fmt(data.value)} {data.unit || ""}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-muted-foreground block font-medium">Variance</span>
                          <span
                            className={`font-mono font-bold ${
                              isHigh ? "text-rose-400" : "text-amber-400"
                            }`}
                          >
                            {percent > 0 ? `+${fmt(percent)}%` : `${fmt(percent)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Tolerance limits meter */}
                      <div className="mt-2 pl-2">
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                          <span>Safe Min: {fmt(data.min)}</span>
                          <span>Safe Max: {fmt(data.max)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHigh ? "bg-rose-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(15, absDev))}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Bar: Telemetry Graph & Deep AI RCA Triggers */}
                      <div className="mt-3 pl-2 pt-2 border-t border-border/50 flex items-center justify-between gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
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
                            });
                          }}
                          className="h-7 text-xs font-semibold gap-1 px-2 border-border/80 hover:bg-muted"
                        >
                          <Activity className="w-3 h-3 text-cyan-400" />
                          View Graph
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            setSelectedAlertForRca({
                              assetName: data.asset || notif.title || "PM-01-PAPER-MACHINE",
                              signalName: data.signal || "Operational Variable",
                              severity: isHigh ? "Critical" : "Medium",
                              observedValue: data.value,
                              thresholdValue: isHigh ? data.max : data.min,
                              unit: data.unit || "%",
                              deviationPercent: data.percent ?? 24,
                              timestamp: data.timestamp || notif.createdAt,
                            });
                          }}
                          className="h-7 text-xs font-bold gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm px-2.5"
                        >
                          <Sparkles className="w-3 h-3" />
                          AI RCA
                        </Button>
                      </div>
                    </div>
                  );
                }

                /* ----------------- 2. RESOLVED / RESTORED CARD ----------------- */
                if (resolved) {
                  return (
                    <div
                      key={notif.id}
                      className="relative rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3.5 transition-all shadow-sm"
                    >
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-emerald-500" />

                      <div className="flex items-center justify-between gap-2 pl-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Resolved
                          </span>
                          <span className="text-xs font-mono font-bold text-foreground">
                            {data?.asset || "PM-01"}
                          </span>
                        </div>

                        <span className="text-[11px] text-muted-foreground font-mono">
                          {timeLabel}
                        </span>
                      </div>

                      <div className="mt-1.5 pl-2">
                        <h4 className="text-xs font-bold text-foreground">
                          {data?.signal || "Operating Telemetry"} Restored to Nominal
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Process baseline normalized. Risk factor subdued to safe threshold.
                        </p>
                      </div>
                    </div>
                  );
                }

                /* ----------------- 3. SYSTEM / GENERIC CARD ----------------- */
                return (
                  <div
                    key={notif.id}
                    className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{notif.title || "Notification"}</span>
                      <span className="text-[11px] text-muted-foreground">{timeLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{notif.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

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
    </>
  );
};

export default NotificationDrawer;
