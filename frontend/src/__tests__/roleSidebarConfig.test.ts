import { describe, it, expect } from 'vitest';
import { ROLE_SIDEBAR_ACCESS, type UserRole } from '../sidebar/roleSidebarConfig';

describe('ROLE_SIDEBAR_ACCESS', () => {
  it('Admin has all major sections', () => {
    const adminItems = ROLE_SIDEBAR_ACCESS['Admin'];
    expect(adminItems).toContain('dashboard');
    expect(adminItems).toContain('assets');
    expect(adminItems).toContain('devices');
    expect(adminItems).toContain('manage-user');
    expect(adminItems).toContain('deleted-items');
  });

  it('Engineer cannot access manage-user or deleted-items', () => {
    const items = ROLE_SIDEBAR_ACCESS['Engineer'];
    expect(items).not.toContain('manage-user');
    expect(items).not.toContain('deleted-items');
  });

  it('Operator cannot access devices', () => {
    const items = ROLE_SIDEBAR_ACCESS['Operator'];
    expect(items).not.toContain('devices');
  });

  it('User only gets dashboard and reports', () => {
    const items = ROLE_SIDEBAR_ACCESS['User'];
    expect(items).toContain('dashboard');
    expect(items).toContain('reports');
    expect(items.length).toBe(2);
  });

  it('all roles have at least dashboard', () => {
    const roles: UserRole[] = ['Admin', 'Engineer', 'Operator', 'User'];
    roles.forEach(role => {
      expect(ROLE_SIDEBAR_ACCESS[role]).toContain('dashboard');
    });
  });

  it('no role has duplicate sidebar items', () => {
    const roles: UserRole[] = ['Admin', 'Engineer', 'Operator', 'User'];
    roles.forEach(role => {
      const items = ROLE_SIDEBAR_ACCESS[role];
      const unique = new Set(items);
      expect(unique.size).toBe(items.length);
    });
  });
});
