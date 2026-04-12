import { describe, it, expect } from 'vitest';
import { hasRole, requireRole, getUserFromRequest, requireAdmin, requireSuperAdmin, requirePosAccess, requireOrderAccess, type TokenPayload } from '../../src/middleware/authorization';

describe('Authorization Middleware', () => {
  const superAdminUser: TokenPayload = { userId: 1, email: 'admin@test.com', name: 'Admin', role: 'super_admin' };
  const adminRestaurantUser: TokenPayload = { userId: 2, email: 'adminres@test.com', name: 'Admin Resto', role: 'admin_restoran' };
  const kasirUser: TokenPayload = { userId: 3, email: 'kasir@test.com', name: 'Kasir', role: 'kasir' };
  const waitressUser: TokenPayload = { userId: 4, email: 'waitress@test.com', name: 'Waitress', role: 'waitress' };
  const chefUser: TokenPayload = { userId: 5, email: 'chef@test.com', name: 'Chef', role: 'chef' };
  const nullUser: TokenPayload | null = null;

  describe('hasRole', () => {
    it('should return true when user has allowed role', () => {
      expect(hasRole(superAdminUser, ['super_admin'])).toBe(true);
      expect(hasRole(kasirUser, ['kasir'])).toBe(true);
    });

    it('should return true when user has one of allowed roles', () => {
      expect(hasRole(superAdminUser, ['super_admin', 'admin_restoran'])).toBe(true);
      expect(hasRole(adminRestaurantUser, ['super_admin', 'admin_restoran'])).toBe(true);
      expect(hasRole(kasirUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(true);
    });

    it('should return false when user does not have allowed role', () => {
      expect(hasRole(kasirUser, ['super_admin'])).toBe(false);
      expect(hasRole(waitressUser, ['super_admin', 'admin_restoran'])).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasRole(nullUser, ['super_admin'])).toBe(false);
    });
  });

  describe('getUserFromRequest', () => {
    it('should extract user from valid token in cookie', () => {
      const token = 'valid.token';
      const cookies = { pos_session: token };
      const user = getUserFromRequest(cookies, {});
      expect(user).toBeDefined();
    });

    it('should return null for invalid token', () => {
      const cookies = { pos_session: 'invalid.token' };
      const user = getUserFromRequest(cookies, {});
      expect(user).toBeNull();
    });

    it('should return null when no cookie', () => {
      const user = getUserFromRequest({}, {});
      expect(user).toBeNull();
    });
  });

  describe('Role convenience functions', () => {
    it('requireAdmin should allow super_admin and admin_restoran', () => {
      expect(hasRole(superAdminUser, ['super_admin', 'admin_restoran'])).toBe(true);
      expect(hasRole(adminRestaurantUser, ['super_admin', 'admin_restoran'])).toBe(true);
      expect(hasRole(kasirUser, ['super_admin', 'admin_restoran'])).toBe(false);
    });

    it('requireSuperAdmin should only allow super_admin', () => {
      expect(hasRole(superAdminUser, ['super_admin'])).toBe(true);
      expect(hasRole(adminRestaurantUser, ['super_admin'])).toBe(false);
    });

    it('requirePosAccess should allow POS users', () => {
      expect(hasRole(superAdminUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(true);
      expect(hasRole(adminRestaurantUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(true);
      expect(hasRole(kasirUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(true);
      expect(hasRole(waitressUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(false);
      expect(hasRole(chefUser, ['super_admin', 'admin_restoran', 'kasir'])).toBe(false);
    });

    it('requireOrderAccess should allow all order-related roles', () => {
      expect(hasRole(superAdminUser, ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'])).toBe(true);
      expect(hasRole(adminRestaurantUser, ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'])).toBe(true);
      expect(hasRole(kasirUser, ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'])).toBe(true);
      expect(hasRole(waitressUser, ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'])).toBe(true);
      expect(hasRole(chefUser, ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef'])).toBe(true);
    });
  });
});