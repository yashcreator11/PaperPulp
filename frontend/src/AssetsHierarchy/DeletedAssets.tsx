import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { getDeletedAssets, restoreAssetById } from "@/api/assetApi"; // You will create these API functions

interface Asset {
  id: string;
  name: string;
  isDeleted: boolean;
}

export default function DeletedAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  // Fetch deleted assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const data = await getDeletedAssets();
        setAssets(data);
      } catch (err) {
        console.error("Error fetching deleted assets:", err);
        setError("Failed to fetch deleted assets.");
        toast.error("Failed to load deleted assets.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Restore a deleted asset
  const restoreAsset = async (assetId: string) => {
    try {
      await restoreAssetById(assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast.success("Asset restored successfully!", { autoClose: 2000 });
    } catch (err) {
      console.error("Error restoring asset:", err);
      toast.error("Failed to restore asset.", { autoClose: 2000 });
    }
  };

  // Filtered assets by search
  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Deleted Assets</h1>
        <p className="text-muted-foreground">Manage all deleted assets</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            id="deleted-asset-search"
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div className="text-center text-muted-foreground">Loading assets...</div>}
      {error && <div className="text-center text-destructive">{error}</div>}

      {/* Asset Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table id="deleted-asset-table" className="w-full text-sm text-foreground">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-4 font-semibold">Asset Name</th>
                {isAdmin && <th className="p-4 font-semibold text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length > 0 ? (
                filteredAssets.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium">{a.name}</td>
                    {isAdmin && (
                      <td className="p-4 flex justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => restoreAsset(a.id)}
                          className="restore-asset-btn flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" /> Restore
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center p-6 text-muted-foreground">
                    No deleted assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
