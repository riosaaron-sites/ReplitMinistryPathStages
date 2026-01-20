import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, BookOpen, Search, Users, CheckCircle, Clock, AlertCircle, Trash2, HelpCircle, FileQuestion, ThumbsUp, ThumbsDown, ClipboardList } from "lucide-react";
import { HelpLink } from "@/components/HelpLink";
import type { TrainingModule, UserTrainingProgress, User, Ministry } from "@shared/schema";
import { insertTrainingModuleSchema, DISCIPLESHIP_STEPS } from "@shared/schema";
import { z } from "zod";

// Assessment interface matching GET /api/training/assessments/:moduleId response
interface Assessment {
  id: string;
  moduleId: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation?: string;
}

// Assessment creation/update payload for backend
interface AssessmentPayload {
  moduleId: string;
  questionText: string;
  options: string[];
  correctAnswer: string; // 'A', 'B', 'C', 'D' letter format for backend
  explanation?: string;
  sortOrder?: number;
}

const formSchema = insertTrainingModuleSchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  description: z.string().optional(),
  audience: z.enum(['all', 'leader', 'ministry']).optional().default('all'),
});

type FormData = z.infer<typeof formSchema>;

function TrainingCard({
  training,
  onEdit,
  onManageQuestions,
  onDelete,
  enrolledCount,
  completedCount,
  ministry,
}: {
  training: TrainingModule;
  onEdit: () => void;
  onManageQuestions: () => void;
  onDelete: () => void;
  enrolledCount: number;
  completedCount: number;
  ministry?: Ministry;
}) {
  const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  return (
    <Card className="hover-elevate" data-testid={`card-training-${training.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{training.title}</CardTitle>
              {!training.isPublished && (
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              )}
              {training.isRequired && (
                <Badge variant="default" className="text-xs">Required{ministry ? ` for ${ministry.name}` : ""}</Badge>
              )}
            </div>
            <CardDescription className="mt-1">{ministry?.name || "General"}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onManageQuestions} data-testid={`button-manage-questions-${training.id}`}>
              <FileQuestion className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-training-${training.id}`}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive" data-testid={`button-delete-training-${training.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {training.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{training.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion Rate</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{enrolledCount} enrolled</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{completedCount} completed</span>
            </div>
          </div>
          {training.pathStep && (
            <Badge variant="outline" className="text-xs">
              {training.pathStep}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UserProgressRow({
  progress,
  user,
  training,
}: {
  progress: UserTrainingProgress;
  user?: User;
  training?: TrainingModule;
}) {
  const statusColors: Record<string, string> = {
    completed: "text-green-600 bg-green-100",
    in_progress: "text-amber-600 bg-amber-100",
    not_started: "text-gray-600 bg-gray-100",
  };

  const statusLabels: Record<string, string> = {
    completed: "Completed",
    in_progress: "In Progress",
    not_started: "Not Started",
  };

  const status = progress.status || "not_started";

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card" data-testid={`row-progress-${progress.id}`}>
      <Avatar className="w-10 h-10">
        <AvatarImage src={user?.profileImageUrl || undefined} />
        <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
        <p className="text-sm text-muted-foreground">{training?.title}</p>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={progress.progressPercent || 0} className="w-24 h-2" />
        <span className="text-sm font-medium w-12">{progress.progressPercent || 0}%</span>
        <Badge className={statusColors[status] || statusColors.not_started}>
          {statusLabels[status] || "Not Started"}
        </Badge>
      </div>
    </div>
  );
}

export default function TrainingManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [ministryFilter, setMinistryFilter] = useState<string>("all");
  const [publishFilter, setPublishFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingModule | null>(null);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [managingQuestionsTraining, setManagingQuestionsTraining] = useState<TrainingModule | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Assessment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      ministryId: null,
      isRequired: false,
      isPublished: true,
      sortOrder: 0,
      pathStep: null,
      estimatedMinutes: 30,
      passingScore: 80,
      xpReward: 100,
      audience: 'all',
    },
  });

  const { data: trainings, isLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules?includeAll=true"],
  });

  const { data: allProgress } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress/all"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  // Training submissions pending approval (ministry-scoped)
  interface TrainingSubmission {
    id: string;
    moduleId: string;
    userId: string;
    status: string;
    submittedAt?: string;
    assessmentScore?: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      profileImageUrl?: string;
    };
    module: {
      id: string;
      title: string;
      description?: string;
      ministryId?: string;
    } | null;
    ministry: {
      id: string;
      name: string;
    } | null;
  }

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<TrainingSubmission[]>({
    queryKey: ["/api/training/submissions"],
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (progressId: string) => {
      return apiRequest("POST", `/api/training/progress/${progressId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress/all"] });
      toast({ title: "Readiness Affirmed", description: "The team member has been notified they're cleared for ministry service." });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to approve training.";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ progressId, feedback }: { progressId: string; feedback: string }) => {
      return apiRequest("POST", `/api/training/progress/${progressId}/reject`, { feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress/all"] });
      setRejectingId(null);
      setRejectFeedback("");
      toast({ title: "Training Returned", description: "The team member has been notified with your feedback." });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to reject training.";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/training/modules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ title: "Training Created", description: "The training module has been created." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create training module.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      console.log("Updating training module:", id, "with data:", data);
      try {
        const result = await apiRequest("PATCH", `/api/training/modules/${id}`, data);
        return result;
      } catch (err: any) {
        // Mobile-friendly error - show alert so user can see it
        const errorMsg = err?.message || "Unknown error";
        if (errorMsg.includes("401")) {
          alert("Session expired. Please log out and log back in to save changes.");
        }
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Training module updated successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ title: "Training Updated", description: "The training module has been updated." });
      closeDialog();
    },
    onError: (error: any) => {
      console.error("Failed to update training module:", error);
      const errorMsg = error?.message || "Unknown error";
      if (errorMsg.includes("401")) {
        toast({ title: "Session Expired", description: "Please log out and log back in, then try again.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to update training module. Please try logging in again.", variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/training/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress/all"] });
      toast({ title: "Training Deleted", description: "The training module has been permanently deleted." });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete training module. You may not have admin access.", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTraining(null);
    form.reset({
      title: "",
      slug: "",
      description: "",
      ministryId: null,
      isRequired: false,
      isPublished: true,
      sortOrder: 0,
      pathStep: null,
      estimatedMinutes: 30,
      passingScore: 80,
      xpReward: 100,
      audience: 'all',
    });
  };

  const openEditDialog = (training: TrainingModule) => {
    setEditingTraining(training);
    form.reset({
      title: training.title,
      slug: training.slug,
      description: training.description || "",
      ministryId: training.ministryId,
      isRequired: training.isRequired || false,
      isPublished: training.isPublished ?? true,
      sortOrder: training.sortOrder || 0,
      pathStep: training.pathStep,
      estimatedMinutes: training.estimatedMinutes || 30,
      passingScore: training.passingScore || 80,
      xpReward: training.xpReward || 100,
      audience: (training.audience as 'all' | 'leader' | 'ministry') || 'all',
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    // Auto-sanitize slug to prevent issues with spaces/capitals
    const sanitizedData = {
      ...data,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    };
    console.log("Form submitted with data:", sanitizedData);
    if (editingTraining) {
      console.log("Updating training:", editingTraining.id);
      updateMutation.mutate({ id: editingTraining.id, data: sanitizedData });
    } else {
      console.log("Creating new training");
      createMutation.mutate(sanitizedData);
    }
  };

  // Debug: Log form errors when they change
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log("Form validation errors:", formErrors);
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredTrainings = (trainings || []).filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesMinistry = ministryFilter === "all" || t.ministryId === ministryFilter || (!t.ministryId && ministryFilter === "general");
    const matchesPublish = publishFilter === "all" || 
      (publishFilter === "published" && t.isPublished) ||
      (publishFilter === "unpublished" && !t.isPublished);
    return matchesSearch && matchesMinistry && matchesPublish;
  });

  const getEnrolledCount = (trainingId: string) => 
    (allProgress || []).filter(p => p.moduleId === trainingId).length;
  
  const getCompletedCount = (trainingId: string) =>
    (allProgress || []).filter(p => p.moduleId === trainingId && p.status === 'completed').length;

  const getUserById = (userId: string) => users?.find(u => u.id === userId);
  const getTrainingById = (moduleId: string) => trainings?.find(t => t.id === moduleId);
  const getMinistryById = (ministryId: string | null) => ministryId ? ministries?.find(m => m.id === ministryId) : undefined;

  const stats = {
    total: trainings?.length || 0,
    active: trainings?.filter(t => t.isPublished).length || 0,
    inProgress: (allProgress || []).filter(p => p.status === 'in_progress').length,
    completed: (allProgress || []).filter(p => p.status === 'completed').length,
  };

  const recentProgress = (allProgress || [])
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Training Management</h1>
            <p className="text-muted-foreground">Create and manage training modules for your team</p>
          </div>
          <HelpLink category="admin" tooltip="Training Help" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-training">
              <Plus className="w-4 h-4 mr-2" />
              Add Training
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTraining ? "Edit Training" : "Create Training"}</DialogTitle>
              <DialogDescription>
                {editingTraining ? "Update the training module details." : "Add a new training module for your team."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Following Jesus Course" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              if (!editingTraining) {
                                form.setValue('slug', generateSlug(e.target.value));
                              }
                            }}
                            data-testid="input-training-title" 
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
                          <Input placeholder="following-jesus" {...field} data-testid="input-training-slug" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this training covers..." 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-training-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ministryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ministry</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ministry">
                              <SelectValue placeholder="Select ministry (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">General (All ministries)</SelectItem>
                            {ministries?.map(ministry => (
                              <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="audience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who Should See This</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'all'}>
                          <FormControl>
                            <SelectTrigger data-testid="select-audience">
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="leader">Leaders & Pastors Only</SelectItem>
                            <SelectItem value="ministry">Ministry Members Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Controls who can see this training</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pathStep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discipleship Path Step</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-path-step">
                              <SelectValue placeholder="Link to path (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No path link</SelectItem>
                            {DISCIPLESHIP_STEPS.map(step => (
                              <SelectItem key={step.id} value={step.id}>{step.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Links training completion to discipleship advancement</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            value={field.value || 30}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passingScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing Score (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            value={field.value || 80}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 80)}
                            data-testid="input-passing-score"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="xpReward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Progress Weight</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            value={field.value || 100}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                            data-testid="input-progress-weight"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Required Training</FormLabel>
                          <FormDescription>Mark as required for ministry participation</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} data-testid="switch-required" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Published</FormLabel>
                          <FormDescription>Make this training visible to members</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-published" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-training"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingTraining ? "Save Changes" : "Create Training"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Trainings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-active">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-in-progress">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-completed">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trainings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvals" data-testid="tab-approvals" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Pending Approvals
            {submissions.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {submissions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trainings" data-testid="tab-trainings">Training Modules</TabsTrigger>
          <TabsTrigger value="progress" data-testid="tab-progress">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Training Submissions Awaiting Your Approval
              </CardTitle>
              <CardDescription>
                Review and approve training completions for your ministry team members.
                You can only approve trainings for ministries you lead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>All caught up! No pending approvals.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="border" data-testid={`card-submission-${submission.id}`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={submission.user.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {submission.user.firstName?.[0]}{submission.user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {submission.user.firstName} {submission.user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {submission.module?.title || "Unknown Training"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {submission.ministry && (
                                  <Badge variant="outline" className="text-xs">
                                    {submission.ministry.name}
                                  </Badge>
                                )}
                                {submission.assessmentScore !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {submission.assessmentScore}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="text-sm text-muted-foreground mr-2">
                              {submission.submittedAt && (
                                <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            
                            {rejectingId === submission.id ? (
                              <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <Textarea
                                  placeholder="Provide feedback for revision..."
                                  value={rejectFeedback}
                                  onChange={(e) => setRejectFeedback(e.target.value)}
                                  className="min-w-[200px]"
                                  data-testid={`input-reject-feedback-${submission.id}`}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={!rejectFeedback.trim() || rejectMutation.isPending}
                                    onClick={() => rejectMutation.mutate({ 
                                      progressId: submission.id, 
                                      feedback: rejectFeedback 
                                    })}
                                    data-testid={`button-confirm-reject-${submission.id}`}
                                  >
                                    {rejectMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Send Feedback"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectingId(null);
                                      setRejectFeedback("");
                                    }}
                                    data-testid={`button-cancel-reject-${submission.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={approveMutation.isPending}
                                  onClick={() => approveMutation.mutate(submission.id)}
                                  data-testid={`button-approve-${submission.id}`}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <ThumbsUp className="w-4 h-4 mr-1" />
                                  )}
                                  Affirm Readiness
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectingId(submission.id)}
                                  data-testid={`button-reject-${submission.id}`}
                                >
                                  <ThumbsDown className="w-4 h-4 mr-1" />
                                  Needs Follow-Up
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Training Modules</CardTitle>
                  <CardDescription>{filteredTrainings.length} modules</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search trainings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                      data-testid="input-search-trainings"
                    />
                  </div>
                  <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-ministry-filter">
                      <SelectValue placeholder="Filter by ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ministries</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      {ministries?.map(ministry => (
                        <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={publishFilter} onValueChange={setPublishFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-publish-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="unpublished">Unpublished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTrainings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No training modules found.</p>
                  <Button variant="ghost" onClick={() => { setSearchQuery(""); setMinistryFilter("all"); setPublishFilter("all"); }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTrainings.map(training => (
                    <TrainingCard
                      key={training.id}
                      training={training}
                      onEdit={() => openEditDialog(training)}
                      onManageQuestions={() => {
                        setManagingQuestionsTraining(training);
                        setQuestionsDialogOpen(true);
                      }}
                      onDelete={() => setDeleteConfirmId(training.id)}
                      enrolledCount={getEnrolledCount(training.id)}
                      completedCount={getCompletedCount(training.id)}
                      ministry={getMinistryById(training.ministryId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Training Activity</CardTitle>
              <CardDescription>Latest progress updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProgress.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No training activity yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProgress.map(progress => (
                    <UserProgressRow
                      key={progress.id}
                      progress={progress}
                      user={getUserById(progress.userId)}
                      training={getTrainingById(progress.moduleId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this training module? This will also delete all associated quiz questions and user progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
