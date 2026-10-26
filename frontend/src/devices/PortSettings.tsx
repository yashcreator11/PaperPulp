import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Plug,
  Thermometer,
  Radio,
  Activity,
  Droplets,
  RefreshCcw,
  Wrench,
} from "lucide-react";

export default function PortSettings() {
  const navigate = useNavigate();

  const ports = [
    { id: 0, name: "Voltage", unit: "V", icon: <Zap className="h-5 w-5 text-yellow-500" /> },
    { id: 1, name: "Current", unit: "A", icon: <Plug className="h-5 w-5 text-blue-500" /> },
    { id: 2, name: "Temperature", unit: "°C", icon: <Thermometer className="h-5 w-5 text-red-500" /> },
    { id: 3, name: "Frequency", unit: "Hz", icon: <Radio className="h-5 w-5 text-purple-500" /> },
    { id: 4, name: "Vibration", unit: "mm/s", icon: <Activity className="h-5 w-5 text-green-500" /> },
    { id: 5, name: "Flow Rate", unit: "L/min", icon: <Droplets className="h-5 w-5 text-cyan-500" /> },
    { id: 6, name: "RPM", unit: "rpm", icon: <RefreshCcw className="h-5 w-5 text-orange-500" /> },
    { id: 7, name: "Torque", unit: "Nm", icon: <Wrench className="h-5 w-5 text-gray-600" /> },
  ];

  return (
    <div className="p-8 min-h-screen flex flex-col items-center space-y-6 bg-background text-foreground">
      <div className="w-full max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold text-center">Port Settings</h1>
        <p className="text-center text-muted-foreground">
          View all available hardware ports and their configured measurement units.
        </p>

        <Card className="p-6 bg-card border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-center">Device Ports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {ports.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col items-center justify-center border border-border rounded-2xl bg-muted/20 p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="mb-2">{p.icon}</div>
                  <h3 className="font-semibold text-base">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.unit}</p>
                  <span className="mt-2 text-xs text-muted-foreground">Port {p.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={() => navigate("/devices")}>
            ← Back to Devices
          </Button>
        </div>
      </div>
    </div>
  );
}