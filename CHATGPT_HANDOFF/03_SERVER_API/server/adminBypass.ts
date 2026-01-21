import type { User } from "@shared/schema";

export function hasAdminBypass(user: User | undefined): boolean {
  if (!user) return false;
  const isAdminOrOwner = user.role === 'admin' || user.role === 'owner';
  return isAdminOrOwner && user.adminBypassMode === true;
}

export function isAdminUser(user: User | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'owner';
}
