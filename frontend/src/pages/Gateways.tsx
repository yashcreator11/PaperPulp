import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Loader2,
  Copy,
  CheckCircle2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import {
  getGateways,
  addGateway,
  updateGatewayName,
  refreshClientSecret,
} from "@/api/GatewayApi";
import { Spinner } from "@/components/ui/spinner";

interface Gateway {
  name: string;
  clientId: string;
}

interface GatewayCredentials {
  clientId: string;
  clientSecret: string;
  rabbitMqUsername?: string;
  rabbitMqPassword?: string;
  caCertificateBase64?: string;
}

// ── Reusable credential row ──────────────────────────────────────────────────
function CredentialRow({
  label,
  value,
  copiable = false,
  copiedField,
  onCopy,
}: {
  label: string;
  value?: string | null;
  copiable?: boolean;
  copiedField: string | null;
  onCopy: (value: string, field: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="p-3 bg-gray-50 border rounded-md font-mono text-sm break-all flex justify-between items-center gap-2">
      <span>
        <span className="font-semibold text-gray-600">{label}: </span>
        {value}
      </span>
      {copiable && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => onCopy(value, label)}
        >
          {copiedField === label ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// ── Credentials Dialog ───────────────────────────────────────────────────────
function CredentialsDialog({
  open,
  credentials,
  onClose,
}: {
  open: boolean;
  credentials: GatewayCredentials | null;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    const copyFallback = (text: string) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;

      // Must be visible in viewport, not just in DOM
      textarea.style.position = "fixed";
      textarea.style.top = "50%";
      textarea.style.left = "50%";
      textarea.style.transform = "translate(-50%, -50%)";
      textarea.style.width = "2px";
      textarea.style.height = "2px";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0.01"; // NOT 0 — must be visible to browser
      textarea.setAttribute("readonly", "");

      document.body.appendChild(textarea);

      // On iOS, need a different selection approach
      const isIOS = navigator.userAgent.match(/ipad|iphone/i);
      if (isIOS) {
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, 999999);
      } else {
        textarea.focus();
        textarea.select();
      }

      const success = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!success) throw new Error("execCommand copy failed");
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        copyFallback(value);
      }
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      try {
        copyFallback(value);
        setCopiedField(field);
        toast.success(`${field} copied to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const handleDownloadCa = () => {
    if (!credentials?.caCertificateBase64) return;
    const link = document.createElement("a");
    link.href =
      "data:application/x-pem-file;base64," + credentials.caCertificateBase64;
    link.download = "ca.crt";
    link.click();
  };

  const handleClose = () => {
    setCopiedField(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gateway Credentials</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Important: Save these credentials now
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              These credentials will only be shown once. The old secret is now
              invalid.
            </p>
          </div>

          <CredentialRow
            label="Client ID"
            value={credentials?.clientId}
            copiable
            copiedField={copiedField}
            onCopy={handleCopy}
          />
          <CredentialRow
            label="Client Secret"
            value={credentials?.clientSecret}
            copiable
            copiedField={copiedField}
            onCopy={handleCopy}
          />
          <CredentialRow
            label="RabbitMQ Username"
            value={credentials?.rabbitMqUsername}
            copiedField={copiedField}
            onCopy={handleCopy}
          />
          <CredentialRow
            label="RabbitMQ Password"
            value={credentials?.rabbitMqPassword}
            copiable
            copiedField={copiedField}
            onCopy={handleCopy}
          />

          {credentials?.caCertificateBase64 && (
            <div className="p-3 bg-gray-50 border rounded-md flex justify-between items-center">
              <span className="text-sm font-medium">TLS CA Certificate</span>
              <Button size="sm" onClick={handleDownloadCa}>
                Download ca.crt
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>I've Saved the Credentials</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refresh Client Secret</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will immediately invalidate the current client secret. Any
          integration using it will stop working until updated with the new
          secret. Are you sure?
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onConfirm} disabled={loading} className="bg-blue-500 text-white">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Yes, Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Gateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Add
  const [openDialog, setOpenDialog] = useState(false);
  const [gatewayName, setGatewayName] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);

  // Refresh secret
  const [confirmRefreshGateway, setConfirmRefreshGateway] =
    useState<Gateway | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Credentials
  const [openCredentialsDialog, setOpenCredentialsDialog] = useState(false);
  const [credentials, setCredentials] = useState<GatewayCredentials | null>(
    null,
  );

  // ── Debounce ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchGateways = async () => {
    try {
      setLoading(true);
      const data = await getGateways();
      setGateways(data);
    } catch {
      setError("Failed to fetch gateways");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, [debouncedSearch]);

  // ── Add ────────────────────────────────────────────────────────────────────
  const handleAddGateway = async () => {
    if (!gatewayName.trim()) {
      toast.error("Gateway name is required");
      return;
    }
    try {
      setSaving(true);
      const res = await addGateway(gatewayName.trim());
      toast.success("Gateway added successfully");
      setCredentials(res);
      setOpenCredentialsDialog(true);
      setGatewayName("");
      setOpenDialog(false);
      await fetchGateways();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data ||
          "Failed to add gateway",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEditFor = (gateway: Gateway) => {
    setEditingGateway(gateway);
    setEditName(gateway.name);
    setOpenEditDialog(true);
  };

  const handleUpdateGatewayName = async () => {
    if (!editName.trim()) {
      toast.error("Gateway name is required");
      return;
    }
    try {
      setUpdating(true);
      await updateGatewayName(editingGateway!.clientId, editName.trim());
      toast.success("Gateway name updated successfully");
      setOpenEditDialog(false);
      setEditingGateway(null);
      await fetchGateways();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data ||
          "Failed to update gateway name",
      );
    } finally {
      setUpdating(false);
    }
  };

  // ── Refresh Secret ─────────────────────────────────────────────────────────
  const handleRefreshSecret = async () => {
    if (!confirmRefreshGateway) return;
    try {
      setRefreshing(true);
      const res = await refreshClientSecret(confirmRefreshGateway.clientId);
      toast.success("Client secret refreshed");
      setConfirmRefreshGateway(null);
      // Show only clientId + new clientSecret (no RabbitMQ fields returned)
      setCredentials({
        clientId: res.clientId,
        clientSecret: res.clientSecret,
      });
      setOpenCredentialsDialog(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data ||
          "Failed to refresh client secret",
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredGateways = gateways.filter(
    (g) =>
      g.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      g.clientId.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gateways</h1>
          <p className="text-muted-foreground">Manage registered gateways</p>
        </div>
        <Button onClick={() => setOpenDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Gateway
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-1/3">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search gateways..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-md"
        />
      </div>

      {loading && <Spinner />}
      {error && <p className="text-destructive">{error}</p>}

      {/* Table */}
      {!loading && !error && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-4 text-left">Gateway Name</th>
                <th className="p-4 text-left">Client ID</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGateways.map((g) => (
                <tr key={g.clientId} className="border-t">
                  <td className="p-4 font-medium">{g.name}</td>
                  <td className="p-4 text-muted-foreground">{g.clientId}</td>
                  <td className="p-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditFor(g)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRefreshGateway(g)}
                      title="Refresh client secret"
                    >
                      <RefreshCw className="h-4 w-4 text-amber-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredGateways.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center p-6 text-muted-foreground"
                  >
                    No gateways found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Gateway Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Gateway</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Gateway Name</label>
            <Input
              placeholder="Enter gateway name"
              value={gatewayName}
              onChange={(e) => setGatewayName(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddGateway} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gateway Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Gateway Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">New Gateway Name</label>
            <Input
              placeholder="Enter new gateway name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenEditDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateGatewayName} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Refresh Dialog */}
      <ConfirmDialog
        open={!!confirmRefreshGateway}
        onConfirm={handleRefreshSecret}
        onCancel={() => setConfirmRefreshGateway(null)}
        loading={refreshing}
      />

      {/* Credentials Dialog */}
      <CredentialsDialog
        open={openCredentialsDialog}
        credentials={credentials}
        onClose={() => {
          setOpenCredentialsDialog(false);
          setCredentials(null);
        }}
      />
    </div>
  );
}
