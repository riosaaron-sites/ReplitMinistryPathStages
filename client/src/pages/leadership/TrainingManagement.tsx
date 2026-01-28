import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Loader2, Plus, Pencil, BookOpen, Search, Users, CheckCircle, Clock, AlertCircle, Trash2, HelpCircle, FileQuestion, ThumbsUp, ThumbsDown, ClipboardList, Zap, Link2, Settings2, RefreshCw, FileEdit, FileText, Archive, Eye } from "lucide-react";
import { HelpLink } from "@/components/HelpLink";
import type { TrainingModule as BaseTrainingModule, UserTrainingProgress, User, Ministry } from "@shared/schema";
import { insertTrainingModuleSchema, DISCIPLESHIP_STEPS } from "@shared/schema";
import { z } from "zod";

// Extended TrainingModule type with moduleStatus explicitly typed
// (moduleStatus is in the database schema but TypeScript inference may not pick it up correctly)
type TrainingModule = BaseTrainingModule & {
  moduleStatus: 'draft' | 'live' | 'archived' | null;
  manualId?: string | null;
  isOnboardingRequired?: boolean;
};

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
  isOnboardingRequired: z.boolean().optional().default(false),
  positionId: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper function to safely get moduleStatus with proper typing
const getModuleStatus = (training: TrainingModule): 'draft' | 'live' | 'archived' => {
  const status = training.moduleStatus;
  if (status === 'live' || status === 'archived') return status;
  return 'draft'; // Default for null/undefined
};

function TrainingCard({
  training,
  onEdit,
  enrolledCount,
  completedCount,
  ministry,
}: {
  training: TrainingModule;
  onEdit: () => void;
  enrolledCount: number;
  completedCount: number;
  ministry?: Ministry;
}) {
  const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;
  
  const moduleStatus = getModuleStatus(training);
  const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string, icon: any }> = {
    draft: { variant: "secondary", label: "Draft", icon: FileEdit },
    live: { variant: "default", label: "Live", icon: Eye },
    archived: { variant: "outline", label: "Archived", icon: Archive },
  };
  const status = statusConfig[moduleStatus] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <Card className="hover-elevate" data-testid={`card-training-${training.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{training.title}</CardTitle>
              <Badge variant={status.variant} className="text-xs">
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              {training.manualId && (
                <Badge variant="outline" className="text-xs">
                  <Link2 className="w-3 h-3 mr-1" />
                  Manual Linked
                </Badge>
              )}
              {training.isRequired && (
                <Badge variant="default" className="text-xs">Required{ministry ? ` for ${ministry.name}` : ""}</Badge>
              )}
              {training.isOnboardingRequired && (
                <Badge variant="destructive" className="text-xs">Onboarding Required</Badge>
              )}
            </div>
            <CardDescription className="mt-1">{ministry?.name || "General"}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} data-testid={`button-edit-training-${training.id}`}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingModule | null>(null);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [managingQuestionsTraining, setManagingQuestionsTraining] = useState<TrainingModule | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Assessment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editPanelTraining, setEditPanelTraining] = useState<TrainingModule | null>(null);
  const [editPanelTab, setEditPanelTab] = useState<string>("details");
  const [, navigate] = useLocation();
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
    finalReflection?: string;
    lessonReflections?: Record<string, string>;
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
      lessons?: any[];
    } | null;
    ministry: {
      id: string;
      name: string;
    } | null;
  }
  
  // Extended type for viewing full submission details
  type SubmissionWithDetails = TrainingSubmission;

  const { data: submissions = [], refetch: refetchSubmissions } = useQuery<TrainingSubmission[]>({
    queryKey: ["/api/training/submissions"],
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionWithDetails | null>(null);
  const [settingsTraining, setSettingsTraining] = useState<TrainingModule | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

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
      setEditPanelOpen(false);
      setEditPanelTraining(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete training module. You may not have admin access.", variant: "destructive" });
    },
  });

  // Archive/Unarchive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      return apiRequest("PATCH", `/api/training/modules/${id}`, { 
        moduleStatus: archive ? 'archived' : 'draft' 
      });
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ 
        title: archive ? "Training Archived" : "Training Unarchived", 
        description: archive 
          ? "The training is now hidden from members but history is preserved." 
          : "The training is now visible in draft status."
      });
      setEditPanelOpen(false);
      setEditPanelTraining(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update training status.", variant: "destructive" });
    },
  });

  // Publish/Republish mutation
  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      return apiRequest("PATCH", `/api/training/modules/${id}`, { 
        moduleStatus: publish ? 'live' : 'draft',
        publishedAt: publish ? new Date().toISOString() : null,
      });
    },
    onSuccess: (_, { publish }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ 
        title: publish ? "Training Published" : "Training Unpublished", 
        description: publish 
          ? "The training is now live and visible to members." 
          : "The training is now a draft and hidden from members."
      });
      // Refresh the edit panel training
      if (editPanelTraining) {
        const updatedTrainings = trainings?.find(t => t.id === editPanelTraining.id);
        if (updatedTrainings) {
          setEditPanelTraining({ ...updatedTrainings, moduleStatus: publish ? 'live' : 'draft' } as TrainingModule);
        }
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update training status.", variant: "destructive" });
    },
  });

  // Bulk action state
  const [bulkLinkResult, setBulkLinkResult] = useState<{
    fixed: { moduleTitle: string; manualTitle: string }[];
    stillUnlinked: { moduleTitle: string; reason: string }[];
  } | null>(null);
  const [bulkAnalyzeResult, setBulkAnalyzeResult] = useState<{
    total: number;
    results: { title: string; status: string }[];
  } | null>(null);

  // Bulk link trainings to manuals
  const linkManualsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/fix-training-links", {});
    },
    onSuccess: (data: any) => {
      setBulkLinkResult({
        fixed: data.fixed || [],
        stillUnlinked: data.stillUnlinked || [],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ 
        title: "Manuals Linked", 
        description: `${data.fixed?.length || 0} trainings linked to manuals.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Link Failed", 
        description: error?.message || "Failed to link trainings to manuals. Admin access required.", 
        variant: "destructive" 
      });
    },
  });

  // Bulk analyze manuals and generate content
  const analyzeManualsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/analyze-training-manuals", {});
    },
    onSuccess: (data: any) => {
      setBulkAnalyzeResult({
        total: data.total || 0,
        results: data.results?.map((r: any) => ({ title: r.title, status: r.status })) || [],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ 
        title: "Content Generation Started", 
        description: `${data.results?.filter((r: any) => r.status === 'started').length || 0} manuals queued for analysis.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Analysis Failed", 
        description: error?.message || "Failed to analyze manuals. Leadership access required.", 
        variant: "destructive" 
      });
    },
  });

  // Combined bulk action: link + generate
  const runBulkActionMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Link trainings to manuals
      const linkResult = await apiRequest("POST", "/api/admin/fix-training-links", {});
      // Step 2: Generate content for linked manuals
      const analyzeResult = await apiRequest("POST", "/api/admin/analyze-training-manuals", {});
      return { linkResult, analyzeResult };
    },
    onSuccess: (data: any) => {
      setBulkLinkResult({
        fixed: data.linkResult?.fixed || [],
        stillUnlinked: data.linkResult?.stillUnlinked || [],
      });
      setBulkAnalyzeResult({
        total: data.analyzeResult?.total || 0,
        results: data.analyzeResult?.results?.map((r: any) => ({ title: r.title, status: r.status })) || [],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      const linkedCount = data.linkResult?.fixed?.length || 0;
      const analyzedCount = data.analyzeResult?.results?.filter((r: any) => r.status === 'started').length || 0;
      toast({ 
        title: "Bulk Action Complete", 
        description: `${linkedCount} trainings linked, ${analyzedCount} manuals queued for content generation.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Bulk Action Failed", 
        description: error?.message || "Failed to complete bulk action. Admin access required.", 
        variant: "destructive" 
      });
    },
  });

  // State for force regen results
  const [forceRegenResult, setForceRegenResult] = useState<{
    totalTrainingsScanned: number;
    totalWithManual: number;
    regeneratedCount: number;
    skippedCount: number;
    failedCount: number;
    failures: { trainingId: string; title: string; reason: string }[];
    results: { trainingId: string; title: string; status: string; durationMs: number; lessonCount?: number; studyQuestionCount?: number; assessmentQuestionCount?: number }[];
    totalDurationMs: number;
    dbProof?: {
      before: { trainingsWithoutLessons: number; totalQuizQuestions: number };
      after: { trainingsWithoutLessons: number; totalQuizQuestions: number };
      sampleTrainings: any[];
    };
  } | null>(null);

  // Force regenerate all training content
  const forceRegenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/force-regenerate-trainings", { force: true });
    },
    onSuccess: (data: any) => {
      setForceRegenResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules?includeAll=true"] });
      toast({ 
        title: "Force Regeneration Complete", 
        description: `${data.regeneratedCount || 0} trainings regenerated, ${data.failedCount || 0} failed.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Force Regeneration Failed", 
        description: error?.message || "Failed to force regenerate trainings. Admin access required.", 
        variant: "destructive" 
      });
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

  // Calculate module counts by status (using helper defined at module level)
  const statusCounts = {
    live: (trainings || []).filter(t => getModuleStatus(t) === 'live').length,
    draft: (trainings || []).filter(t => getModuleStatus(t) === 'draft').length,
    archived: (trainings || []).filter(t => getModuleStatus(t) === 'archived').length,
  };

  const filteredTrainings = (trainings || []).filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesMinistry = ministryFilter === "all" || t.ministryId === ministryFilter || (!t.ministryId && ministryFilter === "general");
    const moduleStatus = getModuleStatus(t);
    const matchesStatus = statusFilter === "all" || moduleStatus === statusFilter;
    return matchesSearch && matchesMinistry && matchesStatus;
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
    live: statusCounts.live,
    draft: statusCounts.draft,
    archived: statusCounts.archived,
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
        <Link href="/leadership/training-studio">
          <Button data-testid="button-create-training">
            <Plus className="w-4 h-4 mr-2" />
            Create Training (Training Studio)
          </Button>
        </Link>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
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
                <p className="text-2xl font-bold" data-testid="stat-active">{stats.live}</p>
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
          <TabsTrigger value="bulk" data-testid="tab-bulk" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Bulk Actions
          </TabsTrigger>
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
                                  variant="ghost"
                                  onClick={() => setViewingSubmission(submission)}
                                  data-testid={`button-view-details-${submission.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
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
                                  Approve
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status ({stats.total})</SelectItem>
                      <SelectItem value="live">Live ({statusCounts.live})</SelectItem>
                      <SelectItem value="draft">Draft ({statusCounts.draft})</SelectItem>
                      <SelectItem value="archived">Archived ({statusCounts.archived})</SelectItem>
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
                  <Button variant="ghost" onClick={() => { setSearchQuery(""); setMinistryFilter("all"); setStatusFilter("all"); }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTrainings.map(training => (
                    <TrainingCard
                      key={training.id}
                      training={training}
                      onEdit={() => {
                        setEditPanelTraining(training);
                        setEditPanelOpen(true);
                      }}
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

        {/* Bulk Actions Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Bulk Link & Generate Training Content
              </CardTitle>
              <CardDescription>
                Automatically link training modules to their source manuals and generate lesson content using AI.
                This operation matches trainings to manuals by ministry and title, then queues content generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => runBulkActionMutation.mutate()}
                  disabled={runBulkActionMutation.isPending || linkManualsMutation.isPending || analyzeManualsMutation.isPending || forceRegenMutation.isPending}
                  data-testid="button-bulk-link-generate"
                >
                  {runBulkActionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Link & Generate All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => linkManualsMutation.mutate()}
                  disabled={runBulkActionMutation.isPending || linkManualsMutation.isPending || forceRegenMutation.isPending}
                  data-testid="button-link-manuals"
                >
                  {linkManualsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Link Manuals Only
                </Button>
                <Button
                  variant="outline"
                  onClick={() => analyzeManualsMutation.mutate()}
                  disabled={runBulkActionMutation.isPending || analyzeManualsMutation.isPending || forceRegenMutation.isPending}
                  data-testid="button-generate-content"
                >
                  {analyzeManualsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Generate Content Only
                </Button>
              </div>

              {/* Force Regen Section */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Force Regeneration (Admin Only)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Force regenerate ALL training content from linked manuals. This bypasses all "already processed" checks 
                  and completely overwrites existing lessons, study questions, and quiz content. Use with caution.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => forceRegenMutation.mutate()}
                  disabled={forceRegenMutation.isPending || runBulkActionMutation.isPending}
                  data-testid="button-force-regen-all"
                >
                  {forceRegenMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {forceRegenMutation.isPending ? "Processing..." : "FORCE REGEN ALL (RUN NOW)"}
                </Button>
              </div>

              {/* Force Regen Results */}
              {forceRegenResult && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Force Regeneration Results
                  </h3>
                  
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-background p-3 rounded text-center">
                      <div className="text-2xl font-bold">{forceRegenResult.totalTrainingsScanned}</div>
                      <div className="text-xs text-muted-foreground">Total Scanned</div>
                    </div>
                    <div className="bg-background p-3 rounded text-center">
                      <div className="text-2xl font-bold">{forceRegenResult.totalWithManual}</div>
                      <div className="text-xs text-muted-foreground">With Manual</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">{forceRegenResult.regeneratedCount}</div>
                      <div className="text-xs text-muted-foreground">Regenerated</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-amber-600">{forceRegenResult.skippedCount}</div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-center">
                      <div className="text-2xl font-bold text-red-600">{forceRegenResult.failedCount}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Total duration: {(forceRegenResult.totalDurationMs / 1000).toFixed(1)}s
                  </div>

                  {/* DB Proof */}
                  {forceRegenResult.dbProof && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Database Proof:</p>
                      <div className="bg-background p-3 rounded text-sm font-mono">
                        <div>Before: {forceRegenResult.dbProof.before.trainingsWithoutLessons} trainings without lessons, {forceRegenResult.dbProof.before.totalQuizQuestions} quiz questions</div>
                        <div>After: {forceRegenResult.dbProof.after.trainingsWithoutLessons} trainings without lessons, {forceRegenResult.dbProof.after.totalQuizQuestions} quiz questions</div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Results */}
                  {forceRegenResult.results.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Detailed Results ({forceRegenResult.results.length} trainings):</p>
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {forceRegenResult.results.map((item, idx) => (
                          <div key={idx} className={`flex items-center gap-2 text-sm p-2 rounded ${
                            item.status === 'UPDATED' ? 'bg-green-50 dark:bg-green-900/20' :
                            item.status === 'SKIPPED' ? 'bg-amber-50 dark:bg-amber-900/20' :
                            'bg-red-50 dark:bg-red-900/20'
                          }`}>
                            {item.status === 'UPDATED' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            {item.status === 'SKIPPED' && <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            {item.status === 'FAILED' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            <span className="font-medium flex-1">{item.title}</span>
                            <Badge variant={item.status === 'UPDATED' ? 'default' : item.status === 'SKIPPED' ? 'secondary' : 'destructive'}>
                              {item.status}
                            </Badge>
                            {item.lessonCount !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {item.studyQuestionCount} study Qs, {item.assessmentQuestionCount} quiz Qs
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{item.durationMs}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failures */}
                  {forceRegenResult.failures.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-600">Failures ({forceRegenResult.failures.length}):</p>
                      <div className="grid gap-2">
                        {forceRegenResult.failures.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">{item.title}</span>
                              <p className="text-xs text-muted-foreground">{item.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Link Results */}
              {bulkLinkResult && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Manual Linking Results
                  </h3>
                  
                  {bulkLinkResult.fixed.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Successfully Linked ({bulkLinkResult.fixed.length})
                      </p>
                      <div className="grid gap-2">
                        {bulkLinkResult.fixed.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="font-medium">{item.moduleTitle}</span>
                            <span className="text-muted-foreground">linked to</span>
                            <span>{item.manualTitle}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkLinkResult.stillUnlinked.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Could Not Link ({bulkLinkResult.stillUnlinked.length})
                      </p>
                      <div className="grid gap-2">
                        {bulkLinkResult.stillUnlinked.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="font-medium">{item.moduleTitle}</span>
                            <span className="text-muted-foreground">{item.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkLinkResult.fixed.length === 0 && bulkLinkResult.stillUnlinked.length === 0 && (
                    <p className="text-sm text-muted-foreground">All trainings are already linked to manuals.</p>
                  )}
                </div>
              )}

              {/* Analysis Results */}
              {bulkAnalyzeResult && (
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Content Generation Results
                  </h3>
                  
                  {bulkAnalyzeResult.results.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {bulkAnalyzeResult.results.filter(r => r.status === 'started').length} manuals queued,{' '}
                        {bulkAnalyzeResult.results.filter(r => r.status === 'completed').length} already done,{' '}
                        {bulkAnalyzeResult.results.filter(r => r.status === 'processing').length} in progress
                      </p>
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {bulkAnalyzeResult.results.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                            {item.status === 'started' && <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            {item.status === 'processing' && <Loader2 className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin" />}
                            <span className="font-medium">{item.title}</span>
                            <Badge variant={item.status === 'completed' ? 'default' : item.status === 'started' ? 'secondary' : 'outline'}>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No trainings need content generation. Either all are complete or none have linked manuals.
                    </p>
                  )}
                </div>
              )}

              {/* Help Text */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">How this works:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Link Manuals:</strong> Matches trainings to PDF manuals by ministry assignment and title similarity.</li>
                  <li><strong>Generate Content:</strong> Uses AI to extract lessons, study questions, and quiz content from linked PDFs.</li>
                  <li>Content generation runs in the background and may take several minutes per manual.</li>
                  <li>Already processed manuals are skipped automatically.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Training Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={(open) => {
        setSettingsDialogOpen(open);
        if (!open) setSettingsTraining(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Training Assignment Settings</DialogTitle>
            <DialogDescription>
              Configure who is required to complete this training
            </DialogDescription>
          </DialogHeader>
          {settingsTraining && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="onboardingRequired" className="text-base">Onboarding Required</Label>
                    <p className="text-sm text-muted-foreground">
                      All new users must complete this training
                    </p>
                  </div>
                  <Switch
                    id="onboardingRequired"
                    checked={(settingsTraining as any).isOnboardingRequired || false}
                    onCheckedChange={(checked) => {
                      updateMutation.mutate({
                        id: settingsTraining.id,
                        data: { isOnboardingRequired: checked } as any,
                      });
                      setSettingsTraining({
                        ...settingsTraining,
                        isOnboardingRequired: checked,
                      } as any);
                    }}
                    data-testid="switch-onboarding-required"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ministryRequired" className="text-base">Ministry Required</Label>
                    <p className="text-sm text-muted-foreground">
                      Required for members of selected ministry
                    </p>
                  </div>
                  <Switch
                    id="ministryRequired"
                    checked={settingsTraining.isRequired || false}
                    onCheckedChange={(checked) => {
                      updateMutation.mutate({
                        id: settingsTraining.id,
                        data: { isRequired: checked },
                      });
                      setSettingsTraining({
                        ...settingsTraining,
                        isRequired: checked,
                      });
                    }}
                    data-testid="switch-ministry-required"
                  />
                </div>
              </div>

              {settingsTraining.isRequired && (
                <div className="space-y-2">
                  <Label>Assign to Ministry</Label>
                  <Select
                    value={settingsTraining.ministryId || "none"}
                    onValueChange={(value) => {
                      const ministryId = value === "none" ? null : value;
                      updateMutation.mutate({
                        id: settingsTraining.id,
                        data: { ministryId } as any,
                      });
                      setSettingsTraining({
                        ...settingsTraining,
                        ministryId,
                      } as any);
                    }}
                  >
                    <SelectTrigger data-testid="select-training-ministry">
                      <SelectValue placeholder="Select ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Ministries (General)</SelectItem>
                      {ministries?.map((ministry) => (
                        <SelectItem key={ministry.id} value={ministry.id}>
                          {ministry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Assign to Position (Optional)</Label>
                <Select
                  value={(settingsTraining as any).positionId || "none"}
                  onValueChange={(value) => {
                    const positionId = value === "none" ? null : value;
                    updateMutation.mutate({
                      id: settingsTraining.id,
                      data: { positionId } as any,
                    });
                    setSettingsTraining({
                      ...settingsTraining,
                      positionId,
                    } as any);
                  }}
                >
                  <SelectTrigger data-testid="select-training-position">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Positions</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="team-lead">Team Lead</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If selected, only users in this position will be required to complete this training
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)} data-testid="button-close-settings">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Questions Manager Dialog */}
      <Dialog 
        open={questionsDialogOpen} 
        onOpenChange={(open) => {
          setQuestionsDialogOpen(open);
          if (!open) setManagingQuestionsTraining(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5" />
              Manage Questions - {managingQuestionsTraining?.title}
            </DialogTitle>
            <DialogDescription>
              Add, edit, or remove quiz questions for this training module.
            </DialogDescription>
          </DialogHeader>
          
          {managingQuestionsTraining && (
            <QuestionsManager 
              moduleId={managingQuestionsTraining.id} 
              onClose={() => {
                setQuestionsDialogOpen(false);
                setManagingQuestionsTraining(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Details Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={(open) => !open && setViewingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Training Submission Review
            </DialogTitle>
            <DialogDescription>
              Review {viewingSubmission?.user.firstName}'s training submission before approval
            </DialogDescription>
          </DialogHeader>
          
          {viewingSubmission && (
            <div className="space-y-6 py-4">
              {/* Submitter Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={viewingSubmission.user.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {viewingSubmission.user.firstName?.[0]}{viewingSubmission.user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {viewingSubmission.user.firstName} {viewingSubmission.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{viewingSubmission.user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingSubmission.ministry && (
                      <Badge variant="outline">{viewingSubmission.ministry.name}</Badge>
                    )}
                    {viewingSubmission.assessmentScore !== undefined && (
                      <Badge variant="secondary">Quiz Score: {viewingSubmission.assessmentScore}%</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Training Module Info */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Training: {viewingSubmission.module?.title || "Unknown Training"}
                </h4>
                {viewingSubmission.module?.description && (
                  <p className="text-sm text-muted-foreground">{viewingSubmission.module.description}</p>
                )}
              </div>

              {/* Final Reflection */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Final Reflection
                </h4>
                {viewingSubmission.finalReflection ? (
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">{viewingSubmission.finalReflection}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No reflection submitted</p>
                )}
              </div>

              {/* Lesson Reflections (if any) */}
              {viewingSubmission.lessonReflections && Object.keys(viewingSubmission.lessonReflections).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Lesson Reflections</h4>
                  <div className="space-y-3">
                    {Object.entries(viewingSubmission.lessonReflections).map(([lessonId, reflection], index) => (
                      <div key={lessonId} className="p-3 bg-muted/30 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-1">Lesson {index + 1}</p>
                        <p className="text-sm whitespace-pre-wrap">{reflection as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission Date */}
              {viewingSubmission.submittedAt && (
                <p className="text-sm text-muted-foreground">
                  Submitted on {new Date(viewingSubmission.submittedAt).toLocaleDateString()} at{' '}
                  {new Date(viewingSubmission.submittedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewingSubmission(null)}
              data-testid="button-close-submission-details"
            >
              Close
            </Button>
            {viewingSubmission && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingId(viewingSubmission.id);
                    setViewingSubmission(null);
                  }}
                  data-testid="button-reject-from-details"
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  Needs Follow-Up
                </Button>
                <Button
                  onClick={() => {
                    approveMutation.mutate(viewingSubmission.id);
                    setViewingSubmission(null);
                  }}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve-from-details"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 mr-1" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Edit Panel Dialog */}
      <Dialog 
        open={editPanelOpen} 
        onOpenChange={(open) => {
          setEditPanelOpen(open);
          if (!open) {
            setEditPanelTraining(null);
            setEditPanelTab("details");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Training: {editPanelTraining?.title}
            </DialogTitle>
            <DialogDescription>
              Manage all aspects of this training module
            </DialogDescription>
          </DialogHeader>
          
          {editPanelTraining && (
            <div className="space-y-6 py-4">
              {/* Status Badge and Quick Actions */}
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={getModuleStatus(editPanelTraining) === 'live' ? 'default' : getModuleStatus(editPanelTraining) === 'archived' ? 'outline' : 'secondary'}>
                    {getModuleStatus(editPanelTraining) === 'live' && <Eye className="w-3 h-3 mr-1" />}
                    {getModuleStatus(editPanelTraining) === 'draft' && <FileEdit className="w-3 h-3 mr-1" />}
                    {getModuleStatus(editPanelTraining) === 'archived' && <Archive className="w-3 h-3 mr-1" />}
                    {getModuleStatus(editPanelTraining).toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {editPanelTraining.ministryId ? getMinistryById(editPanelTraining.ministryId)?.name || 'General' : 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getModuleStatus(editPanelTraining) === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={() => publishMutation.mutate({ id: editPanelTraining.id, publish: true })}
                      disabled={publishMutation.isPending}
                      data-testid="button-publish-training"
                    >
                      {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                      Publish
                    </Button>
                  )}
                  {getModuleStatus(editPanelTraining) === 'live' && (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => publishMutation.mutate({ id: editPanelTraining.id, publish: false })}
                      disabled={publishMutation.isPending}
                      data-testid="button-unpublish-training"
                    >
                      {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileEdit className="w-4 h-4 mr-1" />}
                      Unpublish
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs for different edit sections */}
              <Tabs value={editPanelTab} onValueChange={setEditPanelTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details" data-testid="tab-edit-details">Details</TabsTrigger>
                  <TabsTrigger value="settings" data-testid="tab-edit-settings">Settings</TabsTrigger>
                  <TabsTrigger value="questions" data-testid="tab-edit-questions">Questions</TabsTrigger>
                  <TabsTrigger value="actions" data-testid="tab-edit-actions">Actions</TabsTrigger>
                </TabsList>

                {/* Details Tab - Module Info */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input 
                        value={editPanelTraining.title} 
                        onChange={(e) => setEditPanelTraining({...editPanelTraining, title: e.target.value})}
                        data-testid="input-edit-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={editPanelTraining.description || ''} 
                        onChange={(e) => setEditPanelTraining({...editPanelTraining, description: e.target.value})}
                        rows={3}
                        data-testid="input-edit-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ministry</Label>
                        <Select 
                          value={editPanelTraining.ministryId || "__none__"} 
                          onValueChange={(v) => setEditPanelTraining({...editPanelTraining, ministryId: v === "__none__" ? null : v})}
                        >
                          <SelectTrigger data-testid="select-edit-ministry">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">General (All Ministries)</SelectItem>
                            {ministries?.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Path Step</Label>
                        <Select 
                          value={editPanelTraining.pathStep || "__none__"} 
                          onValueChange={(v) => setEditPanelTraining({...editPanelTraining, pathStep: v === "__none__" ? null : v})}
                        >
                          <SelectTrigger data-testid="select-edit-pathstep">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {DISCIPLESHIP_STEPS.map(step => (
                              <SelectItem key={step.id} value={step.id}>{step.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Est. Minutes</Label>
                        <Input 
                          type="number" 
                          value={editPanelTraining.estimatedMinutes || 30} 
                          onChange={(e) => setEditPanelTraining({...editPanelTraining, estimatedMinutes: parseInt(e.target.value) || 30})}
                          data-testid="input-edit-minutes"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>XP Reward</Label>
                        <Input 
                          type="number" 
                          value={editPanelTraining.xpReward || 100} 
                          onChange={(e) => setEditPanelTraining({...editPanelTraining, xpReward: parseInt(e.target.value) || 100})}
                          data-testid="input-edit-xp"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Passing Score %</Label>
                        <Input 
                          type="number" 
                          value={editPanelTraining.passingScore || 80} 
                          onChange={(e) => setEditPanelTraining({...editPanelTraining, passingScore: parseInt(e.target.value) || 80})}
                          data-testid="input-edit-passing"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/leadership/training-studio?edit=${editPanelTraining.id}`)}
                        data-testid="button-deep-edit"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Edit Content in Training Studio
                      </Button>
                      <Button 
                        onClick={() => {
                          updateMutation.mutate({ 
                            id: editPanelTraining.id, 
                            data: {
                              title: editPanelTraining.title,
                              description: editPanelTraining.description,
                              ministryId: editPanelTraining.ministryId,
                              pathStep: editPanelTraining.pathStep,
                              estimatedMinutes: editPanelTraining.estimatedMinutes,
                              xpReward: editPanelTraining.xpReward,
                              passingScore: editPanelTraining.passingScore,
                            } as any
                          });
                        }}
                        disabled={updateMutation.isPending}
                        data-testid="button-save-details"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        {getModuleStatus(editPanelTraining) === 'live' ? 'Save & Republish' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Settings Tab - Requirements & Configuration */}
                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Required Training</p>
                        <p className="text-sm text-muted-foreground">Members must complete this training</p>
                      </div>
                      <Switch 
                        checked={editPanelTraining.isRequired || false}
                        onCheckedChange={(checked) => {
                          setEditPanelTraining({...editPanelTraining, isRequired: checked});
                          updateMutation.mutate({ id: editPanelTraining.id, data: { isRequired: checked } as any });
                        }}
                        data-testid="switch-required"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Onboarding Required</p>
                        <p className="text-sm text-muted-foreground">New members must complete during onboarding</p>
                      </div>
                      <Switch 
                        checked={editPanelTraining.isOnboardingRequired || false}
                        onCheckedChange={(checked) => {
                          setEditPanelTraining({...editPanelTraining, isOnboardingRequired: checked});
                          updateMutation.mutate({ id: editPanelTraining.id, data: { isOnboardingRequired: checked } as any });
                        }}
                        data-testid="switch-onboarding"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Requires Leader Approval</p>
                        <p className="text-sm text-muted-foreground">Leader must approve completion before XP is awarded</p>
                      </div>
                      <Switch 
                        checked={editPanelTraining.requiresApproval ?? true}
                        onCheckedChange={(checked) => {
                          setEditPanelTraining({...editPanelTraining, requiresApproval: checked});
                          updateMutation.mutate({ id: editPanelTraining.id, data: { requiresApproval: checked } as any });
                        }}
                        data-testid="switch-approval"
                      />
                    </div>
                    <div className="space-y-2 p-4 border rounded-lg">
                      <Label>Audience</Label>
                      <Select 
                        value={(editPanelTraining as any).audience || 'all'} 
                        onValueChange={(v) => {
                          setEditPanelTraining({...editPanelTraining, audience: v} as any);
                          updateMutation.mutate({ id: editPanelTraining.id, data: { audience: v } as any });
                        }}
                      >
                        <SelectTrigger data-testid="select-audience">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="leader">Leaders Only</SelectItem>
                          <SelectItem value="ministry">Ministry Members Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Who should be required/able to take this training</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Questions Tab - Quiz Management */}
                <TabsContent value="questions" className="mt-4">
                  <QuestionsManager 
                    moduleId={editPanelTraining.id} 
                    onClose={() => setEditPanelTab("details")}
                  />
                </TabsContent>

                {/* Actions Tab - Archive, Delete, etc */}
                <TabsContent value="actions" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    {/* Archive/Unarchive */}
                    {getModuleStatus(editPanelTraining) !== 'archived' ? (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Archive Training</p>
                          <p className="text-sm text-muted-foreground">Hide from members while preserving completion history</p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => archiveMutation.mutate({ id: editPanelTraining.id, archive: true })}
                          disabled={archiveMutation.isPending}
                          data-testid="button-archive"
                        >
                          {archiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Archive className="w-4 h-4 mr-1" />}
                          Archive
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Unarchive Training</p>
                          <p className="text-sm text-muted-foreground">Restore training to draft status</p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => archiveMutation.mutate({ id: editPanelTraining.id, archive: false })}
                          disabled={archiveMutation.isPending}
                          data-testid="button-unarchive"
                        >
                          {archiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                          Unarchive
                        </Button>
                      </div>
                    )}

                    {/* Delete */}
                    <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                      <div>
                        <p className="font-medium text-destructive">Delete Training</p>
                        <p className="text-sm text-muted-foreground">Permanently remove this training and all associated data</p>
                      </div>
                      <Button 
                        variant="destructive"
                        onClick={() => setDeleteConfirmId(editPanelTraining.id)}
                        data-testid="button-delete-from-panel"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Questions Manager Component
function QuestionsManager({ moduleId, onClose }: { moduleId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [editingQuestion, setEditingQuestion] = useState<Assessment | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  // Form state for adding/editing questions
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');

  // Fetch questions for this module
  const { data: questions = [], isLoading } = useQuery<Assessment[]>({
    queryKey: ['/api/training/assessments', moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/training/assessments/${moduleId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch questions');
      return res.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: AssessmentPayload) => {
      const res = await apiRequest('POST', '/api/training/assessments', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/assessments', moduleId] });
      toast({ title: 'Question added successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add question', description: error.message, variant: 'destructive' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AssessmentPayload> }) => {
      const res = await apiRequest('PATCH', `/api/training/assessments/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/assessments', moduleId] });
      toast({ title: 'Question updated successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update question', description: error.message, variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/training/assessments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/assessments', moduleId] });
      toast({ title: 'Question deleted' });
      setDeleteQuestionId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete question', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setExplanation('');
    setIsAddingNew(false);
    setEditingQuestion(null);
  };

  const startEditing = (question: Assessment) => {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setOptions([...question.options, '', '', '', ''].slice(0, 4)); // Ensure 4 options
    setCorrectAnswer(question.correctAnswer);
    setExplanation(question.explanation || '');
    setIsAddingNew(false);
  };

  const handleSubmit = () => {
    if (!questionText.trim()) {
      toast({ title: 'Please enter a question', variant: 'destructive' });
      return;
    }

    const filledOptions = options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      toast({ title: 'Please provide at least 2 options', variant: 'destructive' });
      return;
    }

    // Convert 0-based index to letter (A, B, C, D)
    const letterAnswers = ['A', 'B', 'C', 'D'];
    const payload: AssessmentPayload = {
      moduleId,
      questionText: questionText.trim(),
      options: filledOptions,
      correctAnswer: letterAnswers[correctAnswer] || 'A',
      explanation: explanation.trim() || undefined,
      sortOrder: questions.length
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Questions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Questions ({questions.length})</h3>
          {!isAddingNew && !editingQuestion && (
            <Button onClick={() => setIsAddingNew(true)} size="sm" data-testid="button-add-question">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>

        {questions.length === 0 && !isAddingNew && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No questions yet. Add your first quiz question.</p>
          </div>
        )}

        {questions.map((q, index) => (
          <Card key={q.id} className="p-4" data-testid={`card-question-${q.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <p className="font-medium truncate">{q.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {q.options.map((opt, optIndex) => (
                    <div 
                      key={optIndex} 
                      className={`flex items-center gap-2 px-2 py-1 rounded ${optIndex === q.correctAnswer ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-muted'}`}
                    >
                      <span className="font-semibold">{String.fromCharCode(65 + optIndex)}.</span>
                      <span className="truncate">{opt}</span>
                      {optIndex === q.correctAnswer && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-sm text-muted-foreground mt-2 italic">Explanation: {q.explanation}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => startEditing(q)}
                  data-testid={`button-edit-question-${q.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setDeleteQuestionId(q.id)}
                  data-testid={`button-delete-question-${q.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingQuestion) && (
        <Card className="p-4 border-primary">
          <h4 className="font-semibold mb-4">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h4>
          <div className="space-y-4">
            <div>
              <Label htmlFor="question-text">Question</Label>
              <Textarea
                id="question-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question..."
                className="mt-1"
                data-testid="input-question-text"
              />
            </div>

            <div className="space-y-2">
              <Label>Answer Options</Label>
              <RadioGroup value={String(correctAnswer)} onValueChange={(v) => setCorrectAnswer(parseInt(v))}>
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <RadioGroupItem value={String(index)} id={`option-${index}`} data-testid={`radio-correct-${index}`} />
                    <span className="font-semibold w-6">{String.fromCharCode(65 + index)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[index] = e.target.value;
                        setOptions(newOptions);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                      data-testid={`input-option-${index}`}
                    />
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground">Select the radio button next to the correct answer.</p>
            </div>

            <div>
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Why is this the correct answer?"
                className="mt-1"
                data-testid="input-explanation"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-question">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-question"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingQuestion ? 'Update' : 'Add'} Question
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteQuestionId} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-question">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteQuestionId && deleteMutation.mutate(deleteQuestionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-question"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="button-close-questions">
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
