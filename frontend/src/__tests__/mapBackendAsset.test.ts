import { describe, it, expect } from 'vitest';
import levelToType from '../asset/mapBackendAsset';

describe('levelToType', () => {
  it('maps level 1 to Plant', () => {
    expect(levelToType(1)).toBe('Plant');
  });

  it('maps level 2 to Department', () => {
    expect(levelToType(2)).toBe('Department');
  });

  it('maps level 3 to Line', () => {
    expect(levelToType(3)).toBe('Line');
  });

  it('maps level 4 to Machine', () => {
    expect(levelToType(4)).toBe('Machine');
  });

  it('maps level 5 to SubMachine', () => {
    expect(levelToType(5)).toBe('SubMachine');
  });

  it('returns Unknown for level 0', () => {
    expect(levelToType(0)).toBe('Unknown');
  });

  it('returns Unknown for out-of-range levels', () => {
    expect(levelToType(6)).toBe('Unknown');
    expect(levelToType(-1)).toBe('Unknown');
    expect(levelToType(99)).toBe('Unknown');
  });
});
