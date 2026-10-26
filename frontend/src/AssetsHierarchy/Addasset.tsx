import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

import { insertAsset } from "@/api/assetApi";

interface AddAssetProps {
  parentAsset?: any; // backend: { assetId, name, ... }
  onClose: () => void;
  onAdd?: () => void;
}

export default function AddAsset({ parentAsset, onClose, onAdd }: AddAssetProps) {
  const [formData, setFormData] = useState({
    name: "",
  });

  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const trimmed = formData.name.trim();
    const regex = /^[A-Za-z][A-Za-z0-9_\- ]{2,99}$/;

    if (!trimmed) {
      toast.error("Asset Name is required.");
      return false;
    }

    if (!regex.test(trimmed)) {
      toast.error(
        "Asset Name must start with a letter, be 3–100 chars, and may contain letters, numbers, spaces, underscores, or hyphens."
      );
      return false;
    }

    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Backend required fields
      const payload = {
        name: formData.name.trim(),
        parentId: parentAsset?.assetId || null,
        level: parentAsset ? parentAsset.level + 1 : 0, // compute level
      };

      console.log("Insert Asset Payload:", payload);

      // Call backend API
      const response = await insertAsset(payload);

      toast.success(`Asset "${payload.name}" created successfully!`);

      // Notify parent to update AssetTree
      if (onAdd) onAdd();

      setFormData({ name: "" });
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      console.error("Error creating asset:", err);

      const message = err || "Failed to create asset. Please try again.";

      toast.error(message, { autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black/30 backdrop-blur-sm">
      <div className="w-[400px] max-h-[80vh] overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-left font-semibold">
              {parentAsset ? "Add Sub-Asset" : "Add Root Asset"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name */}
              <div className="grid gap-2">
                <Label>Asset Name *</Label>
                <Input
                  name="name"
                  placeholder="Enter Asset Name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              {/* Parent (readonly) */}
              {parentAsset && (
                <div className="grid gap-2">
                  <Label>Parent Asset</Label>
                  <Input value={parentAsset.name} disabled />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>

                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
