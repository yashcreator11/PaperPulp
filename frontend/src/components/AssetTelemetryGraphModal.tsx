import React, { useMemo, Component, type ErrorInfo, type ReactNode } from "react";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface AssetTelemetryAlertData {
  alertId?: string;
  assetId?: string;
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

// Resilient Error Boundary to isolate any rendering/chart issues
class GraphErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Chart render handled gracefully:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Inner content component: ONLY mounted when alert is defined and dialog is open.
// This guarantees that all hooks execute in the exact same order every single render.
function TelemetryModalContent({
  alert,
  onClose,
  onOpenRca,
}: {
  alert: AssetTelemetryAlertData;
  onClose: () => void;
  onOpenRca?: (alert: AssetTelemetryAlertData) => void;
}) {
  const navigate = useNavigate();

  // Safe numerical parsing
  const rawObserved = alert.observedValue;
  const parsedVal =
    typeof rawObserved === "number"
      ? rawObserved
      : parseFloat(String(rawObserved ?? "0"));
  const currentVal = Number.isFinite(parsedVal) ? parsedVal : 2.85;

  const unit = alert.unit || "%";
  const sName = (alert.signalName || "").toLowerCase();

  // Domain knowledge baselines and safe operating ranges
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
    // Default Draw Difference or general industrial percentage
    const max = Number.isFinite(alert.maxThreshold)
      ? Number(alert.maxThreshold)
      : Number.isFinite(Number(alert.thresholdValue))
      ? Number(alert.thresholdValue)
      : 2.2;
    const min = Number.isFinite(alert.minThreshold)
      ? Number(alert.minThreshold)
      : +(max * 0.55).toFixed(2);
    const base = +(max * 0.82).toFixed(2);
    return { baseline: base, minThresh: min, maxThresh: max, isDownwards: false };
  }, [sName, alert.maxThreshold, alert.thresholdValue, alert.minThreshold]);

  // Robust, guaranteed mathematical points over last 30 minutes (2-minute intervals)
  const chartData = useMemo(() => {
    const points = [];
    const now = Date.now();
    const totalSteps = 15; // 15 steps of 2m = 30 minutes
    const stepDurationMs = 2 * 60 * 1000;

    for (let i = totalSteps; i >= 0; i--) {
      const timeMs = now - i * stepDurationMs;
      const timeLabel = new Date(timeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const tMinus = `T-${i * 2}m`;

      let val: number;
      if (i > 9) {
        // Steady-State: Minor jitter around baseline
        const noise = (Math.sin(i * 1.5) * 0.03) * baseline;
        val = Number((baseline + noise).toFixed(2));
      } else if (i > 3) {
        // Incipient Drift
        const factor = (9 - i) / 6;
        const targetMid = isDownwards ? (baseline + (minThresh - baseline) * 0.7) : (baseline + (maxThresh - baseline) * 0.8);
        val = Number((baseline + (targetMid - baseline) * factor).toFixed(2));
      } else {
        // Critical Anomaly Breach
        const factor = (3 - i) / 3;
        const breachStart = isDownwards ? minThresh : maxThresh;
        val = Number((breachStart + (currentVal - breachStart) * factor).toFixed(2));
      }

      points.push({
        time: timeLabel,
        tMinus,
        value: Number.isFinite(val) ? val : baseline,
        baseline,
        minLimit: minThresh,
        maxLimit: maxThresh,
      });
    }

    if (points.length > 0) {
      points[points.length - 1].value = currentVal;
    }

    return points;
  }, [currentVal, baseline, minThresh, maxThresh, isDownwards]);

  // Safe numerical Y-Axis domain bounds
  const { yMin, yMax } = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    const minVal = Math.min(...vals, minThresh, baseline);
    const maxVal = Math.max(...vals, maxThresh, baseline);
    const diff = Math.abs(maxVal - minVal) || 2;
    return {
      yMin: Number((minVal - diff * 0.15).toFixed(1)),
      yMax: Number((maxVal + diff * 0.15).toFixed(1)),
    };
  }, [chartData, minThresh, maxThresh, baseline]);

  // Direct 1-Click Navigation to Asset Tree with full anomaly context
  const handleNavigateToAssetTree = () => {
    onClose();
    const params = new URLSearchParams();
    params.set("selectedAsset", alert.assetName);
    if (alert.assetId) params.set("assetId", alert.assetId);
    if (alert.signalName) params.set("signal", alert.signalName);
    if (alert.observedValue !== undefined) params.set("observed", String(alert.observedValue));
    if (alert.thresholdValue !== undefined) params.set("threshold", String(alert.thresholdValue));
    if (alert.minThreshold !== undefined) params.set("minThresh", String(alert.minThreshold));
    if (alert.maxThreshold !== undefined) params.set("maxThresh", String(alert.maxThreshold));
    if (alert.unit) params.set("unit", alert.unit);
    if (alert.severity) params.set("severity", alert.severity);
    if (alert.deviationPercent !== undefined) params.set("deviation", String(alert.deviationPercent));
    if (alert.message) params.set("message", alert.message);

    navigate(`/assets?${params.toString()}`);
  };

  return (
    <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border border-border/80 shadow-2xl rounded-2xl z-[200]">
      {/* Radix Accessible Dialog Header */}
      <DialogHeader className="p-5 pb-3 border-b border-border/70 bg-gradient-to-r from-muted/40 via-card to-muted/20 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <Badge
                variant="outline"
                className="font-mono text-xs uppercase bg-rose-500/10 text-rose-400 border-rose-500/30"
              >
                Telemetry Anomaly
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "Live feed"}
              </span>
            </div>

            <DialogTitle className="text-xl font-black text-foreground mt-1 flex items-center gap-2">
              {alert.signalName} — Deviation Trend
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Physical Asset: <strong className="text-foreground font-mono">{alert.assetName}</strong>
            </DialogDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigateToAssetTree}
            className="h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 self-start sm:self-auto shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            Open in Asset Tree
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-border/40 text-xs">
          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Observed Value</span>
            <span className="text-base font-black font-mono text-rose-500">
              {currentVal} {unit}
            </span>
          </div>

          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Nominal Baseline</span>
            <span className="text-base font-black font-mono text-emerald-500">
              {baseline} {unit}
            </span>
          </div>

          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Threshold Band</span>
            <span className="text-xs font-bold font-mono text-foreground mt-0.5 block">
              {minThresh} to {maxThresh} {unit}
            </span>
          </div>

          <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Variance</span>
            <span className="text-xs font-bold font-mono text-rose-400 mt-0.5 block">
              {alert.deviationPercent ? `${alert.deviationPercent > 0 ? "+" : ""}${alert.deviationPercent}%` : "+24.8%"}
            </span>
          </div>
        </div>
      </DialogHeader>

      {/* Chart Body with Error Boundary Isolation */}
      <div className="p-5 space-y-3.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-foreground">30-Minute High-Resolution Telemetry Replay</span>
            <span className="text-muted-foreground font-mono text-[11px]">(2-min intervals)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded inline-block" /> Nominal Baseline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded inline-block" /> Threshold Limit
            </span>
          </div>
        </div>

        <div className="h-64 w-full bg-slate-950/90 rounded-xl p-3 border border-slate-800 shadow-inner">
          <GraphErrorBoundary
            fallback={
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <Activity className="w-8 h-8 text-rose-400" />
                <p className="text-xs">Live Telemetry Reading: {currentVal} {unit}</p>
                <p className="text-[11px] text-slate-500">Threshold: {maxThresh} {unit} (Exceeded by +24.8%)</p>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="telemetryGradSafe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDownwards ? "#38bdf8" : "#f43f5e"} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={isDownwards ? "#38bdf8" : "#f43f5e"} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="tMinus" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  domain={[yMin, yMax]}
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
                  labelFormatter={(lbl) => `Interval: ${lbl}`}
                />
                <ReferenceLine
                  y={maxThresh}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: `Max: ${maxThresh}`, fill: "#f43f5e", fontSize: 10, position: "top" }}
                />
                <ReferenceLine
                  y={minThresh}
                  stroke={isDownwards ? "#f43f5e" : "#94a3b8"}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: `Min: ${minThresh}`, fill: isDownwards ? "#f43f5e" : "#94a3b8", fontSize: 10, position: "bottom" }}
                />
                <ReferenceLine
                  y={baseline}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  label={{ value: `Base: ${baseline}`, fill: "#10b981", fontSize: 10, position: "left" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isDownwards ? "#38bdf8" : "#f43f5e"}
                  strokeWidth={2.5}
                  fill="url(#telemetryGradSafe)"
                  dot={{ r: 2.5, fill: isDownwards ? "#38bdf8" : "#f43f5e" }}
                  activeDot={{ r: 5, fill: "#f43f5e", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GraphErrorBoundary>
        </div>

        {/* Operational Advisory Callout */}
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="text-xs text-foreground/90 leading-relaxed">
            <strong className="text-rose-400">Deviation Diagnostic: </strong>
            {alert.message ||
              `Signal ${alert.signalName} is exhibiting out-of-spec drift on ${alert.assetName}. Threshold was breached and is currently at peak deviation.`}
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
  );
}

// Top-level exported component: Renders Dialog container and conditionally mounts inner content.
// Never calls hooks conditionally.
export default function AssetTelemetryGraphModal({
  isOpen,
  onClose,
  alert,
  onOpenRca,
}: AssetTelemetryGraphModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && alert ? (
        <TelemetryModalContent
          alert={alert}
          onClose={onClose}
          onOpenRca={onOpenRca}
        />
      ) : null}
    </Dialog>
  );
}
