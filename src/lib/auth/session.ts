// Session Management Utilities for Dual Authentication System

import { getServerSession } from 'next-auth';
import { authOptions } from './config';

/**
 * Get the current session (server-side)
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the current user from session
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getCurrentSession();
  return !!session?.user;
}

/**
 * Check if user is staff
 */
export async function isStaff() {
  const user = await getCurrentUser();
  return user?.userType === 'staff';
}

/**
 * Check if user is customer
 */
export async function isCustomer() {
  const user = await getCurrentUser();
  return user?.userType === 'customer';
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string) {
  const user = await getCurrentUser();
  return user?.permissions?.includes(permission) ?? false;
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: string[]) {
  const user = await getCurrentUser();
  const userPermissions = user?.permissions || [];
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Check if user has all specified permissions
 */
export async function hasAllPermissions(permissions: string[]) {
  const user = await getCurrentUser();
  const userPermissions = user?.permissions || [];
  return permissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: string) {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(roles: string[]) {
  const user = await getCurrentUser();
  return user?.role ? roles.includes(user.role) : false;
}

/**
 * Get user permissions
 */
export async function getUserPermissions() {
  const user = await getCurrentUser();
  return user?.permissions || [];
}

/**
 * Get user role
 */
export async function getUserRole() {
  const user = await getCurrentUser();
  return user?.role || null;
}

/**
 * Check if current user can access customer resource
 */
export async function canAccessCustomerResource(customerId: string) {
  const user = await getCurrentUser();

  if (!user) return false;

  // Staff can access any customer resource if they have permission
  if (user.userType === 'staff') {
    return await hasPermission('customers:read');
  }

  // Customers can only access their own resources
  if (user.userType === 'customer') {
    return user.id === customerId;
  }

  return false;
}

/**
 * Permission helpers for common resources
 */
export const permissions = {
  // User management
  canCreateUsers: () => hasPermission('users:create'),
  canReadUsers: () => hasPermission('users:read'),
  canUpdateUsers: () => hasPermission('users:update'),
  canDeleteUsers: () => hasPermission('users:delete'),

  // Customer management
  canCreateCustomers: () => hasPermission('customers:create'),
  canReadCustomers: () => hasPermission('customers:read'),
  canUpdateCustomers: () => hasPermission('customers:update'),
  canDeleteCustomers: () => hasPermission('customers:delete'),

  // Order management
  canCreateOrders: () => hasPermission('orders:create'),
  canReadOrders: () => hasPermission('orders:read'),
  canUpdateOrders: () => hasPermission('orders:update'),
  canDeleteOrders: () => hasPermission('orders:delete'),

  // Product management
  canCreateProducts: () => hasPermission('products:create'),
  canReadProducts: () => hasPermission('products:read'),
  canUpdateProducts: () => hasPermission('products:update'),
  canDeleteProducts: () => hasPermission('products:delete'),

  // Inquiry management
  canCreateInquiries: () => hasPermission('inquiries:create'),
  canReadInquiries: () => hasPermission('inquiries:read'),
  canUpdateInquiries: () => hasPermission('inquiries:update'),
  canDeleteInquiries: () => hasPermission('inquiries:delete'),

  // Media management
  canCreateMedia: () => hasPermission('media:create'),
  canReadMedia: () => hasPermission('media:read'),
  canUpdateMedia: () => hasPermission('media:update'),
  canDeleteMedia: () => hasPermission('media:delete'),
};
