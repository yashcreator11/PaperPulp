import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock xlsx since we're unit-testing the validation logic, not xlsx parsing
vi.mock('xlsx', () => {
  const sheetToJson = vi.fn();
  return {
    default: {
      read: vi.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
      utils: { sheet_to_json: sheetToJson },
    },
    read: vi.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
    utils: { sheet_to_json: sheetToJson },
  };
});

import * as XLSX from 'xlsx';
import { parseAndValidateAssetFile } from '../Services/parseAndValidateAssetFile';

// Helper: build a fake File and trigger FileReader.onload with mocked XLSX rows
function runWithRows(rows: any[]): Promise<any> {
  // Point XLSX mock to return our rows
  (XLSX.utils.sheet_to_json as ReturnType<typeof vi.fn>).mockReturnValue(rows);

  const file = new File([new ArrayBuffer(8)], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return parseAndValidateAssetFile(file);
}

describe('parseAndValidateAssetFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Valid rows ──────────────────────────────────────────────────────────────

  it('accepts a valid row with Name and Level', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: 2 }]);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(0);
  });

  it('accepts a valid row with alphanumeric Name including hyphens and dots', async () => {
    const result = await runWithRows([{ Name: 'Motor-02.v1', Level: 3 }]);
    expect(result.validRows).toHaveLength(1);
  });

  it('accepts rows with null ParentName', async () => {
    const result = await runWithRows([{ Name: 'RootAsset', Level: 1, ParentName: null }]);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].ParentName).toBeNull();
  });

  it('trims whitespace from Name', async () => {
    const result = await runWithRows([{ Name: '  Pump01  ', Level: 2 }]);
    expect(result.validRows[0].Name).toBe('Pump01');
  });

  it('converts empty ParentName string to null', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: 2, ParentName: '' }]);
    expect(result.validRows[0].ParentName).toBeNull();
  });

  it('accepts Level = 0 (boundary)', async () => {
    const result = await runWithRows([{ Name: 'Root', Level: 0 }]);
    expect(result.validRows).toHaveLength(1);
  });

  it('accepts Level = 5 (boundary)', async () => {
    const result = await runWithRows([{ Name: 'Leaf', Level: 5 }]);
    expect(result.validRows).toHaveLength(1);
  });

  // ── Invalid rows ────────────────────────────────────────────────────────────

  it('rejects row with missing Name', async () => {
    const result = await runWithRows([{ Name: '', Level: 2 }]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors).toContain('Name is required');
  });

  it('rejects row with Name containing spaces', async () => {
    const result = await runWithRows([{ Name: 'Pump 01', Level: 2 }]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some(e => e.includes('invalid characters'))).toBe(true);
  });

  it('rejects row with Name containing special characters (@)', async () => {
    const result = await runWithRows([{ Name: 'Pump@01', Level: 2 }]);
    expect(result.invalidRows).toHaveLength(1);
  });

  it('rejects row with Level undefined', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: undefined }]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors).toContain('Level is required');
  });

  it('rejects row with Level = 6 (above range)', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: 6 }]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors).toContain('Level must be between 0 and 5');
  });

  it('rejects row with Level = -1 (below range)', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: -1 }]);
    expect(result.invalidRows).toHaveLength(1);
  });

  it('rejects row with ParentName containing spaces', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: 2, ParentName: 'Parent Asset' }]);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some(e => e.includes('ParentName'))).toBe(true);
  });

  it('rejects row with non-numeric Level string', async () => {
    const result = await runWithRows([{ Name: 'Pump01', Level: 'abc' }]);
    expect(result.invalidRows).toHaveLength(1);
  });

  // ── Mixed rows ──────────────────────────────────────────────────────────────

  it('separates valid and invalid rows correctly', async () => {
    const result = await runWithRows([
      { Name: 'Pump01', Level: 2 },               // valid
      { Name: '', Level: 2 },                      // invalid: missing name
      { Name: 'Motor-02', Level: 3 },              // valid
      { Name: 'Bad Asset', Level: 10 },            // invalid: space + level
    ]);
    expect(result.validRows).toHaveLength(2);
    expect(result.invalidRows).toHaveLength(2);
  });

  it('returns empty arrays for empty sheet', async () => {
    const result = await runWithRows([]);
    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(0);
  });

  it('preserves the invalid row object in invalidRows', async () => {
    const result = await runWithRows([{ Name: '', Level: 99 }]);
    expect(result.invalidRows[0]).toHaveProperty('row');
    expect(result.invalidRows[0]).toHaveProperty('errors');
  });
});
