import { describe, it, expect } from 'vitest';
import { ROUTE_PERMISSIONS, type UserRole } from '../config/routePermissions';

const hasAccess = (route: string, role: UserRole): boolean =>
  ROUTE_PERMISSIONS[route]?.includes(role) ?? false;

describe('ROUTE_PERMISSIONS', () => {
  describe('Admin — full access', () => {
    it('can access /dashboard', () => expect(hasAccess('/dashboard', 'Admin')).toBe(true));
    it('can access /manage-user', () => expect(hasAccess('/manage-user', 'Admin')).toBe(true));
    it('can access /deleted-items', () => expect(hasAccess('/deleted-items', 'Admin')).toBe(true));
    it('can access /devices/upload', () => expect(hasAccess('/devices/upload', 'Admin')).toBe(true));
    it('can access /ai', () => expect(hasAccess('/ai', 'Admin')).toBe(true));
  });

  describe('Engineer — no admin-only routes', () => {
    it('can access /devices', () => expect(hasAccess('/devices', 'Engineer')).toBe(true));
    it('can access /ai', () => expect(hasAccess('/ai', 'Engineer')).toBe(true));
    it('cannot access /manage-user', () => expect(hasAccess('/manage-user', 'Engineer')).toBe(false));
    it('cannot access /deleted-items', () => expect(hasAccess('/deleted-items', 'Engineer')).toBe(false));
    it('cannot access /devices/upload', () => expect(hasAccess('/devices/upload', 'Engineer')).toBe(false));
  });

  describe('Operator — limited access', () => {
    it('can access /assets', () => expect(hasAccess('/assets', 'Operator')).toBe(true));
    it('can access /gateways', () => expect(hasAccess('/gateways', 'Operator')).toBe(true));
    it('cannot access /devices', () => expect(hasAccess('/devices', 'Operator')).toBe(false));
    it('cannot access /manage-user', () => expect(hasAccess('/manage-user', 'Operator')).toBe(false));
    it('cannot access /ai', () => expect(hasAccess('/ai', 'Operator')).toBe(false));
  });

  describe('User — minimal access', () => {
    it('can access /dashboard', () => expect(hasAccess('/dashboard', 'User')).toBe(true));
    it('can access /reports', () => expect(hasAccess('/reports', 'User')).toBe(true));
    it('cannot access /assets', () => expect(hasAccess('/assets', 'User')).toBe(false));
    it('cannot access /devices', () => expect(hasAccess('/devices', 'User')).toBe(false));
    it('cannot access /manage-user', () => expect(hasAccess('/manage-user', 'User')).toBe(false));
    it('cannot access /ai', () => expect(hasAccess('/ai', 'User')).toBe(false));
  });

  describe('Route coverage', () => {
    it('every defined route has at least one allowed role', () => {
      Object.entries(ROUTE_PERMISSIONS).forEach(([route, roles]) => {
        expect(roles.length, `Route ${route} has no allowed roles`).toBeGreaterThan(0);
      });
    });

    it('/forbidden is accessible to all roles', () => {
      const roles: UserRole[] = ['Admin', 'Engineer', 'Operator', 'User'];
      roles.forEach(role => {
        expect(hasAccess('/forbidden', role)).toBe(true);
      });
    });
  });
});
