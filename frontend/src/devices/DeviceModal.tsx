import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Cpu, Wrench, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import {
  updateDevice,
  DeviceProtocol,
  type DeviceConfiguration,
} from "@/api/deviceApi";

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "edit" | "config";
  device: any | null;
  onDeviceUpdated: () => void;
}

export default function DeviceModal({
  isOpen,
  onClose,
  mode,
  device,
  onDeviceUpdated,
}: DeviceModalProps) {
  const [loading, setLoading] = useState(false);

  // Device base fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState<DeviceProtocol>(DeviceProtocol.Modbus);

  // Configuration fields
  const [configName, setConfigName] = useState("");
  const [pollInterval, setPollInterval] = useState(1000);
  const [modbusMode, setModbusMode] = useState<"Tcp" | "Rtu">("Tcp");
  const [ipAddress, setIpAddress] = useState("127.0.0.1");
  const [port, setPort] = useState(502);
  const [slaveId, setSlaveId] = useState(1);
  const [endian, setEndian] = useState<"Little" | "Big">("Little");
  const [serialPort, setSerialPort] = useState("COM1");
  const [baudRate, setBaudRate] = useState(9600);
  const [parity, setParity] = useState("None");
  const [connectionString, setConnectionString] = useState("");
  const [connectionMode, setConnectionMode] = useState<1 | 2>(1);

  useEffect(() => {
    if (device) {
      setName(device.name || "");
      setDescription(device.description || "");
      const prot = device.protocol ?? DeviceProtocol.Modbus;
      setProtocol(prot);

      const cfg = device.deviceConfiguration;
      setConfigName(cfg?.name || `${device.name || "Device"}_config`);
      setPollInterval(cfg?.pollIntervalMs || 1000);
      setModbusMode(cfg?.modbusMode === 2 ? "Rtu" : "Tcp");
      setIpAddress(cfg?.ipAddress || "192.168.1.101");
      setPort(cfg?.port || 502);
      setSlaveId(cfg?.slaveId || 1);
      setEndian(cfg?.endian === "Big" ? "Big" : "Little");
      setSerialPort(cfg?.serialPort || "COM1");
      setBaudRate(cfg?.baudRate || 9600);
      setParity(cfg?.parity || "None");
      setConnectionString(cfg?.connectionString || "opc.tcp://192.168.1.50:4840");
      setConnectionMode(cfg?.connectionMode || 1);
    }
  }, [device, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device?.deviceId) return;

    if (!name.trim() || name.trim().length < 3) {
      toast.error("Device name must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      const isModbus = protocol === DeviceProtocol.Modbus;
      const isOpcUa = protocol === DeviceProtocol.OpcUa;

      const devicePayload = {
        name: name.trim(),
        description: description.trim(),
        protocol,
      };

      const configDto: DeviceConfiguration = {
        name: configName.trim() || `${name.trim()}_config`,
        protocol,
        pollIntervalMs: pollInterval,
        ...(isModbus && {
          modbusMode: modbusMode === "Tcp" ? 1 : 2,
          ipAddress: modbusMode === "Tcp" ? ipAddress.trim() : undefined,
          port: modbusMode === "Tcp" ? Number(port) : undefined,
          serialPort: modbusMode === "Rtu" ? serialPort.trim() : undefined,
          baudRate: modbusMode === "Rtu" ? Number(baudRate) : undefined,
          parity: modbusMode === "Rtu" ? parity : undefined,
          slaveId: Number(slaveId),
          endian,
        }),
        ...(isOpcUa && {
          connectionString: connectionString.trim(),
          connectionMode,
        }),
      };

      await updateDevice(device.deviceId, devicePayload, configDto);

      toast.success(
        mode === "edit"
          ? `Device "${name}" updated successfully!`
          : `Configuration for "${name}" saved!`
      );
      onDeviceUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {mode === "edit" ? <Settings2 className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {mode === "edit" ? "Edit Device Details & Protocol" : "Configure OT Protocol & Communication"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "edit"
                  ? "Update hardware identifier, name, and field bus parameters"
                  : "Fine-tune sampling rates, polling intervals, and communication addresses"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* SECTION 1: DEVICE IDENTITY */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-primary" /> Device Identity
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">ID: {device?.deviceId?.slice(0, 8)}...</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Device Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PM01-Press-PLC"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Industrial Protocol</Label>
                <div className="h-9 px-3 rounded-md bg-muted/50 border border-input flex items-center justify-between text-xs font-medium">
                  <span>{protocol === DeviceProtocol.Modbus ? "Modbus (TCP / RTU)" : "OPC UA"}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                    Hardware Fixed
                  </span>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Siemens S7-1500 Controller for Pulp Fiberline"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: COMMUNICATION & PROTOCOL CONFIGURATION */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-emerald-500" /> OT Communication & Polling
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                LIVE SAMPLING
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Configuration Name</Label>
                <Input
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="Config profile name"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sampling Poll Interval (ms) *</Label>
                <Input
                  type="number"
                  min={100}
                  max={300000}
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {/* MODBUS SPECIFIC SETTINGS */}
              {protocol === DeviceProtocol.Modbus && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Modbus Transport Mode</Label>
                    <Select value={modbusMode} onValueChange={(val: any) => setModbusMode(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tcp">Modbus TCP (Ethernet / IP)</SelectItem>
                        <SelectItem value="Rtu">Modbus RTU (Serial RS-485)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {modbusMode === "Tcp" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">PLC / Gateway IP Address</Label>
                        <Input
                          value={ipAddress}
                          onChange={(e) => setIpAddress(e.target.value)}
                          placeholder="192.168.1.100"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">TCP Port</Label>
                        <Input
                          type="number"
                          value={port}
                          onChange={(e) => setPort(Number(e.target.value))}
                          placeholder="502"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Serial Port</Label>
                        <Input
                          value={serialPort}
                          onChange={(e) => setSerialPort(e.target.value)}
                          placeholder="COM1 or /dev/ttyUSB0"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Baud Rate</Label>
                        <Select value={String(baudRate)} onValueChange={(v) => setBaudRate(Number(v))}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="9600">9600 bps</SelectItem>
                            <SelectItem value="19200">19200 bps</SelectItem>
                            <SelectItem value="38400">38400 bps</SelectItem>
                            <SelectItem value="115200">115200 bps</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Parity</Label>
                        <Select value={parity} onValueChange={setParity}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Even">Even</SelectItem>
                            <SelectItem value="Odd">Odd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Slave ID / Station Address</Label>
                    <Input
                      type="number"
                      min={1}
                      max={247}
                      value={slaveId}
                      onChange={(e) => setSlaveId(Number(e.target.value))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Byte Endianness</Label>
                    <Select value={endian} onValueChange={(v: any) => setEndian(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Little">Little-Endian (Standard Intel/PLC)</SelectItem>
                        <SelectItem value="Big">Big-Endian (Motorola/Network)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* OPC UA SPECIFIC SETTINGS */}
              {protocol === DeviceProtocol.OpcUa && (
                <>
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold">OPC UA Endpoint Connection String *</Label>
                    <Input
                      value={connectionString}
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="opc.tcp://192.168.1.10:4840"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Subscription Mode</Label>
                    <Select
                      value={connectionMode === 1 ? "Polling" : "PubSub"}
                      onValueChange={(val) => setConnectionMode(val === "Polling" ? 1 : 2)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Polling">Active Polling (High Frequency)</SelectItem>
                        <SelectItem value="PubSub">Publish-Subscribe (Event Driven)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              disabled={loading}
            >
              {loading ? "Saving changes..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
