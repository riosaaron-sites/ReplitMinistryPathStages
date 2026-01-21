import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Users, Search, BookOpen, Shield, ChevronRight, ChevronDown, UserPlus, X, Crown } from "lucide-react";
import type { Ministry, User, RoleAssignment, InsertMinistry, MinistryLeader } from "@shared/schema";
import { insertMinistrySchema } from "@shared/schema";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const MINISTRY_CATEGORIES = [
  "Children & Youth",
  "Worship & Creative Arts", 
  "Guest Services",
  "Operations & Facilities",
  "Outreach & Missions",
  "Discipleship & Groups",
  "Support Ministries",
  "Administration"
];

const formSchema = insertMinistrySchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  category: z.string().min(1, "Please select a category"),
  parentMinistryId: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MinistryLeaderWithUser extends MinistryLeader {
  user?: User;
}

function MinistryCard({ 
  ministry, 
  onEdit, 
  memberCount,
  leaders,
  childMinistries,
  parentMinistry,
  allMinistries
}: { 
  ministry: Ministry; 
  onEdit: () => void;
  memberCount: number;
  leaders: MinistryLeaderWithUser[];
  childMinistries: Ministry[];
  parentMinistry?: Ministry;
  allMinistries: Ministry[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = childMinistries.length > 0;

  return (
    <Card className="hover-elevate" data-testid={`card-ministry-${ministry.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {parentMinistry && (
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <span>{parentMinistry.name}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
            <CardTitle className="text-lg flex items-center gap-2">
              {hasChildren && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 p-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                  data-testid={`button-expand-ministry-${ministry.id}`}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              )}
              {ministry.name}
              {!ministry.isActive && (
                <Badge variant="secondary" className="text-xs">Paused</Badge>
              )}
              {hasChildren && (
                <Badge variant="outline" className="text-xs">{childMinistries.length} sub-ministries</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{ministry.category}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-ministry-${ministry.id}`}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ministry.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{ministry.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {ministry.requiresBackgroundCheck && (
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Background Check
            </Badge>
          )}
          {ministry.requiresSpiritBaptism && (
            <Badge variant="outline" className="text-xs">Spirit Baptism</Badge>
          )}
          {ministry.requiresHolySpiritClass && (
            <Badge variant="outline" className="text-xs">Holy Spirit Class</Badge>
          )}
          {ministry.minimumAge && (
            <Badge variant="outline" className="text-xs">Age {ministry.minimumAge}+</Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{memberCount} members</span>
            </div>
          </div>
          {leaders.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {leaders.slice(0, 3).map((leader) => (
                  <Avatar key={leader.id} className="w-6 h-6 border-2 border-background">
                    <AvatarImage src={leader.user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {leader.user?.firstName?.[0]}{leader.user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {leaders.length === 1 && (
                <span className="text-sm text-muted-foreground ml-1">
                  {leaders[0].user?.firstName} {leaders[0].user?.lastName}
                  {leaders[0].isPrimary && <Crown className="w-3 h-3 inline ml-1 text-amber-500" />}
                </span>
              )}
              {leaders.length > 1 && (
                <span className="text-sm text-muted-foreground ml-1">
                  {leaders.length} leaders
                </span>
              )}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sub-Ministries</p>
            <div className="space-y-1 pl-4 border-l-2 border-muted">
              {childMinistries.map((child) => (
                <div key={child.id} className="text-sm py-1 flex items-center justify-between">
                  <span>{child.name}</span>
                  <Badge variant="secondary" className="text-xs">{child.category}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MinistriesManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [selectedLeaderRole, setSelectedLeaderRole] = useState<string>("leader");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "",
      description: "",
      parentMinistryId: null,
      leaderId: null,
      requiresBackgroundCheck: false,
      requiresSpiritBaptism: false,
      requiresHolySpiritClass: false,
      minimumAge: null,
      isActive: true,
      sortOrder: 0,
    },
  });

  const { data: ministries, isLoading } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: allAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments", "all"],
  });

  // Fetch leaders for the currently editing ministry
  const { data: currentMinistryLeaders, refetch: refetchLeaders } = useQuery<MinistryLeaderWithUser[]>({
    queryKey: ["/api/ministries", editingMinistry?.id, "leaders"],
    enabled: !!editingMinistry,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/ministries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries"] });
      toast({ title: "Ministry Created", description: "The ministry has been created successfully." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create ministry.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      return apiRequest("PATCH", `/api/ministries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries"] });
      toast({ title: "Ministry Updated", description: "The ministry has been updated successfully." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update ministry.", variant: "destructive" });
    },
  });

  const addLeaderMutation = useMutation({
    mutationFn: async ({ ministryId, userId, role, isPrimary }: { ministryId: string; userId: string; role: string; isPrimary?: boolean }) => {
      return apiRequest("POST", `/api/ministries/${ministryId}/leaders`, { userId, role, isPrimary });
    },
    onSuccess: () => {
      if (editingMinistry) {
        queryClient.invalidateQueries({ queryKey: ["/api/ministries", editingMinistry.id, "leaders"] });
      }
      toast({ title: "Leader Added", description: "The leader has been added to this ministry." });
      setSelectedLeaderId("");
      setSelectedLeaderRole("leader");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add leader.", variant: "destructive" });
    },
  });

  const removeLeaderMutation = useMutation({
    mutationFn: async ({ ministryId, userId }: { ministryId: string; userId: string }) => {
      return apiRequest("DELETE", `/api/ministries/${ministryId}/leaders/${userId}`);
    },
    onSuccess: () => {
      if (editingMinistry) {
        queryClient.invalidateQueries({ queryKey: ["/api/ministries", editingMinistry.id, "leaders"] });
      }
      toast({ title: "Leader Removed", description: "The leader has been removed from this ministry." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove leader.", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMinistry(null);
    setSelectedLeaderId("");
    setSelectedLeaderRole("leader");
    form.reset({
      name: "",
      slug: "",
      category: "",
      description: "",
      parentMinistryId: null,
      leaderId: null,
      requiresBackgroundCheck: false,
      requiresSpiritBaptism: false,
      requiresHolySpiritClass: false,
      minimumAge: null,
      isActive: true,
      sortOrder: 0,
    });
  };

  const openEditDialog = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    form.reset({
      name: ministry.name,
      slug: ministry.slug,
      category: ministry.category,
      description: ministry.description || "",
      parentMinistryId: ministry.parentMinistryId || null,
      leaderId: ministry.leaderId,
      requiresBackgroundCheck: ministry.requiresBackgroundCheck || false,
      requiresSpiritBaptism: ministry.requiresSpiritBaptism || false,
      requiresHolySpiritClass: ministry.requiresHolySpiritClass || false,
      minimumAge: ministry.minimumAge,
      isActive: ministry.isActive ?? true,
      sortOrder: ministry.sortOrder || 0,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingMinistry) {
      updateMutation.mutate({ id: editingMinistry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredMinistries = (ministries || []).filter(ministry => {
    const matchesSearch = ministry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ministry.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ministry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getMemberCount = (ministryId: string): number => {
    return (allAssignments || []).filter(a => a.ministryId === ministryId).length;
  };

  const getChildMinistries = (parentId: string): Ministry[] => {
    return (ministries || []).filter(m => m.parentMinistryId === parentId);
  };

  const getParentMinistry = (parentId: string | null): Ministry | undefined => {
    if (!parentId) return undefined;
    return ministries?.find(m => m.id === parentId);
  };

  // Get parent ministries (ministries that can be parents - ones without a parent)
  const parentMinistryOptions = (ministries || []).filter(m => 
    m.isActive && !m.parentMinistryId && m.id !== editingMinistry?.id
  );

  const categoryStats = MINISTRY_CATEGORIES.map(cat => ({
    category: cat,
    count: (ministries || []).filter(m => m.category === cat && m.isActive).length,
  }));

  const leaderOptions = (users || []).filter(u => 
    ['admin', 'pastor', 'leader'].includes(u.role || '')
  );

  // Filter out users already assigned as leaders for this ministry
  const availableLeaderOptions = leaderOptions.filter(u => 
    !currentMinistryLeaders?.some(l => l.userId === u.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Ministries</h1>
          <p className="text-muted-foreground">Manage church ministries and their requirements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-ministry">
              <Plus className="w-4 h-4 mr-2" />
              Add Ministry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMinistry ? "Edit Ministry" : "Create Ministry"}</DialogTitle>
              <DialogDescription>
                {editingMinistry ? "Update the ministry details below." : "Add a new ministry to the church."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ministry Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Kingdom Children" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (!editingMinistry) {
                                form.setValue('slug', generateSlug(e.target.value));
                              }
                            }}
                            data-testid="input-ministry-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="kingdom-children" {...field} data-testid="input-ministry-slug" />
                        </FormControl>
                        <FormDescription>URL-friendly identifier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ministry-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MINISTRY_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe this ministry..." 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-ministry-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentMinistryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Ministry (Group)</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-parent-ministry">
                            <SelectValue placeholder="Select parent ministry (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No parent (top-level ministry)</SelectItem>
                          {parentMinistryOptions.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Group this ministry under a parent. Example: "Greeters" under "Landing Team"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multiple Leaders Section - only show when editing */}
                {editingMinistry && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Ministry Leaders</h4>
                      <Badge variant="secondary">{currentMinistryLeaders?.length || 0} leaders</Badge>
                    </div>
                    
                    {/* Current Leaders */}
                    {currentMinistryLeaders && currentMinistryLeaders.length > 0 ? (
                      <div className="space-y-2">
                        {currentMinistryLeaders.map((leader) => (
                          <div key={leader.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={leader.user?.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {leader.user?.firstName?.[0]}{leader.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {leader.user?.firstName} {leader.user?.lastName}
                                  {leader.isPrimary && (
                                    <Crown className="w-3 h-3 inline ml-1 text-amber-500" />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">{leader.role}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLeaderMutation.mutate({ 
                                ministryId: editingMinistry.id, 
                                userId: leader.userId 
                              })}
                              disabled={removeLeaderMutation.isPending}
                              data-testid={`button-remove-leader-${leader.userId}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No leaders assigned yet.</p>
                    )}

                    {/* Add New Leader */}
                    <div className="flex gap-2">
                      <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                        <SelectTrigger className="flex-1" data-testid="select-add-leader">
                          <SelectValue placeholder="Select a person to add as leader" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLeaderOptions.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedLeaderRole} onValueChange={setSelectedLeaderRole}>
                        <SelectTrigger className="w-32" data-testid="select-leader-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leader">Leader</SelectItem>
                          <SelectItem value="co-leader">Co-Leader</SelectItem>
                          <SelectItem value="assistant">Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (selectedLeaderId && editingMinistry) {
                            addLeaderMutation.mutate({
                              ministryId: editingMinistry.id,
                              userId: selectedLeaderId,
                              role: selectedLeaderRole,
                              isPrimary: currentMinistryLeaders?.length === 0,
                            });
                          }
                        }}
                        disabled={!selectedLeaderId || addLeaderMutation.isPending}
                        data-testid="button-add-leader"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Legacy single leader - for backwards compatibility */}
                <FormField
                  control={form.control}
                  name="leaderId"
                  render={({ field }) => (
                    <FormItem className={editingMinistry ? "hidden" : ""}>
                      <FormLabel>Primary Leader</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ministry-leader">
                            <SelectValue placeholder="Select a leader (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No leader assigned</SelectItem>
                          {leaderOptions.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Requirements</h4>
                  
                  <FormField
                    control={form.control}
                    name="requiresBackgroundCheck"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Background Check Required</FormLabel>
                          <FormDescription>For ministries involving children or vulnerable populations</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} data-testid="switch-background-check" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresSpiritBaptism"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Spirit Baptism Required</FormLabel>
                          <FormDescription>For worship and prayer ministries</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} data-testid="switch-spirit-baptism" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiresHolySpiritClass"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Holy Spirit Class Required</FormLabel>
                          <FormDescription>Completion of Holy Spirit training class</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} data-testid="switch-holy-spirit-class" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimumAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Age</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 18" 
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-minimum-age"
                          />
                        </FormControl>
                        <FormDescription>Leave empty if no age requirement</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active Ministry</FormLabel>
                        <FormDescription>Paused ministries won't appear in member-facing lists</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-is-active" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-ministry"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingMinistry ? "Save Changes" : "Create Ministry"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {categoryStats.slice(0, 4).map(({ category, count }) => (
          <Card 
            key={category} 
            className="cursor-pointer hover-elevate"
            onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{category}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Ministries</CardTitle>
              <CardDescription>{filteredMinistries.length} ministries</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ministries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-ministries"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {MINISTRY_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMinistries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No ministries found matching your criteria.</p>
              <Button variant="ghost" onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMinistries.map(ministry => (
                <MinistryCard
                  key={ministry.id}
                  ministry={ministry}
                  onEdit={() => openEditDialog(ministry)}
                  memberCount={getMemberCount(ministry.id)}
                  leaders={[]}
                  childMinistries={getChildMinistries(ministry.id)}
                  parentMinistry={getParentMinistry(ministry.parentMinistryId)}
                  allMinistries={ministries || []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
