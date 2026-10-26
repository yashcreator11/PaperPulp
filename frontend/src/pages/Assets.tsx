/**
 * src/pages/Assets.tsx
 *
 * Thin shell — fetches the asset hierarchy from the API and hands it
 * to AssetHierarchyPage, which renders the full 3-panel UI (tree +
 * detail + device mapping) in one place.
 *
 * Drop-in replacement for the old Assets.tsx.
 * The old AssetTree / AssetDetails / AssignDevice imports are gone;
 * everything lives inside AssetHierarchyPage now.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-toastify";

import AssetHierarchyPage, { type BackendAsset } from "@/asset/AssetTree";
import { getAssetHierarchy } from "@/api/assetApi";
import { useAuth } from "@/context/AuthContext";
import UploadAssetCsv from "@/asset/UploadAssetCsv";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── Helpers (kept identical to original) ─────────────────────────────────────

const normalizeAssets = (assets: BackendAsset[]): BackendAsset[] =>
  assets.map(a => ({
    ...a,
    childrens: Array.isArray(a.childrens) ? normalizeAssets(a.childrens) : [],
  }));

const removeAssetById = (assets: BackendAsset[], id: string): BackendAsset[] =>
  assets
    .filter(a => a.assetId !== id)
    .map(a => ({ ...a, childrens: removeAssetById(a.childrens ?? [], id) }));

// ── Component ─────────────────────────────────────────────────────────────────

export default function Assets() {
  const [assets,          setAssets]          = useState<BackendAsset[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isAdmin   = user?.role === "Admin";

  // ── Load assets ─────────────────────────────────────────────────────────────
  const loadAssets = async () => {
    try {
      setLoading(true);
      const data: BackendAsset[] = await getAssetHierarchy();
      setAssets(normalizeAssets(data));
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Failed to load assets.",
        { autoClose: 4000 }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAssets(); }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {/*
        AssetHierarchyPage is fully self-contained:
          • left panel  → asset tree with search + CRUD
          • center panel → asset detail (type / level / status / signals / alerts)
          • right panel  → available devices + inline mapping modal

        It owns its own top bar (breadcrumb + Refresh + Add Root).
        We inject the extra admin buttons (AI bot + Import Bulk) via the
        `headerExtra` slot so they appear alongside the built-in controls.
      */}
      <AssetHierarchyPage
        assets={assets}
        onAdd={loadAssets}
        onDelete={deleted =>
          setAssets(prev => removeAssetById(prev, deleted.assetId))
        }
        headerExtra={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Bot
                onClick={() => navigate("/ai")}
                className="w-7 h-7 p-1.5 rounded-xl border border-border bg-background shadow-sm
                           text-muted-foreground hover:shadow-md hover:text-foreground
                           transition-all duration-200 cursor-pointer"
              />
              <Button
                id="import-bulk-btn"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate("/Asset/BulkUpload")}
              >
                Import Bulk
              </Button>
            </div>
          ) : null
        }
      />

      {/* Upload CSV modal (kept from original) */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md p-6 bg-card rounded-2xl border shadow-xl">
          <DialogHeader>
            <DialogTitle>Upload CSV</DialogTitle>
            <DialogDescription>Upload asset hierarchy file</DialogDescription>
          </DialogHeader>
          <UploadAssetCsv
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              void loadAssets();
              setShowUploadModal(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}