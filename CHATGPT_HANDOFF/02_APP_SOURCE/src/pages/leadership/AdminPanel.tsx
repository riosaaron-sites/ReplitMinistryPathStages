import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, 
  Users, 
  FileText, 
  Settings, 
  Trash2, 
  Edit, 
  Plus,
  Shield,
  Search,
  UserCog,
  Book,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
  Brain,
  ExternalLink,
  Calendar,
  Tag,
  Briefcase,
  Award,
  LayoutList,
  HelpCircle,
  UserPlus,
  MessageCircle,
  Check,
  X,
  Cloud,
  RefreshCw,
  Copy
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Manual, Ministry, UserRole, ManualAnalysis, TrainingModule, AdminTag, ServeRole, StaffTitle, GlobalLabel, CalendarCategory } from "@shared/schema";
import { USER_ROLES, ROLE_LABELS } from "@shared/schema";
import { GraduationCap } from "lucide-react";
import { HelpLink } from "@/components/HelpLink";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MANUAL_CATEGORIES = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'policies', label: 'Policies & Procedures' },
  { id: 'training', label: 'Training Materials' },
  { id: 'safety', label: 'Safety & Security' },
  { id: 'ministry-specific', label: 'Ministry Specific' },
];

const manualFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  ministryId: z.string().optional().nullable(),
  fileUrl: z.string().optional(),
  isRequired: z.boolean().default(false),
});

type ManualFormData = z.infer<typeof manualFormSchema>;

interface ManualWithMinistry extends Manual {
  ministry?: Ministry;
  analysisStatus?: string;
}

interface AnalysisStatusMap {
  [manualId: string]: ManualAnalysis | null;
}

function ManualsSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<Manual | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [analyzingManuals, setAnalyzingManuals] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const form = useForm<ManualFormData>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      ministryId: null,
      fileUrl: "",
      isRequired: false,
    },
  });

  const { data: manuals = [], isLoading } = useQuery<ManualWithMinistry[]>({
    queryKey: ["/api/manuals"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (manualId: string) => {
      setAnalyzingManuals(prev => new Set(prev).add(manualId));
      return apiRequest("POST", `/api/manuals/${manualId}/analyze`);
    },
    onSuccess: (_, manualId) => {
      toast({ 
        title: "Analysis Started", 
        description: "AI is analyzing the manual. This may take a minute." 
      });
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/manuals/${manualId}/analysis`);
          if (response.ok) {
            const analysis = await response.json();
            if (analysis && (analysis.status === 'completed' || analysis.status === 'failed')) {
              clearInterval(pollInterval);
              setAnalyzingManuals(prev => {
                const next = new Set(prev);
                next.delete(manualId);
                return next;
              });
              queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
              if (analysis.status === 'completed') {
                toast({ 
                  title: "Analysis Complete", 
                  description: "Training content has been generated from the manual." 
                });
              } else {
                toast({ 
                  title: "Analysis Failed", 
                  description: analysis.errorMessage || "Failed to analyze manual.", 
                  variant: "destructive" 
                });
              }
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }, 3000);
      // Clear after 2 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        setAnalyzingManuals(prev => {
          const next = new Set(prev);
          next.delete(manualId);
          return next;
        });
      }, 120000);
    },
    onError: (_, manualId) => {
      setAnalyzingManuals(prev => {
        const next = new Set(prev);
        next.delete(manualId);
        return next;
      });
      toast({ 
        title: "Error", 
        description: "Failed to start analysis.", 
        variant: "destructive" 
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ManualFormData) => {
      return apiRequest("POST", "/api/manuals", {
        ...data,
        ministryId: data.ministryId === "__none__" ? null : (data.ministryId || null),
        fileUrl: data.fileUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({ title: "Manual Created", description: "The manual has been added successfully." });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create manual.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ManualFormData }) => {
      return apiRequest("PATCH", `/api/manuals/${id}`, {
        ...data,
        ministryId: data.ministryId === "__none__" ? null : (data.ministryId || null),
        fileUrl: data.fileUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({ title: "Manual Updated", description: "The manual has been updated successfully." });
      setDialogOpen(false);
      setEditingManual(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update manual.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/manuals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({ title: "Manual Deleted", description: "The manual has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete manual.", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid File", description: "Only PDF files are allowed.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/manuals/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      form.setValue('fileUrl', result.fileUrl);
      setUploadedFileName(result.fileName);
      toast({ title: "File Uploaded", description: "PDF file uploaded successfully." });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload the file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (manual: Manual) => {
    setEditingManual(manual);
    form.reset({
      title: manual.title,
      description: manual.description || "",
      category: manual.category || "",
      ministryId: manual.ministryId || "__none__",
      fileUrl: manual.fileUrl || "",
      isRequired: manual.isRequired || false,
    });
    setUploadedFileName(null);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingManual(null);
    form.reset({
      title: "",
      description: "",
      category: "",
      ministryId: "__none__",
      fileUrl: "",
      isRequired: false,
    });
    setUploadedFileName(null);
    setDialogOpen(true);
  };

  const onSubmit = (data: ManualFormData) => {
    if (editingManual) {
      updateMutation.mutate({ id: editingManual.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch = manual.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manual.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || manual.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search manuals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-manuals"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MANUAL_CATEGORIES.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-manual">
          <Plus className="h-4 w-4 mr-2" />
          Add Manual
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredManuals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Manuals Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all" 
                ? "No manuals match your search criteria."
                : "Start by adding your first ministry manual."}
            </p>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Manual
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredManuals.map(manual => {
            const isAnalyzing = analyzingManuals.has(manual.id);
            const hasFile = !!manual.fileUrl;
            
            return (
              <Card key={manual.id} className="hover-elevate" data-testid={`card-manual-${manual.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{manual.title}</h3>
                        {manual.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {manual.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {manual.isRequired && (
                            <Badge variant="default" className="text-xs">Required</Badge>
                          )}
                          {manual.category && (
                            <Badge variant="secondary" className="text-xs">
                              {MANUAL_CATEGORIES.find(c => c.id === manual.category)?.label || manual.category}
                            </Badge>
                          )}
                          {manual.ministry && (
                            <Badge variant="outline" className="text-xs">{manual.ministry.name}</Badge>
                          )}
                          {manual.analysisStatus === 'completed' && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              <Brain className="h-3 w-3 mr-1" />
                              AI Training Ready
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasFile && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => analyzeMutation.mutate(manual.id)}
                              disabled={isAnalyzing}
                              data-testid={`button-analyze-manual-${manual.id}`}
                            >
                              {isAnalyzing ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isAnalyzing ? "Analyzing with AI..." : "Generate Training with AI"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(manual)}
                        data-testid={`button-edit-manual-${manual.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteMutation.mutate(manual.id)}
                        data-testid={`button-delete-manual-${manual.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingManual ? "Edit Manual" : "Add New Manual"}</DialogTitle>
            <DialogDescription>
              {editingManual ? "Update the manual details below." : "Enter the details for the new manual."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Volunteer Handbook" {...field} data-testid="input-manual-title" />
                    </FormControl>
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
                        placeholder="Brief description of the manual content..."
                        {...field}
                        data-testid="input-manual-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-manual-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MANUAL_CATEGORIES.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ministryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ministry (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-manual-ministry">
                            <SelectValue placeholder="Select ministry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No Ministry (General)</SelectItem>
                          {ministries.map(ministry => (
                            <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PDF File</FormLabel>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label 
                          className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover-elevate ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span className="text-sm">{uploading ? 'Uploading...' : 'Upload PDF'}</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            data-testid="input-manual-file"
                          />
                        </label>
                        {uploadedFileName && (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {uploadedFileName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">or enter URL:</span>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/manual.pdf"
                          {...field}
                          data-testid="input-manual-url"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="text-xs text-muted-foreground">
                          Current: {field.value}
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-base">Required Reading</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this manual as required for team members
                      </p>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        data-testid="switch-manual-required"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-manual"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingManual ? "Update Manual" : "Add Manual"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Training Module Management Section
const trainingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  ministryId: z.string().optional().nullable(),
  manualId: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  estimatedMinutes: z.number().min(1).default(30),
  xpReward: z.number().min(0).default(100),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type TrainingFormData = z.infer<typeof trainingFormSchema>;

interface TrainingModuleWithManual extends TrainingModule {
  manual?: Manual;
  ministry?: Ministry;
}

function TrainingsSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingModule | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      ministryId: null,
      manualId: null,
      videoUrl: "",
      estimatedMinutes: 30,
      xpReward: 100,
      isRequired: false,
      isActive: true,
    },
  });

  const { data: trainings = [], isLoading } = useQuery<TrainingModuleWithManual[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: manuals = [] } = useQuery<Manual[]>({
    queryKey: ["/api/manuals"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TrainingFormData) => {
      return apiRequest("POST", "/api/training/modules", {
        ...data,
        ministryId: data.ministryId === "__none__" ? null : (data.ministryId || null),
        manualId: data.manualId === "__none__" ? null : (data.manualId || null),
        videoUrl: data.videoUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({ title: "Training Created", description: "The training module has been added successfully." });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create training module.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TrainingFormData }) => {
      return apiRequest("PATCH", `/api/training/modules/${id}`, {
        ...data,
        ministryId: data.ministryId === "__none__" ? null : (data.ministryId || null),
        manualId: data.manualId === "__none__" ? null : (data.manualId || null),
        videoUrl: data.videoUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({ title: "Training Updated", description: "The training module has been updated successfully." });
      setDialogOpen(false);
      setEditingTraining(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update training module.", variant: "destructive" });
    },
  });

  const batchAnalyzeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/analyze-training-manuals");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Analysis Started", 
        description: `Triggered analysis for ${data.results?.filter((r: any) => r.status === 'started').length || 0} manuals.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to trigger batch analysis.", variant: "destructive" });
    },
  });

  const openEditDialog = (training: TrainingModule) => {
    setEditingTraining(training);
    form.reset({
      title: training.title,
      slug: training.slug,
      description: training.description || "",
      ministryId: training.ministryId || "__none__",
      manualId: training.manualId || "__none__",
      videoUrl: training.videoUrl || "",
      estimatedMinutes: training.estimatedMinutes || 30,
      xpReward: training.xpReward || 100,
      isRequired: training.isRequired || false,
      isActive: training.isActive !== false,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTraining(null);
    form.reset({
      title: "",
      slug: "",
      description: "",
      ministryId: "__none__",
      manualId: "__none__",
      videoUrl: "",
      estimatedMinutes: 30,
      xpReward: 100,
      isRequired: false,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (data: TrainingFormData) => {
    if (editingTraining) {
      updateMutation.mutate({ id: editingTraining.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const filteredTrainings = trainings.filter(training => {
    return training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Training Modules
            </CardTitle>
            <CardDescription>
              Manage training modules and link them to PDF manuals for AI-generated content
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => batchAnalyzeMutation.mutate()}
              disabled={batchAnalyzeMutation.isPending}
              data-testid="button-batch-analyze"
            >
              {batchAnalyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Analyze All Manuals
            </Button>
            <Button onClick={openCreateDialog} data-testid="button-add-training">
              <Plus className="h-4 w-4 mr-2" />
              Add Training
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search training modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-trainings"
            />
          </div>

          <div className="space-y-2">
            {filteredTrainings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No training modules found</p>
              </div>
            ) : (
              filteredTrainings.map((training) => (
                <Card key={training.id} className="hover-elevate">
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{training.title}</h3>
                        {training.isRequired && (
                          <Badge variant="secondary">Required</Badge>
                        )}
                        {!training.isActive && (
                          <Badge variant="outline">Paused</Badge>
                        )}
                        {training.manualId && (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Has Manual
                          </Badge>
                        )}
                        {training.videoUrl && (
                          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">
                            <ExternalLink className="h-3 w-3" />
                            Video
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {training.description || "No description"}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{training.estimatedMinutes} min</span>
                        <span>{training.xpReward} XP</span>
                        {training.lessonSummary && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Content Ready
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(training)}
                        data-testid={`button-edit-training-${training.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTraining ? "Edit Training Module" : "Add Training Module"}
            </DialogTitle>
            <DialogDescription>
              {editingTraining 
                ? "Update the training module details and linked manual" 
                : "Create a new training module and optionally link a PDF manual for AI-generated content"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Kids Ministry Safety Training"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingTraining) {
                            form.setValue("slug", generateSlug(e.target.value));
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
                      <Input 
                        placeholder="kids-ministry-safety"
                        {...field}
                        data-testid="input-training-slug"
                      />
                    </FormControl>
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
                        placeholder="Brief description of the training content..."
                        {...field}
                        data-testid="input-training-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-training-video-url"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Add a YouTube or Vimeo video for video-based training
                    </p>
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
                      <FormLabel>Ministry (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-training-ministry">
                            <SelectValue placeholder="Select ministry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">General (All)</SelectItem>
                          {ministries.map(ministry => (
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
                  name="manualId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Manual</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-training-manual">
                            <SelectValue placeholder="Select manual" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No Manual</SelectItem>
                          {manuals.map(manual => (
                            <SelectItem key={manual.id} value={manual.id}>{manual.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Link a PDF manual to auto-generate lesson content
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          data-testid="input-training-minutes"
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
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-training-progress-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-base">Required Training</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark as required for team members
                        </p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-training-required"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Show this training to users
                        </p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          data-testid="switch-training-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-training"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingTraining ? "Update Training" : "Add Training"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeopleSection() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [newNextNightStatus, setNewNextNightStatus] = useState<string>("UNKNOWN");
  const [newFollowingJesusStatus, setNewFollowingJesusStatus] = useState<string>("UNKNOWN");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Updated", description: "User role has been updated successfully." });
      setRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user role.", variant: "destructive" });
    },
  });

  const updateClassStatusMutation = useMutation({
    mutationFn: async ({ userId, nextNightStatus, followingJesusStatus }: { 
      userId: string; 
      nextNightStatus: string;
      followingJesusStatus: string;
    }) => {
      return apiRequest("PATCH", `/api/users/${userId}/class-status`, { 
        nextNightStatus, 
        followingJesusStatus 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Class Status Updated", description: "User's class status has been updated." });
      setClassDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update class status.", variant: "destructive" });
    },
  });

  const archiveUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return apiRequest("POST", `/api/users/${userId}/archive`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Archived", description: "User has been archived successfully." });
      setArchiveDialogOpen(false);
      setSelectedUser(null);
      setArchiveReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to archive user.", variant: "destructive" });
    },
  });

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role as UserRole || "member");
    setRoleDialogOpen(true);
  };

  const openClassDialog = (user: User) => {
    setSelectedUser(user);
    setNewNextNightStatus(user.nextNightStatus || "UNKNOWN");
    setNewFollowingJesusStatus(user.followingJesusStatus || "UNKNOWN");
    setClassDialogOpen(true);
  };

  const openArchiveDialog = (user: User) => {
    setSelectedUser(user);
    setArchiveReason("");
    setArchiveDialogOpen(true);
  };

  const handleArchiveUser = () => {
    if (selectedUser) {
      archiveUserMutation.mutate({ userId: selectedUser.id, reason: archiveReason || undefined });
    }
  };

  const handleUpdateClassStatus = () => {
    if (selectedUser) {
      updateClassStatusMutation.mutate({ 
        userId: selectedUser.id, 
        nextNightStatus: newNextNightStatus,
        followingJesusStatus: newFollowingJesusStatus
      });
    }
  };

  const handleUpdateRole = () => {
    if (selectedUser) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  const filteredUsers = users.filter(user => {
    // Exclude archived users from the main list
    if (user.isArchived) return false;
    
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    const nextNightIncomplete = user.nextNightStatus !== 'COMPLETE';
    const followingJesusIncomplete = user.followingJesusStatus !== 'COMPLETE';
    let matchesClass = true;
    if (classFilter === "incomplete-next-night") {
      matchesClass = nextNightIncomplete;
    } else if (classFilter === "incomplete-following-jesus") {
      matchesClass = followingJesusIncomplete;
    } else if (classFilter === "any-incomplete") {
      matchesClass = nextNightIncomplete || followingJesusIncomplete;
    } else if (classFilter === "all-complete") {
      matchesClass = !nextNightIncomplete && !followingJesusIncomplete;
    }
    
    return matchesSearch && matchesRole && matchesClass;
  });

  const getClassStatusBadge = (status: string | null) => {
    switch (status) {
      case "COMPLETE":
        return <Badge className="bg-green-500 text-xs">Complete</Badge>;
      case "SCHEDULED":
        return <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">Scheduled</Badge>;
      case "INCOMPLETE":
        return <Badge variant="outline" className="text-red-600 border-red-600 text-xs">Not Yet</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-xs">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500">Administrator</Badge>;
      case "pastor":
        return <Badge className="bg-purple-500">Pastor</Badge>;
      case "leader":
        return <Badge className="bg-green-500">Leader</Badge>;
      case "dream-team":
        return <Badge className="bg-blue-500">Team Member</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-people"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40" data-testid="select-filter-role">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {USER_ROLES.map(role => (
                <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44" data-testid="select-filter-class">
              <SelectValue placeholder="Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Class Status</SelectItem>
              <SelectItem value="any-incomplete">Any Incomplete</SelectItem>
              <SelectItem value="incomplete-next-night">Missing Next Night</SelectItem>
              <SelectItem value="incomplete-following-jesus">Missing Following Jesus</SelectItem>
              <SelectItem value="all-complete">All Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} {filteredUsers.length === 1 ? "person" : "people"}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-1" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No People Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter !== "all"
                ? "No people match your search criteria."
                : "No users have signed up yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => (
            <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar>
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {user.firstName} {user.lastName}
                        </span>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">NN:</span>
                      {getClassStatusBadge(user.nextNightStatus)}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">FJ:</span>
                      {getClassStatusBadge(user.followingJesusStatus)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openClassDialog(user)}
                      data-testid={`button-edit-class-${user.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Classes
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openRoleDialog(user)}
                      data-testid={`button-edit-role-${user.id}`}
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Role
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openArchiveDialog(user)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-archive-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Class Status</DialogTitle>
            <DialogDescription>
              Update required class status for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Next Night</label>
              <Select value={newNextNightStatus} onValueChange={setNewNextNightStatus}>
                <SelectTrigger data-testid="select-next-night-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETE">Complete</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="INCOMPLETE">Not Yet</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Following Jesus</label>
              <Select value={newFollowingJesusStatus} onValueChange={setNewFollowingJesusStatus}>
                <SelectTrigger data-testid="select-following-jesus-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETE">Complete</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="INCOMPLETE">Not Yet</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateClassStatus}
              disabled={updateClassStatusMutation.isPending}
              data-testid="button-confirm-class-update"
            >
              {updateClassStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
              <SelectTrigger data-testid="select-new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-role-change"
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.firstName} {selectedUser?.lastName}? 
              This will archive the user and remove their access to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              placeholder="Enter reason for deletion..."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              className="mt-2"
              data-testid="input-archive-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleArchiveUser}
              disabled={archiveUserMutation.isPending}
              data-testid="button-confirm-archive"
            >
              {archiveUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SystemToolsSection() {
  const { toast } = useToast();

  const { data: unsentCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/unsent-emails-count"],
  });

  const { data: ministries = [] } = useQuery<(Ministry & { needsLeader?: boolean; primaryLeaderCount?: number })[]>({
    queryKey: ["/api/ministries"],
  });

  // Filter ministries that need a leader (H1)
  const ministriesNeedingLeader = ministries.filter(m => m.needsLeader);

  const sendEmailsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/send-retroactive-emails");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/unsent-emails-count"] });
      toast({ 
        title: "Emails Sent", 
        description: `Successfully sent ${data.sent || 0} result emails.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send emails.", variant: "destructive" });
    },
  });

  const seedMinistriesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/seed-ministries");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries"] });
      toast({ 
        title: "Teams Created", 
        description: data.message || `Created ${data.created?.length || 0} ministry teams.`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create teams. Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-email-tool">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Missed Email Results
            </CardTitle>
            <CardDescription>
              Send results to people who finished but didn't get their email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{unsentCount?.count ?? 0}</p>
                <p className="text-sm text-muted-foreground">Waiting to send</p>
              </div>
              <Button 
                onClick={() => sendEmailsMutation.mutate()}
                disabled={sendEmailsMutation.isPending || (unsentCount?.count ?? 0) === 0}
                data-testid="button-send-emails"
              >
                {sendEmailsMutation.isPending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-database-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Database Status
            </CardTitle>
            <CardDescription>
              PostgreSQL connection health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Connected</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-system-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Info
            </CardTitle>
            <CardDescription>
              Application configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span>Development</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-ministry-setup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Structure
          </CardTitle>
          <CardDescription>
            Set up your ministry teams and sub-teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{ministries.length}</p>
              <p className="text-sm text-muted-foreground">Active teams</p>
            </div>
            <Button 
              onClick={() => seedMinistriesMutation.mutate()}
              disabled={seedMinistriesMutation.isPending}
              data-testid="button-seed-ministries"
            >
              {seedMinistriesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Up...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Default Teams
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Sets up Landing Team, Worship Arts, Kids Ministry, Student Ministry, and Production with their sub-teams.
          </p>

          {/* Needs Leader Section (H1) */}
          {ministriesNeedingLeader.length > 0 && (
            <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" data-testid="needs-leader-section">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                  Teams Needing Leaders ({ministriesNeedingLeader.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ministriesNeedingLeader.slice(0, 5).map(ministry => (
                  <Badge 
                    key={ministry.id} 
                    variant="outline" 
                    className="border-amber-400 text-amber-700 dark:text-amber-300"
                    data-testid={`badge-needs-leader-${ministry.id}`}
                  >
                    {ministry.name}
                  </Badge>
                ))}
                {ministriesNeedingLeader.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{ministriesNeedingLeader.length - 5} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These teams don't have a Primary Leader assigned yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <UserResetTool />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Admin Actions
          </CardTitle>
          <CardDescription>
            Sensitive operations that affect the entire system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            These tools require system administrator privileges and should be used with caution.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" disabled data-testid="button-clear-cache">
              Clear Cache
            </Button>
            <Button variant="outline" disabled data-testid="button-export-data">
              Export All Data
            </Button>
            <Button variant="outline" disabled data-testid="button-sync-pc">
              Sync with Planning Center
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserResetTool() {
  const { toast } = useToast();
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = useQuery<{
    mode: string;
    protectedUser: { email: string; name: string; role: string } | null;
    willRemove: { users: number };
    usersToRemove: { id: string; email: string; name: string; role: string }[];
    warning: string;
  }>({
    queryKey: ["/api/admin/reset-users/preview"],
    enabled: false,
  });
  
  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/reset-users/execute", { confirmPhrase });
    },
    onSuccess: (data: any) => {
      setShowConfirmDialog(false);
      setConfirmPhrase("");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ 
        title: "Reset Complete", 
        description: data.message || `Removed ${data.removed?.users || 0} users.`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Reset Failed", 
        description: error.message || "Failed to execute reset.", 
        variant: "destructive" 
      });
    },
  });
  
  const handlePreview = async () => {
    await refetchPreview();
    setShowConfirmDialog(true);
  };
  
  const handleExecute = () => {
    if (confirmPhrase !== "RESET ALL USERS") {
      toast({ 
        title: "Invalid Phrase", 
        description: "Type 'RESET ALL USERS' exactly to confirm.", 
        variant: "destructive" 
      });
      return;
    }
    resetMutation.mutate();
  };
  
  return (
    <>
      <Card className="border-destructive/30" data-testid="card-user-reset">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            User Reset Tool
          </CardTitle>
          <CardDescription>
            Remove all users except the protected owner account for a fresh start
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Protected: pastor@gardencitychurch.net</p>
              <p className="text-xs text-muted-foreground mt-1">All other users and their data will be removed</p>
            </div>
            <Button 
              variant="outline"
              onClick={handlePreview}
              disabled={previewLoading}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              data-testid="button-preview-reset"
            >
              {previewLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
              ) : (
                "Preview Reset"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm User Reset
            </DialogTitle>
            <DialogDescription>
              This action will permanently remove all users and their associated data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {preview?.protectedUser && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Protected Account (will NOT be removed)</p>
                <p className="text-sm">{preview.protectedUser.name} ({preview.protectedUser.email})</p>
              </div>
            )}
            
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm font-medium text-destructive">Will Remove</p>
              <p className="text-2xl font-bold">{preview?.willRemove?.users || 0} users</p>
            </div>
            
            {preview?.usersToRemove && preview.usersToRemove.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Users to be removed:</p>
                {preview.usersToRemove.slice(0, 10).map((u) => (
                  <div key={u.id} className="text-xs py-1 border-b last:border-0">
                    {u.name} ({u.email}) - {u.role}
                  </div>
                ))}
                {preview.usersToRemove.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ...and {preview.usersToRemove.length - 10} more
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type "RESET ALL USERS" to confirm:</label>
              <Input
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="RESET ALL USERS"
                className="font-mono"
                data-testid="input-confirm-phrase"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleExecute}
              disabled={confirmPhrase !== "RESET ALL USERS" || resetMutation.isPending}
              data-testid="button-execute-reset"
            >
              {resetMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</>
              ) : (
                "Execute Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ArchivedUsersSection() {
  const { toast } = useToast();

  const { data: archivedUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/archived-users"],
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (archiveId: string) => {
      return apiRequest("POST", `/api/user-archives/${archiveId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archived-users"] });
      toast({ title: "User Restored", description: "User has been restored successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore user.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (archivedUsers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Archived Users</h3>
          <p className="text-muted-foreground">
            Users you delete will appear here for 30 days before being permanently removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {archivedUsers.length} archived {archivedUsers.length === 1 ? "user" : "users"} - can be restored within 30 days
        </p>
      </div>
      
      <div className="space-y-2">
        {archivedUsers.map((archive: any) => (
          <Card key={archive.id} className="border-amber-200 dark:border-amber-800" data-testid={`archived-user-${archive.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={archive.userData?.profileImageUrl} />
                    <AvatarFallback>
                      {archive.userData?.firstName?.[0]}{archive.userData?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {archive.userData?.firstName} {archive.userData?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{archive.userData?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {archive.reason ? `Reason: ${archive.reason}` : "No reason provided"} • Archived {new Date(archive.archivedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => restoreUserMutation.mutate(archive.id)}
                  disabled={restoreUserMutation.isPending}
                  data-testid={`button-restore-${archive.id}`}
                >
                  Restore
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface PastoralQuestion {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userProfileImage?: string;
  questionType: string;
  questionText: string;
  onboardingStep?: string;
  status: string;
  pastoralNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

interface MinistryJoinRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userProfileImage?: string;
  ministryId: string;
  ministryName?: string;
  requestType: string;
  message?: string;
  surveyRecommendation?: boolean;
  matchScore?: number;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

function PastoralQuestionsSection() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedQuestion, setSelectedQuestion] = useState<PastoralQuestion | null>(null);
  const [notes, setNotes] = useState("");

  const { data: questions = [], isLoading } = useQuery<PastoralQuestion[]>({
    queryKey: ["/api/pastoral-questions", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/pastoral-questions?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/pastoral-questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pastoral-questions"] });
      toast({ title: "Question updated", description: "The pastoral question has been updated." });
      setSelectedQuestion(null);
      setNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update question.", variant: "destructive" });
    },
  });

  const handleResolve = (question: PastoralQuestion) => {
    updateMutation.mutate({
      id: question.id,
      data: { status: 'resolved', pastoralNotes: notes || question.pastoralNotes }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Pastoral Questions
          </h2>
          <p className="text-muted-foreground">
            Review questions from members during faith commitment onboarding
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-question-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No {statusFilter} questions</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'pending' 
                ? "No members are waiting for pastoral follow-up"
                : `No questions with status: ${statusFilter}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id} className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={question.userProfileImage} />
                    <AvatarFallback>
                      {question.userName?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="font-medium" data-testid={`text-question-user-${question.id}`}>
                        {question.userName}
                      </span>
                      <span className="text-sm text-muted-foreground">{question.userEmail}</span>
                      <Badge variant={question.status === 'pending' ? 'default' : question.status === 'resolved' ? 'outline' : 'secondary'}>
                        {question.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Step: {question.onboardingStep || 'Faith Commitment'} • Type: {question.questionType}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 mt-2">
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-question-content-${question.id}`}>
                        {question.questionText}
                      </p>
                    </div>
                    {question.pastoralNotes && (
                      <div className="mt-2 p-3 bg-primary/5 rounded border border-primary/20">
                        <p className="text-sm font-medium text-primary mb-1">Pastoral Notes:</p>
                        <p className="text-sm">{question.pastoralNotes}</p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(question.createdAt).toLocaleDateString()}
                      {question.resolvedAt && ` • Resolved: ${new Date(question.resolvedAt).toLocaleDateString()}`}
                    </div>
                    {question.status !== 'resolved' && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuestion(question);
                            setNotes(question.pastoralNotes || '');
                          }}
                          data-testid={`button-respond-${question.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Add Notes & Resolve
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolve(question)}
                          disabled={updateMutation.isPending}
                          data-testid={`button-resolve-${question.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Resolved
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

      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Question</DialogTitle>
            <DialogDescription>
              Add pastoral notes and mark this question as resolved
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-1">Question from {selectedQuestion?.userName}:</p>
              <p className="text-sm">{selectedQuestion?.questionText}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pastoral Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about how this was addressed..."
                rows={4}
                data-testid="textarea-pastoral-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedQuestion && handleResolve(selectedQuestion)}
              disabled={updateMutation.isPending}
              data-testid="button-save-resolve"
            >
              {updateMutation.isPending ? "Saving..." : "Save & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JoinRequestsSection() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: requests = [], isLoading } = useQuery<MinistryJoinRequest[]>({
    queryKey: ["/api/ministry-join-requests", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/ministry-join-requests?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/ministry-join-requests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-join-requests"] });
      toast({ title: "Request updated", description: "The join request has been processed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update request.", variant: "destructive" });
    },
  });

  const handleApprove = (request: MinistryJoinRequest) => {
    updateMutation.mutate({ id: request.id, data: { status: 'approved' } });
  };

  const handleReject = (request: MinistryJoinRequest) => {
    updateMutation.mutate({ id: request.id, data: { status: 'rejected' } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Ministry Join Requests
          </h2>
          <p className="text-muted-foreground">
            Review and approve requests to join ministry teams
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-request-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No {statusFilter} requests</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'pending' 
                ? "No pending ministry join requests"
                : `No requests with status: ${statusFilter}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Card key={request.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.userProfileImage} />
                    <AvatarFallback>
                      {request.userName?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-base" data-testid={`text-request-user-${request.id}`}>
                      {request.userName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {request.userEmail}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{request.ministryName}</Badge>
                  {request.surveyRecommendation && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">
                      Survey Match
                    </Badge>
                  )}
                </div>
                {request.matchScore && (
                  <div className="text-sm text-muted-foreground">
                    Match Score: {request.matchScore}%
                  </div>
                )}
                {request.message && (
                  <p className="text-sm bg-muted/50 p-2 rounded">{request.message}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  Requested: {new Date(request.createdAt).toLocaleDateString()}
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(request)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-approve-${request.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleReject(request)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-reject-${request.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
                {request.status !== 'pending' && (
                  <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigBankSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'tags' | 'roles' | 'titles' | 'labels'>('tags');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: '', description: '', color: '', isActive: true });

  const { data: tags = [], isLoading: tagsLoading } = useQuery<AdminTag[]>({
    queryKey: ["/api/config/tags"],
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<ServeRole[]>({
    queryKey: ["/api/config/serve-roles"],
  });

  const { data: titles = [], isLoading: titlesLoading } = useQuery<StaffTitle[]>({
    queryKey: ["/api/config/staff-titles"],
  });

  const { data: labels = [], isLoading: labelsLoading } = useQuery<GlobalLabel[]>({
    queryKey: ["/api/config/labels"],
  });

  const createMutation = useMutation({
    mutationFn: async ({ type, data }: { type: string; data: any }) => {
      const endpoints: Record<string, string> = {
        tags: '/api/config/tags',
        roles: '/api/config/serve-roles',
        titles: '/api/config/staff-titles',
        labels: '/api/config/labels',
      };
      return apiRequest("POST", endpoints[type], data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/serve-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/staff-titles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/labels"] });
      toast({ title: "Created", description: "Item created successfully." });
      setDialogOpen(false);
      setItemForm({ name: '', description: '', color: '', isActive: true });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create item.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ type, id, data }: { type: string; id: string; data: any }) => {
      const endpoints: Record<string, string> = {
        tags: `/api/config/tags/${id}`,
        roles: `/api/config/serve-roles/${id}`,
        titles: `/api/config/staff-titles/${id}`,
        labels: `/api/config/labels/${id}`,
      };
      return apiRequest("PATCH", endpoints[type], data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/serve-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/staff-titles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/labels"] });
      toast({ title: "Updated", description: "Item updated successfully." });
      setDialogOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', color: '', isActive: true });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const endpoints: Record<string, string> = {
        tags: `/api/config/tags/${id}`,
        roles: `/api/config/serve-roles/${id}`,
        titles: `/api/config/staff-titles/${id}`,
        labels: `/api/config/labels/${id}`,
      };
      return apiRequest("DELETE", endpoints[type]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/serve-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/staff-titles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/config/labels"] });
      toast({ title: "Deleted", description: "Item deleted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setItemForm({ name: '', description: '', color: '', isActive: true });
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name || item.key || '',
      description: item.description || '',
      color: item.color || '',
      isActive: item.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const typeMap: Record<string, string> = { tags: 'tags', roles: 'roles', titles: 'titles', labels: 'labels' };
    const data = activeTab === 'labels' 
      ? { key: itemForm.name, value: itemForm.name, description: itemForm.description }
      : { name: itemForm.name, description: itemForm.description, color: itemForm.color, isActive: itemForm.isActive };

    if (editingItem) {
      updateMutation.mutate({ type: typeMap[activeTab], id: editingItem.id, data });
    } else {
      createMutation.mutate({ type: typeMap[activeTab], data });
    }
  };

  const renderItems = () => {
    const items = activeTab === 'tags' ? tags : activeTab === 'roles' ? roles : activeTab === 'titles' ? titles : labels;
    const isLoading = activeTab === 'tags' ? tagsLoading : activeTab === 'roles' ? rolesLoading : activeTab === 'titles' ? titlesLoading : labelsLoading;

    if (isLoading) {
      return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <LayoutList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Items Yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first item.</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item: any) => (
          <Card key={item.id} className="hover-elevate" data-testid={`card-config-${item.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.color && (
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <h3 className="font-medium truncate">{item.name || item.key}</h3>
                    {item.isActive === false && (
                      <Badge variant="secondary" className="text-xs">Paused</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(item)}
                    data-testid={`button-edit-config-${item.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteMutation.mutate({ type: activeTab, id: item.id })}
                    data-testid={`button-delete-config-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const tabConfig = [
    { id: 'tags' as const, label: 'Tags', icon: Tag, description: 'Audience targeting tags for trainings' },
    { id: 'roles' as const, label: 'Serve Roles', icon: Briefcase, description: 'Roles for serving in ministries' },
    { id: 'titles' as const, label: 'Staff Titles', icon: Award, description: 'Staff and leadership titles' },
    { id: 'labels' as const, label: 'Labels', icon: LayoutList, description: 'Custom labels for the system' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 pb-2 border-b">
        {tabConfig.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
            data-testid={`tab-config-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {tabConfig.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tabConfig.find(t => t.id === activeTab)?.description}
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-config-item">
          <Plus className="h-4 w-4 mr-2" />
          Add {tabConfig.find(t => t.id === activeTab)?.label.slice(0, -1) || 'Item'}
        </Button>
      </div>

      {renderItems()}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} {tabConfig.find(t => t.id === activeTab)?.label.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details below." : "Enter the details for the new item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder={activeTab === 'labels' ? 'e.g., dream_team_name' : 'e.g., Usher'}
                data-testid="input-config-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Brief description..."
                data-testid="input-config-description"
              />
            </div>
            {activeTab !== 'labels' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Color (optional)</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={itemForm.color || '#6366f1'}
                      onChange={(e) => setItemForm({ ...itemForm, color: e.target.value })}
                      className="w-12 h-10 p-1"
                      data-testid="input-config-color"
                    />
                    <Input
                      value={itemForm.color}
                      onChange={(e) => setItemForm({ ...itemForm, color: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Active</label>
                    <p className="text-xs text-muted-foreground">Show this item in lists</p>
                  </div>
                  <Switch
                    checked={itemForm.isActive}
                    onCheckedChange={(checked) => setItemForm({ ...itemForm, isActive: checked })}
                    data-testid="switch-config-active"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !itemForm.name.trim()}
              data-testid="button-save-config"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== SYSTEM STATUS SECTION ==========
interface SystemStatus {
  database: { status: 'connected' | 'disconnected' | 'error'; message?: string; latency?: number };
  email: { status: 'configured' | 'not_configured' | 'error'; message?: string };
  outlook: { status: 'connected' | 'not_configured' | 'error'; message?: string };
  timestamp: string;
}

function SystemStatusSection() {
  const { data: status, isLoading, refetch, isFetching } = useQuery<SystemStatus>({
    queryKey: ['/api/system/status'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const getStatusBadge = (status: 'connected' | 'configured' | 'not_configured' | 'disconnected' | 'error') => {
    switch (status) {
      case 'connected':
      case 'configured':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Online</Badge>;
      case 'not_configured':
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Not Set Up</Badge>;
      case 'disconnected':
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Health check for connected services
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-status"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Database Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border" data-testid="status-database">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Database</p>
                  <p className="text-xs text-muted-foreground">{status?.database.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status?.database.latency !== undefined && (
                  <span className="text-xs text-muted-foreground">{status.database.latency}ms</span>
                )}
                {getStatusBadge(status?.database.status || 'disconnected')}
              </div>
            </div>

            {/* Email Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border" data-testid="status-email">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Email (Mailgun)</p>
                  <p className="text-xs text-muted-foreground">{status?.email.message}</p>
                </div>
              </div>
              {getStatusBadge(status?.email.status || 'not_configured')}
            </div>

            {/* Outlook Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border" data-testid="status-outlook">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Cloud className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Outlook 365</p>
                  <p className="text-xs text-muted-foreground">{status?.outlook.message}</p>
                </div>
              </div>
              {getStatusBadge(status?.outlook.status || 'not_configured')}
            </div>

            {status?.timestamp && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Last checked: {new Date(status.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface OutlookSettings {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecretConfigured: boolean;
  selectedCalendars: string[];
  roomCalendars: string[];
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
}

interface SetupStep {
  step: number;
  title: string;
  description: string;
  details: string[];
}

interface SetupGuide {
  title: string;
  steps: SetupStep[];
  requiredPermissions: string[];
  note: string;
}

function OutlookIntegrationSection() {
  const { toast } = useToast();
  const [showGuide, setShowGuide] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');

  const { data: settings, isLoading } = useQuery<OutlookSettings>({
    queryKey: ['/api/org/outlook-settings'],
  });

  const { data: setupGuide } = useQuery<SetupGuide>({
    queryKey: ['/api/org/outlook-setup-guide'],
    enabled: showGuide,
  });

  // Sync form state with fetched settings
  useState(() => {
    if (settings) {
      setTenantId(settings.tenantId);
      setClientId(settings.clientId);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OutlookSettings>) => {
      const res = await apiRequest('PUT', '/api/org/outlook-settings', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/org/outlook-settings'] });
      toast({ title: "Settings Updated", description: "Outlook integration settings have been saved." });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not save Outlook settings.", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/org/outlook-test');
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: data.message });
      } else {
        toast({ title: "Connection Failed", description: data.message, variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Test Failed", description: "Could not test Outlook connection.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      outlookTenantId: tenantId,
      outlookClientId: clientId,
    } as any);
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateMutation.mutate({ outlookIntegrationEnabled: enabled } as any);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Text copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Outlook 365 Integration
              </CardTitle>
              <CardDescription>
                Connect your church's Outlook 365 calendar to sync events and room bookings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
                data-testid="button-show-setup-guide"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Setup Guide
              </Button>
              <Switch
                checked={settings?.enabled ?? false}
                onCheckedChange={handleToggleEnabled}
                disabled={updateMutation.isPending}
                data-testid="switch-outlook-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3">
            <Badge variant={settings?.enabled ? "default" : "secondary"} className="flex items-center gap-1">
              {settings?.enabled ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {settings?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant={settings?.clientSecretConfigured ? "default" : "destructive"} className="flex items-center gap-1">
              {settings?.clientSecretConfigured ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {settings?.clientSecretConfigured ? 'Secret Configured' : 'Secret Missing'}
            </Badge>
            {settings?.lastSyncAt && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(settings.lastSyncAt).toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Credentials Form */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant ID</label>
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={tenantId || settings?.tenantId || ''}
                onChange={(e) => setTenantId(e.target.value)}
                data-testid="input-tenant-id"
              />
              <p className="text-xs text-muted-foreground">
                Your Azure AD Directory (tenant) ID
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={clientId || settings?.clientId || ''}
                onChange={(e) => setClientId(e.target.value)}
                data-testid="input-client-id"
              />
              <p className="text-xs text-muted-foreground">
                Your Azure AD Application (client) ID
              </p>
            </div>
          </div>

          {/* Client Secret Note */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Client Secret</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  For security, the client secret is stored in environment variables. 
                  Add <code className="bg-muted px-1 rounded">OUTLOOK_CLIENT_SECRET</code> to your Replit secrets.
                </p>
                {!settings?.clientSecretConfigured && (
                  <Badge variant="destructive" className="mt-2">Not configured</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Interval</label>
            <Select
              value={String(settings?.syncIntervalMinutes || 15)}
              onValueChange={(v) => updateMutation.mutate({ outlookSyncIntervalMinutes: Number(v) } as any)}
            >
              <SelectTrigger className="w-48" data-testid="select-sync-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-outlook"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              data-testid="button-test-outlook"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      {showGuide && setupGuide && (
        <Card>
          <CardHeader>
            <CardTitle>{setupGuide.title}</CardTitle>
            <CardDescription>
              Follow these steps to set up Azure AD app registration for Outlook integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupGuide.steps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {step.step}
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.details.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      {step.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
              <h4 className="font-medium text-blue-600 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Required Permissions
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {setupGuide.requiredPermissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="font-mono text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{setupGuide.note}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const CATEGORY_TYPES = [
  { value: "MINISTRY", label: "Ministry", description: "Ministry-specific events" },
  { value: "SERVICE", label: "Service", description: "Worship and church services" },
  { value: "GROUP", label: "Group", description: "Small groups and team meetings" },
  { value: "TAG", label: "Tag", description: "General event tags" },
] as const;

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["MINISTRY", "SERVICE", "GROUP", "TAG"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  description: z.string().optional(),
  outlookCategoryName: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

function CalendarCategoriesSection() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CalendarCategory | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      type: "TAG",
      color: "#3B82F6",
      description: "",
      outlookCategoryName: "",
      sortOrder: 0,
      isActive: true,
    },
  });

  const { data: categories = [], isLoading } = useQuery<CalendarCategory[]>({
    queryKey: ["/api/categories", { activeOnly: false }],
    queryFn: () => fetch("/api/categories?activeOnly=false").then(res => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      toast({ title: "Category Created", description: "New calendar category has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryFormData> }) =>
      apiRequest("PATCH", `/api/categories/${id}`, data),
    onSuccess: () => {
      toast({ title: "Category Updated", description: "Calendar category has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      toast({ title: "Category Paused", description: "Calendar category has been deactivated." });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      type: "TAG",
      color: "#3B82F6",
      description: "",
      outlookCategoryName: "",
      sortOrder: categories.length,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (category: CalendarCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      type: category.type as "MINISTRY" | "SERVICE" | "GROUP" | "TAG",
      color: category.color || "#3B82F6",
      description: category.description || "",
      outlookCategoryName: category.outlookCategoryName || "",
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleActive = (category: CalendarCategory) => {
    if (category.isActive) {
      deleteMutation.mutate(category.id);
    } else {
      updateMutation.mutate({ id: category.id, data: { isActive: true } });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Categories
            </CardTitle>
            <CardDescription>
              Manage event categories for the ministry calendar. Categories help organize events and sync with Outlook.
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calendar categories yet.</p>
              <p className="text-sm">Add categories to organize your ministry events.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    category.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                  }`}
                  data-testid={`category-item-${category.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: category.color || "#3B82F6" }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {category.type}
                        </Badge>
                        {!category.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                      {category.outlookCategoryName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          Outlook: {category.outlookCategoryName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(category)}
                      data-testid={`button-toggle-category-${category.id}`}
                    >
                      {category.isActive ? (
                        <X className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Calendar Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the calendar category settings."
                : "Create a new category to organize calendar events."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Youth Ministry"
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-12 h-10 p-1 cursor-pointer"
                          data-testid="input-category-color"
                        />
                        <Input
                          {...field}
                          placeholder="#3B82F6"
                          className="flex-1 font-mono text-sm"
                          data-testid="input-category-color-text"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief description of this category"
                        rows={2}
                        data-testid="input-category-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outlookCategoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outlook Category Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Category name in Outlook"
                        data-testid="input-category-outlook"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-category-sort"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editingCategory && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Show this category in the calendar filters
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-category-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-category"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCategory ? "Save Changes" : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif-display text-3xl font-bold flex items-center gap-3" data-testid="text-admin-title">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage manuals, people, and system settings
          </p>
        </div>
        <HelpLink category="admin" tooltip="Admin Help" variant="text" />
      </div>

      <Tabs defaultValue="trainings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trainings" className="gap-2" data-testid="tab-trainings">
            <GraduationCap className="h-4 w-4" />
            Trainings
          </TabsTrigger>
          <TabsTrigger value="manuals" className="gap-2" data-testid="tab-manuals">
            <Upload className="h-4 w-4" />
            Manuals
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2" data-testid="tab-people">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2" data-testid="tab-tools">
            <Settings className="h-4 w-4" />
            System Tools
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2" data-testid="tab-archived">
            <Trash2 className="h-4 w-4" />
            Archived
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2" data-testid="tab-config">
            <Tag className="h-4 w-4" />
            Config Bank
          </TabsTrigger>
          <TabsTrigger value="pastoral" className="gap-2" data-testid="tab-pastoral">
            <HelpCircle className="h-4 w-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="join-requests" className="gap-2" data-testid="tab-join-requests">
            <UserPlus className="h-4 w-4" />
            Join Requests
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
            <Cloud className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2" data-testid="tab-calendar">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trainings">
          <TrainingsSection />
        </TabsContent>

        <TabsContent value="manuals">
          <ManualsSection />
        </TabsContent>

        <TabsContent value="people">
          <PeopleSection />
        </TabsContent>

        <TabsContent value="tools">
          <SystemToolsSection />
        </TabsContent>

        <TabsContent value="archived">
          <ArchivedUsersSection />
        </TabsContent>

        <TabsContent value="config">
          <ConfigBankSection />
        </TabsContent>

        <TabsContent value="pastoral">
          <PastoralQuestionsSection />
        </TabsContent>

        <TabsContent value="join-requests">
          <JoinRequestsSection />
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <SystemStatusSection />
            <OutlookIntegrationSection />
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarCategoriesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
