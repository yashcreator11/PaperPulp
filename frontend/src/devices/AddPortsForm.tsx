import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "@/api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Save,
  X,
  Edit2,
  Trash2,
  Database,
  Loader,
  Settings2,
  Cable,
} from "lucide-react";
import { toast } from "react-toastify";
import apiAsset from "@/api/axiosAsset";

export type RegisterPayload = {
  registerId?: string;
  registerAddress: number;
  registerLength: number;
  dataType: string;
  scale: number;
  unit?: string | null;
  isHealthy: boolean;
  byteOrder?: "Big" | "Little" | null;
  wordSwap?: boolean;
  registerType?: "coil" | "discrete" | "input" | "holding";
  signalBase?: number;
  signalName?: string;
};

export type SlaveData = {
  deviceSlaveId?: string;
  slaveIndex: number;
  registers: RegisterPayload[];
  isHealthy: boolean;
};

// All known signal suggestions with their default units
const SIGNAL_SUGGESTIONS = [
  { id: 1, name: "Voltage", unit: "V" },
  { id: 3, name: "Current", unit: "A" },
  { id: 5, name: "Temperature", unit: "°C" },
  { id: 7, name: "Frequency", unit: "Hz" },
  { id: 9, name: "Vibration", unit: "mm/s" },
  { id: 11, name: "FlowRate", unit: "L/min" },
  { id: 13, name: "RPM", unit: "rpm" },
  { id: 15, name: "Torque", unit: "N·m" },
];

const UNIT_PRESETS = [
  { label: "V — Volts", value: "V" },
  { label: "A — Amperes", value: "A" },
  { label: "°C — Celsius", value: "°C" },
  { label: "Hz — Hertz", value: "Hz" },
  { label: "mm/s — Vibration", value: "mm/s" },
  { label: "L/min — FlowRate", value: "L/min" },
  { label: "rpm — RPM", value: "rpm" },
  { label: "N·m — Torque", value: "N·m" },
  { label: "kPa", value: "kPa" },
  { label: "bar", value: "bar" },
];

const defaultRegister: RegisterPayload = {
  registerAddress: 40001,
  registerLength: 2,
  dataType: "float32",
  scale: 0.01,
  unit: "",
  isHealthy: true,
  byteOrder: "Little",
  wordSwap: false,
  registerType: "holding",
  signalBase: 1,
  signalName: "",
};

interface ExistingMapping {
  signalId: string;
  assetId: string;
  signalTypeId: string;
  deviceId: string;
  devicePortId: string;
  signalUnit: string;
  signalName: string;
  registerAdress: number;
  createdAt: string;
  registerId: string;
}

export default function ModbusPortManager() {
  const [slaves, setSlaves] = useState<SlaveData[]>([]);
  const [selectedSlaveIndex, setSelectedSlaveIndex] = useState<number | null>(
    null,
  );
  const [editingRegisterIdx, setEditingRegisterIdx] = useState<number | null>(
    null,
  );
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterPayload>({
    ...defaultRegister,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [signals, setSignals] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const params = useParams<{ id?: string }>();
  const [existingMappings, setExistingMappings] = useState<string[]>([]);
  const [showNewSlaveModal, setShowNewSlaveModal] = useState(false);
  const [newSlaveIndexInput, setNewSlaveIndexInput] = useState<string>("1");
  const [newSlaveIndexError, setNewSlaveIndexError] = useState<string>("");

  const deviceId = params.id;

  const selectedSlave =
    slaves.find((p) => p.slaveIndex === selectedSlaveIndex) ?? null;

  const typeDigit = (t?: RegisterPayload["registerType"]) => {
    switch (t) {
      case "coil":
        return 0;
      case "discrete":
        return 1;
      case "input":
        return 3;
      case "holding":
      default:
        return 4;
    }
  };

  const buildDisplayAddress = (
    t: RegisterPayload["registerType"],
    base: number,
  ) => {
    const leading = typeDigit(t);
    const baseStr = String(base).padStart(4, "0");
    return Number(`${leading}${baseStr}`);
  };

  // Guess unit from signal name (typed or quick-filled)
  const guessUnitForSignalName = (name: string): string => {
    const matched = SIGNAL_SUGGESTIONS.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );
    return matched?.unit ?? "";
  };

  const updateRegisterForm = <K extends keyof RegisterPayload>(
    key: K,
    value: RegisterPayload[K],
  ) => {
    setRegisterForm((prev) => {
      const next = { ...prev, [key]: value } as RegisterPayload;

      if (key === "registerType" || key === "signalBase") {
        const rt =
          (key === "registerType" ? (value as any) : next.registerType) ??
          "holding";
        const sb =
          (key === "signalBase" ? (value as any) : next.signalBase) ?? 1;
        next.registerAddress = buildDisplayAddress(rt, sb);
      }

      if (key === "registerAddress") {
        const ra = Number(value as any);
        const s = String(ra).padStart(5, "0");
        const leading = Number(s[0]);
        const base = Number(s.slice(1));
        const map: Record<number, RegisterPayload["registerType"]> = {
          0: "coil",
          1: "discrete",
          3: "input",
          4: "holding",
        };
        next.registerType = map[leading] ?? "holding";
        next.signalBase = base;
      }

      return next;
    });
  };

  // Handle free-text signal name change — auto-fill unit if name matches a suggestion
  const handleSignalNameChange = (signalName: string) => {
    const guessedUnit = guessUnitForSignalName(signalName);
    setRegisterForm((prev) => ({
      ...prev,
      signalName,
      ...(guessedUnit ? { unit: guessedUnit } : {}),
    }));
  };

  // Quick-fill chip: populate only signal name and unit — address is untouched
  const handleSignalQuickFill = (
    suggestion: (typeof SIGNAL_SUGGESTIONS)[number],
  ) => {
    setRegisterForm((prev) => ({
      ...prev,
      signalName: suggestion.name,
      unit: suggestion.unit,
    }));
  };

  const loadMappingTable = async () => {
    try {
      const mappingsResp = await apiAsset.get<ExistingMapping[]>(`/Mapping`);
      const mappingsData = Array.isArray(mappingsResp.data)
        ? mappingsResp.data
        : [];
      setExistingMappings(
        mappingsData
          .filter((m) => m.deviceId === deviceId)
          .map((m) => m.registerId),
      );
    } catch (error) {
      console.error("Failed to load existing mappings:", error);
    }
  };

  const loadSlaves = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await api.get(`/devices/${deviceId}/ports`);
      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const mapped: SlaveData[] = (arr || []).map((p: any) => ({
        deviceSlaveId: p.deviceSlaveId ?? undefined,
        slaveIndex: p.slaveIndex,
        isHealthy: p.isHealthy ?? true,
        registers: (p.registers || []).map((r: any) => ({
          registerId: r.registerId ?? undefined,
          registerAddress: r.registerAddress,
          registerLength: r.registerLength,
          dataType: r.dataType,
          scale: r.scale,
          unit: r.unit ?? "",
          isHealthy: r.isHealthy ?? true,
          byteOrder: r.byteOrder ?? null,
          wordSwap: !!r.wordSwap,
          signalName: r.signalName ?? "",
          registerType: (() => {
            const s = String(r.registerAddress);
            if (s.length >= 5) {
              const leading = Number(s[0]);
              if (leading === 0) return "coil";
              if (leading === 1) return "discrete";
              if (leading === 3) return "input";
              return "holding";
            }
            return "holding";
          })(),
          signalBase: (() => {
            const s = String(r.registerAddress).padStart(5, "0");
            return Number(s.slice(1));
          })(),
        })),
      }));
      const sorted = [...mapped].sort((a, b) => b.slaveIndex - a.slaveIndex);

      setSlaves((prev) => {
        const savedIndexes = sorted.map((s) => s.slaveIndex);
        const unsaved = prev.filter(
          (s) => !s.deviceSlaveId && !savedIndexes.includes(s.slaveIndex),
        );
        return [...sorted, ...unsaved].sort(
          (a, b) => b.slaveIndex - a.slaveIndex,
        );
      });

      if (sorted.length > 0 && selectedSlaveIndex === null) {
        setSelectedSlaveIndex(sorted[0]?.slaveIndex ?? null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [deviceId, selectedSlaveIndex]);

  useEffect(() => {
    loadSlaves();
    loadMappingTable();
  }, [deviceId, loadSlaves]);

  const fetchSignals = useCallback(
    async (slaveIndex: number) => {
      if (!deviceId) return;
      setSignals(SIGNAL_SUGGESTIONS);
    },
    [deviceId],
  );

  useEffect(() => {
    if (selectedSlaveIndex === null) return;
    fetchSignals(selectedSlaveIndex);
    setRegisterForm({
      ...defaultRegister,
      registerAddress: buildDisplayAddress(
        defaultRegister.registerType!,
        defaultRegister.signalBase!,
      ),
    });
    setShowRegisterForm(false);
    setEditingRegisterIdx(null);
  }, [selectedSlaveIndex, fetchSignals]);

  const validateRegister = (
    reg: RegisterPayload,
    currentRegisters: RegisterPayload[],
  ) => {
    if (
      !Number.isInteger(reg.registerAddress) ||
      reg.registerAddress < 0 ||
      reg.registerAddress > 65535
    )
      return "Address must be between 0-65535";
    if (
      !Number.isInteger(reg.registerLength) ||
      reg.registerLength < 1 ||
      reg.registerLength > 10
    )
      return "Length must be between 1-10";
    if (!reg.dataType?.trim()) return "Data type is required";
    if (!(reg.scale > 0)) return "Scale must be greater than 0";
    if (!reg.signalName?.trim()) return "Signal name is required";
    if (!reg.unit?.trim()) return "Unit is required";

    const duplicate = currentRegisters.some(
      (r, idx) =>
        idx !== editingRegisterIdx && r.registerAddress === reg.registerAddress,
    );
    if (duplicate) return "Register address already exists in this slave";

    return null;
  };

  const handleSaveRegister = () => {
    if (!selectedSlave) return;

    const form = { ...registerForm };

    const validationError = validateRegister(form, selectedSlave.registers);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSlaves((prev) =>
      prev.map((slave) => {
        if (slave.slaveIndex !== selectedSlave.slaveIndex) return slave;

        let updatedRegisters: RegisterPayload[];
        if (editingRegisterIdx !== null) {
          updatedRegisters = slave.registers.map((r, idx) =>
            idx === editingRegisterIdx ? { ...form } : r,
          );
          toast.success("Register updated locally, please save to persist");
        } else {
          updatedRegisters = [...slave.registers, { ...form }];
          toast.success("Register added locally, please save to persist");
        }

        return { ...slave, registers: updatedRegisters };
      }),
    );

    cancelRegisterForm();
  };

  const handleDeleteRegister = (idx: number) => {
    if (!selectedSlave) return;
    const reg = selectedSlave.registers[idx];
    if (reg.registerId && existingMappings.includes(reg.registerId)) {
      toast.error(
        "Cannot delete register linked to asset signal. Please unlink first.",
      );
      return;
    }

    setSlaves(
      slaves.map((slave) =>
        slave.slaveIndex === selectedSlave.slaveIndex
          ? { ...slave, registers: slave.registers.filter((_, i) => i !== idx) }
          : slave,
      ),
    );
    toast.success("Register deleted locally, please save to persist");
  };

  const handleEditRegister = (idx: number) => {
    if (!selectedSlave) return;
    const reg = selectedSlave.registers[idx];

    if (reg.registerId && existingMappings.includes(reg.registerId)) {
      toast.error(
        "Cannot edit register linked to asset signal. Please unlink first.",
      );
      return;
    }

    const s = String(reg.registerAddress).padStart(5, "0");
    const leading = Number(s[0]);
    const base = Number(s.slice(1));
    const map: Record<number, RegisterPayload["registerType"]> = {
      0: "coil",
      1: "discrete",
      3: "input",
      4: "holding",
    };
    setRegisterForm({
      ...reg,
      registerType: map[leading] ?? "holding",
      signalBase: base,
    });
    setEditingRegisterIdx(idx);
    setShowRegisterForm(true);
  };

  const handleAddNewSlave = () => {
    if (slaves.length >= 2) {
      toast.error("Maximum of 2 slaves allowed per device");
      return;
    }
    setNewSlaveIndexInput("1");
    setNewSlaveIndexError("");
    setShowNewSlaveModal(true);
  };
  const handleConfirmNewSlave = () => {
    const parsed = parseInt(newSlaveIndexInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 247) {
      setNewSlaveIndexError("Slave Index must be between 1 and 247");
      return;
    }
    const duplicate = slaves.some((s) => s.slaveIndex === parsed);
    if (duplicate) {
      setNewSlaveIndexError(`Slave with index ${parsed} already exists`);
      return;
    }
    const newSlave: SlaveData = {
      slaveIndex: parsed,
      registers: [],
      isHealthy: true,
    };
    setSlaves((prev) => [...prev, newSlave]);
    setSelectedSlaveIndex(parsed);
    setShowRegisterForm(false);
    setShowNewSlaveModal(false);
  };

  const buildPayload = (slave: SlaveData) => ({
    deviceSlaveId: slave.deviceSlaveId,
    slaveIndex: slave.slaveIndex,
    isHealthy: slave.isHealthy,
    registers: slave.registers.map((r) => ({
      registerId: r.registerId,
      registerAddress: r.registerAddress,
      registerLength: r.registerLength,
      dataType: r.dataType,
      scale: r.scale,
      unit: r.unit,
      isHealthy: r.isHealthy,
      byteOrder: r.byteOrder,
      wordSwap: r.wordSwap,
      signalName: r.signalName,
    })),
  });

  const saveCurrentSlave = async () => {
    if (!selectedSlave || !deviceId) return;

    const payload = buildPayload(selectedSlave);
    if (payload.registers.length === 0) {
      toast.error("Cannot save slave with no registers");
      return;
    }
    if (payload.registers.length > 5) {
      toast.error("Maximum of 5 registers allowed per slave");
      return;
    }
    setIsSaving(true);

    try {
      if (selectedSlave.deviceSlaveId) {
        await api.put(
          `/devices/${deviceId}/ports/${selectedSlave.slaveIndex}`,
          payload,
        );
        toast.success("Slave updated on server");
      } else {
        await api.post(`/devices/${deviceId}/ports`, payload);
        toast.success("Slave created on server");
      }
      await loadSlaves();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to save slave",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const cancelRegisterForm = () => {
    setRegisterForm({
      ...defaultRegister,
      registerAddress: buildDisplayAddress(
        defaultRegister.registerType!,
        defaultRegister.signalBase!,
      ),
    });
    setEditingRegisterIdx(null);
    setShowRegisterForm(false);
  };

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        {/* HEADER */}
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
                <Cable className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Slave Manager
                </h1>
                <p className="text-xs text-muted-foreground">
                  Modbus Slave / Registers Configuration
                </p>
              </div>
            </div>
            <Button
              onClick={handleAddNewSlave}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Slave
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* SLAVE SIDEBAR */}
            <div className="grid grid-cols-2 gap-3 p-3 max-h-96 overflow-y-auto border-r">
              {slaves.length === 0 ? (
                <div className="p-8 text-center col-span-2">
                  <Database className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No slaves yet</p>
                </div>
              ) : (
                slaves.map((slave) => (
                  <button
                    key={slave.slaveIndex}
                    onClick={() => {
                      setSelectedSlaveIndex(slave.slaveIndex);
                      setShowRegisterForm(false);
                      setEditingRegisterIdx(null);
                      setRegisterForm({
                        ...defaultRegister,
                        registerAddress: buildDisplayAddress(
                          defaultRegister.registerType!,
                          defaultRegister.signalBase!,
                        ),
                      });
                    }}
                    className={`p-4 h-32 text-left rounded-xl border transition-all ${
                      selectedSlaveIndex === slave.slaveIndex
                        ? "bg-gradient-to-r from-primary/10 to-primary/20 border-primary shadow-sm"
                        : "hover:bg-card/50 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          Slave {slave.slaveIndex}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {slave.registers.length} registers
                        </p>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${slave.isHealthy ? "bg-emerald-500" : "bg-red-500"}`}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* MAIN CONTENT */}
            <div className="lg:col-span-3">
              {selectedSlave ? (
                <div className="space-y-3">
                  {/* SLAVE HEADER CARD */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-xl">
                          <Settings2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground">
                            Slave {selectedSlave.slaveIndex}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Configuration
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full font-semibold text-sm ${
                          selectedSlave.isHealthy
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-red-500/15 text-red-600"
                        }`}
                      >
                        {selectedSlave.isHealthy ? "Healthy" : "Unhealthy"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!showRegisterForm && (
                        <Button
                          onClick={() => setShowRegisterForm(true)}
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10 rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Register
                        </Button>
                      )}
                      <Button
                        onClick={saveCurrentSlave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        {isSaving ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Slave
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="-mt-8">
                    <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 rounded-lg px-4 py-2">
                      The register having status Connected will not be{" "}
                      <b>deleted / updated</b>, please unlink them by asset to{" "}
                      <b>delete / update</b>
                    </p>
                  </div>

                  {/* REGISTER FORM */}
                  {showRegisterForm && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-foreground">
                          {editingRegisterIdx !== null
                            ? "Edit Register"
                            : "Add Register"}
                        </h3>
                        <button
                          onClick={cancelRegisterForm}
                          className="p-1 rounded-lg hover:bg-muted transition"
                        >
                          <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {/* REGISTER TYPE */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Register Type
                          </Label>
                          <Select
                            value={registerForm.registerType}
                            onValueChange={(v) =>
                              updateRegisterForm("registerType", v as any)
                            }
                          >
                            <SelectTrigger className="rounded-xl border-border bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card shadow-md border border-border">
                              <SelectItem value="coil">Coil (0xxxx)</SelectItem>
                              <SelectItem value="discrete">
                                Discrete Input (1xxxx)
                              </SelectItem>
                              <SelectItem value="input">
                                Input Register (3xxxx)
                              </SelectItem>
                              <SelectItem value="holding">
                                Holding Register (4xxxx)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* SIGNAL NAME — free text + quick-fill chips */}
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-sm font-medium text-foreground">
                            Signal Name
                          </Label>
                          <Input
                            className="rounded-xl border-border bg-card"
                            placeholder="e.g. Temperature, Pressure, CustomSignal..."
                            value={registerForm.signalName ?? ""}
                            onChange={(e) =>
                              handleSignalNameChange(e.target.value)
                            }
                          />
                          {/* Quick-fill chips */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {SIGNAL_SUGGESTIONS.map((sig) => (
                              <button
                                key={sig.id}
                                type="button"
                                onClick={() => handleSignalQuickFill(sig)}
                                className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-primary/10 hover:border-primary transition-colors"
                              >
                                {sig.name}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Type any custom signal name, or click a suggestion
                            to auto-fill name &amp; unit. Register address is
                            set independently.
                          </p>
                        </div>

                        {/* REGISTER ADDRESS — fully manual */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Register Address
                          </Label>
                          <Input
                            type="number"
                            value={registerForm.registerAddress}
                            onChange={(e) =>
                              updateRegisterForm(
                                "registerAddress",
                                Number(e.target.value),
                              )
                            }
                            className="rounded-xl border-border bg-card font-mono"
                            placeholder="e.g. 40001"
                          />
                          <p className="text-xs text-muted-foreground">
                            5-digit Modbus address (e.g. 40001, 30005)
                          </p>
                        </div>

                        {/* REGISTER LENGTH */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Register Length
                          </Label>
                          <Input
                            type="number"
                            value={registerForm.registerLength}
                            min={1}
                            max={10}
                            onChange={(e) =>
                              updateRegisterForm(
                                "registerLength",
                                Number(e.target.value),
                              )
                            }
                            className="rounded-xl border-border bg-card"
                          />
                        </div>

                        {/* DATA TYPE */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Data Type
                          </Label>
                          <Select
                            value={registerForm.dataType}
                            onValueChange={(v) =>
                              updateRegisterForm("dataType", v)
                            }
                          >
                            <SelectTrigger className="rounded-xl border-border bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card shadow-md border border-border">
                              <SelectItem value="int16">int16</SelectItem>
                              <SelectItem value="uint16">uint16</SelectItem>
                              <SelectItem value="int32">int32</SelectItem>
                              <SelectItem value="uint32">uint32</SelectItem>
                              <SelectItem value="float32">float32</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* SCALE FACTOR */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Scale Factor
                          </Label>
                          <Input
                            type="number"
                            step={0.01}
                            value={registerForm.scale}
                            onChange={(e) =>
                              updateRegisterForm(
                                "scale",
                                Number(e.target.value),
                              )
                            }
                            className="rounded-xl border-border bg-card"
                          />
                        </div>

                        {/* UNIT — free text + preset dropdown */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Unit
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              className="rounded-xl border-border bg-card"
                              placeholder="e.g. bar, kPa, °F, m/s²..."
                              value={registerForm.unit ?? ""}
                              onChange={(e) =>
                                updateRegisterForm("unit", e.target.value)
                              }
                            />
                            <Select
                              onValueChange={(v) =>
                                updateRegisterForm("unit", v)
                              }
                            >
                              <SelectTrigger className="w-32 shrink-0 rounded-xl border-border bg-card">
                                <SelectValue placeholder="Presets" />
                              </SelectTrigger>
                              <SelectContent className="bg-card shadow-md border border-border">
                                {UNIT_PRESETS.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>
                                    {u.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Type any unit or pick a preset.
                          </p>
                        </div>

                        {/* BYTE ORDER */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            Byte Order
                          </Label>
                          <Select
                            value={registerForm.byteOrder ?? "Big"}
                            onValueChange={(v) =>
                              updateRegisterForm("byteOrder", v as any)
                            }
                          >
                            <SelectTrigger className="rounded-xl border-border bg-card">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card shadow-md border border-border">
                              <SelectItem value="Big">Big Endian</SelectItem>
                              <SelectItem value="Little">
                                Little Endian
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* CHECKBOXES */}
                      <div className="space-y-3 mb-6 p-4 bg-card rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="wordSwap"
                            checked={!!registerForm.wordSwap}
                            onCheckedChange={(c) =>
                              updateRegisterForm("wordSwap", !!c)
                            }
                          />
                          <Label
                            htmlFor="wordSwap"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Word Swap
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="isHealthy"
                            checked={registerForm.isHealthy}
                            onCheckedChange={(c) =>
                              updateRegisterForm("isHealthy", !!c)
                            }
                          />
                          <Label
                            htmlFor="isHealthy"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Healthy
                          </Label>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleSaveRegister}
                          className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-xl"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editingRegisterIdx !== null
                            ? "Update Register"
                            : "Add Register"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelRegisterForm}
                          className="rounded-xl border-border"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* REGISTER TABLE */}
                  {selectedSlave.registers.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
                      <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">
                        No registers configured
                      </p>
                      <p className="text-muted-foreground/70 text-xs mt-1">
                        Add a register to get started
                      </p>
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-card to-muted border-b border-border/70">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Address
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Signal
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Length
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Data Type
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Scale
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Byte Order
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card">
                            {selectedSlave.registers.map((reg, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-accent transition-colors"
                              >
                                <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">
                                  {reg.registerAddress}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/80">
                                  {reg.signalName || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/80">
                                  {reg.registerLength}
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-foreground/80">
                                  {reg.dataType}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/80">
                                  {reg.scale}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/80">
                                  {reg.unit || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground/80">
                                  {reg.byteOrder || "—"}
                                </td>
                                <td className="px-6 py-4 text-sm w-[7.2rem] text-center">
                                  <span
                                    className={`inline-flex items-center w-[7.2rem] px-4 py-1 rounded-full text-xs font-medium ${
                                      reg?.registerId
                                        ? existingMappings.includes(
                                            reg.registerId,
                                          )
                                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                          : "bg-red-100 text-red-700 border border-red-200"
                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                    }`}
                                  >
                                    {reg?.registerId
                                      ? existingMappings.includes(
                                          reg.registerId,
                                        )
                                        ? "connected"
                                        : "not connected"
                                      : "loading..."}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={
                                        reg?.registerId
                                          ? existingMappings.includes(
                                              reg.registerId,
                                            )
                                          : false
                                      }
                                      onClick={() => handleEditRegister(idx)}
                                      className="hover:bg-primary/10 hover:text-primary"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={
                                        reg?.registerId
                                          ? existingMappings.includes(
                                              reg.registerId,
                                            )
                                          : false
                                      }
                                      onClick={() => handleDeleteRegister(idx)}
                                      className="hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
                  <Database className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg font-semibold">
                    Select a Slave
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Choose a slave from the sidebar to manage its registers
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showNewSlaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-8 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">New Slave</h3>
              <button
                onClick={() => setShowNewSlaveModal(false)}
                className="p-1 rounded-lg hover:bg-muted transition"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Slave Index{" "}
                  <span className="text-muted-foreground font-normal">
                    (1 – 247)
                  </span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={247}
                  value={newSlaveIndexInput}
                  onChange={(e) => {
                    setNewSlaveIndexInput(e.target.value);
                    setNewSlaveIndexError("");
                  }}
                  className="rounded-xl border-border bg-card font-mono text-lg"
                  placeholder="e.g. 1"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleConfirmNewSlave()
                  }
                />
                {newSlaveIndexError && (
                  <p className="text-xs text-red-500 font-medium">
                    {newSlaveIndexError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The Modbus slave index (1–247). Must be unique per device.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleConfirmNewSlave}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slave
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNewSlaveModal(false)}
                  className="rounded-xl border-border"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
