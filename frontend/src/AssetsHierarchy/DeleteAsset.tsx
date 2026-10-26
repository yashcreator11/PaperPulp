import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteAsset } from "@/api/assetApi";
import { toast } from "react-toastify";

interface DeleteAssetProps {
  asset: any;        // { assetId, name, level, isDeleted }
  open: boolean;
  onClose: () => void;
  onDeleted?: (deletedAsset: any) => void; // <-- notify parent
}

export default function DeleteAsset({ asset, open, onClose, onDeleted }: DeleteAssetProps) {
  if (!asset) return null;

  const handleDelete = async () => {
    try {
      // 🔥 Backend now uses asset.assetId
      await deleteAsset(asset.assetId);

      if (onDeleted) onDeleted(asset);

      onClose();
    } catch (err: any) {
      console.log(err)
      toast.error(
        err?.response?.data?.message || err.response?.data || err ||
        "Failed to delete asset. Try again."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border border-border rounded-2xl p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-red-200 p-3 rounded-full">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">
              Confirm Delete
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-center">
            Are you sure you want to delete{" "}
            <span className="font-medium">{asset.name}</span>?
          </p>

          {/* Optional: show level or deleted status */}
          {asset.level !== undefined && (
            <p className="text-xs text-muted-foreground">
              Level: {asset.level}
            </p>
          )}

          {asset.isDeleted && (
            <p className="text-xs text-red-500">This asset is already deleted.</p>
          )}

          <DialogFooter className="flex w-full gap-2 pt-3 sm:pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="
                flex-1 
                h-9 sm:h-10 
                text-sm sm:text-base
              "
            >
              Cancel
            </Button>


            <Button
              variant="destructive"
              onClick={handleDelete}
              className="
                flex-1 
                h-9 sm:h-10
                text-sm sm:text-base
                flex items-center justify-center gap-1 sm:gap-2
                bg-red-600 hover:bg-red-700 text-white
              "
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>

          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
