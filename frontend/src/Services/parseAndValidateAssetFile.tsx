import * as XLSX from "xlsx";

export interface AssetUploadRow {
  Name: string;
  ParentName?: string | null;
  Level: number;
}

export interface ValidationResult {
  validRows: AssetUploadRow[];
  invalidRows: { row: AssetUploadRow; errors: string[] }[];
}

export const parseAndValidateAssetFile = (file: File): Promise<ValidationResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows: AssetUploadRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const validRows: AssetUploadRow[] = [];
        const invalidRows: { row: AssetUploadRow; errors: string[] }[] = [];

        // Row-wise validation
        rows.forEach((row, index) => {
          const errors: string[] = [];

          // Trim values
          row.Name = (row.Name || "").toString().trim();
          row.ParentName = row.ParentName ? row.ParentName.toString().trim() : null;

          // Convert empty ParentName to null
          if (!row.ParentName) {
            row.ParentName = null;
          }

          // Validate Name
          if (!row.Name) {
            errors.push("Name is required");
          } else if (!/^[A-Za-z0-9_.-]+$/.test(row.Name)) {
            errors.push("Name contains invalid characters or spaces");
          }

          // Validate Level
          if (row.Level === undefined || row.Level === null || isNaN(Number(row.Level))) {
            errors.push("Level is required");
          } else if (row.Level < 0 || row.Level > 5) {
            errors.push("Level must be between 0 and 5");
          }

          // Validate ParentName (if present)
          if (row.ParentName && !/^[A-Za-z0-9_.-]+$/.test(row.ParentName)) {
            errors.push("ParentName contains invalid characters or spaces");
          }

          if (errors.length > 0) {
            invalidRows.push({ row, errors });
          } else {
            validRows.push(row);
          }
        });

        resolve({ validRows, invalidRows });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);

    // Read file as ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
};
