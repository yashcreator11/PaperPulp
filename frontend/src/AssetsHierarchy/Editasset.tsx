import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateAsset } from "@/api/assetApi";

interface EditAssetProps {
  asset: any;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function EditAsset({ asset, onClose, onUpdated }: EditAssetProps) {
  const [formData, setFormData] = useState({ name: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({ name: asset.name || "" });
    }
  }, [asset]);

  const validate = (value: string) => {
    const trimmed = value.trim();
    const regex = /^[A-Za-z][A-Za-z0-9_\- ]{2,99}$/;

    if (!trimmed) return "Asset Name is required.";
    if (!regex.test(trimmed))
      return "Name must start with a letter, 3–100 chars allowed (letters, numbers, space, _ , -).";

    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ name: val });
    setErrorMsg(validate(val)); // inline live validation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validate(formData.name);

    if (check !== "") {
      setErrorMsg(check);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        assetId: asset.assetId,
        newName: formData.name.trim(),
      };

      await updateAsset(payload);

      if (onUpdated) onUpdated();
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to update Asset. Try again.";

      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black/30">
      <div className="w-[400px] max-h-[80vh] overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-left font-semibold">
              Edit Asset
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Top Error */}
              {errorMsg && (
                <p className="text-red-500 text-sm font-medium">{errorMsg}</p>
              )}

              {/* Name */}
              <div className="grid gap-2">
                <Label>Asset Name *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errorMsg ? "border-red-500" : ""}
                  placeholder="Enter new name"
                />
              </div>

              {/* Parent */}
              {asset?.parentName && (
                <div className="grid gap-2">
                  <Label>Parent Asset</Label>
                  <Input value={asset.parentName} disabled />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>

                <Button type="submit" disabled={loading || errorMsg !== ""}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
