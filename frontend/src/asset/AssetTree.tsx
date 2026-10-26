import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  Wrench,
  Plus,
  Edit,
  Trash2,
  Factory,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Link2,
  Unplug,
  Activity,
  Sparkles,
  Check,
  Pencil,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

import Addroot from "../AssetsHierarchy/Addroot";
import Addasset from "../AssetsHierarchy/Addasset";
import Editasset from "../AssetsHierarchy/Editasset";
import DeleteAsset from "@/AssetsHierarchy/DeleteAsset";
import { useAuth } from "@/context/AuthContext";
import levelToType from "./mapBackendAsset";
import apiAsset from "@/api/axiosAsset";
import { getMappingById, clearThresholds } from "@/api/assetApi";
import { getDeviceById, getUnmappedDevices } from "@/api/deviceApi";
import type { UnmappedDevice, UnmappedSlave } from "@/api/deviceApi";
import { createMapping, deleteMapping } from "@/api/assetApi";
import type { CreateMappingPayload } from "@/api/assetApi";
import { MOCK_DEVICES, MOCK_MAPPINGS } from "@/data/mockMillData";

// ─────────────────────────── Exported Types ──────────────────────────────────

export interface BackendAsset {
  assetId: string;
  name: string;
  childrens: BackendAsset[];
  parentId: string | null;
  level: number;
  isDeleted: boolean;
}

// ─────────────────────────── Internal Types ──────────────────────────────────

interface ExistingMapping {
  signalId: string;
  assetId: string;
  deviceId: string;
  signalName: string;
  signalUnit: string;
  registerId: string | null;
  opcUaNodeId: string | null;
  minThreshold: number | null; // nullable — set after mapping
  maxThreshold: number | null; // nullable — set after mapping
  createdAt: string;
}

interface AssetConfig {
  mappingId: string;
  assetId: string;
  signalTypeId: string;
  deviceId: string;
  devicePortId: string;
  signalUnit: string;
  signalName: string;
  registerAdress: number;
  createdAt: Date;
}

// ─────────────────────────── Helpers ─────────────────────────────────────────

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightMatchHtml = (name: string, term: string) => {
  if (!term.trim()) return escapeHtml(name);
  const re = new RegExp(`(${escapeRegExp(term)})`, "ig");
  return escapeHtml(name).replace(
    re,
    `<mark class="bg-primary/20 text-primary rounded-sm px-0.5">$1</mark>`,
  );
};

const filterTreeBySearch = (
  assets: BackendAsset[],
  term: string,
): BackendAsset[] => {
  if (!term.trim()) return assets;
  const lower = term.toLowerCase();
  const helper = (node: BackendAsset): BackendAsset | null => {
    const matches = node.name.toLowerCase().includes(lower);
    const filteredKids = node.childrens
      .map(helper)
      .filter(Boolean) as BackendAsset[];
    return matches || filteredKids.length > 0
      ? { ...node, childrens: filteredKids }
      : null;
  };
  return assets.map(helper).filter(Boolean) as BackendAsset[];
};

const nodeOrDescendantMatches = (node: BackendAsset, term: string): boolean => {
  if (!term.trim()) return false;
  const lower = term.toLowerCase();
  if (node.name.toLowerCase().includes(lower)) return true;
  return node.childrens.some((c) => nodeOrDescendantMatches(c, term));
};

function protocolLabel(p?: number | null) {
  if (p === 1) return "Modbus";
  if (p === 2) return "OPC UA";
  return "Unknown";
}

function buildBreadcrumb(assets: BackendAsset[], targetId: string): string[] {
  const path: string[] = [];
  const dfs = (nodes: BackendAsset[]): boolean => {
    for (const n of nodes) {
      path.push(n.name);
      if (n.assetId === targetId) return true;
      if (dfs(n.childrens)) return true;
      path.pop();
    }
    return false;
  };
  dfs(assets);
  return path;
}

const formatLocalTime = (utcString: string) => {
  if (!utcString) return "-";
  return new Date(utcString + "Z").toLocaleString("en-IN");
};

// ─────────────────────── InlineThresholdRow ──────────────────────────────────
// Renders one signal row in the Signal Configuration table.
// Auto-opens the editor when thresholds are null (newly mapped signal).
// Shows pencil icon to edit when thresholds are already set.

interface InlineThresholdRowProps {
  mapping: ExistingMapping;
  deviceName: string;
  onSave: (mappingId: string, min: number, max: number) => Promise<void>;
  onUnlink: (mappingId: string) => void;
  onClear: (mappingId: string) => void; // ← add this
}

function InlineThresholdRow({
  mapping,
  deviceName,
  onSave,
  onUnlink,
  onClear,
}: InlineThresholdRowProps) {
  const hasThresholds =
    mapping.minThreshold != null && mapping.maxThreshold != null;
  const [editing, setEditing] = useState(!hasThresholds);
  const [min, setMin] = useState(mapping.minThreshold?.toString() ?? "");
  const [max, setMax] = useState(mapping.maxThreshold?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const isValid = min !== "" && max !== "" && Number(min) < Number(max);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(mapping.signalId, Number(min), Number(max));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setMin(mapping.minThreshold?.toString() ?? "");
    setMax(mapping.maxThreshold?.toString() ?? "");
    setEditing(false);
  }

  function handleClear() {
    onClear(mapping.signalId);
  }

  return (
    <TableRow className={editing ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
      <TableCell>
        <div className="font-medium text-sm">{mapping.signalName}</div>
        <div className="text-xs text-muted-foreground">
          {mapping.signalUnit} · {deviceName}
        </div>
      </TableCell>

      <TableCell>
        {editing ? (
          <div className="flex flex-col gap-2">
            {/* Min / Max Inputs */}
            <div className="flex flex-col gap-1 w-36">
              <Input
                type="number"
                placeholder={`Min (${mapping.signalUnit})`}
                value={min}
                onChange={(e) => setMin(e.target.value)}
                className="h-7 text-xs"
              />

              <Input
                type="number"
                placeholder={`Max (${mapping.signalUnit})`}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            {/* Validation */}
            {min !== "" && max !== "" && Number(min) >= Number(max) && (
              <p className="text-xs text-red-500">Min must be less than Max</p>
            )}

            {/* Save / Cancel Buttons */}
            <div className="flex gap-1">
              <Button
                size="sm"
                className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                disabled={!isValid || saving}
                onClick={handleSave}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>

              {hasThresholds && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : hasThresholds ? (
          <div className="flex flex-col gap-1 text-xs">
            <Badge variant="outline" className="text-red-500 border-red-400">
              ↓ {mapping.minThreshold} {mapping.signalUnit}
            </Badge>

            <Badge
              variant="outline"
              className="text-green-600 border-green-500"
            >
              ↑ {mapping.maxThreshold} {mapping.signalUnit}
            </Badge>
          </div>
        ) : (
          <Badge
            variant="outline"
            className="text-xs text-yellow-600 border-yellow-400"
          >
            No range set
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-right">
        {!editing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {!editing && hasThresholds && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            disabled={clearing}
            onClick={handleClear}
            title="Clear thresholds"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────── AssetTreeNode ───────────────────────────────────

interface NodeProps {
  asset: BackendAsset;
  selectedId: string | null;
  onSelect: (a: BackendAsset) => void;
  searchTerm: string;
  isAdmin: boolean;
  expandedMap: Record<string, boolean>;
  setExpandedMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowAddAssetModal: (v: boolean) => void;
  setAssetForAdd: (a: BackendAsset) => void;
  setShowEditModal: (v: boolean) => void;
  setAssetForEdit: (a: BackendAsset) => void;
  setOpenDeleteDialog: (v: boolean) => void;
  setAssetToDelete: (a: BackendAsset) => void;
}

const AssetTreeNode: React.FC<NodeProps> = ({
  asset,
  selectedId,
  onSelect,
  searchTerm,
  isAdmin,
  expandedMap,
  setExpandedMap,
  setShowAddAssetModal,
  setAssetForAdd,
  setShowEditModal,
  setAssetForEdit,
  setOpenDeleteDialog,
  setAssetToDelete,
}) => {
  const hasChildren = asset.childrens.length > 0;
  const isSelected = asset.assetId === selectedId;
  const isExpanded = expandedMap[asset.assetId] ?? false;

  const expandAll = (node: BackendAsset, map: Record<string, boolean>) => {
    map[node.assetId] = true;
    node.childrens.forEach((c) => expandAll(c, map));
  };

  const handleRowClick = () => {
    setExpandedMap((prev) => {
      const next = { ...prev };
      expandAll(asset, next);
      return next;
    });
    onSelect(asset);
  };

  const toggleLevel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMap((prev) => ({
      ...prev,
      [asset.assetId]: !prev[asset.assetId],
    }));
  };

  useEffect(() => {
    if (!searchTerm.trim()) return;
    if (nodeOrDescendantMatches(asset, searchTerm))
      setExpandedMap((prev) => ({ ...prev, [asset.assetId]: true }));
  }, [searchTerm]);

  const type = levelToType(asset.level);
  const Icon =
    type === "Plant"
      ? Factory
      : type === "Department"
        ? Building2
        : type === "Line"
          ? Layers
          : Wrench;

  return (
    <div>
      <div
        onClick={handleRowClick}
        className={[
          "group flex items-center justify-between gap-1 px-2 py-1.5 cursor-pointer rounded-md transition-all duration-150",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent/60 text-foreground/80 hover:text-foreground",
          asset.isDeleted ? "opacity-40" : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            onClick={toggleLevel}
            className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : (
              <span className="w-3.5" />
            )}
          </button>
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
          />
          <span
            className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
            title={asset.name}
            dangerouslySetInnerHTML={{
              __html: highlightMatchHtml(asset.name, searchTerm),
            }}
          />
        </div>
        {isAdmin && (
          <TooltipProvider>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {asset.level !== 5 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1 rounded hover:bg-primary/20 hover:text-primary text-muted-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssetForAdd(asset);
                        setShowAddAssetModal(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Add Sub-Asset
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssetForEdit(asset);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Edit
                </TooltipContent>
              </Tooltip>
              {!hasChildren && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="p-1 rounded hover:bg-destructive/20 text-destructive/60 hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssetToDelete(asset);
                        setOpenDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Delete
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="ml-4 border-l border-border/40 pl-1 overflow-hidden"
          >
            {asset.childrens.map((child) => (
              <AssetTreeNode
                key={child.assetId}
                asset={child}
                selectedId={selectedId}
                onSelect={onSelect}
                searchTerm={searchTerm}
                isAdmin={isAdmin}
                expandedMap={expandedMap}
                setExpandedMap={setExpandedMap}
                setShowAddAssetModal={setShowAddAssetModal}
                setAssetForAdd={setAssetForAdd}
                setShowEditModal={setShowEditModal}
                setAssetForEdit={setAssetForEdit}
                setOpenDeleteDialog={setOpenDeleteDialog}
                setAssetToDelete={setAssetToDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────── Main Component ──────────────────────────────────

interface AssetHierarchyPageProps {
  assets: BackendAsset[];
  onAdd: () => void;
  onDelete: (a: BackendAsset) => void;
  headerExtra?: ReactNode;
}

export default function AssetHierarchyPage({
  assets,
  onAdd,
  onDelete,
  headerExtra,
}: AssetHierarchyPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isEngineer = user?.role?.toLowerCase() === "engineer";

  // ── Tree state ──────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<BackendAsset | null>(null);

  // ── Resizable & Expandable Tree Width state ──────────────────────────────
  const [treeWidth, setTreeWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("asset_tree_width");
      return saved ? Math.max(250, Math.min(Number(saved), 750)) : 340;
    } catch {
      return 340;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleWidthChange = useCallback((w: number) => {
    const clamped = Math.max(250, Math.min(w, 750));
    setTreeWidth(clamped);
    try {
      localStorage.setItem("asset_tree_width", String(clamped));
    } catch {}
  }, []);

  const toggleExpandTree = useCallback(() => {
    if (treeWidth > 380) {
      handleWidthChange(280);
    } else {
      handleWidthChange(520);
    }
  }, [treeWidth, handleWidthChange]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(e.clientX - 80, 750));
      setTreeWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem("asset_tree_width", String(treeWidth));
      } catch {}
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, treeWidth]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredAssets = useMemo(
    () => filterTreeBySearch(assets, debounced),
    [assets, debounced],
  );
  const breadcrumb = useMemo(
    () => (selectedAsset ? buildBreadcrumb(assets, selectedAsset.assetId) : []),
    [assets, selectedAsset],
  );

  // ── Tree modal state ────────────────────────────────────────────────────────
  const [showAddRootModal, setShowAddRootModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [assetForAdd, setAssetForAdd] = useState<BackendAsset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assetForEdit, setAssetForEdit] = useState<BackendAsset | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<BackendAsset | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingClear, setPendingClear] = useState("");

  // ── Asset detail state ──────────────────────────────────────────────────────
  const [assetConfig, setAssetConfig] = useState<AssetConfig[] | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detaching, setDetaching] = useState(false);
  const [showDetachConfirm, setShowDetachConfirm] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [typedText, setTypedText] = useState("");
  const recommendationRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const signalPollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Right panel state ───────────────────────────────────────────────────────
  const [devLoading, setDevLoading] = useState(false);
  const [devices, setDevices] = useState<UnmappedDevice[]>([]);
  const [existingMappings, setExistingMappings] = useState<ExistingMapping[]>(
    [],
  );
  const [mappingLoading, setMappingLoading] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [pendingUnlink, setPendingUnlink] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"All">("All");

  const SIGNAL_POLL_MS = 5000;
  const ALERT_POLL_MS = 2000;

  const fetchSignalsAndDevices = useCallback(async (assetId: string) => {
    try {
      const data = await getMappingById(assetId);
      const mapped: AssetConfig[] = data.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
      }));
      setAssetConfig(mapped);
      const uniqueIds = Array.from(
        new Set(mapped.map((d: AssetConfig) => d.deviceId)),
      );
      const names = await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const res = await getDeviceById(id as string);
            return res?.name ?? res?.data?.name ?? "Unknown Device";
          } catch {
            return "Unknown Device";
          }
        }),
      );
      setDeviceDetails(names);
    } catch {
      setAssetConfig(null);
      setDeviceDetails([]);
    }
  }, []);

  const fetchAlerts = useCallback(async (assetId: string) => {
    try {
      const res = await apiAsset.get(`/alerts/asset/${assetId}/pending`);
      const data = res?.data ?? [];
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    }
  }, []);

  const loadDeviceData = useCallback(async () => {
    if (!selectedAsset) return;
    setDevLoading(true);
    try {
      let unmappedData: any[] = [];
      try {
        const unmappedResp = await getUnmappedDevices();
        unmappedData = unmappedResp.data || [];
      } catch {}

      let mappingsData: ExistingMapping[] = [];
      try {
        const mappingsResp = await apiAsset.get<ExistingMapping[]>("/Mapping");
        mappingsData = Array.isArray(mappingsResp.data) ? mappingsResp.data : [];
      } catch {
        mappingsData = Object.values(MOCK_MAPPINGS).flat() as any;
      }

      setDevices(unmappedData.length > 0 ? unmappedData : (MOCK_DEVICES as any));
      setExistingMappings(
        mappingsData.filter((m) => m.assetId === selectedAsset.assetId),
      );
    } catch {
      setDevices(MOCK_DEVICES as any);
    } finally {
      setDevLoading(false);
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    if (!selectedAsset?.assetId) {
      setAssetConfig(null);
      setDeviceDetails([]);
      setAlerts([]);
      setRecommendation("");
      setTypedText("");
      return;
    }
    const id = selectedAsset.assetId;
    setRecommendation("");
    setTypedText("");
    setDetailLoading(true);
    fetchSignalsAndDevices(id).finally(() => setDetailLoading(false));
    fetchAlerts(id);
    signalPollRef.current = setInterval(
      () => fetchSignalsAndDevices(id),
      SIGNAL_POLL_MS,
    );
    pollingRef.current = setInterval(() => fetchAlerts(id), ALERT_POLL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (signalPollRef.current) clearInterval(signalPollRef.current);
    };
  }, [selectedAsset?.assetId]);

  useEffect(() => {
    void loadDeviceData();
  }, [loadDeviceData]);

  // ── Derived sets ────────────────────────────────────────────────────────────
  const mappedRegisterIds = useMemo(() => {
    const s = new Set<string>();
    existingMappings.forEach((m) => m.registerId && s.add(m.registerId));
    return s;
  }, [existingMappings]);

  const mappedNodeIds = useMemo(() => {
    const s = new Set<string>();
    existingMappings.forEach((m) => m.opcUaNodeId && s.add(m.opcUaNodeId));
    return s;
  }, [existingMappings]);

  const devicesForRender = useMemo(
    () =>
      devices.filter((device) => {
        const hasModbus =
          device.matchedSlaves?.some((sl) =>
            sl.matchedRegisters?.some(
              (r) => !mappedRegisterIds.has(r.registerId),
            ),
          ) ?? false;
        const hasOpcUa =
          device.matchedNodes?.some((n) => !mappedNodeIds.has(n.opcUaNodeId)) ??
          false;
        return hasModbus || hasOpcUa;
      }),
    [devices, mappedRegisterIds, mappedNodeIds],
  );

  const deviceNameById = useMemo(() => {
    const m = new Map<string, string>();
    devices.forEach((d) => m.set(d.deviceId, d.name ?? d.deviceId));
    return m;
  }, [devices]);

  const signalsWithoutThresholds = useMemo(
    () =>
      existingMappings.filter(
        (m) => m.minThreshold == null || m.maxThreshold == null,
      ).length,
    [existingMappings],
  );

  // ── Map immediately — no modal, no thresholds required ─────────────────────
  const handleMapSlave = async (
    device: UnmappedDevice,
    slave: UnmappedSlave,
  ) => {
    if (!selectedAsset) return;
    const unmapped =
      slave.matchedRegisters?.filter(
        (r) => !mappedRegisterIds.has(r.registerId),
      ) ?? [];
    if (unmapped.length === 0) return;
    setMappingLoading(true);
    try {
      for (const r of unmapped) {
        const payload: CreateMappingPayload = {
          assetId: selectedAsset.assetId,
          deviceId: device.deviceId,
          register: {
            registerId: r.registerId,
            signalName: r.signalName,
            unit: r.signalUnit,
            minThreshold: null,
            maxThreshold: null,
          },
          opcUaNode: null,
        };
        await createMapping(payload);
      }
      toast.success(
        "Device mapped — set alert thresholds in the signals panel",
      );
      await loadDeviceData();
      await fetchSignalsAndDevices(selectedAsset.assetId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Mapping failed");
    } finally {
      setMappingLoading(false);
    }
  };

  const handleMapOpcUa = async (device: UnmappedDevice) => {
    if (!selectedAsset) return;
    const unmapped = (device.matchedNodes ?? []).filter(
      (n) => !mappedNodeIds.has(n.opcUaNodeId),
    );
    if (unmapped.length === 0) return;
    setMappingLoading(true);
    try {
      for (const n of unmapped) {
        const payload: CreateMappingPayload = {
          assetId: selectedAsset.assetId,
          deviceId: device.deviceId,
          register: null,
          opcUaNode: {
            opcUaNodeId: n.opcUaNodeId,
            signalName: n.signalName,
            unit: n.signalUnit,
            minThreshold: null,
            maxThreshold: null,
          },
        };
        await createMapping(payload);
      }
      toast.success(
        "Device mapped — set alert thresholds in the signals panel",
      );
      await loadDeviceData();
      await fetchSignalsAndDevices(selectedAsset.assetId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Mapping failed");
    } finally {
      setMappingLoading(false);
    }
  };

  // ── Save thresholds per signal (PATCH /api/Mapping/{id}/thresholds) ─────────
  const handleSaveThresholds = async (
    mappingId: string,
    min: number,
    max: number,
  ) => {
    await apiAsset.patch(`/Mapping/${mappingId}/thresholds`, {
      minThreshold: min,
      maxThreshold: max,
    });
    toast.success("Thresholds saved");
    await loadDeviceData();
    if (selectedAsset) await fetchSignalsAndDevices(selectedAsset.assetId);
  };

  const handleClearThresholds = (signalId: string) => {
    setPendingClear(signalId);
    setShowClearConfirm(true);
  };

  const confirmClearThresholds = async () => {
    setShowClearConfirm(false);
    try {
      await clearThresholds(pendingClear);
      toast.success("Thresholds cleared");
      await loadDeviceData();
      if (selectedAsset) await fetchSignalsAndDevices(selectedAsset.assetId);
    } catch {
      toast.error("Failed to clear thresholds");
    } finally {
      setPendingClear("");
    }
  };

  const handleUnlink = (mappingId: string) => {
    setPendingUnlink(mappingId);
    setShowUnlinkConfirm(true);
  };

  const confirmUnlink = async () => {
    setShowUnlinkConfirm(false);
    setMappingLoading(true);
    try {
      await deleteMapping(pendingUnlink);
      toast.success("Signal unmapped successfully");
      await loadDeviceData();
      if (selectedAsset) await fetchSignalsAndDevices(selectedAsset.assetId);
    } catch {
      toast.error("Failed to unmap signal");
    } finally {
      setMappingLoading(false);
      setPendingUnlink("");
    }
  };

  const handleDetachDevice = async () => {
    if (!selectedAsset?.assetId) return;
    setDetaching(true);
    try {
      await apiAsset.delete(`/Mapping/${selectedAsset.assetId}`);
      toast.success("Device detached successfully!");
      setAssetConfig(null);
      setDeviceDetails([]);
      setTypedText("");
      setRecommendation("");
      await fetchSignalsAndDevices(selectedAsset.assetId);
      await loadDeviceData();
    } catch {
      toast.error("Failed to detach device. Try again.");
    } finally {
      setDetaching(false);
    }
  };

  const typeWriter = (text: string, speed = 20) => {
    setTypedText("");
    let index = 0;
    const interval = setInterval(() => {
      setTypedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, speed);
  };

  const analyseAlert = async (fromTime: string) => {
    if (!selectedAsset || !alerts?.length) return;
    setAiLoading(true);
    setRecommendation("");
    setTypedText("");
    setTimeout(
      () =>
        recommendationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
    try {
      const res = await apiAsset.post("alerts/analyze-asset", {
        assetId: selectedAsset.assetId,
        fromUtc: fromTime,
        toUtc: new Date().toISOString(),
      });
      if (res.data.success) {
        const parsed = JSON.parse(res.data.recommendation);
        const rcaText = parsed?.rca ?? "";
        setRecommendation(rcaText);
        setAiLoading(false);
        typeWriter(rcaText);
      }
    } catch {
      setAiLoading(false);
    }
  };

  const assetType = selectedAsset ? levelToType(selectedAsset.level) : "—";
  const assetLevel = selectedAsset?.level ?? "—";
  const assetStatus = selectedAsset
    ? selectedAsset.isDeleted
      ? "Deleted"
      : "Active"
    : "—";
  const hasDeviceAssigned = assetConfig && assetConfig.length > 0;
  const canShowDeviceBtn =
    (isAdmin || isEngineer) && [3, 4, 5].includes(selectedAsset?.level ?? 0);

  if (authLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-border/60 bg-background/80 backdrop-blur-sm shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-tight">
            Asset Hierarchy
          </span>
          {breadcrumb.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {breadcrumb.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? "text-primary font-medium"
                        : ""
                    }
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedAsset && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                void loadDeviceData();
              }}
              disabled={devLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${devLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowAddRootModal(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Root
            </Button>
          )}
          {headerExtra}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Asset Tree (Expandable / Resizable) */}
        <aside
          style={{ width: `${treeWidth}px` }}
          className="shrink-0 flex flex-col border-r border-border/60 bg-background overflow-hidden relative select-none transition-[width] duration-75"
        >
          <div className="p-3 border-b border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Asset Tree
                </span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  ({treeWidth}px)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  onClick={toggleExpandTree}
                  title={treeWidth > 380 ? "Shrink Tree Width (280px)" : "Expand Tree Width (520px)"}
                >
                  {treeWidth > 380 ? "◀ Shrink" : "Expand ▶"}
                </Button>
              </div>
            </div>
            <Input
              id="search-asset"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto p-2 space-y-0.5">
            {filteredAssets.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No assets found
              </p>
            ) : (
              filteredAssets.map((a) => (
                <AssetTreeNode
                  key={a.assetId}
                  asset={a}
                  selectedId={selectedAsset?.assetId ?? null}
                  onSelect={setSelectedAsset}
                  searchTerm={debounced}
                  isAdmin={isAdmin}
                  expandedMap={expandedMap}
                  setExpandedMap={setExpandedMap}
                  setShowAddAssetModal={setShowAddAssetModal}
                  setAssetForAdd={setAssetForAdd}
                  setShowEditModal={setShowEditModal}
                  setAssetForEdit={setAssetForEdit}
                  setOpenDeleteDialog={setOpenDeleteDialog}
                  setAssetToDelete={setAssetToDelete}
                />
              ))
            )}
          </div>

          {/* Draggable Resize Divider */}
          <div
            onMouseDown={startResizing}
            onDoubleClick={toggleExpandTree}
            title="Drag to resize tree width • Double-click to expand/shrink"
            className={`absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/40 transition-colors z-30 ${
              isResizing ? "bg-primary w-2.5" : "bg-transparent hover:bg-primary/30"
            }`}
          />
        </aside>

        {/* CENTER: Asset Detail */}
        <main className="flex-1 overflow-y-auto">
          {!selectedAsset ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Factory className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select an asset from the tree</p>
            </div>
          ) : (
            <motion.div
              key={selectedAsset.assetId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {selectedAsset.name}
                </h1>
                {!selectedAsset.isDeleted && (
                  <Badge
                    variant="outline"
                    className="text-emerald-500 border-emerald-500/30 gap-1.5 text-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Live
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Sub Assets:{" "}
                  <strong>{selectedAsset.childrens?.length ?? 0}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    {
                      label: "TYPE",
                      value: assetType,
                      green: false,
                      accent: false,
                    },
                    {
                      label: "LEVEL",
                      value: String(assetLevel),
                      green: false,
                      accent: true,
                    },
                    {
                      label: "STATUS",
                      value: assetStatus,
                      green: !selectedAsset.isDeleted,
                      accent: false,
                    },
                  ] as const
                ).map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-border/60 bg-card p-4"
                  >
                    <div className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                      {card.label}
                    </div>
                    <div
                      className={`text-xl font-bold ${card.green ? "text-emerald-500" : card.accent ? "text-primary" : "text-foreground"}`}
                    >
                      {card.value}
                    </div>
                  </div>
                ))}
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-5">
                    {deviceDetails.length > 0 && (
                      <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-100 to-green-50 dark:from-emerald-900/60 dark:to-green-950/60 p-4 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/30">
                        <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                          Connected Devices
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {deviceDetails.map((d, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-100 bg-white dark:bg-emerald-800 rounded-full border border-emerald-400 dark:border-emerald-500 shadow-sm flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#22c55e]" />
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signal Configuration — inline threshold editing replaces old static list */}
                    {existingMappings.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Signal Configuration
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs ml-auto"
                          >
                            {existingMappings.length}
                          </Badge>
                          {signalsWithoutThresholds > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs text-yellow-600 border-yellow-400"
                            >
                              {signalsWithoutThresholds} need range
                            </Badge>
                          )}
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Signal</TableHead>
                              <TableHead className="text-xs">
                                Alert range
                              </TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {existingMappings.map((m) => (
                              <InlineThresholdRow
                                key={m.signalId}
                                mapping={m}
                                deviceName={
                                  deviceNameById.get(m.deviceId) ?? "—"
                                }
                                onSave={handleSaveThresholds}
                                onClear={handleClearThresholds}
                                onUnlink={handleUnlink}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {canShowDeviceBtn && hasDeviceAssigned && (
                      <Button
                        className="w-full gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold border border-red-700 shadow-md shadow-red-900/30"
                        disabled={detaching}
                        onClick={() => setShowDetachConfirm(true)}
                      >
                        <Unplug className="h-4 w-4" />
                        {detaching ? "Detaching…" : "Detach Device"}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 overflow-hidden shadow-sm shadow-red-100 dark:shadow-red-900/20">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-red-200 dark:border-red-800 bg-red-100/60 dark:bg-red-900/30">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          <span className="text-xs font-bold text-red-800 dark:text-red-200 uppercase tracking-widest">
                            Alerts
                          </span>
                          {alerts.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                              {alerts.length}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-700 dark:text-red-300 hover:bg-red-200/50 dark:hover:bg-red-800/50"
                          onClick={() =>
                            navigate(`/Asset/Alerts/${selectedAsset.assetId}`)
                          }
                        >
                          Previous Alerts
                        </Button>
                      </div>
                      {alerts.length === 0 ? (
                        <div className="py-8 text-center text-red-400 dark:text-red-500">
                          <CheckCircle2 className="h-7 w-7 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium">
                            No active alerts
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-red-200/60 dark:divide-red-800/60 max-h-64 overflow-y-auto">
                          {alerts.map((alert: any) => (
                            <div
                              key={alert.alertId}
                              className="px-4 py-3 border-l-4 border-red-500 bg-white/60 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                                {alert.signalName}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                {formatLocalTime(alert.alertStartUtc)} →{" "}
                                {formatLocalTime(alert.alertEndUtc)}
                              </p>
                              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                Min:{" "}
                                <strong>
                                  {alert.minObservedValue?.toFixed(2)}
                                </strong>{" "}
                                · Max:{" "}
                                <strong>
                                  {alert.maxObservedValue?.toFixed(2)}
                                </strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {alerts.length > 0 && (
                        <div className="p-3 border-t border-red-200 dark:border-red-800">
                          <Button
                            className="w-full gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:brightness-110 text-white font-semibold text-sm"
                            onClick={() =>
                              analyseAlert(alerts[0].alertStartUtc)
                            }
                            disabled={aiLoading}
                          >
                            <Sparkles className="h-4 w-4" />
                            {aiLoading ? "Analysing…" : "Analyze Alert"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={recommendationRef}>
                {(aiLoading || recommendation) && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />{" "}
                      Recommendations
                    </h3>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                      {aiLoading ? "Getting response…" : typedText}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </main>

        {/* RIGHT: Available Devices — Map button fires immediately, NO modal */}
        <aside className="w-72 shrink-0 flex flex-col border-l border-border/60 bg-background overflow-hidden">
          <div className="p-3 border-b border-border/60">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Available Devices
              </span>
              {devicesForRender.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-emerald-500 border-emerald-500/30 text-xs"
                >
                  {devicesForRender.length} available
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              {(["All"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDeviceFilter(f)}
                  className={[
                    "flex-1 text-xs py-1 rounded-md border transition-all duration-150",
                    deviceFilter === f
                      ? "border-primary/50 bg-primary/10 text-primary font-semibold"
                      : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                  ].join(" ")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!selectedAsset && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Select an asset to see available devices
              </p>
            )}
            {selectedAsset && devLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}
            {selectedAsset && !devLoading && devicesForRender.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm font-medium">No unmapped devices</p>
                <p className="text-xs mt-1 opacity-60">
                  All devices have been mapped
                </p>
              </div>
            )}
            {selectedAsset &&
              !devLoading &&
              devicesForRender.map((device) => (
                <div
                  key={device.deviceId}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden"
                >
                  <div className="flex items-start justify-between px-3 py-2.5 bg-muted/30 border-b border-border/60">
                    <div>
                      <div className="font-semibold text-sm">{device.name}</div>
                      {device.description && (
                        <div className="text-xs text-muted-foreground">
                          {device.description}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs shrink-0 mt-0.5"
                    >
                      {protocolLabel(device.protocol)}
                    </Badge>
                  </div>
                  <div className="p-3 space-y-2">
                    {device.matchedSlaves?.map((slave) => {
                      const avail =
                        slave.matchedRegisters?.filter(
                          (r) => !mappedRegisterIds.has(r.registerId),
                        ) ?? [];
                      if (avail.length === 0) return null;
                      return (
                        <div
                          key={slave.deviceSlaveId}
                          className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                Slave #{slave.slaveIndex}
                              </span>
                              <Badge
                                variant={
                                  slave.isHealthy ? "outline" : "destructive"
                                }
                                className="text-[10px] h-4"
                              >
                                {slave.isHealthy ? "Healthy" : "Unhealthy"}
                              </Badge>
                            </div>
                            {(selectedAsset?.level ?? 0) >= 3 && (
                              <Button
                                size="sm"
                                className="h-6 text-xs px-3"
                                disabled={mappingLoading}
                                onClick={() => handleMapSlave(device, slave)}
                              >
                                {mappingLoading ? "Mapping…" : "Map"}
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {avail.map((r) => (
                              <span
                                key={r.registerId}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground"
                              >
                                {r.signalName} · {r.signalUnit}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const avail = (device.matchedNodes ?? []).filter(
                        (n) => !mappedNodeIds.has(n.opcUaNodeId),
                      );
                      if (avail.length === 0) return null;
                      return (
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                OPC UA
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {avail.length} node
                                {avail.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {(selectedAsset?.level ?? 0) >= 3 && (
                              <Button
                                size="sm"
                                className="h-6 text-xs px-3"
                                disabled={mappingLoading}
                                onClick={() => handleMapOpcUa(device)}
                              >
                                {mappingLoading ? "Mapping…" : "Map"}
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {avail.map((n) => (
                              <span
                                key={n.opcUaNodeId}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground"
                              >
                                {n.signalName} · {n.signalUnit}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
          </div>
        </aside>
      </div>

      {/* Tree modals */}
      {showAddRootModal && (
        <Addroot onClose={() => setShowAddRootModal(false)} onAdd={onAdd} />
      )}
      {showAddAssetModal && assetForAdd && (
        <Addasset
          parentAsset={assetForAdd}
          onClose={() => setShowAddAssetModal(false)}
          onAdd={onAdd}
        />
      )}
      {showEditModal && assetForEdit && (
        <Editasset
          asset={assetForEdit}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            onAdd();
            setShowEditModal(false);
          }}
        />
      )}
      <DeleteAsset
        asset={assetToDelete}
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onDeleted={() => {
          if (assetToDelete) onDelete(assetToDelete);
          toast.success("Deleted successfully");
          setOpenDeleteDialog(false);
        }}
      />

      {/* Detach Confirmation */}
      <AlertDialog open={showDetachConfirm} onOpenChange={setShowDetachConfirm}>
        <AlertDialogContent className="border-2 border-red-300 dark:border-red-700 bg-white dark:bg-zinc-900 shadow-2xl shadow-red-900/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                <Unplug className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-red-900 dark:text-red-100 text-lg font-bold">
                Detach Device?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will remove{" "}
              <strong className="text-foreground">all device mappings</strong>{" "}
              from{" "}
              <strong className="text-red-700 dark:text-red-300">
                {selectedAsset?.name}
              </strong>
              . All signal configurations will be lost. You can re-map at any
              time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              onClick={() => setShowDetachConfirm(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold border border-red-700 gap-2"
              onClick={async () => {
                setShowDetachConfirm(false);
                await handleDetachDevice();
              }}
            >
              <Unplug className="h-4 w-4" /> Yes, Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink single signal */}
      <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmap Signal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the signal from this asset. You can remap it at
              any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnlinkConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlink}>Unmap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear thresholds confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center shrink-0">
                <X className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <AlertDialogTitle>Clear Thresholds?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will remove the <strong>min and max alert range</strong> for
              this signal. No alerts will trigger until new thresholds are set.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
              onClick={confirmClearThresholds}
            >
              <X className="h-4 w-4 mr-1" /> Yes, Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
