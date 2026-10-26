import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAssetHierarchy, getSignalOnAsset } from "@/api/assetApi";
import { getDeviceById } from "@/api/deviceApi";
import type { Asset } from "@/api/assetApi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TimeRange } from "@/api/telemetryApi";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------ Helpers ------------------------------ */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function colorForAsset(assetId: string) {
  const seed = hashStringToInt(assetId);
  const rnd = mulberry32(seed);
  const r = Math.floor(rnd() * 200) + 20;
  const g = Math.floor(rnd() * 200) + 20;
  const b = Math.floor(rnd() * 200) + 20;
  return `rgb(${r}, ${g}, ${b})`;
}

/* ---------------------------- Component ---------------------------- */
export default function Signals() {
  const { state } = useLocation();
  const passedAsset = (state as any)?.asset as Asset | undefined | null;

  const [mainAsset, setMainAsset] = useState<Asset | null>(passedAsset ?? null);
  const [deviceName, setDeviceName] = useState<string>("Loading...");
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [compareAssetId, setCompareAssetId] = useState<string>("");

  const [mainSignalMappings, setMainSignalMappings] = useState<SignalMapping[]>([]);
  const [compareSignalMappings, setCompareSignalMappings] = useState<SignalMapping[]>([]);
  const [compareDeviceName, setCompareDeviceName] = useState<string>("Loading...");

  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d" | "custom">("24h");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingData, setFetchingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 Store telemetry data for all signals
  const [telemetryData, setTelemetryData] = useState<Record<string, TelemetryResponse>>({});

  const flattenAssets = (assets: Asset[]): Asset[] => {
    const out: Asset[] = [];
    const stack = [...assets];
    while (stack.length) {
      const a = stack.shift()!;
      out.push(a);
      if (a.childrens?.length) stack.unshift(...a.childrens);
    }
    return out;
  };

  /* ---------------- Load asset hierarchy ---------------- */
  useEffect(() => {
    const loadHierarchy = async () => {
      setLoading(true);
      try {
        const hierarchy = await getAssetHierarchy();
        setAllAssets(flattenAssets(hierarchy || []));
      } catch (err) {
        console.error("Failed to load asset hierarchy", err);
        setAllAssets([]);
        setError("Failed to load assets");
      } finally {
        setLoading(false);
      }
    };
    loadHierarchy();
  }, []);

  /* ---------------- Load main asset signals & device ---------------- */
  useEffect(() => {
    const loadMainSignals = async () => {
      if (!mainAsset) {
        setDeviceName("Not Assigned");
        setMainSignalMappings([]);
        return;
      }
      try {
        const mappings = await getSignalOnAsset(mainAsset.assetId);
        if (mappings?.length > 0) {
          const signalMappings: SignalMapping[] = mappings.map((m: any) => ({
            signalTypeId: m.signalTypeId,
            signalName: m.signalName ?? "Unknown",
            deviceId: m.deviceId,
            signalUnit: m.signalUnit,
          }));

          // Remove duplicates based on signalTypeId
          const uniqueMappings = Array.from(
            new Map(signalMappings.map((s) => [s.signalTypeId, s])).values()
          );

          setMainSignalMappings(uniqueMappings);

          const deviceId = mappings[0].deviceId;
          if (deviceId) {
            try {
              const device = await getDeviceById(deviceId);
              setDeviceName(device?.name ?? device?.data?.name ?? "Unknown Device");
            } catch {
              setDeviceName("Unknown Device");
            }
          } else {
            setDeviceName("Not Assigned");
          }
        } else {
          setMainSignalMappings([]);
          setDeviceName("Not Assigned");
        }
      } catch (err) {
        console.error("Failed to fetch main asset signals", err);
        setMainSignalMappings([]);
        setDeviceName("Error");
      }
    };
    loadMainSignals();
  }, [mainAsset]);

  /* ---------------- Compare asset signals & device ---------------- */
  useEffect(() => {
    const loadCompareSignals = async () => {
      if (!compareAssetId) {
        setCompareSignalMappings([]);
        setCompareDeviceName("Not Assigned");
        return;
      }
      try {
        const mappings = await getSignalOnAsset(compareAssetId);
        const signalMappings: SignalMapping[] = mappings.map((m: any) => ({
          signalTypeId: m.signalTypeId,
          signalName: m.signalName ?? "Unknown",
          deviceId: m.deviceId,
          signalUnit: m.signalUnit,
        }));

        const uniqueMappings = Array.from(
          new Map(signalMappings.map((s) => [s.signalTypeId, s])).values()
        );

        setCompareSignalMappings(uniqueMappings);

        const deviceId = mappings[0]?.deviceId;
        if (deviceId) {
          try {
            const device = await getDeviceById(deviceId);
            setCompareDeviceName(device?.name ?? device?.data?.name ?? "Unknown Device");
          } catch {
            setCompareDeviceName("Unknown Device");
          }
        } else {
          setCompareDeviceName("Not Assigned");
        }
      } catch (err) {
        console.error("Failed to fetch compare asset signals", err);
        setCompareSignalMappings([]);
        setCompareDeviceName("Error");
      }
    };
    loadCompareSignals();
  }, [compareAssetId]);

  /* ---------------- 🔥 Fetch Real Telemetry Data ---------------- */
  useEffect(() => {
    const fetchTelemetryData = async () => {
      if (!mainAsset && !compareAssetId) return;

      setFetchingData(true);
      setError(null);

      try {
        const newTelemetryData: Record<string, TelemetryResponse> = {};

        // Map timeRange to API enum
        const apiTimeRange: TimeRange =
          timeRange === "1h"
            ? TimeRange.LastHour
            : timeRange === "24h"
            ? TimeRange.Last24Hours
            : timeRange === "7d"
            ? TimeRange.Last7Days
            : timeRange === "30d"
            ? TimeRange.Last30Days
            : TimeRange.Custom;

        // Fetch main asset signals
        if (mainAsset) {
          for (const mapping of mainSignalMappings) {
            const key = `${mainAsset.assetId}-${mapping.signalTypeId}`;
            try {
              const data = await getTelemetryData({
                assetId: mainAsset.assetId,
                signalId: (mapping as any).signalId || (mapping as any).signalTypeId || "sig-1",
                signalName: mapping.signalName,
                unit: mapping.unit,
                timeRange: apiTimeRange,
                startDate: customStart?.toISOString(),
                endDate: customEnd?.toISOString(),
              });
              newTelemetryData[key] = data;
            } catch (err) {
              console.error(`Failed to fetch data for ${mapping.signalName}:`, err);
            }
          }
        }

        // Fetch compare asset signals
        if (compareAssetId) {
          for (const mapping of compareSignalMappings) {
            const key = `${compareAssetId}-${mapping.signalTypeId}`;
            try {
              const data = await getTelemetryData({
                assetId: compareAssetId,
                signalId: (mapping as any).signalId || (mapping as any).signalTypeId || "sig-1",
                signalName: mapping.signalName,
                unit: mapping.unit,
                timeRange: apiTimeRange,
                startDate: customStart?.toISOString(),
                endDate: customEnd?.toISOString(),
              });
              newTelemetryData[key] = data;
            } catch (err) {
              console.error(`Failed to fetch compare data for ${mapping.signalName}:`, err);
            }
          }
        }

        setTelemetryData(newTelemetryData);
      } catch (err: any) {
        console.error("Failed to fetch telemetry data:", err);
        setError(err.message || "Failed to fetch telemetry data");
      } finally {
        setFetchingData(false);
      }
    };

    fetchTelemetryData();
  }, [mainAsset, mainSignalMappings, compareAssetId, compareSignalMappings, timeRange, customStart, customEnd]);

  /* ---------------- 🔥 Process Chart Data from Real API ---------------- */
  const chartData = useMemo(() => {
    const timestampMap: Record<string, any> = {};

    // Process main asset data
    if (mainAsset) {
      mainSignalMappings.forEach((mapping) => {
        const key = `${mainAsset.assetId}-${mapping.signalTypeId}`;
        const data = telemetryData[key];

        if (data?.values) {
          data.values.forEach((point) => {
            const timestamp = new Date(point.time).toLocaleString();
            if (!timestampMap[timestamp]) {
              timestampMap[timestamp] = { timestamp };
            }
            timestampMap[timestamp][`${mainAsset.name}-${mapping.signalName}`] = point.value;
          });
        }
      });
    }

    // Process compare asset data
    if (compareAssetId) {
      const compareAsset = allAssets.find((a) => a.assetId === compareAssetId);
      if (compareAsset) {
        compareSignalMappings.forEach((mapping) => {
          const key = `${compareAssetId}-${mapping.signalTypeId}`;
          const data = telemetryData[key];

          if (data?.values) {
            data.values.forEach((point) => {
              const timestamp = new Date(point.time).toLocaleString();
              if (!timestampMap[timestamp]) {
                timestampMap[timestamp] = { timestamp };
              }
              timestampMap[timestamp][`${compareAsset.name}-${mapping.signalName}`] = point.value;
            });
          }
        });
      }
    }

    return Object.values(timestampMap).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [mainAsset, mainSignalMappings, compareAssetId, compareSignalMappings, telemetryData, allAssets]);

  const mainKeys = useMemo(
    () => mainSignalMappings.map((s) => `${mainAsset?.name}-${s.signalName}`),
    [mainAsset, mainSignalMappings]
  );

  const compareKeys = useMemo(() => {
    const obj = allAssets.find((a) => a.assetId === compareAssetId) ?? null;
    if (!obj) return [];
    return compareSignalMappings.map((s) => `${obj.name}-${s.signalName}`);
  }, [compareAssetId, compareSignalMappings, allAssets]);

  /* ---------------------------- JSX ---------------------------- */
  return (
  <div className="p-4 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
    {/* PAGE TITLE */}
    <h2 className="tour-signal-title text-2xl font-semibold text-gray-800 dark:text-gray-200">
      Signals
    </h2>

    {/* TIME RANGE SECTION */}
    <div className="flex flex-col md:flex-row md:items-center gap-4 mt-1">
      <div className="flex flex-col">
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Time Range</span>
        <select
          className="tour-time-range w-40 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="today">Today</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {timeRange === "custom" && (
        <div className="tour-custom-range flex flex-row items-center gap-2 mt-1">
          <DatePicker
            selected={customStart}
            onChange={setCustomStart}
            placeholderText="Start"
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-600 dark:text-gray-300">to</span>
          <DatePicker
            selected={customEnd}
            onChange={setCustomEnd}
            placeholderText="End"
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}
    </div>

    {/* 2 CARDS: MAIN + COMPARE */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* MAIN ASSET CARD */}
      <Card className="tour-main-asset-card shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-gray-200">Selected Asset</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Asset Dropdown */}
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Select Asset:</span>
            <select
              className="tour-main-asset-dropdown w-full p-2 mt-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={mainAsset?.assetId ?? ""}
              onChange={e => {
                const selected = allAssets.find(a => a.assetId === e.target.value) ?? null;
                setMainAsset(selected);
              }}
            >
              <option value="">--Select Asset--</option>
              {allAssets.map(a => (
                <option key={a.assetId} value={a.assetId}>
                  {a.name} (Level {a.level})
                </option>
              ))}
            </select>
          </div>

          {/* Device & Signals */}
          <div className="flex flex-wrap items-start gap-6 mt-2">
            
            {/* Device */}
            <div className="tour-main-device flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Assigned Device:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {deviceName}
              </span>
            </div>

            {/* Signals */}
            <div className="tour-main-signals flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Signals:</span>
              {mainSignals.length === 0 ? (
                <span className="text-sm text-gray-400">No signals</span>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {mainSignals.map(s => (
                    <span
                      key={s}
                      className="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-600 text-indigo-800 dark:text-white font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* COMPARE ASSET CARD */}
      <Card className="tour-compare-card shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-gray-200">Compare Asset</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Select Asset</span>
            {loading ? (
              <span className="text-gray-500 dark:text-gray-400 text-sm">Loading...</span>
            ) : (
              <select
                className="tour-compare-dropdown w-full p-2 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={compareAssetId}
                onChange={e => setCompareAssetId(e.target.value)}
              >
                <option value="">None</option>
                {allAssets
                  .filter(a => a.assetId !== mainAsset?.assetId)
                  .map(a => (
                    <option key={a.assetId} value={a.assetId}>
                      {a.name} (Level {a.level})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {compareAssetId && (
            <div className="flex flex-wrap items-start gap-6 mt-2">
              {/* Device */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400">Assigned Device:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{compareDeviceName}</span>
              </div>

              {/* Signals */}
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400">Signals:</span>
                {compareSignals.length === 0 ? (
                  <span className="text-sm text-gray-400">No signals</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {compareSignals.map(s => (
                      <span
                        key={s}
                        className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-600 text-purple-800 dark:text-white font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>

    {/* GRAPH CARD */}
    <Card className="tour-graph-card shadow rounded-lg border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-gray-200">Signals Graph</CardTitle>
      </CardHeader>

      <CardContent style={{ height: 360 }}>
        {chartData.length === 0 ? (
          <span className="text-gray-500 dark:text-gray-400 text-sm">No data to plot</span>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
              <XAxis dataKey="timestamp" stroke="#4b5563" />
              <YAxis stroke="#4b5563" />
              <Tooltip
                contentStyle={{ backgroundColor: "#f9fafb", borderRadius: 6, borderColor: "#d1d5db" }}
                labelStyle={{ color: "#111827" }}
                itemStyle={{ color: "#111827" }}
              />

              {mainKeys.map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={mainAsset ? colorForAsset(mainAsset.assetId) : "#3b82f6"}
                  strokeWidth={2}
                  dot={false}
                />
              ))}

              {compareKeys.map(key => {
                const assetObj = allAssets.find(a => a.assetId === compareAssetId);
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={assetObj ? colorForAsset(assetObj.assetId) : "#a855f7"}
                    strokeWidth={2}
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  </div>
);

}
