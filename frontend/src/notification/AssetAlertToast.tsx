import React from "react";

const fmt = (v: any) => (v ?? "-");
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleString() : "-";

export const AssetAlertToast = ({ data }: { data: any }) => {
  if (!data || typeof data !== "object") {
    return <div className="text-sm text-gray-500">No alert data</div>;
  }

  const isHigh = data.status === "HIGH";
  const isLow = data.status === "LOW";
  const percent = typeof data.percent === "number" ? data.percent : 0;
  const progress = Math.min(Math.abs(percent), 100);

  const deviation =
    typeof data.value === "number"
      ? Math.abs(
          data.value -
            (isHigh ? data.max : isLow ? data.min : data.value)
        )
      : "-";

  return (
    <div className="w-96 max-w-full">
      <div className="flex">
        {/* LEFT COLOR BAR */}
        <div
          className={`w-1 rounded-l-md mr-3 ${
            isHigh
              ? "bg-red-500"
              : isLow
              ? "bg-blue-500"
              : "bg-gray-400"
          }`}
        />

        <div className="flex-1">
          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {isHigh ? "🔔" : isLow ? "ℹ️" : "⚠️"}
              </span>

              <div className="text-sm font-semibold leading-tight">
                <span>{fmt(data.asset)}</span>
                <span className="text-gray-500 font-normal">
                  {" "}• {fmt(data.signal)}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              {fmtDate(data.timestamp)}
            </div>
          </div>

          {/* VALUE + STATUS */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isHigh
                    ? "bg-red-100 text-red-700"
                    : isLow
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {data.status ?? "ALERT"}
              </span>

              <span className="ml-2 text-sm text-gray-700">
                {fmt(data.value)}
              </span>

              <span className="ml-2 text-xs text-gray-500">
                {data.unit ?? ""}
              </span>
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div>
                Deviation:{" "}
                <span className="font-medium text-gray-800">
                  {fmt(percent)}%
                </span>
              </div>

              <div className="text-right">
                Δ {fmt(deviation)}
              </div>
            </div>

            <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isHigh
                    ? "bg-red-500"
                    : isLow
                    ? "bg-blue-500"
                    : "bg-gray-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <div>
                Min:
                <span className="font-medium text-gray-800 ml-1">
                  {fmt(data.min)}
                </span>
              </div>
              <div>
                Max:
                <span className="font-medium text-gray-800 ml-1">
                  {fmt(data.max)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
