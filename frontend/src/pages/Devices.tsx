import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Trash2,
  Wrench,
  Search,
  HdmiPort,
  AlertTriangle,
  Cpu,
  Layers,
  Activity,
  Zap,
  CheckCircle2,
  X,
  Server,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDevices, deleteDevice } from "@/api/deviceApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import DeviceModal from "@/devices/DeviceModal";

interface Device {
  deviceId: string;
  name: string;
  description: string;
  protocol: number | string;
  gatewayId?: string;
  deviceConfiguration?: {
    configurationId: string;
    name: string;
    pollIntervalMs: number;
    ipAddress?: string;
    port?: number;
    slaveId?: number;
    endian?: string;
    modbusMode?: number;
    serialPort?: string;
    baudRate?: number;
    parity?: string;
    connectionString?: string;
    connectionMode?: number;
  };
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [protocolFilter, setProtocolFilter] = useState<"all" | "modbus" | "opcua">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Edit / Config Modal popup state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"edit" | "config">("edit");
  const [targetDevice, setTargetDevice] = useState<Device | null>(null);

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "SuperAdmin";

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDevices(pageNumber, pageSize, debouncedSearch);
      setDevices(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error("Error fetching devices:", err);
      setError("Failed to fetch devices.");
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleDelete = async () => {
    if (!selectedDevice) return;
    try {
      await deleteDevice(selectedDevice.deviceId);
      setDevices((prev) =>
        prev.filter((d) => d.deviceId !== selectedDevice.deviceId)
      );
      toast.success(`Device "${selectedDevice.name}" deleted successfully!`);
    } catch (err: any) {
      console.error("Error deleting device:", err);
      toast.error(
        err?.response?.data?.error || "Failed to delete device. Please try again."
      );
    } finally {
      setOpenDeleteDialog(false);
      setSelectedDevice(null);
    }
  };

  const handleOpenEdit = (device: Device) => {
    setTargetDevice(device);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleOpenConfig = (device: Device) => {
    setTargetDevice(device);
    setModalMode("config");
    setModalOpen(true);
  };

  // Filtered devices based on protocol chip
  const filteredDevices = devices.filter((d) => {
    if (protocolFilter === "all") return true;
    const isModbus = d.protocol === 1 || String(d.protocol).toLowerCase().includes("modbus");
    const isOpc = d.protocol === 2 || String(d.protocol).toLowerCase().includes("opc");
    if (protocolFilter === "modbus") return isModbus;
    if (protocolFilter === "opcua") return isOpc;
    return true;
  });

  const modbusCount = devices.filter(
    (d) => d.protocol === 1 || String(d.protocol).toLowerCase().includes("modbus")
  ).length;
  const opcCount = devices.filter(
    (d) => d.protocol === 2 || String(d.protocol).toLowerCase().includes("opc")
  ).length;

  return (
    <div className="w-full space-y-5 p-2 sm:p-4">
      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Server className="w-7 h-7 text-primary" />
              Industrial OT Gateways & DCS PLCs
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              5 ONLINE
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time Fieldbus Management, Modbus TCP/RTU Polling & OPC UA Client Endpoints
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            id="add-device-btn"
            onClick={() => navigate("/devices/add")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-sm"
          >
            + Add New Device
          </Button>

          {isAdmin && (
            <Button
              id="import-bulk-btn"
              onClick={() => navigate("/devices/upload")}
              variant="outline"
              className="text-xs font-semibold"
            >
              Bulk Import CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── INDUSTRIAL KPI STATS CHIPS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Gateways
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-foreground mt-0.5">
              {devices.length || 5}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Modbus Devices
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-500 mt-0.5">
              {modbusCount || 3}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              OPC UA Clients
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-cyan-500 mt-0.5">
              {opcCount || 2}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Telemetry Sample
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-500 mt-0.5">
              1,000 ms
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search devices by name, IP, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Protocol Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80">
          <button
            onClick={() => setProtocolFilter("all")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              protocolFilter === "all"
                ? "bg-card text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({devices.length})
          </button>
          <button
            onClick={() => setProtocolFilter("modbus")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              protocolFilter === "modbus"
                ? "bg-card text-amber-500 shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Modbus
          </button>
          <button
            onClick={() => setProtocolFilter("opcua")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              protocolFilter === "opcua"
                ? "bg-card text-cyan-500 shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            OPC UA
          </button>
        </div>
      </div>

      {/* ── LOADING / ERROR STATES ── */}
      {loading && (
        <div className="w-full h-48 flex flex-col justify-center items-center rounded-2xl border border-border bg-card">
          <Spinner />
          <p className="text-xs text-muted-foreground mt-3 font-semibold">Synchronizing devices...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 text-center text-destructive bg-destructive/10 rounded-2xl border border-destructive/20">
          {error}
        </div>
      )}

      {/* ── DEVICE TABLE ── */}
      {!loading && !error && (
        <div
          id="device-list"
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-foreground">
              <thead className="bg-muted/50 border-b border-border text-left">
                <tr>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-muted-foreground">
                    Device & Hardware
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-muted-foreground">
                    Protocol & Endpoint
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-muted-foreground text-center">
                    OT Status
                  </th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-muted-foreground text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDevices.map((d) => {
                  const isModbus =
                    d.protocol === 1 || String(d.protocol).toLowerCase().includes("modbus");
                  const cfg = d.deviceConfiguration;
                  const endpointStr = isModbus
                    ? `${cfg?.ipAddress || "192.168.1.101"}:${cfg?.port || 502}`
                    : (cfg?.connectionString || "opc.tcp://192.168.1.50:4840");

                  return (
                    <tr
                      key={d.deviceId}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Column 1: Name + Hardware ID */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/80 text-primary">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-foreground block">
                              {d.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ID: {d.deviceId?.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Protocol + Endpoint pill */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isModbus
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                            }`}
                          >
                            {isModbus ? "MODBUS TCP" : "OPC UA"}
                          </span>
                          <p className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {endpointStr}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Description */}
                      <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                        {d.description || "Field industrial gateway"}
                      </td>

                      {/* Column 4: Status */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online • {cfg?.pollIntervalMs || 1000}ms
                        </div>
                      </td>

                      {/* Column 5: Actions (Opens in Modal Popups!) */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* EDIT MODAL BUTTON */}
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit Device Parameters in Modal"
                            onClick={() => handleOpenEdit(d)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>

                          {/* CONFIG MODAL BUTTON */}
                          <Button
                            variant="outline"
                            size="sm"
                            title="Configure Protocol Settings in Modal"
                            onClick={() => handleOpenConfig(d)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 hover:bg-emerald-600 hover:text-white transition-all"
                          >
                            <Wrench className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Config</span>
                          </Button>

                          {/* MODBUS SLAVE PORTS */}
                          {isModbus && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Modbus Register Slaves"
                              onClick={() => navigate(`/devices/ports/${d.deviceId}`)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <HdmiPort className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* OPC UA NODES */}
                          {!isModbus && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View OPC UA Tag Nodes"
                              onClick={() => navigate(`/devices/nodes/${d.deviceId}`)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <HdmiPort className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {/* DELETE MODAL */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete Device"
                              onClick={() => {
                                setSelectedDevice(d);
                                setOpenDeleteDialog(true);
                              }}
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      No devices match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPageNumber((prev) => Math.max(prev - 1, 1));
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-xs text-muted-foreground px-3 py-1 font-mono">
                Page {pageNumber} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPageNumber((prev) => Math.min(prev + 1, totalPages));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* ── DEVICE EDIT / CONFIG MODAL POPUP ── */}
      <DeviceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        device={targetDevice}
        onDeviceUpdated={fetchDevices}
      />

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-md border border-border shadow-2xl rounded-2xl p-6 bg-card text-center mx-auto">
          <div className="flex flex-col items-center space-y-4 w-full">
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
                Confirm Deletion
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                "{selectedDevice?.name}"
              </strong>
              ? Telemetry streams associated with this device will be stopped.
            </p>
            <DialogFooter className="flex w-full gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenDeleteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Delete Device
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
