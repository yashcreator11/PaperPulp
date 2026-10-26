import { describe, it, expect, beforeEach } from 'vitest';
import { formatNotification } from '../hooks/utils';
import {
  PAGE_TOUR_KEY,
  BACKEND_TOUR_KEY,
  getPageTourState,
  markPageCompleted,
  setBackendTourDone,
  getBackendTourStatus,
  clearTourData,
} from '../hooks/tourStorage';
import { ROLE_SIDEBAR_ACCESS } from '../sidebar/roleSidebarConfig';
import { ROUTE_PERMISSIONS } from '../config/routePermissions';
import { cn } from '../lib/utils';
import levelToType from '../asset/mapBackendAsset';

// ─── formatNotification ──────────────────────────────────────────────────────

describe('formatNotification', () => {
  const base = {
    asset: 'Pump-01',
    signal: 'Current',
    status: 'CRITICAL',
    value: 55,
    min: 0,
    max: 50,
    percent: 10,
    timestamp: '2024-06-01T10:30:00.000Z',
  };

  it('includes asset name', () => {
    expect(formatNotification(base)).toContain('Pump-01');
  });

  it('includes signal name', () => {
    expect(formatNotification(base)).toContain('Current');
  });

  it('includes status', () => {
    expect(formatNotification(base)).toContain('CRITICAL');
  });

  it('includes value', () => {
    expect(formatNotification(base)).toContain('55');
  });

  it('includes min and max range', () => {
    const output = formatNotification(base);
    expect(output).toContain('0');
    expect(output).toContain('50');
  });

  it('includes deviation percent', () => {
    expect(formatNotification(base)).toContain('10%');
  });

  it('formats timestamp as locale string (non-empty)', () => {
    const output = formatNotification(base);
    // Just check a portion of the year appears
    expect(output).toContain('2024');
  });

  it('works with WARNING status', () => {
    expect(formatNotification({ ...base, status: 'WARNING' })).toContain('WARNING');
  });
});

// ─── tourStorage (additional branches) ──────────────────────────────────────

describe('tourStorage — additional coverage', () => {
  beforeEach(() => localStorage.clear());

  it('PAGE_TOUR_KEY and BACKEND_TOUR_KEY are non-empty strings', () => {
    expect(typeof PAGE_TOUR_KEY).toBe('string');
    expect(PAGE_TOUR_KEY.length).toBeGreaterThan(0);
    expect(typeof BACKEND_TOUR_KEY).toBe('string');
    expect(BACKEND_TOUR_KEY.length).toBeGreaterThan(0);
  });

  it('getPageTourState returns {} when localStorage is corrupted', () => {
    localStorage.setItem(PAGE_TOUR_KEY, 'not-json{{{');
    expect(getPageTourState()).toEqual({});
  });

  it('markPageCompleted marks multiple pages independently', () => {
    markPageCompleted('dashboard');
    markPageCompleted('devices');
    const state = getPageTourState();
    expect(state['dashboard']).toBe(true);
    expect(state['devices']).toBe(true);
  });

  it('markPageCompleted does not overwrite other pages', () => {
    markPageCompleted('assets');
    markPageCompleted('reports');
    const state = getPageTourState();
    expect(state['assets']).toBe(true);
    expect(state['reports']).toBe(true);
  });

  it('setBackendTourDone stores "true" string', () => {
    setBackendTourDone();
    expect(getBackendTourStatus()).toBe('true');
  });

  it('getBackendTourStatus returns null before being set', () => {
    expect(getBackendTourStatus()).toBeNull();
  });

  it('clearTourData removes both keys', () => {
    markPageCompleted('dashboard');
    setBackendTourDone();
    clearTourData();
    expect(getPageTourState()).toEqual({});
    expect(getBackendTourStatus()).toBeNull();
  });

  it('clearTourData is safe to call when nothing is stored', () => {
    expect(() => clearTourData()).not.toThrow();
  });
});

// ─── ROLE_SIDEBAR_ACCESS (additional coverage) ───────────────────────────────

describe('ROLE_SIDEBAR_ACCESS — additional coverage', () => {
  it('all 4 roles are defined', () => {
    ['Admin', 'Engineer', 'Operator', 'User'].forEach(role => {
      expect(ROLE_SIDEBAR_ACCESS).toHaveProperty(role);
    });
  });

  it('User only has dashboard and reports', () => {
    expect(ROLE_SIDEBAR_ACCESS['User']).toContain('dashboard');
    expect(ROLE_SIDEBAR_ACCESS['User']).toContain('reports');
    expect(ROLE_SIDEBAR_ACCESS['User']).not.toContain('devices');
    expect(ROLE_SIDEBAR_ACCESS['User']).not.toContain('assets');
  });

  it('Operator has dashboard, assets, and signal but not devices', () => {
    const op = ROLE_SIDEBAR_ACCESS['Operator'];
    expect(op).toContain('dashboard');
    expect(op).toContain('assets');
    expect(op).toContain('signal');
    expect(op).not.toContain('devices');
  });

  it('Engineer has devices but not manage-user', () => {
    const eng = ROLE_SIDEBAR_ACCESS['Engineer'];
    expect(eng).toContain('devices');
    expect(eng).not.toContain('manage-user');
  });

  it('Admin has all items that Engineer has, plus admin-only ones', () => {
    const adminItems = ROLE_SIDEBAR_ACCESS['Admin'];
    const engineerItems = ROLE_SIDEBAR_ACCESS['Engineer'];
    engineerItems.forEach(item => expect(adminItems).toContain(item));
    expect(adminItems).toContain('manage-user');
    expect(adminItems).toContain('deleted-items');
  });

  it('each role array contains only unique items', () => {
    for (const [role, items] of Object.entries(ROLE_SIDEBAR_ACCESS)) {
      expect(new Set(items).size).toBe(items.length);
    }
  });
});

// ─── ROUTE_PERMISSIONS (additional coverage) ─────────────────────────────────

describe('ROUTE_PERMISSIONS — additional coverage', () => {
  const can = (route: string, role: string) =>
    (ROUTE_PERMISSIONS[route] ?? []).includes(role as any);

  it('/settings and /profile are accessible to all 4 roles', () => {
    ['Admin', 'Engineer', 'Operator', 'User'].forEach(role => {
      expect(can('/settings', role)).toBe(true);
      expect(can('/profile', role)).toBe(true);
    });
  });

  it('/signal is not accessible to User', () => {
    expect(can('/signal', 'User')).toBe(false);
  });

  it('/Asset/Alerts/:assetId is accessible to Admin, Engineer, and Operator', () => {
    expect(can('/Asset/Alerts/:assetId', 'Admin')).toBe(true);
    expect(can('/Asset/Alerts/:assetId', 'Engineer')).toBe(true);
    expect(can('/Asset/Alerts/:assetId', 'Operator')).toBe(true);
    expect(can('/Asset/Alerts/:assetId', 'User')).toBe(false);
  });

  it('/ai is only for Admin and Engineer', () => {
    expect(can('/ai', 'Admin')).toBe(true);
    expect(can('/ai', 'Engineer')).toBe(true);
    expect(can('/ai', 'Operator')).toBe(false);
    expect(can('/ai', 'User')).toBe(false);
  });

  it('/map-device-to-asset/:assetid requires Admin or Engineer', () => {
    expect(can('/map-device-to-asset/:assetid', 'Admin')).toBe(true);
    expect(can('/map-device-to-asset/:assetid', 'Operator')).toBe(false);
  });

  it('/forbidden is accessible to all roles', () => {
    ['Admin', 'Engineer', 'Operator', 'User'].forEach(role => {
      expect(can('/forbidden', role)).toBe(true);
    });
  });

  it('undefined route returns false for any role', () => {
    expect(can('/nonexistent-route', 'Admin')).toBe(false);
  });
});

// ─── cn (additional coverage) ─────────────────────────────────────────────────

describe('cn — additional coverage', () => {
  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles object conditional syntax', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false });
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('text-blue-500');
  });

  it('handles array of classes', () => {
    const result = cn(['px-4', 'py-2']);
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles mixed string + object + array', () => {
    const result = cn('base', { 'active': true }, ['extra']);
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).toContain('extra');
  });
});

// ─── levelToType (additional coverage) ───────────────────────────────────────

describe('levelToType — additional coverage', () => {
  it('handles float levels as unknown (no float case defined)', () => {
    // 1.5 is not an exact match for any case
    expect(levelToType(1.5)).toBe('Unknown');
  });

  it('handles very large number as unknown', () => {
    expect(levelToType(1000)).toBe('Unknown');
  });

  it('handles NaN as unknown', () => {
    expect(levelToType(NaN)).toBe('Unknown');
  });

  it('maps all valid levels correctly', () => {
    const expected: [number, string][] = [
      [1, 'Plant'],
      [2, 'Department'],
      [3, 'Line'],
      [4, 'Machine'],
      [5, 'SubMachine'],
    ];
    expected.forEach(([level, type]) => {
      expect(levelToType(level)).toBe(type);
    });
  });
});
