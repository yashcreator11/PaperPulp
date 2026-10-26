import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getDevices } from "@/api/deviceApi";

interface Device {
  id: string;
  name: string;
  type: string;
  status?: string;
}

interface AssignDeviceProps {
  open: boolean;
  onClose: () => void;
  onAssign: (device: Device) => void;
}

export default function AssignDevice({ open, onClose, onAssign }: AssignDeviceProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetch("/api/devices") // YOUR real API call
        .then((res) => res.json())
        .then((data) => setDevices(data))
        .catch(() => setDevices([]));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Device to Assign</DialogTitle>
        </DialogHeader>

        {/* Devices */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices found.</p>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                className={`p-3 rounded-md border cursor-pointer ${
                  selectedDevice === d.id ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.type}</p>
              </div>
            ))
          )}
        </div>

        {/* Submit */}
        <Button
          disabled={!selectedDevice}
          onClick={() => {
            const dev = devices.find((x) => x.id === selectedDevice);
            if (dev) onAssign(dev);
            onClose();
          }}
          className="w-full mt-4"
        >
          Assign Device
        </Button>
      </DialogContent>
    </Dialog>
  );
}
