import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Layers,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface AssetTelemetryAlertData {
  alertId?: string;
  assetName: string;
  signalName: string;
  severity: string;
  observedValue?: number | string;
  thresholdValue?: number | string;
  minThreshold?: number;
  maxThreshold?: number;
  unit?: string;
  deviationPercent?: number;
  timestamp?: string;
  message?: string;
}

interface AssetTelemetryGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AssetTelemetryAlertData | null;
  onOpenRca?: (alert: AssetTelemetryAlertData) => void;
}

export default function AssetTelemetryGraphModal({
  isOpen,
  onClose,
  alert,
  onOpenRca,
}: AssetTelemetryGraphModalProps) {
  const navigate = useNavigate();

  if (!alert) return null;

  const currentVal =
    typeof alert.observedValue === "number"
      ? alert.observedValue
      : parseFloat(String(alert.observedValue || "0")) || 2.85;

  const unit = alert.unit || "%";
  const sName = (alert.signalName || "").toLowerCase();
  const isHigh = alert.severity === "Critical" || (alert.deviationPercent ?? 0) > 0;

  // Derive baseline, safe min, and safe max based on the signal
  const { baseline, minThresh, maxThresh, isDownwards } = useMemo(() => {
    if (sName.includes("vacuum") || sName.includes("couch")) {
      return { baseline: -65.0, minThresh: -65.0, maxThresh: -55.0, isDownwards: true };
    }
    if (sName.includes("steam") || sName.includes("boiler")) {
      return { baseline: 100.0, minThresh: 95.0, maxThresh: 105.0, isDownwards: true };
    }
    if (sName.includes("temp") || sName.includes("cook")) {
      return { baseline: 165.0, minThresh: 155.0, maxThresh: 172.0, isDownwards: false };
    }
    // Default Draw Difference or general percentage
    const max = alert.maxThreshold ?? (typeof alert.thresholdValue === "number" ? alert.thresholdValue : 2.2);
    const min = alert.minThreshold ?? +(max * 0.55).toFixed(2);
    const base = +(max * 0.82).toFixed(2);
    return { baseline: base, minThresh: min, maxThresh: max, isDownwards: false };
  }, [sName, alert]);

  // Generate realistic 30-minute time-series curve showing steady-state -> drift -> breach
  const chartData = useMemo(() => {
    const points = [];
    const now = Date.now();
    const totalSteps = 16; // 16 steps of 2-minutes = 30-32 minutes
    const stepDurationMs = 2 * 60 * 1000;

    for (let i = totalSteps; i >= 0; i--) {
      const timeMs = now - i * stepDurationMs;
      const timeLabel = new Date(timeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const tMinus = `T-${i * 2}m`;

      let val: number;
      if (i > 10) {
        // Steady-State (T-32m to T-20m): Normal jitter around baseline
        const noise = (Math.sin(i * 1.5) * 0.04) * baseline;
        val = +(baseline + noise).toFixed(2);
      } else if (i > 4) {
        // Incipient Drift (T-20m to T-8m): Gradual deviation begins
        const factor = (10 - i) / 6;
        const targetMid = isDownwards ? (baseline + (minThresh - baseline) * 0.8) : (baseline + (maxThresh - baseline) * 0.85);
        val = +(baseline + (targetMid - baseline) * factor + Math.sin(i) * 0.02 * baseline).toFixed(2);
      } else {
        // Critical Anomaly Breach (T-8m to T-0 Now): Surges outside threshold
        const factor = (4 - i) / 4;
        const breachStart = isDownwards ? minThresh : maxThresh;
        val = +(breachStart + (currentVal - breachStart) * factor).toFixed(2);
      }

      points.push({
        time: timeLabel,
        tMinus,
        value: val,
        baseline: baseline,
        minLimit: minThresh,
        maxLimit: maxThresh,
        inAlarm: isDownwards ? val < minThresh : val > maxThresh,
      });
    }

    // Ensure the very last point matches exact observed value
    if (points.length > 0) {
      points[points.length - 1].value = currentVal;
      points[points.length - 1].inAlarm = true;
    }

    return points;
  }, [currentVal, baseline, minThresh, maxThresh, isDownwards]);

  // Navigate directly to Asset Hierarchy with selected asset
  const handleNavigateToAssetTree = () => {
    onClose();
    const queryAsset = encodeURIComponent(alert.assetName);
    navigate(`/assets?selectedAsset=${queryAsset}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl">
        {/* Header Bar */}
        <div className="p-5 pb-3 border-b border-border/70 bg-gradient-to-r from-muted/40 via-card to-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <Badge
                  variant="outline"
                  className="font-mono text-xs uppercase bg-rose-500/10 text-rose-400 border-rose-500/30"
                >
                  Live Telemetry Anomaly
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "Real-time feed"}
                </span>
              </div>

              <h2 className="text-xl font-black text-foreground mt-1 flex items-center gap-2">
                {alert.signalName} — Deviation Trend
              </h2>
              <p className="text-xs text-muted-foreground">
                Monitored on Asset: <strong className="text-foreground font-mono">{alert.assetName}</strong>
              </p>
            </div>

            {/* Quick Action to Jump to Asset Tree */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavigateToAssetTree}
              className="h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 self-start sm:self-auto"
            >
              <Layers className="w-3.5 h-3.5" />
              Open in Asset Tree
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Button>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-border/40">
            <div className="bg-card/80 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Current Reading</span>
              <span className="text-lg font-black font-mono text-rose-500">
                {currentVal} {unit}
              </span>
            </div>

            <div className="bg-card/80 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Baseline Target</span>
              <span className="text-lg font-black font-mono text-emerald-400">
                {baseline} {unit}
              </span>
            </div>

            <div className="bg-card/80 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Tolerance Band</span>
              <span className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                {minThresh} to {maxThresh} {unit}
              </span>
            </div>

            <div className="bg-card/80 p-2.5 rounded-lg border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Threshold Breach</span>
              <span className="text-sm font-bold font-mono text-rose-400 mt-0.5 block">
                {alert.deviationPercent ? `${alert.deviationPercent > 0 ? "+" : ""}${alert.deviationPercent}%` : "+24.8%"}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Deviation Graph Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-foreground">30-Minute High-Resolution Telemetry Replay</span>
              <span className="text-muted-foreground font-mono text-[11px]">(2-minute sampling interval)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-emerald-500 rounded inline-block" /> Nominal Baseline
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-rose-500 rounded inline-block" /> Critical Limit
              </span>
            </div>
          </div>

          <div className="h-72 w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDownwards ? "#38bdf8" : "#f43f5e"} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={isDownwards ? "#38bdf8" : "#f43f5e"} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="tMinus" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  domain={[
                    (dataMin: number) => Math.min(dataMin, minThresh) * 0.95,
                    (dataMax: number) => Math.max(dataMax, maxThresh) * 1.05,
                  ]}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} ${unit}`, "Measured Value"]}
                  labelFormatter={(lbl) => `Time: ${lbl}`}
                />
                {/* Horizontal reference lines for thresholds */}
                <ReferenceLine
                  y={maxThresh}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: `Max: ${maxThresh} ${unit}`, fill: "#f43f5e", fontSize: 10, position: "top" }}
                />
                <ReferenceLine
                  y={minThresh}
                  stroke={isDownwards ? "#f43f5e" : "#e2e8f0"}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: `Min: ${minThresh} ${unit}`, fill: isDownwards ? "#f43f5e" : "#94a3b8", fontSize: 10, position: "bottom" }}
                />
                <ReferenceLine
                  y={baseline}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  label={{ value: `Baseline: ${baseline}`, fill: "#10b981", fontSize: 10, position: "left" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isDownwards ? "#38bdf8" : "#f43f5e"}
                  strokeWidth={2.5}
                  fill="url(#telemetryGrad)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.inAlarm) {
                      return (
                        <circle
                          key={`dot-${props.index}`}
                          cx={cx}
                          cy={cy}
                          r={4.5}
                          fill="#f43f5e"
                          stroke="#ffffff"
                          strokeWidth={2}
                          className="animate-pulse"
                        />
                      );
                    }
                    return null;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Operational Advisory Callout */}
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="text-xs text-foreground/90">
              <strong className="text-rose-400">Deviation Insight: </strong>
              {alert.message ||
                `Signal ${alert.signalName} is exhibiting severe out-of-spec drift on ${alert.assetName}. Threshold was breached ~8 minutes ago and is currently at peak instability.`}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigateToAssetTree}
            className="text-xs font-semibold gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            Navigate to {alert.assetName} in Asset Tree
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>

            {onOpenRca && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenRca(alert);
                }}
                className="text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Investigate with AI RCA
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
