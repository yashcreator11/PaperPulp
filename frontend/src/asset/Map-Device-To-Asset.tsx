// src/pages/MapDeviceToAsset.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Pencil, X } from "lucide-react";
import apiAsset from "@/api/axiosAsset";
import { getUnmappedDevices } from "@/api/deviceApi";
import type { UnmappedDevice, UnmappedSlave } from "@/api/deviceApi";
import { createMapping, deleteMapping } from "@/api/assetApi";
import type { CreateMappingPayload } from "@/api/assetApi";
import { toast } from "react-toastify";
import { MOCK_DEVICES, MOCK_MAPPINGS } from "@/data/mockMillData";

// ─────────────────────────── Types ───────────────────────────
interface ExistingMapping {
  signalId: string;
  assetId: string;
  deviceId: string;
  signalName: string;
  signalUnit: string;
  registerId: string | null;
  opcUaNodeId: string | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  createdAt: string;
}

type Params = { assetid?: string };

// ─────────────────────────── Helpers ───────────────────────────
function protocolLabel(p?: number | null) {
  if (p === 1) return "Modbus";
  if (p === 2) return "OPC UA";
  return "Unknown";
}

// ─────────────────────── ThresholdRow ────────────────────────
interface ThresholdRowProps {
  mapping: ExistingMapping;
  deviceName: string;
  onSave: (mappingId: string, min: number, max: number) => Promise<void>;
  onUnlink: (mappingId: string) => void;
}

function ThresholdRow({ mapping, deviceName, onSave, onUnlink }: ThresholdRowProps) {
  const hasThresholds = mapping.minThreshold != null && mapping.maxThreshold != null;
  // Auto-open editor when thresholds are not yet set
  const [editing, setEditing] = useState(!hasThresholds);
  const [min, setMin] = useState(mapping.minThreshold?.toString() ?? "");
  const [max, setMax] = useState(mapping.maxThreshold?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const isValid = min !== "" && max !== "" && Number(min) < Number(max);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(mapping.signalId, Number(min), Number(max));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setMin(mapping.minThreshold?.toString() ?? "");
    setMax(mapping.maxThreshold?.toString() ?? "");
    setEditing(false);
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-sm">{mapping.signalName}</div>
        <div className="text-xs text-muted-foreground">
          {mapping.signalUnit} · {deviceName}
        </div>
      </TableCell>

      <TableCell>
        {editing ? (
          <div className="space-y-1.5">
            <div className="flex gap-1.5 items-center">
              <Input
                type="number"
                placeholder="Min"
                value={min}
                onChange={e => setMin(e.target.value)}
                className="h-7 w-20 text-xs"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={max}
                onChange={e => setMax(e.target.value)}
                className="h-7 w-20 text-xs"
              />
              <span className="text-xs text-muted-foreground">{mapping.signalUnit}</span>
            </div>
            {min !== "" && max !== "" && Number(min) >= Number(max) && (
              <p className="text-xs text-red-500">Min must be less than Max</p>
            )}
          </div>
        ) : hasThresholds ? (
          <div className="text-xs space-y-0.5">
            <div className="text-red-500">↓ {mapping.minThreshold} {mapping.signalUnit}</div>
            <div className="text-green-600">↑ {mapping.maxThreshold} {mapping.signalUnit}</div>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">
            No range set
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                disabled={!isValid || saving}
                onClick={handleSave}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              {hasThresholds && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => onUnlink(mapping.signalId)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────── Component ───────────────────────────
export default function MapDeviceToAsset() {
  const { assetid } = useParams<Params>();
  const navigate    = useNavigate();

  const [loading, setLoading]                   = useState(false);
  const [devices, setDevices]                   = useState<UnmappedDevice[]>([]);
  const [existingMappings, setExistingMappings] = useState<ExistingMapping[]>([]);
  const [mappingLoading, setMappingLoading]     = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [pendingUnlink, setPendingUnlink]       = useState("");

  useEffect(() => {
    if (!assetid) return;
    void loadAll();
  }, [assetid]);

  async function loadAll(): Promise<void> {
    setLoading(true);
    try {
      let unmappedData: any[] = [];
      try {
        const unmappedResp = await getUnmappedDevices();
        unmappedData = unmappedResp.data || [];
      } catch {}

      let mappingsData: ExistingMapping[] = [];
      try {
        const mappingsResp = await apiAsset.get<ExistingMapping[]>(`/Mapping`);
        mappingsData = Array.isArray(mappingsResp.data) ? mappingsResp.data : [];
      } catch {
        mappingsData = Object.values(MOCK_MAPPINGS).flat() as any;
      }

      setDevices(unmappedData.length > 0 ? unmappedData : (MOCK_DEVICES as any));
      setExistingMappings(mappingsData.filter((m) => m.assetId === assetid));
    } catch {
      setDevices(MOCK_DEVICES as any);
    } finally {
      setLoading(false);
    }
  }

  // ── Already-mapped IDs ────────────────────────────────────────
  const mappedRegisterIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of existingMappings) if (m.registerId) s.add(m.registerId);
    return s;
  }, [existingMappings]);

  const mappedNodeIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of existingMappings) if (m.opcUaNodeId) s.add(m.opcUaNodeId);
    return s;
  }, [existingMappings]);

  const devicesForRender = useMemo(() =>
    devices.filter((device) => {
      const hasModbus = device.matchedSlaves?.some((slave) =>
        slave.matchedRegisters?.some((r) => !mappedRegisterIds.has(r.registerId))
      ) ?? false;
      const hasOpcUa = device.matchedNodes?.some(
        (n) => !mappedNodeIds.has(n.opcUaNodeId)
      ) ?? false;
      return hasModbus || hasOpcUa;
    }),
  [devices, mappedRegisterIds, mappedNodeIds]);

  const deviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices) map.set(d.deviceId, d.name ?? d.deviceId);
    return map;
  }, [devices]);

  // ── Map immediately (no thresholds required) ──────────────────
  async function handleMapSlave(device: UnmappedDevice, slave: UnmappedSlave) {
    if (!assetid) return;
    const unmapped = slave.matchedRegisters?.filter(
      (r) => !mappedRegisterIds.has(r.registerId)
    ) ?? [];
    if (unmapped.length === 0) return;

    setMappingLoading(true);
    try {
      for (const r of unmapped) {
        const payload: CreateMappingPayload = {
          assetId: assetid,
          deviceId: device.deviceId,
          register: {
            registerId: r.registerId,
            signalName: r.signalName,
            unit: r.signalUnit,
            minThreshold: null,
            maxThreshold: null,
          },
          opcUaNode: null,
        };
        await createMapping(payload);
      }
      toast.success("Device mapped — set alert thresholds in the signals panel");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Mapping failed");
    } finally {
      setMappingLoading(false);
    }
  }

  async function handleMapOpcUa(device: UnmappedDevice) {
    if (!assetid) return;
    const unmapped = (device.matchedNodes ?? []).filter(
      (n) => !mappedNodeIds.has(n.opcUaNodeId)
    );
    if (unmapped.length === 0) return;

    setMappingLoading(true);
    try {
      for (const n of unmapped) {
        const payload: CreateMappingPayload = {
          assetId: assetid,
          deviceId: device.deviceId,
          register: null,
          opcUaNode: {
            opcUaNodeId: n.opcUaNodeId,
            signalName: n.signalName,
            unit: n.signalUnit,
            minThreshold: null,
            maxThreshold: null,
          },
        };
        await createMapping(payload);
      }
      toast.success("Device mapped — set alert thresholds in the signals panel");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Mapping failed");
    } finally {
      setMappingLoading(false);
    }
  }

  // ── Save thresholds for a single signal ───────────────────────
  // Requires new backend endpoint: PATCH /api/Mapping/{mappingId}/thresholds
  async function handleSaveThresholds(
    mappingId: string,
    min: number,
    max: number
  ) {
    await apiAsset.patch(`/Mapping/${mappingId}/thresholds`, {
      minThreshold: min,
      maxThreshold: max,
    });
    toast.success("Thresholds saved");
    await loadAll();
  }

  // ── Unlink ────────────────────────────────────────────────────
  function handleUnlink(mappingId: string) {
    setPendingUnlink(mappingId);
    setShowConfirm(true);
  }

  async function confirmUnlink() {
    setShowConfirm(false);
    setMappingLoading(true);
    try {
      await deleteMapping(pendingUnlink);
      toast.success("Signal unmapped successfully");
      await loadAll();
    } catch {
      toast.error("Failed to unmap signal");
    } finally {
      setMappingLoading(false);
      setPendingUnlink("");
    }
  }

  // ─────────────────────────── Render ───────────────────────────
  return (
    <div className="p-6 lg:p-10 space-y-6 bg-background text-foreground">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Map Device</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map a device to this asset — set alert thresholds per signal afterwards
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Asset Signals ── */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Asset Signals</CardTitle>
              <CardDescription>
                Signals appear here after mapping. Set the alert range for each one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingMappings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-1">
                  <p className="text-sm font-medium">No signals yet</p>
                  <p className="text-xs">Map a device on the right to add signals here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signal</TableHead>
                      <TableHead>Alert range</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingMappings.map((m) => (
                      <ThresholdRow
                        key={m.signalId}
                        mapping={m}
                        deviceName={deviceNameById.get(m.deviceId) ?? "—"}
                        onSave={handleSaveThresholds}
                        onUnlink={handleUnlink}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* ── Right: Available Devices ── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Available Devices</CardTitle>
              <CardDescription>
                Click Map to instantly connect signals to this asset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading && (
                  <p className="text-muted-foreground text-sm py-4">Loading devices…</p>
                )}

                {!loading && devicesForRender.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm font-medium">No unmapped devices available</p>
                    <p className="text-xs mt-1">All devices have been mapped or none are configured yet</p>
                  </div>
                )}

                {devicesForRender.map((device) => (
                  <div
                    key={device.deviceId}
                    className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                  >
                    {/* Device header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
                      <div>
                        <div className="font-semibold text-sm">{device.name}</div>
                        {device.description && (
                          <div className="text-xs text-muted-foreground">{device.description}</div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {protocolLabel(device.protocol)}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-3">

                      {/* Modbus Slaves */}
                      {device.matchedSlaves?.map((slave) => {
                        const available = slave.matchedRegisters?.filter(
                          (r) => !mappedRegisterIds.has(r.registerId)
                        ) ?? [];
                        if (available.length === 0) return null;

                        return (
                          <div
                            key={slave.deviceSlaveId}
                            className="rounded-lg border border-border bg-muted p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Slave #{slave.slaveIndex}</span>
                                <Badge
                                  variant={slave.isHealthy ? "outline" : "destructive"}
                                  className="text-xs"
                                >
                                  {slave.isHealthy ? "Healthy" : "Unhealthy"}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                disabled={mappingLoading}
                                onClick={() => handleMapSlave(device, slave)}
                              >
                                {mappingLoading ? "Mapping…" : "Map"}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {available.map((r) => (
                                <span
                                  key={r.registerId}
                                  className="text-xs px-2 py-0.5 rounded-full bg-background border border-border"
                                >
                                  {r.signalName} · {r.signalUnit}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* OPC UA Nodes */}
                      {(() => {
                        const available = (device.matchedNodes ?? []).filter(
                          (n) => !mappedNodeIds.has(n.opcUaNodeId)
                        );
                        if (available.length === 0) return null;

                        return (
                          <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">OPC UA</span>
                                <span className="text-xs text-muted-foreground">
                                  {available.length} node{available.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                disabled={mappingLoading}
                                onClick={() => handleMapOpcUa(device)}
                              >
                                {mappingLoading ? "Mapping…" : "Map"}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {available.map((n) => (
                                <span
                                  key={n.opcUaNodeId}
                                  className="text-xs px-2 py-0.5 rounded-full bg-background border border-border"
                                >
                                  {n.signalName} · {n.signalUnit}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </motion.div>

      {/* ── Unlink Confirm ── */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmap Signal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the signal from this asset. You can remap it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink}>Unmap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}