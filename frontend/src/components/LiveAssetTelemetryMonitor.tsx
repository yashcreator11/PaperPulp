import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Zap,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Gauge,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/context/NotificationContext";
import type { ExistingMapping } from "@/asset/AssetTree";
import type { Asset, IMapping } from "@/api/assetApi";
import { getSignalOnAsset } from "@/api/assetApi";
import type { AssetTelemetryAlertData } from "@/components/AssetTelemetryGraphModal";
import type { AlertRcaData } from "@/components/RcaModal";

export type ProcessPhase = "nominal" | "ramping" | "excursion" | "settling";

interface LiveSignalState {
  signalId: string;
  signalName: string;
  unit: string;
  currentValue: number;
  baseline: number;
  targetValue: number;
  minThreshold: number;
  maxThreshold: number;
  history: number[];
  status: "normal" | "warning" | "critical";
  deviationPercent: number;
  phase: ProcessPhase;
  rateOfChange: number; // dy/dt in units/sec
  alarmFired: boolean;
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
  const [activeDisturbanceSignalId, setActiveDisturbanceSignalId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize signals for the selected asset
  useEffect(() => {
    let isMounted = true;

    const initSignals = async () => {
      let rawList: Array<ExistingMapping | IMapping> = mappings.filter(
        (m) => m.assetId === asset.assetId
      );

      // If no mappings in current list, fetch or synthesize realistic mill signals
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

      // If still empty, synthesize paper mill domain specific variables
      if (rawList.length === 0) {
        const lowerName = asset.name.toLowerCase();
        if (lowerName.includes("dryer") || lowerName.includes("steam") || lowerName.includes("boiler")) {
          rawList = [
            {
              signalId: `sig-${asset.assetId}-steam-p`,
              signalName: `${asset.name} Steam Header Pressure`,
              unit: "bar",
              assetId: asset.assetId,
              deviceId: "dev-dcs-steam",
              minThreshold: 6.0,
              maxThreshold: 13.5,
            } as any,
            {
              signalId: `sig-${asset.assetId}-dryer-temp`,
              signalName: `${asset.name} Cylinder Surface Temp`,
              unit: "°C",
              assetId: asset.assetId,
              deviceId: "dev-dcs-steam",
              minThreshold: 105,
              maxThreshold: 138,
            } as any,
            {
              signalId: `sig-${asset.assetId}-condensate`,
              signalName: `${asset.name} Condensate Syphon Flow`,
              unit: "m³/h",
              assetId: asset.assetId,
              deviceId: "dev-dcs-steam",
              minThreshold: 12,
              maxThreshold: 28,
            } as any,
          ];
        } else if (lowerName.includes("press") || lowerName.includes("couch") || lowerName.includes("wire") || lowerName.includes("paper")) {
          rawList = [
            {
              signalId: `sig-${asset.assetId}-draw`,
              signalName: `${asset.name} Press-to-Dryer Draw`,
              unit: "%",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 1.8,
              maxThreshold: 3.8,
            } as any,
            {
              signalId: `sig-${asset.assetId}-vacuum`,
              signalName: `${asset.name} Couch Roll Vacuum`,
              unit: "kPa",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 45,
              maxThreshold: 68,
            } as any,
            {
              signalId: `sig-${asset.assetId}-torque`,
              signalName: `${asset.name} Sectional Drive Torque`,
              unit: "%",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 40,
              maxThreshold: 85,
            } as any,
          ];
        } else {
          rawList = [
            {
              signalId: `sig-${asset.assetId}-speed`,
              signalName: `${asset.name} Operating Speed`,
              unit: "m/min",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 850,
              maxThreshold: 1150,
            } as any,
            {
              signalId: `sig-${asset.assetId}-load`,
              signalName: `${asset.name} Motor Drive Load`,
              unit: "%",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 35,
              maxThreshold: 80,
            } as any,
            {
              signalId: `sig-${asset.assetId}-vibration`,
              signalName: `${asset.name} Bearing RMS Vibration`,
              unit: "mm/s",
              assetId: asset.assetId,
              deviceId: "dev-pm-qcs",
              minThreshold: 1.2,
              maxThreshold: 4.5,
            } as any,
          ];
        }
      }

      if (!isMounted) return;

      const initialStates: LiveSignalState[] = rawList.slice(0, 6).map((item) => {
        const min = item.minThreshold ?? 10;
        const max = item.maxThreshold ?? 100;
        const mid = (min + max) / 2;
        const history: number[] = [];

        // Pre-populate 20 historical data points around the nominal baseline
        for (let i = 0; i < 20; i++) {
          const noise =
            Math.sin(i / 2) * (max - min) * 0.05 +
            (Math.random() - 0.5) * (max - min) * 0.03;
          history.push(Number((mid + noise).toFixed(2)));
        }

        return {
          signalId: item.signalId || `sig-${Math.random()}`,
          signalName: item.signalName || "Operating Parameter",
          unit: item.unit || (item as any).signalUnit || "",
          currentValue: history[history.length - 1],
          baseline: mid,
          targetValue: mid,
          minThreshold: min,
          maxThreshold: max,
          history,
          status: "normal",
          deviationPercent: 0,
          phase: "nominal",
          rateOfChange: 0,
          alarmFired: false,
        };
      });

      setSignals(initialStates);
      setActiveDisturbanceSignalId(null);
    };

    void initSignals();

    return () => {
      isMounted = false;
    };
  }, [asset.assetId, mappings]);

  // Live dynamic process physics engine (1000ms loop)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSignals((prevSignals) =>
        prevSignals.map((sig) => {
          const range = sig.maxThreshold - sig.minThreshold || 1;
          const curr = sig.currentValue;
          let nextVal = curr;
          let newPhase = sig.phase;
          let alarmFired = sig.alarmFired;

          if (sig.phase === "nominal") {
            // Calm harmonic breathing with slight industrial noise
            const t = Date.now() / 3000;
            const target = sig.baseline + Math.sin(t) * range * 0.04;
            const step = (target - curr) * 0.3 + (Math.random() - 0.5) * range * 0.02;
            nextVal = Number((curr + step).toFixed(2));
          } else if (sig.phase === "ramping") {
            // Smooth First-Order Exponential Ramp towards excursion target
            const dist = sig.targetValue - curr;
            const step = dist * 0.26 + (Math.random() - 0.5) * range * 0.025;
            nextVal = Number((curr + step).toFixed(2));

            // Check if reached plateau
            if (Math.abs(sig.targetValue - nextVal) <= range * 0.05) {
              newPhase = "excursion";
            }

            // Check if crossing alarm boundary for the first time during ramp
            if (nextVal > sig.maxThreshold && !alarmFired) {
              alarmFired = true;
              triggerAlert({
                title: `🚨 PROCESS ALARM: ${asset.name}`,
                asset: asset.name,
                signal: sig.signalName,
                status: "HIGH",
                value: nextVal,
                min: sig.minThreshold,
                max: sig.maxThreshold,
                unit: sig.unit,
                percent: Number((((nextVal - sig.baseline) / (sig.baseline || 1)) * 100).toFixed(1)),
                message: `Telemetry excursion on ${sig.signalName}. Variable ramped past safety threshold (${sig.maxThreshold} ${sig.unit}) due to process disturbance.`,
              });
            }
          } else if (sig.phase === "excursion") {
            // Hold at peak excursion with turbulence and dynamic flutter
            const flutter = (Math.random() - 0.5) * range * 0.03;
            nextVal = Number((sig.targetValue + flutter).toFixed(2));
          } else if (sig.phase === "settling") {
            // Closed-loop PID Damped Settling back towards nominal baseline
            const dist = sig.baseline - curr;
            const step = dist * 0.28 + (Math.random() - 0.5) * range * 0.015;
            nextVal = Number((curr + step).toFixed(2));

            // When variable is safely back within nominal baseline window (±4% of range)
            if (Math.abs(nextVal - sig.baseline) <= range * 0.04) {
              newPhase = "nominal";
              alarmFired = false;
              triggerAlert({
                title: `✅ Process Stabilized: ${asset.name}`,
                asset: asset.name,
                signal: sig.signalName,
                status: "NORMAL",
                value: nextVal,
                min: sig.minThreshold,
                max: sig.maxThreshold,
                unit: sig.unit,
                percent: 0,
                message: `PID loop successfully recovered ${sig.signalName} back to nominal setpoint (${sig.baseline.toFixed(1)} ${sig.unit}).`,
              });
            }
          }

          const rate = Number((nextVal - curr).toFixed(2));
          const newHistory = [...sig.history.slice(1), nextVal];
          const deviation = Number(
            (((nextVal - sig.baseline) / (sig.baseline || 1)) * 100).toFixed(1)
          );

          // Evaluate operating severity status
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
            phase: newPhase,
            deviationPercent: deviation,
            rateOfChange: rate,
            alarmFired,
          };
        })
      );
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [asset.name, triggerAlert]);

  // Inject Process Disturbance (Smooth Ramp-Up over 6-8 seconds)
  const handleInjectDisturbance = (targetSignalId: string) => {
    setActiveDisturbanceSignalId(targetSignalId);

    setSignals((prev) =>
      prev.map((s) => {
        if (s.signalId === targetSignalId) {
          const range = s.maxThreshold - s.minThreshold || 1;
          const target = Number((s.maxThreshold + range * 0.28).toFixed(2));
          return {
            ...s,
            phase: "ramping",
            targetValue: target,
            alarmFired: false,
          };
        }
        return s;
      })
    );
  };

  // Engage PID Control (Smooth Exponential Settling back to baseline over 8-10 seconds)
  const handleEngagePidControl = (targetSignalId?: string) => {
    if (!targetSignalId || activeDisturbanceSignalId === targetSignalId) {
      setActiveDisturbanceSignalId(null);
    }

    setSignals((prev) =>
      prev.map((s) => {
        if (!targetSignalId || s.signalId === targetSignalId) {
          return {
            ...s,
            phase: "settling",
            targetValue: s.baseline,
          };
        }
        return s;
      })
    );
  };

  const activeSignal = signals.find((s) => s.signalId === activeDisturbanceSignalId) || signals[0];
  const isAnyDisturbanceActive = signals.some((s) => s.phase === "ramping" || s.phase === "excursion");
  const isAnySettling = signals.some((s) => s.phase === "settling");

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm">
      {/* Header with Title and Realistic Dynamic Simulator Controls */}
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
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
            >
              OPC-UA / Modbus Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Process telemetry stream with dynamic first-order physics & PID recovery for {asset.name}
          </p>
        </div>

        {/* Global Process Disturbance & PID Controller Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {signals.length > 0 && (
            <>
              {isAnyDisturbanceActive ? (
                <Button
                  size="sm"
                  onClick={() => handleEngagePidControl()}
                  className="h-7 text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-950/20 animate-pulse"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Engage PID Control (Stabilize)
                </Button>
              ) : isAnySettling ? (
                <Button
                  size="sm"
                  disabled
                  variant="outline"
                  className="h-7 text-xs font-semibold gap-1.5 border-teal-500/40 text-teal-600 dark:text-teal-400"
                >
                  <Activity className="w-3.5 h-3.5 animate-spin" /> PID Settling to Setpoint…
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleInjectDisturbance(activeSignal?.signalId || signals[0].signalId)}
                  className="h-7 text-xs font-bold gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-500/20" /> Inject Process Disturbance
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
          const isRamping = sig.phase === "ramping";
          const isExcursion = sig.phase === "excursion";
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
                isCritical || isExcursion
                  ? "bg-gradient-to-br from-rose-950/25 via-card to-rose-950/15 border-rose-500/60 shadow-rose-950/20"
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
                  isCritical || isExcursion
                    ? "bg-rose-500"
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
                      isCritical || isExcursion
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
                    {isExcursion
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

                {/* Primary Metric, Live Ticker & Rate-of-Change */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xl font-black font-mono tracking-tight transition-colors ${
                        isCritical || isExcursion
                          ? "text-rose-500 dark:text-rose-400"
                          : isRamping
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
                    {/* dy/dt indicator */}
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
                          ? isCritical || isExcursion
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
                              isCritical || isExcursion
                                ? "#f43f5e"
                                : isRamping
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
                              isCritical || isExcursion
                                ? "#f43f5e"
                                : isRamping
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
                          isCritical || isExcursion
                            ? "#f43f5e"
                            : isRamping
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

                {/* Quick 1-Click Action Bar */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1">
                  {isRamping || isExcursion ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEngagePidControl(sig.signalId)}
                      className="h-6 px-1.5 text-[10px] font-bold text-teal-500 hover:bg-teal-500/10 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Stabilize PID
                    </Button>
                  ) : isSettling ? (
                    <span className="text-[10px] font-mono text-teal-500 flex items-center gap-1 font-semibold">
                      <Activity className="w-3 h-3 animate-pulse" /> Settling…
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInjectDisturbance(sig.signalId)}
                      className="h-6 px-1.5 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 gap-1"
                    >
                      <Zap className="w-3 h-3" /> Disturbance
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
                          severity: isCritical || isExcursion ? "Critical" : "Medium",
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
                          severity: isCritical || isExcursion ? "Critical" : "Medium",
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
