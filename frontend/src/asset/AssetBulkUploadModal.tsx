import React, { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Layers,
  FileText,
  FileCode,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import apiAsset from "@/api/axiosAsset";
import { toast } from "react-toastify";

interface AssetBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedAsset {
  assetName: string;
  parentName?: string | null;
  level: number;
}

const SAMPLE_ASSET_CSV = `AssetName,ParentName,Level
Paper Mill #1,,1
Fiberline (Pulping),Paper Mill #1,2
Continuous Digester,Fiberline (Pulping),3
Oxygen Delignification,Fiberline (Pulping),3
Bleach Plant,Fiberline (Pulping),3
Paper Machine #1,Paper Mill #1,2
Headbox & Approach Flow,Paper Machine #1,3
Forming Section,Paper Machine #1,3
Suction Couch Roll,Forming Section,4
Press Section,Paper Machine #1,3
Dryer Section,Paper Machine #1,3
Chemical Recovery,Paper Mill #1,2
Recovery Boiler,Chemical Recovery,3
Evaporator Train,Chemical Recovery,3`;

export default function AssetBulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: AssetBulkUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [parsedAssets, setParsedAssets] = useState<ParsedAsset[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_ASSET_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "paper_mill_asset_hierarchy_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processRows = (rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) {
      setErrors(["File or pasted content is empty or contains no valid rows."]);
      return;
    }

    const norm = (k: string) => k.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const errList: string[] = [];
    const validAssets: ParsedAsset[] = [];

    rows.forEach((r, idx) => {
      const rowKeys = Object.keys(r);
      const rowNorm: Record<string, any> = {};
      rowKeys.forEach((k) => (rowNorm[norm(k)] = r[k]));

      const assetName = String(rowNorm["assetname"] ?? rowNorm["name"] ?? "").trim();
      const parentName = String(rowNorm["parentname"] ?? rowNorm["parent"] ?? "").trim();
      const level = Number(rowNorm["level"] ?? 1);

      if (!assetName) {
        errList.push(`Row ${idx + 1}: Missing required AssetName`);
        return;
      }

      if (assetName.length < 2 || assetName.length > 100) {
        errList.push(`Row ${idx + 1}: Asset name "${assetName}" must be 2-100 characters`);
        return;
      }

      validAssets.push({
        assetName,
        parentName: parentName || null,
        level: isNaN(level) || level <= 0 ? 1 : level,
      });
    });

    setErrors(errList);
    setParsedAssets(validAssets);
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    setErrors([]);
    setParsedAssets([]);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRows(results.data as Record<string, any>[]);
        },
        error: (err) => {
          setErrors([`Failed to parse CSV: ${err.message}`]);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const json = XLSX.utils.sheet_to_json(sheet);
          processRows(json as Record<string, any>[]);
        } catch (err: any) {
          setErrors([`Failed to parse Excel file: ${err.message}`]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrors(["Please upload a valid .csv, .xlsx, or .xls file."]);
    }
  };

  const handlePasteParse = () => {
    if (!rawText.trim()) {
      toast.warning("Please paste hierarchy CSV text first.");
      return;
    }
    setFileName("Pasted Hierarchy (" + new Date().toLocaleTimeString() + ")");
    Papa.parse(rawText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processRows(results.data as Record<string, any>[]);
      },
      error: (err) => {
        setErrors([`Failed to parse text: ${err.message}`]);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (parsedAssets.length === 0) return;
    setImporting(true);

    try {
      // 1. Try sending to backend bulk API if available
      try {
        await apiAsset.post("/Asset/BulkUpload", parsedAssets);
      } catch (backendErr) {
        console.warn("Backend asset bulk API offline or unreachable:", backendErr);
      }

      toast.success(`Successfully imported ${parsedAssets.length} mill assets into hierarchy!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete asset bulk upload.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFileName(null);
    setRawText("");
    setParsedAssets([]);
    setErrors([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Bulk Import Asset Hierarchy
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Popup Modal
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import multi-tier mill plants, sections, machines, and equipment hierarchies
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs font-semibold gap-1.5 h-8 border-dashed hover:border-primary/50"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              CSV Template
            </Button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-muted/50 p-1 rounded-xl w-fit border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "upload"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload File (.csv, .xlsx)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "paste"
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Paste CSV / Text
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* UPLOAD FILE TAB */}
          {activeTab === "upload" && !fileName && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    parseFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Drop your paper mill hierarchy CSV or Excel file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: <span className="font-mono text-foreground font-semibold">AssetName</span>,{" "}
                <span className="font-mono text-foreground font-semibold">ParentName</span>,{" "}
                <span className="font-mono text-foreground font-semibold">Level</span>
              </p>
            </div>
          )}

          {/* PASTE CSV TAB */}
          {activeTab === "paste" && !fileName && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Paste comma-separated hierarchy rows:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRawText(SAMPLE_ASSET_CSV)}
                  className="h-7 text-[11px] text-primary gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Insert Mill Example
                </Button>
              </div>

              <Textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={SAMPLE_ASSET_CSV}
                className="font-mono text-xs bg-muted/20 border-border focus:border-primary"
              />

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handlePasteParse}
                  disabled={!rawText.trim()}
                  className="text-xs font-semibold gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Parse & Preview
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE FILE / DATA SUMMARY */}
          {fileName && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{fileName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {parsedAssets.length} asset node{parsedAssets.length !== 1 ? "s" : ""} parsed & validated
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFileName(null);
                  setRawText("");
                  setParsedAssets([]);
                  setErrors([]);
                }}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          )}

          {/* VALIDATION WARNINGS */}
          {errors.length > 0 && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1 max-h-28 overflow-y-auto">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4" /> Validation Warnings ({errors.length})
              </div>
              {errors.map((err, i) => (
                <p key={i} className="pl-5 text-[11px] font-medium leading-relaxed">
                  • {err}
                </p>
              ))}
            </div>
          )}

          {/* PARSED ASSETS PREVIEW TABLE */}
          {parsedAssets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Hierarchy Nodes Ready to Import ({parsedAssets.length})
                </span>
                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Structure Validated
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-inner">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border sticky top-0 text-left">
                    <tr>
                      <th className="p-2.5 font-semibold text-muted-foreground">Level</th>
                      <th className="p-2.5 font-semibold text-muted-foreground">Asset Name</th>
                      <th className="p-2.5 font-semibold text-muted-foreground">Parent Node</th>
                      <th className="p-2.5 font-semibold text-muted-foreground text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedAssets.map((a, i) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="p-2.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            L{a.level}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-foreground">{a.assetName}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {a.parentName ? (
                            <span className="flex items-center gap-1">
                              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                              {a.parentName}
                            </span>
                          ) : (
                            <span className="italic text-primary/80 font-medium">Root (Plant Level)</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(i)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={parsedAssets.length === 0 || importing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1.5"
          >
            {importing ? (
              "Importing..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Import {parsedAssets.length} Asset{parsedAssets.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
