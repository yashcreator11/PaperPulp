import React from "react";

type Payload = {
  asset: string;
  signal: string;
  value: number;
  min: number;
  max: number;
  status: "HIGH" | "LOW" | string;
  percent: number;
  timestamp: string;
};

export default function NotificationToast({ data }: { data: Payload }) {
    console.log("Rendering NotificationToast with data:", data);
  const isHigh = data?.status === "HIGH";
  const isLow = data?.status === "LOW";

  // prettify numbers
  const fmt = (n: number) =>
    Number.isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString() : "-";

  // cap progress bar at 100 for visual
  const progress = Math.min(Math.abs(data.percent), 100);

  return (
    <div className="w-96 max-w-full">
      <div className="flex">
        {/* colored left indicator */}
        <div
          className={`w-1 rounded-l-md mr-3 ${isHigh ? "bg-red-500" : isLow ? "bg-blue-500" : "bg-gray-400"}`}
          aria-hidden
        />
        <div className="flex-1">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm"> {isHigh ? "🔔" : isLow ? "ℹ️" : "⚠️"} </span>
              <div className="text-sm font-semibold leading-tight">
                <span>{data.asset}</span>
                <span className="text-gray-500 font-normal"> • {data.signal}</span>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Status & values */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isHigh ? "bg-red-100 text-red-700" : isLow ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                {data.status}
              </span>

              <span className="ml-2 text-sm text-gray-700">
                {fmt(data.value)}
              </span>
            </div>

            <div className="text-xs text-gray-500">
              Range: {fmt(data.min)} — {fmt(data.max)}
            </div>
          </div>

          {/* Deviation row */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div>Deviation: <span className="font-medium text-gray-800">{fmt(data.percent)}%</span></div>
            </div>

            {/* Progress bar */}
            <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isHigh ? "bg-red-500" : isLow ? "bg-blue-500" : "bg-gray-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
