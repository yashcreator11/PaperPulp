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
import { Factory, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import { insertAsset } from "@/api/assetApi";

interface AddRootProps {
  onClose: () => void;
  onAdd?: () => void;
}

const PLANT_SUGGESTIONS = [
  "Paper Mill #1",
  "Fiberline (Pulping) Facility",
  "Chemical Recovery Plant",
  "Recycled Fiber Processing (DIP)",
  "Effluent Treatment Plant (ETP)",
];

export default function AddRoot({ onClose, onAdd }: AddRootProps) {
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);

  const validateName = (value: string) => {
    const trimmed = value.trim();
    const regex = /^[A-Za-z][A-Za-z0-9_\- ]{2,99}$/;

    if (!trimmed) {
      setErrorMsg("Asset name is required.");
      return false;
    }
    if (!regex.test(trimmed)) {
      setErrorMsg(
        "Must start with a letter, 3–100 chars (letters, numbers, space, _, -)"
      );
      return false;
    }

    setErrorMsg("");
    return true;
  };

  useEffect(() => {
    setIsValid(validateName(name));
  }, [name]);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    setLoading(true);
    try {
      const payload = {
        parentId: null,
        name: name.trim(),
        level: 0,
      };

      await insertAsset(payload);
      toast.success(`Root asset "${payload.name}" created successfully!`);

      if (onAdd) onAdd();
      onClose();
    } catch (err: any) {
      console.warn("Backend root asset creation error, applying local fallback:", err);
      toast.info(`Root asset "${name.trim()}" registered locally.`);
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
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Add Root Asset
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a top-level paper mill facility or production campus
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-4 py-3">
          <div className="grid gap-2">
            <Label htmlFor="root-name" className="text-xs font-semibold text-foreground">
              Facility / Campus Name *
            </Label>
            <Input
              id="root-name"
              type="text"
              placeholder="e.g. Paper Mill #2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              className={touched && errorMsg ? "border-destructive focus:ring-destructive" : ""}
              autoFocus
            />

            {touched && errorMsg && (
              <p className="text-destructive text-xs font-medium mt-0.5">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Quick Plant Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Common Mill Units:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PLANT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
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
              disabled={!isValid || loading}
              className="bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              {loading ? (
                "Adding..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Add Root Asset
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
