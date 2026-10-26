// src/components/Graph.tsx
import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GraphProps {
  telemetryData: any[];
  mainKeys: string[];
  compareKeys: string[];
  mainAssetId?: string;
  compareAssetId?: string;
  aggregationWindow: string;
  colorForAsset: (assetId: string) => string;
}


// Example color function
const colorForAsset = (assetId: string) => {
  const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"];
  const index = assetId ? assetId.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const Graph: React.FC<GraphProps> = ({
  telemetryData,
  mainKeys,
  compareKeys,
  mainAsset,
  compareAssetId,
  allAssets,
  aggregationWindow,
}) => {
  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);

    switch (aggregationWindow) {
      case "5s":
        return date.toLocaleTimeString();
      case "1m":
      case "5m":
      case "10m":
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      case "30m":
      case "1h":
      case "2h":
      case "5h":
        return date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const tickInterval = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return 0;
    const maxTicks = 8;
    return Math.ceil(telemetryData.length / maxTicks);
  }, [telemetryData]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={telemetryData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" tickFormatter={formatXAxis} interval={tickInterval} />
        <YAxis />
        <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
        <Legend />

        {mainKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colorForAsset(mainAsset?.assetId ?? "")}
            strokeWidth={2}
          />
        ))}

        {compareKeys.map((key) => {
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colorForAsset(compareAssetId)}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Graph;
