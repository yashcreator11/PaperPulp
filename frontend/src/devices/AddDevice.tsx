import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  createDevice,
  DeviceProtocol,
  type CreateDevicePayload,
} from "@/api/deviceApi";
import { getGateways, type Gateway } from "@/api/GatewayApi";
import { toast } from "react-toastify";

/* ----------------------
   STATE TYPES
---------------------- */
type EndianType = "Little" | "Big";
type OpcUaConnectionModeType = "Polling" | "PubSub";

interface FormData {
  name: string;
  description: string;
  gatewayClientId: string;
  protocol: DeviceProtocol;
  pollInterval: number;
  // Modbus
  ipAddress?: string;
  port?: number;
  slaveId?: number;
  endian?: EndianType;
  modbusMode?: "Tcp" | "Rtu";
  serialPort?: string;
  baudRate?: number;
  parity?: string;
  // OPC UA
  connectionString?: string;
  connectionMode?: OpcUaConnectionModeType;
}

/* ----------------------
   CONSTANTS
---------------------- */
const VALID_BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const SERIAL_PORT_REGEX = /^(COM\d{1,3}|\/dev\/tty\w+)$/i;

const FRIENDLY_ERRORS: Record<string, string> = {
  "SerialPort must be a valid port name e.g. COM1 or /dev/ttyUSB0.":
    "Serial port format is invalid. Use COM1 (Windows) or /dev/ttyUSB0 (Linux).",
  "BaudRate must be one of: 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200.":
    "Please select a valid baud rate from the dropdown.",
  "Parity must be None, Even, or Odd.":
    "Please select a valid parity value (None, Even, or Odd).",
  "Parity is required for Modbus RTU.":
    "Parity is required. Please select None, Even, or Odd.",
  "SerialPort is required for Modbus RTU.":
    "Serial port is required for RTU mode.",
  "BaudRate is required for Modbus RTU.":
    "Baud rate is required for RTU mode.",
  "SlaveId must be between 0 and 247.":
    "Slave ID must be between 0 and 247.",
  "IpAddress is required for Modbus TCP":
    "IP address is required for TCP mode.",
  "Port must be between 1 and 65535.":
    "Port must be a number between 1 and 65535.",
  "Configuration name must be between 1 and 100 characters.":
    "Configuration name must be between 1 and 100 characters.",
  "Cannot create more than 20 devices.":
    "Maximum device limit (20) reached. Please delete an existing device first.",
  "Gateway Client is required.":
    "Please select a gateway before saving.",
  "Device name is required.":
    "Device name is required.",
  "ModbusMode is required for Modbus":
    "Please select a Modbus mode (TCP or RTU).",
  "ConnectionString is required for OPC UA":
    "Connection string is required for OPC UA.",
  "ConnectionMode is required for OPC UA":
    "Please select a connection mode for OPC UA.",
  "PollIntervalMs is required for OPC UA Polling":
    "Poll interval is required when using OPC UA Polling mode.",
  "Unsupported protocol":
    "The selected protocol is not supported.",
};

/* ----------------------
   COMPONENT
---------------------- */
export default function AddDeviceForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    gatewayClientId: "",
    protocol: DeviceProtocol.Modbus,
    pollInterval: 1000,
    ipAddress: "127.0.0.1",
    port: 502,
    slaveId: 1,
    endian: "Little",
    connectionString: "",
    connectionMode: "Polling",
    modbusMode: "Tcp",
    serialPort: "COM1",
    baudRate: 9600,
    parity: "None",
  });

  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGateways, setLoadingGateways] = useState(true);

  /* ----------------------
     FETCH GATEWAYS
  ---------------------- */
  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const data = await getGateways();
        setGateways(data);
      } catch {
        toast.error("Failed to load gateways. Please refresh the page.");
      } finally {
        setLoadingGateways(false);
      }
    };
    fetchGateways();
  }, []);

  /* ----------------------
     VALIDATION
  ---------------------- */
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Device name is required.");
      return false;
    }

    if (formData.name.trim().length < 3 || formData.name.trim().length > 100) {
      toast.error("Device name must be between 3 and 100 characters.");
      return false;
    }

    if (!formData.gatewayClientId) {
      toast.error("Please select a gateway before saving.");
      return false;
    }

    if (!formData.protocol) {
      toast.error("Protocol selection is required.");
      return false;
    }

    if (formData.description && formData.description.length > 255) {
      toast.error("Description cannot exceed 255 characters.");
      return false;
    }

    if (formData.protocol === DeviceProtocol.Modbus) {
      if (!formData.modbusMode) {
        toast.error("Please select a Modbus mode (TCP or RTU).");
        return false;
      }

      if (
        formData.slaveId === undefined ||
        formData.slaveId < 1 ||
        formData.slaveId > 247
      ) {
        toast.error("Slave ID must be between 1 and 247.");
        return false;
      }

      if (formData.modbusMode === "Tcp") {
        if (!formData.ipAddress) {
          toast.error("IP address is required for Modbus TCP.");
          return false;
        }

        const ipRegex =
          /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;
        if (!ipRegex.test(formData.ipAddress)) {
          toast.error(
            "IP address is invalid. Please enter a valid IPv4 address (e.g. 192.168.1.100)."
          );
          return false;
        }

        if (!formData.port || formData.port < 1 || formData.port > 65535) {
          toast.error("Port must be between 1 and 65535.");
          return false;
        }
      } else if (formData.modbusMode === "Rtu") {
        if (!formData.serialPort?.trim()) {
          toast.error("Serial port is required for Modbus RTU.");
          return false;
        }

        if (!SERIAL_PORT_REGEX.test(formData.serialPort.trim())) {
          toast.error(
            "Serial port format is invalid. Use COM1 (Windows) or /dev/ttyUSB0 (Linux)."
          );
          return false;
        }

        if (
          !formData.baudRate ||
          !VALID_BAUD_RATES.includes(formData.baudRate)
        ) {
          toast.error(
            "Please select a valid baud rate: 1200, 2400, 4800, 9600, 19200, 38400, 57600, or 115200."
          );
          return false;
        }

        const validParities = ["None", "Even", "Odd"];
        if (!formData.parity || !validParities.includes(formData.parity)) {
          toast.error("Parity must be None, Even, or Odd.");
          return false;
        }
      }
    } else if (formData.protocol === DeviceProtocol.OpcUa) {
      if (!formData.connectionString?.trim()) {
        toast.error("Connection string is required for OPC UA.");
        return false;
      }
      if (!formData.connectionMode) {
        toast.error("Please select a connection mode for OPC UA.");
        return false;
      }
    }

    return true;
  };

  /* ----------------------
     HANDLERS
  ---------------------- */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "protocol") {
      setFormData((prev) => ({
        ...prev,
        protocol:
          value === "Modbus" ? DeviceProtocol.Modbus : DeviceProtocol.OpcUa,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  /* ----------------------
     SUBMIT
  ---------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload: CreateDevicePayload = {
        name: formData.name.trim(),
        gatewayClientId: formData.gatewayClientId,
        protocol: formData.protocol,
        description: formData.description?.trim() || undefined,
        configuration: {
          name: formData.name.trim(),
          protocol: formData.protocol,
          pollIntervalMs: formData.pollInterval,
        } as any,
      };

      // Modbus
      if (formData.protocol === DeviceProtocol.Modbus) {
        payload.configuration!.modbusMode =
          formData.modbusMode === "Tcp" ? 1 : 2;
        payload.configuration!.slaveId = formData.slaveId;

        if (formData.modbusMode === "Tcp") {
          payload.configuration!.ipAddress = formData.ipAddress;
          payload.configuration!.port = formData.port;
        } else {
          payload.configuration!.serialPort = formData.serialPort;
          payload.configuration!.baudRate = formData.baudRate;
          payload.configuration!.parity = formData.parity;
        }
      }

      // OPC UA
      if (formData.protocol === DeviceProtocol.OpcUa) {
        payload.configuration!.connectionString = formData.connectionString;
        payload.configuration!.connectionMode =
          formData.connectionMode === "Polling" ? 1 : 2;
        if (formData.connectionMode === "Polling") {
          payload.configuration!.pollIntervalMs = formData.pollInterval;
        }
      }

      await createDevice(payload);

      toast.success("Device created successfully!");
      navigate("/devices");
    } catch (err: any) {
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message;

      const displayMessage =
        (apiError && FRIENDLY_ERRORS[apiError]) ||
        apiError ||
        "Failed to create device. Please try again.";

      toast.error(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------
     RENDER
  ---------------------- */
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Add New Device</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Device Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Device Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Protocol */}
            <div className="grid gap-2">
              <Label htmlFor="protocol">Protocol *</Label>
              <select
                id="protocol"
                name="protocol"
                value={
                  formData.protocol === DeviceProtocol.Modbus
                    ? "Modbus"
                    : "OPCUA"
                }
                onChange={handleChange}
                className="border rounded-md p-2"
                required
              >
                <option value="Modbus">Modbus</option>
                <option value="OPCUA">OPC UA</option>
              </select>
            </div>

            {/* Gateway */}
            <div className="grid gap-2">
              <Label htmlFor="gatewayClientId">Gateway *</Label>
              <select
                id="gatewayClientId"
                name="gatewayClientId"
                value={formData.gatewayClientId}
                onChange={handleChange}
                disabled={loadingGateways}
                className="border rounded-md p-2"
                required
              >
                <option value="">
                  {loadingGateways ? "Loading gateways..." : "Select Gateway"}
                </option>
                {gateways.map((g) => (
                  <option key={g.clientId} value={g.clientId}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modbus Fields */}
            {formData.protocol === DeviceProtocol.Modbus && (
              <div className="space-y-4 border rounded-md p-4">
                <p className="text-sm font-semibold">Modbus Settings</p>

                {/* Modbus Mode */}
                <div className="grid gap-2">
                  <Label>Modbus Mode *</Label>
                  <select
                    name="modbusMode"
                    value={formData.modbusMode}
                    onChange={handleChange}
                    className="border rounded-md p-2"
                  >
                    <option value="Tcp">TCP</option>
                    <option value="Rtu">RTU</option>
                  </select>
                </div>

                {/* Poll Interval */}
                <div className="grid gap-2">
                  <Label>Poll Interval (ms)</Label>
                  <Input
                    name="pollInterval"
                    type="number"
                    value={formData.pollInterval}
                    onChange={handleChange}
                  />
                </div>

                {/* TCP Fields */}
                {formData.modbusMode === "Tcp" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>IP Address *</Label>
                      <Input
                        name="ipAddress"
                        placeholder="192.168.1.100"
                        value={formData.ipAddress}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Port *</Label>
                      <Input
                        name="port"
                        type="number"
                        value={formData.port}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Slave ID *</Label>
                      <Input
                        name="slaveId"
                        type="number"
                        value={formData.slaveId}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}

                {/* RTU Fields */}
                {formData.modbusMode === "Rtu" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Serial Port *</Label>
                      <Input
                        name="serialPort"
                        placeholder="e.g. COM1 or /dev/ttyUSB0"
                        value={formData.serialPort}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Baud Rate *</Label>
                      <select
                        className="border rounded-md p-2"
                        value={formData.baudRate}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            baudRate: Number(e.target.value),
                          }))
                        }
                      >
                        {VALID_BAUD_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Parity *</Label>
                      <select
                        name="parity"
                        className="border rounded-md p-2"
                        value={formData.parity}
                        onChange={handleChange}
                      >
                        <option value="None">None</option>
                        <option value="Even">Even</option>
                        <option value="Odd">Odd</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Slave ID *</Label>
                      <Input
                        name="slaveId"
                        type="number"
                        value={formData.slaveId}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPC UA Fields */}
            {formData.protocol === DeviceProtocol.OpcUa && (
              <div className="space-y-4 border rounded-md p-4">
                <p className="text-sm font-semibold">OPC UA Settings</p>

                <div className="grid gap-2">
                  <Label>Connection Mode *</Label>
                  <select
                    name="connectionMode"
                    value={formData.connectionMode}
                    onChange={handleChange}
                    className="border rounded-md p-2"
                  >
                    <option value="Polling">Polling</option>
                    <option value="PubSub">PubSub</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Connection String *</Label>
                  <Input
                    name="connectionString"
                    placeholder="opc.tcp://..."
                    value={formData.connectionString}
                    onChange={handleChange}
                  />
                </div>

                {formData.connectionMode === "Polling" && (
                  <div className="grid gap-2">
                    <Label>Poll Interval (ms)</Label>
                    <Input
                      name="pollInterval"
                      type="number"
                      value={formData.pollInterval}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/devices")}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Device"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}