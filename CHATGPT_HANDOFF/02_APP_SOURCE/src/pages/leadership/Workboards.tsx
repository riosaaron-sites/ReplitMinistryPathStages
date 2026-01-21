import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { 
  ClipboardList, Plus, CheckCircle2, Circle, Clock,
  AlertCircle, Loader2, Calendar, User, MessageSquare,
  ChevronRight, Trash2, Edit3, ArrowRight, Target, Users
} from "lucide-react";
import { format } from "date-fns";
import type { Ministry } from "@shared/schema";

interface Workboard {
  id: string;
  title: string;
  description: string | null;
  ministryId: string | null;
  status: string;
  mode: 'meeting' | 'ministry';
  agenda: string | null;
  decisions: string | null;
  notes: string | null;
  meetingDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ActionItem {
  id: string;
  workboardId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const createWorkboardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  ministryId: z.string().optional(),
  mode: z.enum(['meeting', 'ministry']).default('ministry'),
  agenda: z.string().optional(),
  meetingDate: z.string().optional(),
});

const createItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.string().default("normal"),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

type CreateWorkboardData = z.infer<typeof createWorkboardSchema>;
type CreateItemData = z.infer<typeof createItemSchema>;

function WorkboardCard({ 
  workboard, 
  onClick,
  onDelete,
}: { 
  workboard: Workboard;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    planning: "bg-blue-500",
    completed: "bg-gray-400",
    archived: "bg-gray-300",
  };

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick} data-testid={`card-workboard-${workboard.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-2 h-2 rounded-full ${statusColors[workboard.status] || 'bg-gray-400'}`} />
            <CardTitle className="text-base">{workboard.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {workboard.mode === 'meeting' ? (
                <><Users className="h-3 w-3 mr-1" /> Meeting</>
              ) : (
                <><Target className="h-3 w-3 mr-1" /> Initiative</>
              )}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">{workboard.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {workboard.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{workboard.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {workboard.mode === 'meeting' && workboard.meetingDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(workboard.meetingDate), 'MMM d, yyyy')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {format(new Date(workboard.updatedAt), 'MMM d')}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 justify-between">
        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onClick(); }} data-testid={`button-open-workboard-${workboard.id}`}>
          Open Board
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-workboard-${workboard.id}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function ActionItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ActionItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priorityColors: Record<string, string> = {
    high: "text-red-500",
    normal: "text-blue-500",
    low: "text-gray-400",
  };

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg border border-transparent hover-elevate ${item.status === 'completed' ? 'opacity-60' : ''}`}
      data-testid={`action-item-${item.id}`}
    >
      <Checkbox 
        checked={item.status === 'completed'} 
        onCheckedChange={onToggle}
        className="mt-0.5"
        data-testid={`checkbox-item-${item.id}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${item.status === 'completed' ? 'line-through' : 'font-medium'}`}>
            {item.title}
          </span>
          {item.priority !== 'normal' && (
            <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority]}`}>
              {item.priority}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {item.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {format(new Date(item.dueDate), 'MMM d')}
            </span>
          )}
          {item.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Assigned
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} data-testid={`button-edit-item-${item.id}`}>
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} data-testid={`button-delete-item-${item.id}`}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function Workboards() {
  const { user, isAuthenticated, isLeader } = useRole();
  const { toast } = useToast();
  
  const [selectedWorkboard, setSelectedWorkboard] = useState<Workboard | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Workboard | null>(null);

  const { data: workboards, isLoading: workboardsLoading } = useQuery<Workboard[]>({
    queryKey: ['/api/workboards'],
    enabled: isAuthenticated,
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ['/api/ministries'],
    enabled: isAuthenticated,
  });

  const { data: actionItems, isLoading: itemsLoading } = useQuery<ActionItem[]>({
    queryKey: ['/api/workboards', selectedWorkboard?.id, 'items'],
    enabled: !!selectedWorkboard,
  });

  const createForm = useForm<CreateWorkboardData>({
    resolver: zodResolver(createWorkboardSchema),
    defaultValues: {
      title: "",
      description: "",
      ministryId: "",
      mode: "ministry",
      agenda: "",
      meetingDate: "",
    },
  });

  const itemForm = useForm<CreateItemData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      assignedTo: "",
      dueDate: "",
    },
  });

  const createWorkboardMutation = useMutation({
    mutationFn: async (data: CreateWorkboardData) => {
      return await apiRequest('POST', '/api/workboards', {
        ...data,
        meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
        ministryId: data.ministryId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workboards'] });
      setCreateOpen(false);
      createForm.reset();
      toast({ title: "Workboard created" });
    },
    onError: () => {
      toast({ title: "Failed to create workboard", variant: "destructive" });
    },
  });

  const deleteWorkboardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/workboards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workboards'] });
      setDeleteConfirm(null);
      if (selectedWorkboard?.id === deleteConfirm?.id) {
        setSelectedWorkboard(null);
      }
      toast({ title: "Workboard deleted" });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: CreateItemData) => {
      if (!selectedWorkboard) return;
      return await apiRequest('POST', `/api/workboards/${selectedWorkboard.id}/items`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedTo: data.assignedTo || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workboards', selectedWorkboard?.id, 'items'] });
      setAddItemOpen(false);
      itemForm.reset();
      toast({ title: "Action item added" });
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async (item: ActionItem) => {
      const newStatus = item.status === 'completed' ? 'pending' : 'completed';
      return await apiRequest('PATCH', `/api/action-items/${item.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workboards', selectedWorkboard?.id, 'items'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/action-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workboards', selectedWorkboard?.id, 'items'] });
      toast({ title: "Action item deleted" });
    },
  });

  if (workboardsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  // Detail View
  if (selectedWorkboard) {
    const pendingItems = actionItems?.filter(i => i.status !== 'completed') || [];
    const completedItems = actionItems?.filter(i => i.status === 'completed') || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedWorkboard(null)} data-testid="button-back-workboards">
            <ArrowRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-xl">{selectedWorkboard.title}</CardTitle>
                {selectedWorkboard.description && (
                  <CardDescription className="mt-1">{selectedWorkboard.description}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedWorkboard.meetingDate && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(selectedWorkboard.meetingDate), 'MMM d, yyyy')}
                  </Badge>
                )}
                <Badge variant="secondary" className="capitalize">{selectedWorkboard.status}</Badge>
              </div>
            </div>
          </CardHeader>
          {selectedWorkboard.agenda && (
            <CardContent className="pt-0">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium text-sm mb-2">Agenda</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedWorkboard.agenda}</p>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Action Items</h3>
          <Button size="sm" onClick={() => setAddItemOpen(true)} data-testid="button-add-action-item">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            {itemsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {pendingItems.length === 0 && completedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No action items yet</p>
                    <p className="text-sm">Add your first action item to get started</p>
                  </div>
                )}
                
                {pendingItems.map(item => (
                  <ActionItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItemMutation.mutate(item)}
                    onEdit={() => {}}
                    onDelete={() => deleteItemMutation.mutate(item.id)}
                  />
                ))}
                
                {completedItems.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-4 pb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Completed ({completedItems.length})
                      </span>
                    </div>
                    {completedItems.map(item => (
                      <ActionItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => toggleItemMutation.mutate(item)}
                        onEdit={() => {}}
                        onDelete={() => deleteItemMutation.mutate(item.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Item Dialog */}
        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Action Item</DialogTitle>
              <DialogDescription>Create a new action item for this workboard.</DialogDescription>
            </DialogHeader>
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit((data) => createItemMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={itemForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Action item title" {...field} data-testid="input-item-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional details..." {...field} data-testid="input-item-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-item-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={itemForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-item-duedate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                    {createItemMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Add Item
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-serif-display">Workboards</h1>
          <p className="text-muted-foreground">Collaborate on ministry agendas, track action items, and plan together.</p>
        </div>
        {isLeader && (
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-workboard">
            <Plus className="h-4 w-4 mr-1" />
            New Workboard
          </Button>
        )}
      </div>

      {workboards && workboards.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workboards.map(board => (
            <WorkboardCard
              key={board.id}
              workboard={board}
              onClick={() => setSelectedWorkboard(board)}
              onDelete={() => setDeleteConfirm(board)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No workboards yet</h3>
              <p className="text-sm mb-4">Create a workboard to start collaborating with your team.</p>
              {isLeader && (
                <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-workboard">
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Workboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Workboard Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Workboard</DialogTitle>
            <DialogDescription>Create a new workboard for planning and collaboration.</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createWorkboardMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sunday Service Planning" {...field} data-testid="input-workboard-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is this workboard about?" {...field} data-testid="input-workboard-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'ministry'}>
                      <FormControl>
                        <SelectTrigger data-testid="select-workboard-mode">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ministry">Ministry Initiative</SelectItem>
                        <SelectItem value="meeting">Meeting / Agenda</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value === 'meeting' 
                        ? 'For team meetings with agenda, decisions, and notes'
                        : 'For ongoing ministry initiatives and projects'}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="ministryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ministry (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-workboard-ministry">
                          <SelectValue placeholder="Select a ministry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ministries?.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="meetingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-workboard-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="agenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agenda (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Meeting agenda items..." className="min-h-[100px]" {...field} data-testid="input-workboard-agenda" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createWorkboardMutation.isPending} data-testid="button-submit-workboard">
                  {createWorkboardMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create Workboard
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.title}"? This will also delete all action items and comments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && deleteWorkboardMutation.mutate(deleteConfirm.id)}
              disabled={deleteWorkboardMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteWorkboardMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
