import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Asset } from "@/types/asset";
import { getDevices } from "@/api/deviceApi";

interface Device {
  name: string;
  description: string | null;
  protocol: string;
}

interface AssignDeviceProps {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  onAssign: (device: Device) => void;
}

export default function AssignDevice({ open, asset, onClose, onAssign }: AssignDeviceProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  useEffect(() => {
    if (open) {
      getDevices()
        .then((data) => {
          // data contains items, map to only name, description, protocol
          const mappedDevices = data.items.map((d: any) => ({
            name: d.name,
            description: d.description,
            protocol: d.protocol,
          }));
          setDevices(mappedDevices);
        })
        .catch((err) => {
          console.error("Failed to fetch devices:", err);
          setDevices([]);
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Device for {asset.name}</DialogTitle>
          <DialogDescription>
            Choose a device from the list below to assign to this asset.
          </DialogDescription>
        </DialogHeader>

        {/* Device List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No devices found.</p>
          ) : (
            devices.map((d, index) => (
              <div
                key={index}
                onClick={() => setSelectedDevice(d.name)}
                className={`p-3 rounded-md border cursor-pointer ${
                  selectedDevice === d.name ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.protocol}</p>
                {d.description && (
                  <p className="text-xs text-muted-foreground italic">{d.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Assign Button */}
        <Button
          disabled={!selectedDevice}
          onClick={() => {
            const dev = devices.find((x) => x.name === selectedDevice);
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
