import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Share2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExistingMapping } from "@/asset/AssetTree";
import type { Asset } from "@/api/assetApi";
import type { AssetTelemetryAlertData } from "@/components/AssetTelemetryGraphModal";
import type { AlertRcaData } from "@/components/RcaModal";
import { useSimulation, type LiveSignalState } from "@/context/SimulationContext";

interface LiveAssetTelemetryMonitorProps {
  asset: Asset;
  mappings: ExistingMapping[];
  onOpenGraph: (data: AssetTelemetryAlertData) => void;
  onOpenRca: (data: AlertRcaData) => void;
}

export default function LiveAssetTelemetryMonitor({
  asset,
  onOpenGraph,
  onOpenRca,
}: LiveAssetTelemetryMonitorProps) {
  const navigate = useNavigate();
  const { signalsByAsset, getSignalsForAsset } = useSimulation();

  // Get live signals for this asset from the shared global engine
  const signals: LiveSignalState[] =
    signalsByAsset[asset.assetId] || getSignalsForAsset(asset.assetId, asset.name);

  const hasExcursion = signals.some((s) => s.status === "critical" || s.phase === "excursion");
  const hasRamping = signals.some((s) => s.phase === "ramping");
  const primarySignal = signals.find((s) => s.isPrimarySource);

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm">
      {/* Header: Clean Operational View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  hasExcursion ? "bg-rose-400" : hasRamping ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  hasExcursion ? "bg-rose-500" : hasRamping ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>

            <h3 className="text-sm font-bold text-foreground tracking-tight">
              Live Sensor Telemetry Monitor
            </h3>

            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
            >
              OPC-UA / Modbus Live
            </Badge>

            {hasExcursion && (
              <Badge variant="destructive" className="text-[10px] uppercase font-mono animate-pulse">
                Excursion Alert
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            Streaming real-time telemetry from plant field transmitters for {asset.name}
          </p>
        </div>

        {/* Clean Link to Dedicated Simulator Page */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/simulator")}
            className="h-7 text-xs font-semibold gap-1.5 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Open Process Simulator to inject test anomalies or adjust signals"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
            <span>Process Simulator</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Button>
        </div>
      </div>

      {/* Active Disturbance Banner (if triggered from Simulator) */}
      {hasExcursion && primarySignal && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
            <span className="font-bold text-rose-400">Primary Root Cause:</span>
            <span className="font-mono text-foreground font-semibold">{primarySignal.signalName}</span>
            <span className="text-muted-foreground hidden md:inline">
              → Inducing downstream cascade into coupled section tags
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 font-mono shrink-0">
            Active Excursion
          </Badge>
        </div>
      )}

      {/* Signal Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {signals.map((sig) => {
          const isCritical = sig.status === "critical" || sig.phase === "excursion";
          const isWarning = sig.status === "warning";
          const isRamping = sig.phase === "ramping";
          const isSettling = sig.phase === "settling";

          // Calculate SVG Sparkline coordinates
          const min = Math.min(...sig.history);
          const max = Math.max(...sig.history);
          const range = max - min || 1;
          const points = sig.history
            .map((val, idx) => {
              const x = (idx / (sig.history.length - 1)) * 140;
              const y = 35 - ((val - min) / range) * 30;
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <div
              key={sig.signalId}
              className={`relative rounded-xl border p-3.5 transition-all shadow-sm flex flex-col justify-between ${
                sig.isPrimarySource
                  ? "bg-gradient-to-br from-rose-950/30 via-card to-rose-950/20 border-rose-500/80 shadow-rose-950/30 ring-1 ring-rose-500/40"
                  : isCritical
                  ? "bg-gradient-to-br from-rose-950/25 via-card to-rose-950/15 border-rose-500/60 shadow-rose-950/20"
                  : sig.inducedBy
                  ? "bg-gradient-to-br from-amber-950/30 via-card to-amber-950/15 border-amber-500/60 shadow-amber-950/20 ring-1 ring-amber-500/30"
                  : isRamping
                  ? "bg-gradient-to-br from-amber-950/25 via-card to-amber-950/15 border-amber-500/60 shadow-amber-950/20"
                  : isSettling
                  ? "bg-gradient-to-br from-teal-950/20 via-card to-teal-950/10 border-teal-500/50 shadow-teal-950/10"
                  : isWarning
                  ? "bg-gradient-to-br from-amber-950/20 via-card to-amber-950/10 border-amber-500/50 shadow-amber-950/10"
                  : "bg-card border-border/70 hover:border-border"
              }`}
            >
              {/* Left severity indicator line */}
              <div
                className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                  sig.isPrimarySource
                    ? "bg-rose-500 animate-pulse"
                    : isCritical
                    ? "bg-rose-500"
                    : sig.inducedBy
                    ? "bg-amber-500"
                    : isRamping
                    ? "bg-amber-500 animate-pulse"
                    : isSettling
                    ? "bg-teal-500"
                    : isWarning
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />

              <div className="pl-1.5 space-y-2">
                {/* Header: Signal Name & Status Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-foreground leading-tight truncate block">
                      {sig.signalName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Safe: {sig.minThreshold} - {sig.maxThreshold} {sig.unit}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-mono font-bold tracking-wider shrink-0 ${
                      sig.isPrimarySource
                        ? "bg-rose-500/25 text-rose-300 border-rose-500 animate-pulse"
                        : sig.inducedBy
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : isCritical
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                        : isRamping
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse"
                        : isSettling
                        ? "bg-teal-500/20 text-teal-400 border-teal-500/40"
                        : isWarning
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    }`}
                  >
                    {sig.isPrimarySource
                      ? "PRIMARY SOURCE"
                      : sig.inducedBy
                      ? "INDUCED CASCADE"
                      : isCritical
                      ? "EXCURSION"
                      : isRamping
                      ? "RAMPING UP"
                      : isSettling
                      ? "PID SETTLING"
                      : isWarning
                      ? "WARN"
                      : "NOMINAL"}
                  </Badge>
                </div>

                {/* Multi-variable correlation indicator tag */}
                {sig.inducedBy && (
                  <div className="text-[9px] text-amber-400/90 font-mono flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Share2 className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">Coupled to: {sig.inducedBy}</span>
                  </div>
                )}

                {/* Primary Metric, Live Ticker & Rate-of-Change */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xl font-black font-mono tracking-tight transition-colors ${
                        isCritical || sig.isPrimarySource
                          ? "text-rose-500 dark:text-rose-400"
                          : isRamping || sig.inducedBy
                          ? "text-amber-500 dark:text-amber-400"
                          : isSettling
                          ? "text-teal-500 dark:text-teal-400"
                          : isWarning
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-foreground"
                      }`}
                    >
                      {sig.currentValue}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {sig.unit}
                    </span>
                  </div>

                  {/* Rate of Change and Deviation */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded border flex items-center gap-0.5 ${
                        sig.rateOfChange > 0.05
                          ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                          : sig.rateOfChange < -0.05
                          ? "text-teal-500 border-teal-500/30 bg-teal-500/10"
                          : "text-muted-foreground border-border/40"
                      }`}
                    >
                      {sig.rateOfChange > 0.05 ? (
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      ) : sig.rateOfChange < -0.05 ? (
                        <ArrowDownRight className="w-2.5 h-2.5" />
                      ) : null}
                      {sig.rateOfChange > 0
                        ? `+${sig.rateOfChange}`
                        : `${sig.rateOfChange}`}{" "}
                      {sig.unit}/s
                    </span>

                    <span
                      className={`text-xs font-bold font-mono ${
                        sig.deviationPercent > 0
                          ? isCritical || sig.isPrimarySource
                            ? "text-rose-500"
                            : "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {sig.deviationPercent > 0
                        ? `+${sig.deviationPercent}%`
                        : `${sig.deviationPercent}%`}
                    </span>
                  </div>
                </div>

                {/* Real-time SVG Sparkline Graph */}
                <div className="pt-1">
                  <div className="h-10 w-full overflow-hidden flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 140 40">
                      <defs>
                        <linearGradient id={`grad-${sig.signalId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={
                              sig.isPrimarySource || isCritical
                                ? "#f43f5e"
                                : isRamping || sig.inducedBy
                                ? "#f59e0b"
                                : isSettling
                                ? "#14b8a6"
                                : isWarning
                                ? "#f59e0b"
                                : "#10b981"
                            }
                            stopOpacity="0.4"
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              sig.isPrimarySource || isCritical
                                ? "#f43f5e"
                                : isRamping || sig.inducedBy
                                ? "#f59e0b"
                                : isSettling
                                ? "#14b8a6"
                                : isWarning
                                ? "#f59e0b"
                                : "#10b981"
                            }
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>
                      <polyline
                        fill="none"
                        stroke={
                          sig.isPrimarySource || isCritical
                            ? "#f43f5e"
                            : isRamping || sig.inducedBy
                            ? "#f59e0b"
                            : isSettling
                            ? "#14b8a6"
                            : isWarning
                            ? "#f59e0b"
                            : "#10b981"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                  </div>
                </div>

                {/* 1-Click Deep Diagnostics Action Bar */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onOpenGraph({
                        assetName: asset.name,
                        assetId: asset.assetId,
                        signalName: sig.signalName,
                        severity: isCritical || sig.isPrimarySource ? "Critical" : "Medium",
                        observedValue: sig.currentValue,
                        thresholdValue: sig.maxThreshold,
                        minThreshold: sig.minThreshold,
                        maxThreshold: sig.maxThreshold,
                        unit: sig.unit,
                        deviationPercent: sig.deviationPercent,
                        timestamp: new Date().toISOString(),
                        message: `Live telemetry monitoring for ${sig.signalName}.`,
                      })
                    }
                    className="h-6 px-2 text-[10px] font-semibold gap-1 text-primary border-border/80 hover:bg-primary/10"
                  >
                    <TrendingUp className="w-3 h-3" /> Graph
                  </Button>

                  <Button
                    size="sm"
                    onClick={() =>
                      onOpenRca({
                        assetName: asset.name,
                        signalName: sig.signalName,
                        severity: isCritical || sig.isPrimarySource ? "Critical" : "Medium",
                        observedValue: sig.currentValue,
                        thresholdValue: sig.maxThreshold,
                        unit: sig.unit,
                        deviationPercent: sig.deviationPercent,
                        timestamp: new Date().toISOString(),
                        message: sig.isPrimarySource
                          ? `Primary process telemetry excursion detected on ${sig.signalName}.`
                          : `Induced cascade excursion detected on ${sig.signalName} originating from ${sig.inducedBy || "upstream"}.`,
                      })
                    }
                    className="h-6 px-2 text-[10px] font-bold gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                  >
                    <Sparkles className="w-3 h-3" /> AI RCA
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
