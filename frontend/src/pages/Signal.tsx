import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAssetHierarchy, getSignalOnAsset } from "@/api/assetApi";
import { getDeviceById } from "@/api/deviceApi";
import { getTelemetryData, TimeRange } from "@/api/telemetryApi";
import type { Asset, IMapping } from "@/api/assetApi";
import { getMappingById } from "@/api/assetApi";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Pin,
  XCircle,
  Activity,
  Layers,
  Cpu,
  RotateCcw,
  ZoomOut,
  Sliders,
  ChevronDown,
  Check,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
  Dot,
} from "recharts";

/* ------------------------------ Color Generator ------------------------------ */
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

const PALETTE = [
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#f43f5e", // rose
  "#14b8a6", // teal
];

function colorForString(str: string) {
  const seed = hashStringToInt(str);
  return PALETTE[seed % PALETTE.length];
}

export default function Signals() {
  const { state } = useLocation();
  const { triggerAlert } = useNotifications();
  const passedAsset = (state as any)?.asset as Asset | undefined | null;
  const [mainAsset, setMainAsset] = useState<Asset | null>(passedAsset ?? null);
  const [deviceName, setDeviceName] = useState("Loading...");
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [compareAssetId, setCompareAssetId] = useState("");
  const [mainSignals, setMainSignals] = useState<IMapping[]>([]);
  const [compareSignals, setCompareSignals] = useState<IMapping[]>([]);
  const [compareDeviceName, setCompareDeviceName] = useState("Loading...");
  const [timeRange, setTimeRange] = useState<"today" | "24h" | "7d" | "custom">("today");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullTelemetryData, setFullTelemetryData] = useState<any[]>([]);
  const [displayedTelemetryData, setDisplayedTelemetryData] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [selectedSignals, setSelectedSignals] = useState<IMapping[]>([]);
  const [compareSelectedSignals, setCompareSelectedSignals] = useState<IMapping[]>([]);
  const [refAreaLeft, setRefAreaLeft] = useState<number | undefined>(undefined);
  const [refAreaRight, setRefAreaRight] = useState<number | undefined>(undefined);
  const [mainSignalDropdownOpen, setMainSignalDropdownOpen] = useState(false);
  const [compareSignalDropdownOpen, setCompareSignalDropdownOpen] = useState(false);
  const mainSignalDropdownRef = useRef<HTMLDivElement | null>(null);
  const compareSignalDropdownRef = useRef<HTMLDivElement | null>(null);
  const [signalColors, setSignalColors] = useState<{ [key: string]: string }>({});

  // Reference Point States
  const [referencePoint, setReferencePoint] = useState<{
    time: number;
    values: { [key: string]: number };
  } | null>(null);
  const [isSelectingReference, setIsSelectingReference] = useState(false);

  const flattenAssets = (assets: Asset[]): Asset[] => {
    const out: Asset[] = [];
    const stack = [...assets];
    while (stack.length) {
      const a = stack.shift()!;
      if (a.level > 2) out.push(a);
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
        const flattened = flattenAssets(hierarchy || []);
        setAllAssets(flattened);
        // Preselect first asset if none passed
        if (!mainAsset && flattened.length > 0) {
          setMainAsset(flattened[0]);
        }
      } catch (err) {
        console.error("Failed to load asset hierarchy", err);
        setAllAssets([]);
      } finally {
        setLoading(false);
      }
    };
    loadHierarchy();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mainSignalDropdownRef.current && !mainSignalDropdownRef.current.contains(e.target as Node)) {
        setMainSignalDropdownOpen(false);
      }
      if (compareSignalDropdownRef.current && !compareSignalDropdownRef.current.contains(e.target as Node)) {
        setCompareSignalDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------------- Load main asset signals & device ---------------- */
  useEffect(() => {
    const loadMainSignals = async () => {
      if (!mainAsset) {
        setDeviceName("Not Assigned");
        setMainSignals([]);
        return;
      }
      try {
        const signalOnAsset = await getSignalOnAsset(mainAsset.assetId);
        if (signalOnAsset?.length > 0) {
          setMainSignals(signalOnAsset);
          // Auto-select the first 2 signals for immediate chart plotting
          setSelectedSignals(signalOnAsset.slice(0, 2));
          const deviceNames = await fetchDevicesForAsset(mainAsset.assetId);
          setDeviceName(deviceNames.join(", "));
        } else {
          setMainSignals([]);
          setSelectedSignals([]);
          setDeviceName("Not Assigned");
        }
      } catch (err) {
        console.error("Failed to fetch main asset signals", err);
        setMainSignals([]);
        setDeviceName("Error");
      }
    };
    loadMainSignals();
  }, [mainAsset]);

  // Reset compare signals when compare asset changes
  useEffect(() => {
    setCompareSelectedSignals([]);
  }, [compareAssetId]);

  /* ---------------- Compare asset signals & device ---------------- */
  useEffect(() => {
    const loadCompareSignals = async () => {
      if (!compareAssetId) {
        setCompareSignals([]);
        setCompareDeviceName("Not Assigned");
        return;
      }
      try {
        const mappings = await getSignalOnAsset(compareAssetId);
        setCompareSignals(mappings);
        const deviceNames = await fetchDevicesForAsset(compareAssetId);
        setCompareDeviceName(deviceNames.join(", "));
      } catch (err) {
        console.error("Failed to fetch compare asset signals", err);
        setCompareSignals([]);
        setCompareDeviceName("Error");
      }
    };
    loadCompareSignals();
  }, [compareAssetId]);

  const toggleMainSignalSelection = (signal: IMapping) => {
    setSelectedSignals((prev) => {
      const exists = prev.some((s) => s.signalId === signal.signalId);
      return exists ? prev.filter((s) => s.signalId !== signal.signalId) : [...prev, signal];
    });
  };

  const toggleCompareSignalSelection = (signal: IMapping) => {
    setCompareSelectedSignals((prev) => {
      const exists = prev.some((s) => s.signalId === signal.signalId);
      return exists ? prev.filter((s) => s.signalId !== signal.signalId) : [...prev, signal];
    });
  };

  const fetchDevicesForAsset = async (assetId: string): Promise<string[]> => {
    try {
      const mappings = await getMappingById(assetId);
      const uniqueDeviceIds = Array.from(new Set(mappings.map((m) => m.deviceId).filter(Boolean)));
      const deviceNames = await Promise.all(
        uniqueDeviceIds.map(async (deviceId) => {
          try {
            const device = await getDeviceById(deviceId);
            return device?.name ?? device?.data?.name ?? "Not Assigned";
          } catch {
            return "Unknown Device";
          }
        })
      );
      return deviceNames;
    } catch (err) {
      console.error(`Failed to fetch devices for asset ${assetId}`, err);
      return ["Error"];
    }
  };

  /* ---------------- Fetch Telemetry Data ---------------- */
  useEffect(() => {
    const fetchTelemetryData = async () => {
      if (selectedSignals.length === 0 && compareSelectedSignals.length === 0) {
        setFullTelemetryData([]);
        setDisplayedTelemetryData([]);
        return;
      }
      if (!mainAsset && !compareAssetId) {
        setFullTelemetryData([]);
        setDisplayedTelemetryData([]);
        return;
      }
      setFetchingData(true);
      try {
        let apiTimeRange: TimeRange;
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (timeRange === "24h") {
          apiTimeRange = TimeRange.Last24Hours;
        } else if (timeRange === "7d") {
          apiTimeRange = TimeRange.Last7Days;
        } else if (timeRange === "today") {
          apiTimeRange = TimeRange.Custom;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate = today.toISOString();
          endDate = new Date().toISOString();
        } else if (timeRange === "custom") {
          apiTimeRange = TimeRange.Custom;
          startDate = customStart?.toISOString();
          endDate = customEnd?.toISOString();
        } else {
          apiTimeRange = TimeRange.Last24Hours;
        }

        const allSignals = [...selectedSignals, ...compareSelectedSignals];
        const dataPromises = allSignals.map(async (signal) => {
          try {
            const response = await getTelemetryData({
              assetId: signal.assetId,
              signalId: signal.signalId,
              signalName: signal.signalName,
              unit: signal.unit,
              timeRange: apiTimeRange,
              startDate,
              endDate,
            });
            const assetName =
              (signal.assetId === mainAsset?.assetId
                ? mainAsset.name
                : allAssets.find((a) => a.assetId === signal.assetId)?.name) ||
              mainAsset?.name ||
              "Asset";
            return {
              ...response,
              signalKey: `${signal.assetId}-${signal.signalName}`,
              signalName: signal.signalName,
              assetName,
            };
          } catch (error) {
            console.error(`Failed to fetch data for signal ${signal.signalName}:`, error);
            return null;
          }
        });

        const results = await Promise.all(dataPromises);
        const validResults = results.filter((r) => r !== null);

        if (validResults.length > 0) {
          const timeMap = new Map<number, any>();
          validResults.forEach((result: any) => {
            (result.values || []).forEach((point: any) => {
              // Normalize timestamps to 1-minute grid so multiple signals align on the X-axis
              const rawTime = new Date(point.time).getTime();
              const timeKey = Math.round(rawTime / 60000) * 60000;
              if (!timeMap.has(timeKey)) {
                timeMap.set(timeKey, { time: timeKey });
              }
              const dataPoint = timeMap.get(timeKey);
              const key = `${result.assetName}-${result.signalName}`;
              const val = typeof point.value === "number" ? point.value : parseFloat(point.value);
              dataPoint[key] = isNaN(val) ? 0 : val;
              if (mainAsset) {
                dataPoint[`${mainAsset.name}-${result.signalName}`] = isNaN(val) ? 0 : val;
              }
              dataPoint[result.signalName] = isNaN(val) ? 0 : val;
            });
          });
          const chartData = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
          setFullTelemetryData(chartData);
          setDisplayedTelemetryData(chartData);
        } else {
          setFullTelemetryData([]);
          setDisplayedTelemetryData([]);
        }
      } catch (error) {
        console.error("Failed to fetch telemetry data:", error);
        setFullTelemetryData([]);
        setDisplayedTelemetryData([]);
      } finally {
        setFetchingData(false);
      }
    };
    fetchTelemetryData();
  }, [mainAsset, compareAssetId, timeRange, customStart, customEnd, allAssets, selectedSignals, compareSelectedSignals]);

  /* ---------------- Chart Keys ---------------- */
  const mainKeys = useMemo(() => {
    if (!mainAsset) return [];
    return selectedSignals.map((s) => `${mainAsset.name}-${s.signalName}`);
  }, [mainAsset, selectedSignals]);

  const compareKeys = useMemo(() => {
    if (!compareAssetId) return [];
    const assetObj = allAssets.find((a) => a.assetId === compareAssetId);
    if (!assetObj) return [];
    return compareSelectedSignals.map((s) => `${assetObj.name}-${s.signalName}`);
  }, [compareAssetId, compareSelectedSignals, allAssets]);

  const allKeys = useMemo(() => [...mainKeys, ...compareKeys], [mainKeys, compareKeys]);

  /* ---------------- Reference Point Functions ---------------- */
  const handleChartClick = (e: any) => {
    if (!isSelectingReference || !e || !e.activeLabel) return;
    const clickedTime = e.activeLabel;
    const dataPoint = displayedTelemetryData.find((d) => d.time === clickedTime);
    if (dataPoint) {
      const values: { [key: string]: number } = {};
      allKeys.forEach((key) => {
        if (dataPoint[key] != null) {
          values[key] = dataPoint[key];
        }
      });
      setReferencePoint({ time: clickedTime, values });
      setIsSelectingReference(false);
    }
  };

  const clearReferencePoint = () => {
    setReferencePoint(null);
    setIsSelectingReference(false);
  };

  const startSelectingReference = () => {
    setIsSelectingReference(true);
  };

  /* ---------------- Zoom Functionality ---------------- */
  const zoom = async () => {
    if (isSelectingReference) return;
    let left = refAreaLeft;
    let right = refAreaRight;
    if (left === undefined || right === undefined || left === right) {
      setRefAreaLeft(undefined);
      setRefAreaRight(undefined);
      return;
    }
    if (left > right) [left, right] = [right, left];
    const filtered = fullTelemetryData.filter((d) => d.time >= left! && d.time <= right!);
    if (filtered.length >= 2) {
      setDisplayedTelemetryData(filtered);
    }
    setRefAreaLeft(undefined);
    setRefAreaRight(undefined);
  };

  const zoomOut = () => {
    setDisplayedTelemetryData(fullTelemetryData);
    setRefAreaLeft(undefined);
    setRefAreaRight(undefined);
  };

  /* ---------------- Custom Tooltip ---------------- */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-slate-100 shadow-2xl backdrop-blur-md min-w-[220px]">
        <p className="font-mono text-xs text-slate-400 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
          <span>{format(new Date(label), "MMM dd, yyyy")}</span>
          <span className="text-emerald-400 font-bold">{format(new Date(label), "HH:mm:ss")}</span>
        </p>

        {payload.map((entry: any, index: number) => {
          const currentValue = entry.value;
          const signalName = entry.name;

          let refValue = null;
          let difference = null;
          let percentChange = null;

          if (referencePoint && referencePoint.values) {
            refValue = referencePoint.values[signalName];
            if (refValue != null && currentValue != null) {
              difference = currentValue - refValue;
              percentChange = ((difference / refValue) * 100).toFixed(2);
            }
          }

          return (
            <div key={index} className="mb-2 pb-1.5 border-b border-slate-800/80 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-semibold text-xs text-slate-200 truncate">{signalName}</span>
              </div>

              <div className="ml-4 mt-1 text-xs space-y-0.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400">Value:</span>
                  <span className="font-bold text-white">{currentValue?.toFixed(2)}</span>
                </div>

                {refValue != null && (
                  <>
                    <div className="flex justify-between font-mono text-[11px] text-slate-400">
                      <span>Ref Point:</span>
                      <span>{refValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Delta:</span>
                      <span
                        className={`font-bold ${
                          difference > 0 ? "text-rose-400" : difference < 0 ? "text-cyan-400" : "text-slate-300"
                        }`}
                      >
                        {difference > 0 ? "+" : ""}
                        {difference?.toFixed(2)} ({difference > 0 ? "+" : ""}
                        {percentChange}%)
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------------- Single Date Picker ---------------- */
  const today = new Date();
  function SingleDatePicker({
    value,
    onChange,
    placeholder,
    disabled = (date: Date) => date > today,
  }: {
    value: Date | null;
    onChange: (d: Date | null) => void;
    placeholder?: string;
    disabled?: (date: Date) => boolean;
  }) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-200 text-xs">
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-emerald-400" />
            {value ? format(value, "PP") : placeholder ?? "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800">
          <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} initialFocus />
        </PopoverContent>
      </Popover>
    );
  }

  const [simulatedSpike, setSimulatedSpike] = useState<"none" | "spike_up" | "spike_down">("none");

  /* ---------------- Dynamic Spike Simulation for Demos ---------------- */
  const effectiveData = useMemo(() => {
    if (simulatedSpike === "none") return displayedTelemetryData;
    const len = displayedTelemetryData.length;
    if (len === 0) return displayedTelemetryData;
    return displayedTelemetryData.map((d, idx) => {
      if (idx < len - 7) return d;
      // In the last 7 points, inject an acute disturbance spike
      const multiplier = simulatedSpike === "spike_up" ? 1.55 : 0.42;
      const modified: any = { ...d };
      allKeys.forEach((k) => {
        if (typeof modified[k] === "number") {
          modified[k] = Number((modified[k] * multiplier).toFixed(2));
        }
      });
      return modified;
    });
  }, [displayedTelemetryData, simulatedSpike, allKeys]);

  /* ---------------- Computed Stats Strip for Top ---------------- */
  const activeStats = useMemo(() => {
    if (!effectiveData.length || !allKeys.length) return [];
    return allKeys.map((key) => {
      const values = effectiveData
        .map((d) => d[key])
        .filter((v) => v !== undefined && v !== null && !isNaN(v));
      if (!values.length) return null;
      const current = values[values.length - 1];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        key,
        current,
        min,
        max,
        avg,
        color: signalColors[key] ?? colorForString(key),
      };
    }).filter(Boolean);
  }, [effectiveData, allKeys, signalColors]);

  return (
    <div className="w-full space-y-4 p-2 sm:p-4 text-foreground">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            Mill Signal Telemetry & Cross-Correlation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            High-Frequency Time-Series Analysis • Fiberline, Chemical Recovery & PM #1
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Demo Spike Simulator Chips */}
          <div className="flex items-center gap-1 p-1 bg-amber-500/10 rounded-xl border border-amber-500/30">
            <span className="text-[11px] font-bold text-amber-500 px-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Demo Spike:
            </span>
            <button
              onClick={() => {
                setSimulatedSpike("none");
                triggerAlert({
                  title: `✅ Telemetry Normalized: ${mainAsset?.assetName || "PM-01"}`,
                  asset: mainAsset?.assetName || "PM-01-PAPER-MACHINE",
                  signal: selectedSignals[0]?.signalName || "Operating Signal",
                  status: "NORMAL",
                  value: 100,
                  unit: selectedSignals[0]?.unit || "%",
                  message: `Disturbance cleared. Telemetry returned to nominal steady state.`,
                });
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                simulatedSpike === "none"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Steady
            </button>
            <button
              onClick={() => {
                setSimulatedSpike("spike_up");
                const activeSignal = selectedSignals[0]?.signalName || "Draw / Vibration";
                triggerAlert({
                  title: `🚨 HIGH EXCURSION ALARM: ${activeSignal} Exceeded Max Threshold`,
                  asset: mainAsset?.assetName || "PM-01-PAPER-MACHINE",
                  signal: activeSignal,
                  status: "HIGH",
                  value: 155,
                  min: 80,
                  max: 120,
                  unit: selectedSignals[0]?.unit || "%",
                  percent: 55.0,
                  message: `Critical high threshold breach: +55% surge detected! Vibration/Draw instability warning.`,
                });
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                simulatedSpike === "spike_up"
                  ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-400"
                  : "text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              ⚡ +55% Spike
            </button>
            <button
              onClick={() => {
                setSimulatedSpike("spike_down");
                const activeSignal = selectedSignals[0]?.signalName || "Couch Roll Vacuum";
                triggerAlert({
                  title: `⚠️ LOW DEFICIT ALARM: ${activeSignal} Dropped Below Min Threshold`,
                  asset: mainAsset?.assetName || "PM-01-PAPER-MACHINE",
                  signal: activeSignal,
                  status: "LOW",
                  value: 42,
                  min: 80,
                  max: 120,
                  unit: selectedSignals[0]?.unit || "%",
                  percent: -58.0,
                  message: `Critical low threshold breach: -58% drop detected! Sheet flutter / suction collapse warning.`,
                });
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                simulatedSpike === "spike_down"
                  ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-400"
                  : "text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              ⚡ -58% Drop
            </button>
          </div>

          {/* Time-Range Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/80">
            {[
              { id: "today", label: "Today" },
              { id: "24h", label: "24 Hours" },
              { id: "7d", label: "7 Days" },
              { id: "custom", label: "Custom" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setTimeRange(chip.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeRange === chip.id
                    ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Spike Alert Warning */}
      {simulatedSpike !== "none" && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center justify-between text-xs text-rose-500 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-bold">
              LIVE DEMO DISTURBANCE ACTIVE: {simulatedSpike === "spike_up" ? "+55% Process Excursion" : "-58% Vacuum/Pressure Drop"} Injected!
            </span>
            <span className="text-muted-foreground hidden sm:inline">
              • Observe instant threshold violation and slope deviation on the chart
            </span>
          </div>
          <button
            onClick={() => setSimulatedSpike("none")}
            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 shrink-0 text-xs"
          >
            Reset Steady-State
          </button>
        </div>
      )}

      {/* Custom Date Pickers Drawer */}
      {timeRange === "custom" && (
        <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Range Bounds:</span>
          <SingleDatePicker value={customStart} onChange={setCustomStart} placeholder="Start Date" />
          <span className="text-xs text-muted-foreground">to</span>
          <SingleDatePicker value={customEnd} onChange={setCustomEnd} placeholder="End Date" />
        </div>
      )}

      {/* Asset & Signal Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Asset Setup */}
        <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-foreground">Primary Equipment Asset</span>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              {deviceName || "OT Connected"}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Select Equipment</label>
            <select
              value={mainAsset?.assetId ?? ""}
              onChange={(e) => setMainAsset(allAssets.find((a) => a.assetId === e.target.value) ?? null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Choose Equipment --</option>
              {allAssets.map((a) => (
                <option key={a.assetId} value={a.assetId}>
                  {a.name} (Level {a.level})
                </option>
              ))}
            </select>
          </div>

          {/* Signal Dropdown Selector */}
          <div ref={mainSignalDropdownRef} className="relative space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex justify-between">
              <span>Signals to Plot ({selectedSignals.length} active)</span>
              {mainSignals.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSignals(
                      selectedSignals.length === mainSignals.length ? [] : [...mainSignals]
                    )
                  }
                  className="text-xs text-emerald-500 hover:underline"
                >
                  {selectedSignals.length === mainSignals.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </label>

            <Button
              variant="outline"
              className="w-full justify-between text-xs font-semibold h-10 border-border"
              onClick={() => setMainSignalDropdownOpen((o) => !o)}
              disabled={!mainSignals.length}
            >
              <span>
                {selectedSignals.length === 0
                  ? "Select signals to visualize"
                  : `${selectedSignals.length} signal(s) monitored`}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>

            {mainSignalDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl p-1.5 space-y-1">
                {mainSignals.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground text-center">No signals mapped to this asset</p>
                ) : (
                  mainSignals.map((signal) => {
                    const isSelected = selectedSignals.some((s) => s.signalId === signal.signalId);
                    return (
                      <div
                        key={signal.signalId}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition ${
                          isSelected ? "bg-emerald-500/15 text-emerald-400" : "hover:bg-muted text-foreground"
                        }`}
                        onClick={() => toggleMainSignalSelection(signal)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{signal.signalName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{signal.unit}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Secondary / Compare Asset Setup */}
        <div className="rounded-2xl bg-card border border-border/80 p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-sm font-bold text-foreground">Cross-Correlation Asset</span>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
              {compareAssetId ? compareDeviceName || "OT Connected" : "Optional Benchmark"}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Compare With Second Machine</label>
            <select
              value={compareAssetId}
              onChange={(e) => setCompareAssetId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">-- None (Single Machine View) --</option>
              {allAssets
                .filter((a) => a.assetId !== mainAsset?.assetId)
                .map((a) => (
                  <option key={a.assetId} value={a.assetId}>
                    {a.name} (Level {a.level})
                  </option>
                ))}
            </select>
          </div>

          {compareAssetId && (
            <div ref={compareSignalDropdownRef} className="relative space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Compare Signals</label>
              <Button
                variant="outline"
                className="w-full justify-between text-xs font-semibold h-10 border-border"
                onClick={() => setCompareSignalDropdownOpen((o) => !o)}
                disabled={!compareSignals.length}
              >
                <span>
                  {compareSelectedSignals.length === 0
                    ? "Select comparison signals"
                    : `${compareSelectedSignals.length} signal(s) selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>

              {compareSignalDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl p-1.5 space-y-1">
                  {compareSignals.map((signal) => {
                    const isSelected = compareSelectedSignals.some((s) => s.signalId === signal.signalId);
                    return (
                      <div
                        key={signal.signalId}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition ${
                          isSelected ? "bg-cyan-500/15 text-cyan-400" : "hover:bg-muted text-foreground"
                        }`}
                        onClick={() => toggleCompareSignalSelection(signal)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected
                                ? "bg-cyan-500 border-cyan-500 text-slate-950 font-bold"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{signal.signalName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{signal.unit}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Value Telemetry Strip */}
      {activeStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {activeStats.map((st: any) => (
            <div
              key={st.key}
              className="rounded-xl border border-border/80 bg-card p-3 shadow-sm space-y-1 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: st.color }}
              />
              <p className="text-[11px] font-semibold text-muted-foreground truncate" title={st.key}>
                {st.key.split("-")[1] || st.key}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono tracking-tight text-foreground">
                  {st.current?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Min: {st.min?.toFixed(1)}</span>
                <span>Max: {st.max?.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Graph Card */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Telemetry Trend & Cross-Section</h3>
              <p className="text-xs text-muted-foreground">
                {displayedTelemetryData.length} data points synchronized • Click and drag to zoom into time windows
              </p>
            </div>
          </div>

          {/* Chart Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={zoomOut}
              size="sm"
              variant="outline"
              className="text-xs h-8 gap-1.5 border-border"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              Reset Zoom
            </Button>
            <Button
              onClick={startSelectingReference}
              disabled={isSelectingReference}
              size="sm"
              variant={isSelectingReference ? "default" : "outline"}
              className={`text-xs h-8 gap-1.5 ${
                isSelectingReference ? "bg-amber-600 text-white" : "border-border"
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              {isSelectingReference ? "Click point on graph..." : "Pin Reference Point"}
            </Button>
            {referencePoint && (
              <Button
                onClick={clearReferencePoint}
                size="sm"
                variant="destructive"
                className="text-xs h-8 gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Clear Ref
              </Button>
            )}
          </div>
        </div>

        {fetchingData ? (
          <div className="flex flex-col justify-center items-center h-96 gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Synchronizing mill telemetry...</p>
          </div>
        ) : fullTelemetryData.length === 0 ? (
          <div className="flex flex-col h-96 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-bold text-foreground">No signals selected</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Please choose an equipment asset and check at least one signal in the selector above to begin visualization.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <LineChart
              data={effectiveData}
              onClick={handleChartClick}
              onMouseDown={(e) => !isSelectingReference && e && setRefAreaLeft(e.activeLabel as number)}
              onMouseMove={(e) => !isSelectingReference && refAreaLeft && e && setRefAreaRight(e.activeLabel as number)}
              onMouseUp={() => !isSelectingReference && zoom()}
              style={{ cursor: isSelectingReference ? "crosshair" : "default" }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="time"
                tickFormatter={(tick) => format(new Date(tick), "MMM dd HH:mm")}
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />

              {referencePoint && (
                <ReferenceLine
                  x={referencePoint.time}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{ value: "Reference Benchmark", position: "top", fill: "#f43f5e", fontSize: 11 }}
                />
              )}

              {allKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={signalColors[key] ?? colorForString(key)}
                  name={key}
                  connectNulls={true}
                  isAnimationActive={false}
                  dot={{ r: 2.5 }}
                  strokeWidth={2.2}
                  activeDot={{ r: 6 }}
                />
              ))}

              {!isSelectingReference && refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#10b981" />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}