import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  Calendar as CalendarIcon,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  BarChart3,
  Zap,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  getAssetHierarchy,
  getSignalOnAsset,
  getRequestedReports,
  requestAssetReport,
  downloadAssetReport,
} from "@/api/assetApi";
import { getDeviceById } from "@/api/deviceApi";
import type { IMapping } from "@/api/assetApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawAsset {
  assetId: string;
  name: string;
  level?: number;
  parentId: string | null;
  isDeleted?: boolean;
  childrens?: RawAsset[];
  children?: RawAsset[];
}

interface FlatAsset extends RawAsset {
  depth: number;          // visual indent level (0 = root)
  displayLevel: number;   // the API's level field (1-based), falls back to depth+1
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively flattens the asset hierarchy.
 * Handles both `childrens` (API typo) and `children`, guards nulls,
 * and derives a safe `displayLevel` even when the API omits `level`.
 */
const flatten = (nodes: RawAsset[], depth = 0): FlatAsset[] => {
  const out: FlatAsset[] = [];
  for (const node of nodes ?? []) {
    const kids: RawAsset[] = Array.isArray(node.childrens)
      ? node.childrens
      : Array.isArray(node.children)
      ? node.children
      : [];

    out.push({
      ...node,
      depth,
      displayLevel: node.level ?? depth + 1,
    });

    if (kids.length > 0) {
      out.push(...flatten(kids, depth + 1));
    }
  }
  return out;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allAssets, setAllAssets] = useState<FlatAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [allSignalsOnAsset, setSignalOnAsset] = useState<IMapping[]>([]);
  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>([]);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [signalDropdownOpen, setSignalDropdownOpen] = useState(false);
  const [assignedDeviceName, setAssignedDeviceName] = useState("None");
  const [reportFormat, setReportFormat] = useState("excel");
  const [requestedReports, setRequestedReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const signalDropdownRef = useRef<HTMLDivElement>(null);

  // ── Load assets on mount ──────────────────────────────────────────────────

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const hierarchy: RawAsset[] = await getAssetHierarchy();
        const flat = flatten(hierarchy ?? []);
        setAllAssets(flat);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load assets");
      }
    };
    loadAssets();
    fetchRequestedReports();
  }, []);

  // ── Close dropdowns on outside click ─────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssetDropdownOpen(false);
      }
      if (signalDropdownRef.current && !signalDropdownRef.current.contains(e.target as Node)) {
        setSignalDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── API calls ─────────────────────────────────────────────────────────────

  const getSignalsOnAsset = async (assetId: string) => {
    try {
      const response = await getSignalOnAsset(assetId);
      setSignalOnAsset(response ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load signals");
    }
  };

  const resolveAssignedDevice = async (assetId: string) => {
    try {
      const mappings = await getSignalOnAsset(assetId);
      if (!mappings?.length) { setAssignedDeviceName("None"); return; }
      const device = await getDeviceById(mappings[0].deviceId);
      setAssignedDeviceName(device?.name ?? "None");
    } catch (err) {
      console.error("Failed to resolve device", err);
      setAssignedDeviceName("None");
    }
  };

  const fetchRequestedReports = async () => {
    setIsLoadingReports(true);
    try {
      const data = await getRequestedReports();
      setRequestedReports(data ?? []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load report history");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const requestReport = async () => {
    if (!selectedAssetId) { toast.error("Please select an asset"); return; }
    if (!selectedSignalIds.length) { toast.error("Please select at least one signal"); return; }
    if (!startDate || !endDate) { toast.error("Please select both start and end dates"); return; }

    // Parse as local midnight / end-of-day to avoid UTC offset shifting the range
    const start = new Date(`${startDate}T00:00:00`);
    const end   = new Date(`${endDate}T23:59:59`);
    if (end < start) { toast.error("End date cannot be earlier than start date"); return; }
    if ((end.getTime() - start.getTime()) / 86_400_000 > 31) {
      toast.error("Date range cannot exceed 31 days"); return;
    }

    setIsRequesting(true);
    try {
      await requestAssetReport({
        assetID: selectedAssetId,
        signalIDs: selectedSignalIds,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        reportFormat,
      });
      toast.success("Report requested! Processing...");
      setTimeout(fetchRequestedReports, 2000);
    } catch (err: any) {
      console.error(err);
      const msg: string = err?.message || err?.response?.data?.error || "";
      if (msg.toLowerCase().includes("no data available")) {
        toast.error(
          "No data found for the selected signals and date range. Try a different date range or check that the device was active during this period.",
          { autoClose: 6000 }
        );
      } else {
        toast.error(msg || "Failed to request report");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const downloadReport = async (reportId: string, fileName: string) => {
    try {
      const blob = await downloadAssetReport(reportId);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success("Report downloaded!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download report");
    }
  };

  // ── Formatters ────────────────────────────────────────────────────────────

  const formatToIST = (utcDate: string) =>
    new Date(utcDate + "Z").toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  // ── Selection helpers ─────────────────────────────────────────────────────

  const toggleSignalSelection = (signalId: string) =>
    setSelectedSignalIds((prev) =>
      prev.includes(signalId) ? prev.filter((id) => id !== signalId) : [...prev, signalId]
    );

  const clearAssetSelection = () => {
    setSelectedAssetId("");
    setSelectedSignalIds([]);
    setSignalOnAsset([]);
    setAssignedDeviceName("None");
    setAssetDropdownOpen(false);
  };

  const handleAssetSelect = (asset: FlatAsset) => {
    setSelectedAssetId(asset.assetId);
    getSignalsOnAsset(asset.assetId);
    resolveAssignedDevice(asset.assetId);
    setAssetDropdownOpen(false);
    setSelectedSignalIds([]);
  };

  // ── Status badge config ───────────────────────────────────────────────────

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Completed":
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          cls: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
        };
      case "Processing":
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          cls: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
        };
      case "Pending":
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          cls: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
        };
      case "Failed":
        return {
          icon: <XCircle className="w-3.5 h-3.5" />,
          cls: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
        };
      default:
        return { icon: null, cls: "bg-gray-50 text-gray-700 border border-gray-200" };
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedAssetName = allAssets.find((a) => a.assetId === selectedAssetId)?.name;
  const completedCount = requestedReports.filter((r) => r.status === "Completed").length;
  const pendingCount = requestedReports.filter(
    (r) => r.status === "Pending" || r.status === "Processing"
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Generator</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate and download signal reports</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {completedCount} Completed
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {pendingCount} Pending
              </span>
            </div>
          </div>
        </div>

        {/* GENERATE REPORT CARD */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-visible">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Generate New Report</h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* START DATE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Start Date
                </label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-sm text-left transition-colors">
                      <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className={startDate ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                        {startDate ? format(new Date(startDate), "dd MMM yyyy") : "Choose start date"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-0 w-auto">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setStartDate(format(d, "yyyy-MM-dd"));
                        setEndDate("");
                        setStartDateOpen(false);
                      }}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* END DATE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  End Date
                </label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-sm text-left transition-colors">
                      <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className={endDate ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                        {endDate ? format(new Date(endDate), "dd MMM yyyy") : "Choose end date"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-0 w-auto">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(d) => {
                        if (!d) return;
                        setEndDate(format(d, "yyyy-MM-dd"));
                        setEndDateOpen(false);
                      }}
                      disabled={(d) =>
                        d > new Date() ||
                        (startDate ? d < new Date(startDate) : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* REPORT FORMAT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Report Format
                </label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excel">Excel / CSV</option>
                </select>
              </div>

              {/* ASSET DROPDOWN */}
              <div ref={dropdownRef} className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Asset <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={() => setAssetDropdownOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-sm text-left transition-colors"
                >
                  <span className={selectedAssetName ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                    {selectedAssetName ?? "Select asset"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${assetDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {assetDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                    {/* Clear option */}
                    <div
                      className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-400 border-b border-gray-100 dark:border-gray-700"
                      onClick={clearAssetSelection}
                    >
                      — None
                    </div>

                    {allAssets.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400">No assets found</p>
                    ) : (
                      allAssets.map((a) => (
                        <div
                          key={a.assetId}
                          style={{ paddingLeft: `${12 + a.depth * 16}px` }}
                          className={`py-2 pr-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm transition-colors flex items-center gap-1.5 ${
                            selectedAssetId === a.assetId
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                          onClick={() => handleAssetSelect(a)}
                        >
                          {/* Tree connector */}
                          {a.depth > 0 && (
                            <span className="text-gray-300 dark:text-gray-600 text-xs shrink-0 select-none">
                              └
                            </span>
                          )}
                          <span className="flex-1 truncate">{a.name}</span>
                          {/* Show level from API; fallback to depth+1 */}
                          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                            L{a.displayLevel}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SIGNALS MULTI-SELECT */}
              <div ref={signalDropdownRef} className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Signals <span className="text-red-400">*</span>
                  {selectedSignalIds.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                      {selectedSignalIds.length}
                    </span>
                  )}
                </label>
                <button
                  onClick={() => setSignalDropdownOpen((v) => !v)}
                  disabled={!selectedAssetId}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className={selectedSignalIds.length > 0 ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                    {selectedSignalIds.length === 0
                      ? "Select signals"
                      : `${selectedSignalIds.length} signal(s) selected`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${signalDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {signalDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {allSignalsOnAsset.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400">No signals available</p>
                    ) : (
                      allSignalsOnAsset.map((s) => (
                        <div
                          key={s.signalId}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                          onClick={() => toggleSignalSelection(s.signalId)}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              selectedSignalIds.includes(s.signalId)
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {selectedSignalIds.includes(s.signalId) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                <path
                                  d="M2 6L5 9L10 3"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {s.signalName}
                            </span>
                            {s.unit && (
                              <span className="ml-1.5 text-xs text-gray-400">({s.unit})</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* ASSIGNED DEVICE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Assigned Device
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      assignedDeviceName !== "None" ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{assignedDeviceName}</span>
                </div>
              </div>
            </div>

            {/* GENERATE BUTTON */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={requestReport}
                disabled={isRequesting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {isRequesting ? "Requesting..." : "Request Report"}
              </button>
            </div>
          </div>
        </div>

        {/* REQUESTED REPORTS TABLE */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-visible">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Requested Reports</h2>
              {requestedReports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                  {requestedReports.length}
                </span>
              )}
            </div>
            <button
              onClick={fetchRequestedReports}
              disabled={isLoadingReports}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {isLoadingReports ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading reports...</span>
            </div>
          ) : requestedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No reports yet. Generate your first report above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["File Name", "Asset", "Requested At", "Status", "Action"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${
                          i > 0 ? "hidden md:table-cell" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {requestedReports.map((report) => {
                    const { icon, cls } = getStatusConfig(report.status);
                    return (
                      <tr
                        key={report.reportId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        {/* File name + mobile status/download */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {report.fileName}
                              </p>
                              <div className="md:hidden mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                                  {icon} {report.status}
                                </span>
                              </div>
                            </div>
                            {report.status === "Completed" && (
                              <button
                                onClick={() => downloadReport(report.reportId, report.fileName)}
                                className="md:hidden ml-auto p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {report.assetName}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatToIST(report.requestedAt)}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
                            {icon} {report.status}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          {report.status === "Completed" ? (
                            <button
                              onClick={() => downloadReport(report.reportId, report.fileName)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Processing...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
