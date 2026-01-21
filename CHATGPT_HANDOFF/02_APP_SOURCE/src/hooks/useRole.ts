import { useAuth } from "./useAuth";
import { 
  UserRole, 
  LEADERSHIP_ROLES, 
  ADMIN_ROLES,
  PASTORAL_ROLES,
  ROLES_REQUIRING_DOCTRINE_ACK,
  ROLE_LABELS 
} from "@shared/schema";

export function useRole() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const role = (user?.role as UserRole) || 'member';
  
  const isAdmin = ADMIN_ROLES.includes(role);
  const isLeader = LEADERSHIP_ROLES.includes(role);
  const isPastoralRole = PASTORAL_ROLES.includes(role);
  const requiresDoctrineAck = ROLES_REQUIRING_DOCTRINE_ACK.includes(role);
  
  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  };
  
  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    // Role hierarchy from lowest to highest access (includes both legacy and new roles)
    const roleHierarchy: UserRole[] = [
      'member',
      'regular-attendee',
      'dream-team',
      'active-church-participant',
      'intern',
      'leader',
      'ministry-leader',
      'leadership-team',
      'pastor',
      'lead-pastor',
      'board-of-elders',
      'admin',
      'system-admin',
    ];
    
    const currentIndex = roleHierarchy.indexOf(role);
    const requiredIndex = roleHierarchy.indexOf(minimumRole);
    
    // If role not found in hierarchy, treat as lowest level
    if (currentIndex === -1) return false;
    if (requiredIndex === -1) return true;
    
    return currentIndex >= requiredIndex;
  };
  
  const canAccessLeadershipPortal = isLeader;
  const canManageUsers = hasMinimumRole('leader');
  const canManageTrainings = hasMinimumRole('leader');
  const canManageMinistries = hasMinimumRole('leader');
  const canViewMetrics = hasMinimumRole('leader');
  const canManageInterns = hasMinimumRole('leader');
  const canManageAdmins = isAdmin;
  
  return {
    role,
    roleLabel: ROLE_LABELS[role] || role,
    isAdmin,
    isLeader,
    isPastoralRole,
    requiresDoctrineAck,
    hasRole,
    hasMinimumRole,
    canAccessLeadershipPortal,
    canManageUsers,
    canManageTrainings,
    canManageMinistries,
    canViewMetrics,
    canManageInterns,
    canManageAdmins,
    user,
    isAuthenticated,
    isLoading,
  };
}
