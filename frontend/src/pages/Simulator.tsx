import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Zap,
  RotateCcw,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  Droplets,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSimulation, type LiveSignalState } from "@/context/SimulationContext";

export default function SimulatorPage() {
  const navigate = useNavigate();
  const {
    signalsByAsset,
    allAssets,
    injectDisturbance,
    engagePidControl,
    setManualValue,
    injectPresetScenario,
    resetAllToNominal,
    activeDisturbancesCount,
    activeExcursions,
  } = useSimulation();

  const [selectedAssetId, setSelectedAssetId] = useState<string>("PM-PM1");

  const currentAsset = allAssets.find((a) => a.assetId === selectedAssetId) || allAssets[0];
  const currentSignals: LiveSignalState[] = signalsByAsset[selectedAssetId] || [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/40 border border-amber-500/30 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Process Telemetry Simulator & Anomaly Studio
              </h1>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs font-mono">
                TESTBENCH MODE
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
              Control room test bench: Generate multi-variable process signals, inject realistic thermal, 
              hydraulic, and mechanical disturbances, and test automated closed-loop PID recovery across the mill.
            </p>
          </div>

          {/* Quick Global Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={resetAllToNominal}
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <RotateCcw className="w-4 h-4" /> Normalize All Sections
            </Button>

            <Button
              onClick={() => navigate("/assets")}
              size="sm"
              className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
            >
              <Layers className="w-4 h-4" /> View in Asset Hierarchy <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-muted-foreground">Physics Engine:</span>
            <span className="text-xs font-bold text-foreground font-mono">1,000ms Ticking</span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-muted-foreground">Active Mill Signals:</span>
            <span className="text-xs font-bold text-cyan-400 font-mono">
              {Object.values(signalsByAsset).flat().length} Tags
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">Active Disturbances:</span>
            <span
              className={`text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                activeDisturbancesCount > 0
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {activeDisturbancesCount} Alarms
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Plant Status:</span>
            <span className="text-xs font-bold text-emerald-400">
              {activeDisturbancesCount > 0 ? "Under Disturbance" : "Nominal Steady-State"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. One-Click Preset Failure Scenarios Bar */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Inject Pre-Configured Mill Failure Scenarios
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Simulate real paper mill failure modes in 1 click</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Scenario 1: Vacuum Drop */}
          <div
            onClick={() => {
              injectPresetScenario("vacuum_sag");
              setSelectedAssetId("PM-PM1-W01");
            }}
            className="group cursor-pointer rounded-xl border border-border hover:border-amber-500/60 p-3.5 bg-gradient-to-br from-card to-amber-950/10 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <Wind className="w-4 h-4" /> Wet-End Vacuum Drop
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500">
                -25% Suction
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Causes dewatering failure on couch roll, wet sheet sag, and high open-draw tension.
            </p>
            <Button size="sm" variant="ghost" className="h-6 w-full text-[11px] font-bold text-amber-500 group-hover:bg-amber-500/10">
              ⚡ Trigger Scenario
            </Button>
          </div>

          {/* Scenario 2: Draw Slip */}
          <div
            onClick={() => {
              injectPresetScenario("draw_slip");
              setSelectedAssetId("PM-PM1-P01");
            }}
            className="group cursor-pointer rounded-xl border border-border hover:border-rose-500/60 p-3.5 bg-gradient-to-br from-card to-rose-950/10 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Press Draw Tension Slip
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-rose-500/40 text-rose-500">
                +28% Tension
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Simulates sectional speed sync mismatch, over-stretching the wet web to rupture point.
            </p>
            <Button size="sm" variant="ghost" className="h-6 w-full text-[11px] font-bold text-rose-500 group-hover:bg-rose-500/10">
              ⚡ Trigger Scenario
            </Button>
          </div>

          {/* Scenario 3: Steam Sag */}
          <div
            onClick={() => {
              injectPresetScenario("steam_sag");
              setSelectedAssetId("CR-CR3-F01");
            }}
            className="group cursor-pointer rounded-xl border border-border hover:border-cyan-500/60 p-3.5 bg-gradient-to-br from-card to-cyan-950/10 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-500 flex items-center gap-1.5">
                <Flame className="w-4 h-4" /> Recovery Steam Pressure Drop
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/40 text-cyan-500">
                -18% Sag
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Dryer cylinder thermal quenching: causes sheet dampness and risk of dryer cylinder wrap.
            </p>
            <Button size="sm" variant="ghost" className="h-6 w-full text-[11px] font-bold text-cyan-500 group-hover:bg-cyan-500/10">
              ⚡ Trigger Scenario
            </Button>
          </div>

          {/* Scenario 4: Bearing Vibration */}
          <div
            onClick={() => {
              injectPresetScenario("vibration_spike");
              setSelectedAssetId("PM-PM1-R01");
            }}
            className="group cursor-pointer rounded-xl border border-border hover:border-purple-500/60 p-3.5 bg-gradient-to-br from-card to-purple-950/10 hover:shadow-md transition-all space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Bearing RMS Vibration Spike
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-purple-400/40 text-purple-400">
                +35% Spike
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Simulates inner raceway spalling and roll mechanical imbalance on high-speed calender/reel.
            </p>
            <Button size="sm" variant="ghost" className="h-6 w-full text-[11px] font-bold text-purple-400 group-hover:bg-purple-500/10">
              ⚡ Trigger Scenario
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Main Simulator Workbench: Asset Selector + Real-Time Signal Tuning Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Asset Selector Tree List */}
        <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Target Machine Asset
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono">
              {allAssets.length} Units
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {allAssets.map((asset) => {
              const isSelected = asset.assetId === selectedAssetId;
              const assetSignals = signalsByAsset[asset.assetId] || [];
              const hasExcursion = assetSignals.some((s) => s.status === "critical" || s.phase === "excursion");
              const hasRamping = assetSignals.some((s) => s.phase === "ramping");

              return (
                <button
                  key={asset.assetId}
                  onClick={() => setSelectedAssetId(asset.assetId)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/40 hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate leading-tight font-medium">{asset.assetName}</p>
                    <span className="text-[10px] opacity-75 font-mono">{asset.assetId}</span>
                  </div>

                  {hasExcursion ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  ) : hasRamping ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/80">
            <Button
              onClick={() => engagePidControl(selectedAssetId)}
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Stabilize {currentAsset.assetName.slice(0, 15)}…
            </Button>
          </div>
        </div>

        {/* Right: Signal Telemetry Tuning Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground">Active Generator:</span>
              <h3 className="text-sm font-bold text-foreground">{currentAsset.assetName}</h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/assets`)}
                className="h-7 text-xs font-semibold gap-1"
              >
                Inspect in Asset Details <ArrowUpRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentSignals.map((sig) => {
              const isCritical = sig.status === "critical" || sig.phase === "excursion";
              const isRamping = sig.phase === "ramping";
              const isSettling = sig.phase === "settling";
              const isWarning = sig.status === "warning";

              // Sparkline points
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
                  className={`relative rounded-2xl border p-4 transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                    sig.isPrimarySource
                      ? "bg-rose-950/25 border-rose-500 ring-1 ring-rose-500/50"
                      : isCritical
                      ? "bg-rose-950/20 border-rose-500/60"
                      : isRamping
                      ? "bg-amber-950/20 border-amber-500/60"
                      : isSettling
                      ? "bg-teal-950/20 border-teal-500/50"
                      : isWarning
                      ? "bg-amber-950/15 border-amber-500/40"
                      : "bg-card border-border/70 hover:border-border"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground truncate block">
                        {sig.signalName}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Safe: {sig.minThreshold} - {sig.maxThreshold} {sig.unit}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-mono font-bold tracking-wider shrink-0 ${
                        sig.isPrimarySource
                          ? "bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse"
                          : isCritical
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          : isRamping
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse"
                          : isSettling
                          ? "bg-teal-500/20 text-teal-400 border-teal-500/40"
                          : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                      }`}
                    >
                      {sig.isPrimarySource
                        ? "PRIMARY SOURCE"
                        : isCritical
                        ? "EXCURSION"
                        : isRamping
                        ? "RAMPING UP"
                        : isSettling
                        ? "PID SETTLING"
                        : "NOMINAL"}
                    </Badge>
                  </div>

                  {/* Value & dy/dt */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-black font-mono tracking-tight ${
                          isCritical || sig.isPrimarySource
                            ? "text-rose-500"
                            : isRamping
                            ? "text-amber-500"
                            : isSettling
                            ? "text-teal-500"
                            : "text-foreground"
                        }`}
                      >
                        {sig.currentValue}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {sig.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                        {sig.rateOfChange > 0 ? `+${sig.rateOfChange}` : sig.rateOfChange} {sig.unit}/s
                      </span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          sig.deviationPercent > 0 ? "text-rose-500" : "text-emerald-500"
                        }`}
                      >
                        {sig.deviationPercent > 0 ? `+${sig.deviationPercent}%` : `${sig.deviationPercent}%`}
                      </span>
                    </div>
                  </div>

                  {/* SVG Sparkline */}
                  <div className="h-10 w-full overflow-hidden flex items-end pt-1">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 140 40">
                      <polyline
                        fill="none"
                        stroke={isCritical ? "#f43f5e" : isRamping ? "#f59e0b" : isSettling ? "#14b8a6" : "#10b981"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    </svg>
                  </div>

                  {/* Manual Slider & Quick Spike Buttons */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>Manual Override Slider</span>
                      <span>Target: {sig.targetValue}</span>
                    </div>

                    <input
                      type="range"
                      min={Number((sig.minThreshold * 0.7).toFixed(1))}
                      max={Number((sig.maxThreshold * 1.4).toFixed(1))}
                      step={0.1}
                      value={sig.currentValue}
                      onChange={(e) => setManualValue(currentAsset.assetId, sig.signalId, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />

                    {/* Quick Trigger Buttons */}
                    <div className="flex items-center gap-1 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => injectDisturbance(currentAsset.assetId, sig.signalId, "high")}
                        className="h-6 flex-1 text-[10px] font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                      >
                        <Zap className="w-3 h-3" /> Spike (+28%)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => injectDisturbance(currentAsset.assetId, sig.signalId, "low")}
                        className="h-6 flex-1 text-[10px] font-bold text-amber-500 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                      >
                        <ArrowDownRight className="w-3 h-3" /> Drop (-25%)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => engagePidControl(currentAsset.assetId, sig.signalId)}
                        className="h-6 px-2 text-[10px] font-bold text-teal-500 border-teal-500/30 hover:bg-teal-500/10"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Active Plant Disturbances & Cascade Diagnostics Table */}
      {activeExcursions.length > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-card p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Live Anomaly Disturbances Streaming in Mill ({activeExcursions.length})
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              These excursions are currently active and visible in the Main Asset Hierarchy
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {activeExcursions.map((ex, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge variant="outline" className="font-mono text-[10px] border-rose-500/40 text-rose-400">
                    {ex.isPrimarySource ? "PRIMARY ROOT CAUSE" : "INDUCED CASCADE"}
                  </Badge>
                  <span className="font-bold text-foreground truncate">{ex.assetName}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-mono text-muted-foreground truncate">{ex.signalName}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-rose-500">
                    {ex.currentValue} {ex.unit} (+{ex.deviationPercent}%)
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => engagePidControl(ex.assetId, ex.signalId)}
                    className="h-6 text-[10px] text-teal-400 hover:bg-teal-500/10 gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Stabilize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
