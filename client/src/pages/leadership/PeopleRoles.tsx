import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, Users, Shield, ChevronDown, X, Filter, Archive, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User, Ministry, RoleAssignment, UserRole } from "@shared/schema";
import { USER_ROLES } from "@shared/schema";

interface UserWithAssignments extends User {
  assignments?: RoleAssignment[];
}

type UserStatus = 'active' | 'pending' | 'blocked' | 'new' | 'archived';

function getUserStatus(user: User): { status: UserStatus; label: string; color: string } {
  if (user.isArchived) {
    return { status: 'archived', label: 'Archived', color: 'bg-gray-400' };
  }
  if (user.status === 'blocked') {
    return { status: 'blocked', label: 'Needs Care', color: 'bg-red-500' };
  }
  if (user.acpStatus === 'approved' && user.isServingActive) {
    return { status: 'active', label: 'Thriving & Serving', color: 'bg-green-500' };
  }
  if (user.acpStatus === 'approved' || user.profileCompletedAt) {
    return { status: 'pending', label: 'Growing', color: 'bg-amber-500' };
  }
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
  const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation <= 14) {
    return { status: 'new', label: 'New Friend', color: 'bg-blue-500' };
  }
  return { status: 'pending', label: 'Getting Started', color: 'bg-amber-500' };
}

function StatusIndicator({ user }: { user: User }) {
  const { status, label, color } = getUserStatus(user);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`w-3 h-3 rounded-full ${color} ring-2 ring-background`}
          data-testid={`status-indicator-${user.id}`}
        />
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case 'admin':
    case 'pastor':
      return 'default';
    case 'leader':
    case 'dream-team':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatRoleName(role: string): string {
  return role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function PeopleRoles() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [selectedRoleName, setSelectedRoleName] = useState<string>("");

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: allAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Updated", description: "User role has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user role.", variant: "destructive" });
    },
  });

  const assignMinistryMutation = useMutation({
    mutationFn: async (data: { userId: string; ministryId: string; roleName?: string }) => {
      return apiRequest("POST", "/api/role-assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-assignments"] });
      toast({ title: "Assignment Created", description: "Ministry assignment has been created." });
      setAssignDialogOpen(false);
      setSelectedMinistry("");
      setSelectedRoleName("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create assignment.", variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest("DELETE", `/api/role-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-assignments"] });
      toast({ title: "Assignment Removed", description: "Ministry assignment has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove assignment.", variant: "destructive" });
    },
  });

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUsers = (users || []).filter(user => {
    const matchesSearch = 
      (user.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    const userStatus = getUserStatus(user).status;
    const matchesStatus = statusFilter === "all" || userStatus === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getUserAssignments = (userId: string): RoleAssignment[] => {
    return (allAssignments || []).filter(a => a.userId === userId);
  };

  const getMinistryName = (ministryId: string): string => {
    const ministry = ministries?.find(m => m.id === ministryId);
    return ministry?.name || ministryId;
  };

  const handleAssignMinistry = () => {
    if (!selectedUser || !selectedMinistry) return;
    assignMinistryMutation.mutate({
      userId: selectedUser.id,
      ministryId: selectedMinistry,
      roleName: selectedRoleName || undefined,
    });
  };

  const roleStats = {
    total: users?.length || 0,
    leaders: users?.filter(u => ['admin', 'pastor', 'leader'].includes(u.role || '')).length || 0,
    active: users?.filter(u => u.isServingActive).length || 0,
    acpEligible: users?.filter(u => u.acpStatus === 'approved').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">People & Roles</h1>
          <p className="text-muted-foreground">Manage church members and their ministry assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total-members">{roleStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-leaders">{roleStats.leaders}</p>
                <p className="text-sm text-muted-foreground">Leaders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-active-serving">{roleStats.active}</p>
                <p className="text-sm text-muted-foreground">Active Serving</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-acp-approved">{roleStats.acpEligible}</p>
                <p className="text-sm text-muted-foreground">ACP Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Church Directory</CardTitle>
              <CardDescription>View and manage member profiles and roles</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-members"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-role-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {USER_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{formatRoleName(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Thriving
                    </span>
                  </SelectItem>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Growing
                    </span>
                  </SelectItem>
                  <SelectItem value="blocked">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Needs Care
                    </span>
                  </SelectItem>
                  <SelectItem value="new">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      New Friend
                    </span>
                  </SelectItem>
                  <SelectItem value="archived">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Archived
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
            <span className="font-medium">Status:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Thriving
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Growing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Needs Care
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              New Friend
            </span>
          </div>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found matching your search criteria.
              </div>
            ) : (
              filteredUsers.map(user => {
                const assignments = getUserAssignments(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`card-member-${user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <StatusIndicator user={user} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {user.firstName} {user.lastName}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(user.role || '')}>
                          {formatRoleName(user.role || 'member')}
                        </Badge>
                        {user.isServingActive && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Serving
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      
                      {assignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assignments.map(a => (
                            <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                              {getMinistryName(a.ministryId)}
                              {a.roleName && ` - ${a.roleName}`}
                              <button
                                onClick={() => removeAssignmentMutation.mutate(a.id)}
                                className="ml-1 hover:text-destructive"
                                data-testid={`button-remove-assignment-${a.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={user.role || 'member'}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role: role as UserRole })}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{formatRoleName(role)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Dialog open={assignDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        setAssignDialogOpen(open);
                        if (open) setSelectedUser(user);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" data-testid={`button-assign-ministry-${user.id}`}>
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign to Ministry</DialogTitle>
                            <DialogDescription>
                              Add {user.firstName} to a ministry team
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Ministry</label>
                              <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
                                <SelectTrigger data-testid="select-assign-ministry">
                                  <SelectValue placeholder="Select a ministry" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ministries?.map(ministry => (
                                    <SelectItem key={ministry.id} value={ministry.id}>
                                      {ministry.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Role (Optional)</label>
                              <Input
                                placeholder="e.g., Team Lead, Volunteer"
                                value={selectedRoleName}
                                onChange={(e) => setSelectedRoleName(e.target.value)}
                                data-testid="input-assign-role"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleAssignMinistry}
                              disabled={!selectedMinistry || assignMinistryMutation.isPending}
                              data-testid="button-confirm-assign"
                            >
                              {assignMinistryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Assign
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
