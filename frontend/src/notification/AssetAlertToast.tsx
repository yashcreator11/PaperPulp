import React from "react";
import { AlertTriangle, Clock, ShieldAlert, Sparkles } from "lucide-react";

const fmt = (v: any) =>
  typeof v === "number" && Number.isFinite(v) ? (Math.round(v * 10) / 10).toLocaleString() : (v ?? "-");

export const AssetAlertToast = ({ data }: { data: any }) => {
  if (!data || typeof data !== "object") {
    return <div className="text-xs font-medium text-slate-600">No alert data</div>;
  }

  const isHigh = data.status === "HIGH";
  const isLow = data.status === "LOW";
  const percent = typeof data.percent === "number" ? data.percent : 0;
  const absDev = Math.min(Math.abs(percent), 100);

  return (
    <div className="w-80 max-w-full text-slate-900 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-wider shadow-sm ${isHigh
                ? "bg-rose-100 text-rose-700 border border-rose-300"
                : isLow
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
          >
            {data.status || "ALERT"}
          </span>
          <span className="text-xs font-mono font-bold text-slate-900">
            {data.asset || "PM-01"}
          </span>
        </div>

        <span className="text-[10px] text-slate-500 font-mono font-semibold flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real-time
        </span>
      </div>

      {/* Body: Signal & Value */}
      <div className="mt-2 space-y-1">
        <p className="text-xs font-bold text-slate-950 truncate">
          {data.signal || "Operational Variable"}
        </p>
        {data.message && (
          <p className="text-[11px] font-medium text-slate-700 line-clamp-2 leading-relaxed">
            {data.message}
          </p>
        )}
      </div>

      {/* Metrics Row */}
      <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-100/90 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono">
        <div>
          <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">Value</span>
          <span className="font-bold text-slate-900">
            {fmt(data.value)} {data.unit || ""}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider">Variance</span>
          <span className={`font-bold ${isHigh ? "text-rose-600" : isLow ? "text-amber-600" : "text-slate-700"}`}>
            {percent > 0 ? `+${fmt(percent)}%` : `${fmt(percent)}%`}
          </span>
        </div>
      </div>

      {/* Mini deviation progress bar */}
      <div className="mt-2 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isHigh ? "bg-rose-600" : isLow ? "bg-amber-500" : "bg-slate-500"
            }`}
          style={{ width: `${Math.max(15, absDev)}%` }}
        />
      </div>
    </div>
  );
};

export default AssetAlertToast;
