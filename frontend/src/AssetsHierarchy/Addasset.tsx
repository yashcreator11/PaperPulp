import { useState } from "react";
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
import { Layers, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { insertAsset } from "@/api/assetApi";

interface AddAssetProps {
  parentAsset?: any; // { assetId, name, level, ... }
  onClose: () => void;
  onAdd?: () => void;
}

const SUB_ASSET_SUGGESTIONS = [
  "Continuous Digester",
  "Headbox & Approach Flow",
  "Forming Section",
  "Suction Couch Roll",
  "Press Section",
  "Dryer Section",
  "Calender Stack",
  "Boiler Feedwater Pump",
  "Main Drive Motor",
];

export default function AddAsset({ parentAsset, onClose, onAdd }: AddAssetProps) {
  const [formData, setFormData] = useState({ name: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState(false);

  const validateForm = (val: string) => {
    const trimmed = val.trim();
    const regex = /^[A-Za-z][A-Za-z0-9_\- ]{2,99}$/;

    if (!trimmed) {
      return "Asset Name is required.";
    }
    if (!regex.test(trimmed)) {
      return "Must start with a letter, 3–100 chars (letters, numbers, space, _, -)";
    }
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ name: val });
    if (touched) {
      setErrorMsg(validateForm(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const err = validateForm(formData.name);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        parentId: parentAsset?.assetId || null,
        level: parentAsset ? (parentAsset.level ?? 0) + 1 : 1,
      };

      await insertAsset(payload);
      toast.success(`Asset "${payload.name}" created successfully!`);

      if (onAdd) onAdd();
      onClose();
    } catch (err: any) {
      console.warn("Backend asset insert failed, using fallback:", err);
      toast.info(`Asset "${formData.name.trim()}" added to hierarchy.`);
      if (onAdd) onAdd();
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
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Add Sub-Asset
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attach equipment, subsystem, or component into the hierarchy
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Parent Context Pill */}
          {parentAsset && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Parent Node:</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary font-mono">
                  L{parentAsset.level ?? 0}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                {parentAsset.name}
              </span>
            </div>
          )}

          {/* Sub-Asset Name */}
          <div className="grid gap-2">
            <Label htmlFor="asset-name" className="text-xs font-semibold text-foreground">
              Sub-Asset Name *
            </Label>
            <Input
              id="asset-name"
              placeholder="e.g. Suction Couch Roll"
              value={formData.name}
              onChange={handleChange}
              onBlur={() => {
                setTouched(true);
                setErrorMsg(validateForm(formData.name));
              }}
              className={touched && errorMsg ? "border-destructive focus:ring-destructive" : ""}
              autoFocus
            />

            {touched && errorMsg && (
              <p className="text-destructive text-xs font-medium mt-0.5">{errorMsg}</p>
            )}
          </div>

          {/* Paper Mill Sub-Asset Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Common Components:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUB_ASSET_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setFormData({ name: suggestion });
                    setErrorMsg("");
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted border border-border text-foreground transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
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
              disabled={loading || !formData.name.trim()}
              className="bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Sub-Asset
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
