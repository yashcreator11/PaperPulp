import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, CheckCircle2 } from "lucide-react";
import { updateAsset } from "@/api/assetApi";
import { toast } from "react-toastify";

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
      return "Must start with a letter, 3–100 chars (letters, numbers, space, _, -).";

    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ name: val });
    setErrorMsg(validate(val));
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
      toast.success(`Asset renamed to "${payload.newName}"`);

      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      console.warn("Backend update failed, applying local update:", err);
      if (asset) asset.name = formData.name.trim();
      toast.info(`Asset name updated locally to "${formData.name.trim()}"`);
      if (onUpdated) onUpdated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Edit Asset Details
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update naming or equipment label in the mill tree
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="edit-asset-name" className="text-xs font-semibold text-foreground">
              Asset Name *
            </Label>
            <Input
              id="edit-asset-name"
              value={formData.name}
              onChange={handleChange}
              className={errorMsg ? "border-destructive focus:ring-destructive" : ""}
              autoFocus
            />

            {errorMsg && (
              <p className="text-destructive text-xs font-medium mt-0.5">{errorMsg}</p>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !formData.name.trim() || !!errorMsg}
              className="bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
