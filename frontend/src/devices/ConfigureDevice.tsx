import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings2, ArrowLeft } from "lucide-react";
import {
  getDeviceById,
  updateDevice,
  DeviceProtocol,
  OpcUaConnectionMode,
} from "@/api/deviceApi";
import { toast } from "react-toastify";

export default function ConfigureDevice() {
  const navigate = useNavigate();
  const { deviceId } = useParams();

  const [loading, setLoading] = useState(false);
  const [hasConfig, setHasConfig] = useState(false); // ✅ NEW

  const [deviceDetails, setDeviceDetails] = useState({
    name: "",
    description: "",
    gatewayClientId: "",
    protocol: DeviceProtocol.Modbus,
  });

  const [formData, setFormData] = useState({
    configName: "",
    pollInterval: 1000,

    ipAddress: "127.0.0.1",
    port: 502,
    slaveId: 1,
    endian: "Little",
    modbusMode: "Tcp",
    serialPort: "COM1",
    baudRate: 9600,
    parity: "None",

    connectionString: "",
    connectionMode: 1,
  });

  useEffect(() => {
    if (!deviceId) return;

    const fetchDevice = async () => {
      try {
        const res = await getDeviceById(deviceId);

        const config = res.deviceConfiguration;
        const actualProtocol = config?.protocol ?? res.protocol;

        setHasConfig(!!config); // ✅ IMPORTANT

        setDeviceDetails({
          name: res.name ?? "",
          description: res.description ?? "",
          gatewayClientId: res.gatewayId ?? "",
          protocol: actualProtocol,
        });

        setFormData({
          configName: config?.name ?? `${res.name}_config`,
          pollInterval: config?.pollIntervalMs ?? 1000,

          ipAddress: config?.ipAddress ?? "127.0.0.1",
          port: config?.port ?? 502,
          slaveId: config?.slaveId ?? 1,
          endian: config?.endian ?? "Little",
          modbusMode: config?.modbusMode === 2 ? "Rtu" : "Tcp",
          serialPort: config?.serialPort ?? "COM1",
          baudRate: config?.baudRate ?? 9600,
          parity: config?.parity ?? "None",

          connectionString: config?.connectionString ?? "",
          connectionMode: config?.connectionMode ?? 1,
        });
      } catch {
        toast.error("Failed to load device");
        navigate("/devices");
      }
    };

    fetchDevice();
  }, [deviceId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "pollInterval" ||
        name === "port" ||
        name === "slaveId" ||
        name === "baudRate"
          ? Number(value)
          : value,
    }));
  };

  /* ===========================
     VALIDATION
  ============================ */
  const validateForm = () => {

    const isModbus =
      deviceDetails.protocol === DeviceProtocol.Modbus;

    const isOpcUa =
      deviceDetails.protocol === DeviceProtocol.OpcUa;

    const isOpcUaPolling =
      isOpcUa &&
      formData.connectionMode === OpcUaConnectionMode.Polling;

    if (!formData.configName.trim()) {
      toast.error("Configuration name is required");
      return false;
    }

    // Only validate poll interval if it's relevant for the current protocol/mode
    if (isModbus || isOpcUaPolling) {
    if (
      formData.pollInterval < 100 ||
      formData.pollInterval > 300000
    ) {
      toast.error("Poll interval must be 100–300000 ms");
      return false;
    }
  }

  if (isModbus) {
    if (formData.modbusMode === "Tcp") {
      const ipRegex =
        /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;

      if (!ipRegex.test(formData.ipAddress)) {
        toast.error("Invalid IP address");
        return false;
      }

      if (formData.port < 1 || formData.port > 65535) {
        toast.error("Port must be 1–65535");
        return false;
      }
    }

    if (formData.modbusMode === "Rtu") {
      if (!formData.serialPort.trim()) {
        toast.error("Serial port is required");
        return false;
      }

    const serialPortRegex = /^(COM\d{1,3}|\/dev\/tty(S|USB|ACM|AMA)\d{1,3})$/i;
    if (!serialPortRegex.test(formData.serialPort.trim())) {
      toast.error("Invalid serial port format (e.g. COM1 or /dev/ttyUSB0)");
      return false;
    }

      if (formData.baudRate <= 0) {
        toast.error("Invalid baud rate");
        return false;
      }

      const validParities = ["None", "Even", "Odd"];
      if (!validParities.includes(formData.parity)) {
        toast.error("Invalid parity value");
        return false;
      }
    }

    if (formData.slaveId < 1 || formData.slaveId > 247) {
      toast.error("Slave ID must be 1–247");
      return false;
    }
  }

  /* ===========================
     OPC UA Validation
  ============================ */

  if (isOpcUa) {
    if (!formData.connectionString.trim()) {
      toast.error("Connection string is required for OPC UA");
      return false;
    }
  }




    


    return true;
  };

  /* ===========================
     SUBMIT
  ============================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;

    setLoading(true);

    try {
      await updateDevice(
        deviceId,
        {
          name: deviceDetails.name,
          description: deviceDetails.description,
          protocol: deviceDetails.protocol,
        },
        {
          name: formData.configName,
          protocol: deviceDetails.protocol,
          pollIntervalMs: formData.pollInterval,

          modbusMode:
            deviceDetails.protocol === DeviceProtocol.Modbus
              ? formData.modbusMode === "Tcp"
                ? 1
                : 2
              : undefined,

          ipAddress:
            formData.modbusMode === "Tcp" ? formData.ipAddress : undefined,

          port: formData.modbusMode === "Tcp" ? formData.port : undefined,

          serialPort:
            formData.modbusMode === "Rtu" ? formData.serialPort : undefined,

          baudRate:
            formData.modbusMode === "Rtu" ? formData.baudRate : undefined,

          parity:
            formData.modbusMode === "Rtu" ? formData.parity : undefined,

          slaveId: formData.slaveId,
          endian: formData.endian,

          connectionString:
            deviceDetails.protocol === DeviceProtocol.OpcUa
              ? formData.connectionString
              : undefined,

          connectionMode:
            deviceDetails.protocol === DeviceProtocol.OpcUa
              ? formData.connectionMode
              : undefined,
        }
      );

      toast.success("Device updated successfully");
      navigate("/devices");
    } catch (err) {
      toast.error("Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-2">
          <Settings2 className="h-5 w-5" />
          <CardTitle>Configure Device</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Configuration Name</Label>
              <Input
                name="configName"
                value={formData.configName}
                onChange={handleChange}
              />
            </div>

            {/* 🔒 Protocol locked if config exists */}
            <div>
              <Label>Protocol</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={deviceDetails.protocol}
                disabled={hasConfig} // ✅ KEY CHANGE
              >
                <option value={DeviceProtocol.Modbus}>Modbus</option>
                <option value={DeviceProtocol.OpcUa}>OPC UA</option>
              </select>
            </div>

            <div>
              <Label>Poll Interval (ms)</Label>
              <Input
                name="pollInterval"
                type="number"
                value={formData.pollInterval}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/devices")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
