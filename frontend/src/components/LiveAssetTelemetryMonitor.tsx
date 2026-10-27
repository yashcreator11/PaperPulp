import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Zap,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Gauge,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/context/NotificationContext";
import type { ExistingMapping } from "@/asset/AssetTree";
import type { Asset, IMapping } from "@/api/assetApi";
import { getSignalOnAsset } from "@/api/assetApi";
import type { AssetTelemetryAlertData } from "@/components/AssetTelemetryGraphModal";
import type { AlertRcaData } from "@/components/RcaModal";

interface LiveSignalState {
  signalId: string;
  signalName: string;
  unit: string;
  currentValue: number;
  baseline: number;
  minThreshold: number;
  maxThreshold: number;
  history: number[];
  status: "normal" | "warning" | "critical";
  deviationPercent: number;
  isSpiking: boolean;
}

interface LiveAssetTelemetryMonitorProps {
  asset: Asset;
  mappings: ExistingMapping[];
  onOpenGraph: (data: AssetTelemetryAlertData) => void;
  onOpenRca: (data: AlertRcaData) => void;
}

export default function LiveAssetTelemetryMonitor({
  asset,
  mappings,
  onOpenGraph,
  onOpenRca,
}: LiveAssetTelemetryMonitorProps) {
  const { triggerAlert } = useNotifications();
  const [signals, setSignals] = useState<LiveSignalState[]>([]);
  const [activeSpikeSignalId, setActiveSpikeSignalId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize signals for the selected asset
  useEffect(() => {
    let isMounted = true;

    const initSignals = async () => {
      let rawList: Array<ExistingMapping | IMapping> = mappings.filter(
        (m) => m.assetId === asset.assetId
      );

      // If no mappings in current list, fetch or synthesize for this asset
      if (rawList.length === 0) {
        try {
          const fallback = await getSignalOnAsset(asset.assetId);
          if (isMounted && fallback.length > 0) {
            rawList = fallback;
          }
        } catch {
          rawList = [];
        }
      }

      // If still empty, provide standard industrial monitoring tags
      if (rawList.length === 0) {
        rawList = [
          {
            signalId: `sig-${asset.assetId}-speed`,
            signalName: `${asset.name} Drive Speed`,
            unit: "m/min",
            assetId: asset.assetId,
            deviceId: "dev-pm-qcs",
            minThreshold: 900,
            maxThreshold: 1150,
          } as any,
          {
            signalId: `sig-${asset.assetId}-load`,
            signalName: `${asset.name} Motor Torque`,
            unit: "%",
            assetId: asset.assetId,
            deviceId: "dev-pm-qcs",
            minThreshold: 45,
            maxThreshold: 85,
          } as any,
          {
            signalId: `sig-${asset.assetId}-temp`,
            signalName: `${asset.name} Bearing Temperature`,
            unit: "°C",
            assetId: asset.assetId,
            deviceId: "dev-pm-qcs",
            minThreshold: 45,
            maxThreshold: 78,
          } as any,
        ];
      }

      if (!isMounted) return;

      const initialStates: LiveSignalState[] = rawList.slice(0, 6).map((item) => {
        const min = item.minThreshold ?? 10;
        const max = item.maxThreshold ?? 100;
        const mid = (min + max) / 2;
        const history: number[] = [];

        // Pre-fill 16 data points around the nominal baseline
        for (let i = 0; i < 16; i++) {
          const noise = (Math.sin(i / 2) * (max - min) * 0.08) + ((Math.random() - 0.5) * (max - min) * 0.04);
          history.push(Number((mid + noise).toFixed(2)));
        }

        return {
          signalId: item.signalId || `sig-${Math.random()}`,
          signalName: item.signalName || "Operating Parameter",
          unit: item.unit || (item as any).signalUnit || "",
          currentValue: history[history.length - 1],
          baseline: mid,
          minThreshold: min,
          maxThreshold: max,
          history,
          status: "normal",
          deviationPercent: 0,
          isSpiking: false,
        };
      });

      setSignals(initialStates);
      setActiveSpikeSignalId(null);
    };

    void initSignals();

    return () => {
      isMounted = false;
    };
  }, [asset.assetId, mappings]);

  // Live polling / ticking interval to simulate OPC-UA / Modbus sensor updates
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSignals((prevSignals) =>
        prevSignals.map((sig) => {
          const range = sig.maxThreshold - sig.minThreshold;
          let nextVal = sig.currentValue;

          if (sig.isSpiking) {
            // High upward anomaly spike beyond max threshold (+20% above max)
            const spikeTarget = sig.maxThreshold + range * 0.28;
            nextVal = Number((spikeTarget + (Math.random() - 0.5) * range * 0.05).toFixed(2));
          } else {
            // Normal slight harmonic breathing within safe limits
            const t = Date.now() / 2500;
            const wave = Math.sin(t) * range * 0.07;
            const jitter = (Math.random() - 0.5) * range * 0.03;
            nextVal = Number((sig.baseline + wave + jitter).toFixed(2));
          }

          const newHistory = [...sig.history.slice(1), nextVal];
          const deviation = Number((((nextVal - sig.baseline) / (sig.baseline || 1)) * 100).toFixed(1));

          let status: "normal" | "warning" | "critical" = "normal";
          if (nextVal > sig.maxThreshold || nextVal < sig.minThreshold) {
            status = "critical";
          } else if (
            nextVal > sig.maxThreshold - range * 0.1 ||
            nextVal < sig.minThreshold + range * 0.1
          ) {
            status = "warning";
          }

          return {
            ...sig,
            currentValue: nextVal,
            history: newHistory,
            status,
            deviationPercent: deviation,
          };
        })
      );
    }, 1800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Injecting a Spike / Deviation on a specific signal
  const handleTriggerSpike = (targetSignalId: string) => {
    const target = signals.find((s) => s.signalId === targetSignalId) || signals[0];
    if (!target) return;

    setActiveSpikeSignalId(target.signalId);

    setSignals((prev) =>
      prev.map((s) =>
        s.signalId === target.signalId
          ? {
              ...s,
              isSpiking: true,
              status: "critical",
              currentValue: Number((s.maxThreshold * 1.25).toFixed(2)),
            }
          : s
      )
    );

    // Dispatch system-wide alarm & notification
    triggerAlert({
      title: `🚨 PROCESS ANOMALY SPIKE: ${asset.name}`,
      asset: asset.name,
      signal: target.signalName,
      status: "HIGH",
      value: Number((target.maxThreshold * 1.25).toFixed(2)),
      min: target.minThreshold,
      max: target.maxThreshold,
      unit: target.unit,
      percent: 25.4,
      message: `Sharp telemetry deviation detected on ${target.signalName}. Operating value surged 25.4% above safety ceiling (${target.maxThreshold} ${target.unit}).`,
    });
  };

  // Handle Normalizing / Clearing Spike
  const handleNormalize = (targetSignalId?: string) => {
    setActiveSpikeSignalId(null);
    setSignals((prev) =>
      prev.map((s) => {
        if (!targetSignalId || s.signalId === targetSignalId) {
          return {
            ...s,
            isSpiking: false,
            status: "normal",
            currentValue: s.baseline,
          };
        }
        return s;
      })
    );

    triggerAlert({
      title: `✅ Telemetry Restored: ${asset.name}`,
      asset: asset.name,
      signal: targetSignalId ? (signals.find((s) => s.signalId === targetSignalId)?.signalName || "Telemetry") : "All Section Signals",
      status: "NORMAL",
      value: 0,
      unit: "%",
      percent: 0,
      message: `Operational parameters for ${asset.name} stabilized within nominal baseline bounds.`,
    });
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm">
      {/* Header with Title and Live Spike Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
              Live Sensor Telemetry Monitor
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
              OPC-UA / Modbus Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time multi-variate telemetry stream & anomaly simulation for {asset.name}
          </p>
        </div>

        {/* Global Spike / Normalize quick controls */}
        <div className="flex items-center gap-2 shrink-0">
          {signals.length > 0 && (
            <>
              {activeSpikeSignalId ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNormalize()}
                  className="h-7 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Normalize Signal
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTriggerSpike(signals[0].signalId)}
                  className="h-7 text-xs font-bold gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <Zap className="w-3.5 h-3.5 fill-rose-500/20" /> Simulate Anomaly Spike
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Signal Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {signals.map((sig) => {
          const isCritical = sig.status === "critical";
          const isWarning = sig.status === "warning";

          // Calculate SVG Sparkline coordinates
          const min = Math.min(...sig.history);
          const max = Math.max(...sig.history);
          const range = max - min || 1;
          const points = sig.history.map((val, idx) => {
            const x = (idx / (sig.history.length - 1)) * 140;
            const y = 35 - ((val - min) / range) * 30;
            return `${x},${y}`;
          }).join(" ");

          return (
            <div
              key={sig.signalId}
              className={`relative rounded-xl border p-3.5 transition-all shadow-sm flex flex-col justify-between ${
                isCritical
                  ? "bg-gradient-to-br from-rose-950/20 via-card to-rose-950/10 border-rose-500/60 shadow-rose-950/20"
                  : isWarning
                  ? "bg-gradient-to-br from-amber-950/20 via-card to-amber-950/10 border-amber-500/50 shadow-amber-950/10"
                  : "bg-card border-border/70 hover:border-border"
              }`}
            >
              {/* Left severity indicator line */}
              <div
                className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${
                  isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
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
                      isCritical
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                        : isWarning
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    }`}
                  >
                    {isCritical ? "EXCURSION" : isWarning ? "WARN" : "NOMINAL"}
                  </Badge>
                </div>

                {/* Primary Metric & Live Ticker */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xl font-black font-mono tracking-tight transition-colors ${
                        isCritical
                          ? "text-rose-500 dark:text-rose-400"
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

                  <span
                    className={`text-xs font-bold font-mono ${
                      sig.deviationPercent > 0
                        ? isCritical
                          ? "text-rose-500"
                          : "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {sig.deviationPercent > 0 ? `+${sig.deviationPercent}%` : `${sig.deviationPercent}%`}
                  </span>
                </div>

                {/* Real-time SVG Sparkline Graph */}
                <div className="pt-1">
                  <div className="h-10 w-full overflow-hidden flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 140 40">
                      <defs>
                        <linearGradient id={`grad-${sig.signalId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={isCritical ? "#f43f5e" : isWarning ? "#f59e0b" : "#10b981"}
                            stopOpacity="0.4"
                          />
                          <stop
                            offset="100%"
                            stopColor={isCritical ? "#f43f5e" : isWarning ? "#f59e0b" : "#10b981"}
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>
                      <polyline
                        fill="none"
                        stroke={isCritical ? "#f43f5e" : isWarning ? "#f59e0b" : "#10b981"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                  </div>
                </div>

                {/* Quick 1-Click Action Bar */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                  {sig.isSpiking ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNormalize(sig.signalId)}
                      className="h-6 px-1.5 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/10 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Normalize
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTriggerSpike(sig.signalId)}
                      className="h-6 px-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 gap-1"
                    >
                      <Zap className="w-3 h-3" /> Spike
                    </Button>
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onOpenGraph({
                          assetName: asset.name,
                          assetId: asset.assetId,
                          signalName: sig.signalName,
                          severity: isCritical ? "Critical" : "Medium",
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
                          severity: isCritical ? "Critical" : "Medium",
                          observedValue: sig.currentValue,
                          thresholdValue: sig.maxThreshold,
                          unit: sig.unit,
                          deviationPercent: sig.deviationPercent,
                          timestamp: new Date().toISOString(),
                          message: `Process telemetry excursion detected on ${sig.signalName}.`,
                        })
                      }
                      className="h-6 px-2 text-[10px] font-bold gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    >
                      <Sparkles className="w-3 h-3" /> AI RCA
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
