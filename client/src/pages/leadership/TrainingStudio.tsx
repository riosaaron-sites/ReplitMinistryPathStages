import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { 
  Upload, 
  FileText, 
  Settings, 
  Sparkles, 
  Edit3, 
  Send, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  BookOpen,
  Eye,
  Save,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Pencil,
  List,
} from "lucide-react";
import type { TrainingModule, Ministry, TrainingModuleStatus, DeepLesson } from "@shared/schema";

interface Manual {
  id: string;
  title: string;
  fileUrl: string;
  category: string;
  ministryId?: string;
}

interface StepProps {
  isActive: boolean;
  isCompleted: boolean;
  stepNumber: number;
  title: string;
  description: string;
}

function StepIndicator({ isActive, isCompleted, stepNumber, title, description }: StepProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
      isActive ? 'bg-primary/10 border border-primary/20' : 
      isCompleted ? 'bg-muted' : 'opacity-50'
    }`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
        isCompleted ? 'bg-primary text-primary-foreground' :
        isActive ? 'bg-primary text-primary-foreground' :
        'bg-muted-foreground/20 text-muted-foreground'
      }`}>
        {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}

export default function TrainingStudio() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedManualId, setSelectedManualId] = useState<string>("");
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editTab, setEditTab] = useState("overview");
  
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    ministryId: "",
    category: "ministry_manual" as string,
    estimatedMinutes: 30,
    xpReward: 100,
    passingScore: 70,
    isRequired: false,
  });
  
  const [editedContent, setEditedContent] = useState({
    description: "",
    lessonSummary: "",
    lessons: [] as DeepLesson[],
    reflectionPrompt: "",
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: manuals = [] } = useQuery<Manual[]>({
    queryKey: ["/api/manuals"],
  });

  const { data: draftTrainings = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training-modules", "drafts"],
    queryFn: async () => {
      const res = await fetch("/api/training-modules?status=draft");
      if (!res.ok) throw new Error("Failed to fetch draft trainings");
      return res.json();
    },
  });

  const { data: selectedTraining, refetch: refetchTraining } = useQuery<TrainingModule>({
    queryKey: ["/api/training-modules", selectedTrainingId],
    queryFn: async () => {
      if (!selectedTrainingId) return null;
      const res = await fetch(`/api/training-modules/${selectedTrainingId}`);
      if (!res.ok) throw new Error("Failed to fetch training");
      return res.json();
    },
    enabled: !!selectedTrainingId,
  });

  useEffect(() => {
    if (selectedTraining) {
      setEditedContent({
        description: selectedTraining.description || "",
        lessonSummary: selectedTraining.lessonSummary || "",
        lessons: (selectedTraining.lessons as DeepLesson[]) || [],
        reflectionPrompt: selectedTraining.reflectionPrompt || "",
      });
    }
  }, [selectedTraining]);

  const generateTrainingMutation = useMutation({
    mutationFn: async (manualId: string) => {
      const res = await apiRequest("POST", `/api/manuals/${manualId}/analyze`);
      return res.json();
    },
    onSuccess: async (data) => {
      toast({ title: "Training Generated", description: "AI has generated training content as a draft." });
      await queryClient.invalidateQueries({ queryKey: ["/api/training-modules"] });
      if (data.trainingModuleId) {
        setSelectedTrainingId(data.trainingModuleId);
        setCurrentStep(4);
      }
    },
    onError: (error: any) => {
      toast({ title: "Generation Failed", description: error.message || "Failed to generate training", variant: "destructive" });
    },
  });

  const saveContentMutation = useMutation({
    mutationFn: async (updates: Partial<TrainingModule>) => {
      const res = await apiRequest("PATCH", `/api/training-modules/${selectedTrainingId}`, {
        ...updates,
        lastEditedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Saved", description: "Training content has been saved." });
      await refetchTraining();
    },
    onError: (error: any) => {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/training-modules/${selectedTrainingId}`, {
        moduleStatus: "live",
        isPublished: true,
        publishedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Published!", description: "Training is now live and visible to members." });
      await queryClient.invalidateQueries({ queryKey: ["/api/training-modules"] });
      setCurrentStep(5);
    },
    onError: (error: any) => {
      toast({ title: "Publish Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerate = async () => {
    if (!selectedManualId) {
      toast({ title: "Select a Manual", description: "Please select a manual to generate training from.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      await generateTrainingMutation.mutateAsync(selectedManualId);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContent = () => {
    saveContentMutation.mutate({
      description: editedContent.description,
      lessonSummary: editedContent.lessonSummary,
      lessons: editedContent.lessons as any,
      reflectionPrompt: editedContent.reflectionPrompt,
    });
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const handleSelectDraft = (trainingId: string) => {
    setSelectedTrainingId(trainingId);
    setCurrentStep(4);
  };

  const selectedManual = manuals.find(m => m.id === selectedManualId);

  const steps = [
    { title: "Select Manual", description: "Choose or upload a PDF manual" },
    { title: "Set Metadata", description: "Configure training settings" },
    { title: "Generate", description: "AI creates training content" },
    { title: "Review & Edit", description: "Refine content with rich editor" },
    { title: "Publish", description: "Make training live" },
  ];

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Training Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, generate, and publish training modules from ministry manuals
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/leadership/training")} data-testid="button-back-to-training">
          <BookOpen className="w-4 h-4 mr-2" />
          Training Management
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workflow Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, idx) => (
                <StepIndicator
                  key={idx}
                  stepNumber={idx + 1}
                  title={step.title}
                  description={step.description}
                  isActive={currentStep === idx + 1}
                  isCompleted={currentStep > idx + 1}
                />
              ))}
            </CardContent>
            <Separator />
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">Draft Trainings</p>
              <ScrollArea className="h-[200px]">
                {draftTrainings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No drafts yet</p>
                ) : (
                  <div className="space-y-2">
                    {draftTrainings.map((draft) => (
                      <Button
                        key={draft.id}
                        variant={selectedTrainingId === draft.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => handleSelectDraft(draft.id)}
                        data-testid={`button-draft-${draft.id}`}
                      >
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{draft.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {draft.lastGeneratedAt ? "Generated" : "Manual"}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Step 1: Select or Upload Manual
                </CardTitle>
                <CardDescription>
                  Choose an existing manual from the library or upload a new PDF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Select Existing Manual</Label>
                  <Select value={selectedManualId} onValueChange={setSelectedManualId}>
                    <SelectTrigger className="mt-2" data-testid="select-manual">
                      <SelectValue placeholder="Choose a manual..." />
                    </SelectTrigger>
                    <SelectContent>
                      {manuals.map((manual) => (
                        <SelectItem key={manual.id} value={manual.id}>
                          {manual.title} ({manual.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedManual && (
                  <Alert>
                    <FileCheck className="h-4 w-4" />
                    <AlertTitle>Manual Selected</AlertTitle>
                    <AlertDescription>
                      <strong>{selectedManual.title}</strong> - {selectedManual.category}
                      {selectedManual.ministryId && (
                        <span className="block text-sm">
                          Linked to: {ministries.find(m => m.id === selectedManual.ministryId)?.name || "Unknown Ministry"}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Or upload a new manual PDF using the Manuals page
                  </p>
                  <Button variant="outline" onClick={() => navigate("/leadership/manuals")} data-testid="button-upload-manual">
                    <Upload className="w-4 h-4 mr-2" />
                    Go to Manuals
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  onClick={() => setCurrentStep(2)} 
                  disabled={!selectedManualId}
                  data-testid="button-next-step-1"
                >
                  Next: Set Metadata
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Step 2: Configure Training Metadata
                </CardTitle>
                <CardDescription>
                  Set the title, ministry assignment, and other settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Training Title</Label>
                    <Input
                      id="title"
                      value={metadata.title || selectedManual?.title || ""}
                      onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter training title..."
                      data-testid="input-training-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ministry</Label>
                    <Select 
                      value={metadata.ministryId || selectedManual?.ministryId || ""} 
                      onValueChange={(v) => setMetadata(prev => ({ ...prev, ministryId: v }))}
                    >
                      <SelectTrigger data-testid="select-ministry">
                        <SelectValue placeholder="Select ministry..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">General (All Members)</SelectItem>
                        {ministries.map((ministry) => (
                          <SelectItem key={ministry.id} value={ministry.id}>
                            {ministry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this training..."
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
                    <Input
                      id="estimatedMinutes"
                      type="number"
                      value={metadata.estimatedMinutes}
                      onChange={(e) => setMetadata(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 30 }))}
                      data-testid="input-estimated-minutes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xpReward">XP Reward</Label>
                    <Input
                      id="xpReward"
                      type="number"
                      value={metadata.xpReward}
                      onChange={(e) => setMetadata(prev => ({ ...prev, xpReward: parseInt(e.target.value) || 100 }))}
                      data-testid="input-xp-reward"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Passing Score %</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      value={metadata.passingScore}
                      onChange={(e) => setMetadata(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 70 }))}
                      data-testid="input-passing-score"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back-step-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} data-testid="button-next-step-2">
                  Next: Generate Training
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Step 3: Generate Training Content
                </CardTitle>
                <CardDescription>
                  AI will analyze the manual and create lessons, questions, and assessments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Generate</AlertTitle>
                  <AlertDescription>
                    <p><strong>Manual:</strong> {selectedManual?.title}</p>
                    <p><strong>Title:</strong> {metadata.title || selectedManual?.title}</p>
                    <p><strong>Ministry:</strong> {ministries.find(m => m.id === (metadata.ministryId || selectedManual?.ministryId))?.name || "General"}</p>
                  </AlertDescription>
                </Alert>

                {isGenerating && (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-lg font-medium">Generating Training Content...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This may take 1-2 minutes. AI is analyzing the manual and creating lessons.
                    </p>
                    <Progress value={33} className="w-64 mx-auto mt-4" />
                  </div>
                )}

                {!isGenerating && (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto text-primary" />
                    <p className="mt-4 text-lg font-medium">Ready to Generate</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click the button below to start AI training generation
                    </p>
                    <Button 
                      size="lg" 
                      className="mt-6" 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      data-testid="button-generate-training"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Training with AI
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)} disabled={isGenerating} data-testid="button-back-step-3">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentStep(4)} 
                  disabled={isGenerating}
                  data-testid="button-skip-to-edit"
                >
                  Skip to Edit (for existing drafts)
                </Button>
              </CardFooter>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Step 4: Review & Edit Content
                </CardTitle>
                <CardDescription>
                  Refine the AI-generated content using the rich text editor
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedTraining ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Training Selected</AlertTitle>
                    <AlertDescription>
                      Please select a draft training from the sidebar or generate a new one.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{selectedTraining.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={selectedTraining.moduleStatus === 'live' ? 'default' : 'secondary'}>
                            {selectedTraining.moduleStatus || 'draft'}
                          </Badge>
                          {selectedTraining.isAutoGenerated && (
                            <Badge variant="outline">AI Generated</Badge>
                          )}
                          {selectedTraining.lastGeneratedAt && (
                            <span className="text-xs text-muted-foreground">
                              Generated: {new Date(selectedTraining.lastGeneratedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSaveContent} disabled={saveContentMutation.isPending} data-testid="button-save-content">
                          {saveContentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span className="ml-2">Save</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetchTraining()} data-testid="button-refresh-content">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Tabs value={editTab} onValueChange={setEditTab}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                        <TabsTrigger value="lessons" data-testid="tab-lessons">
                          Lessons ({editedContent.lessons?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="reflection" data-testid="tab-reflection">Reflection</TabsTrigger>
                        <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <RichTextEditor
                            content={editedContent.description}
                            onChange={(val) => setEditedContent(prev => ({ ...prev, description: val }))}
                            placeholder="Enter training description..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lesson Summary</Label>
                          <RichTextEditor
                            content={editedContent.lessonSummary}
                            onChange={(val) => setEditedContent(prev => ({ ...prev, lessonSummary: val }))}
                            placeholder="Enter lesson summary..."
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="lessons" className="mt-4">
                        <ScrollArea className="h-[500px] pr-4">
                          {editedContent.lessons.length === 0 ? (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>No Lessons</AlertTitle>
                              <AlertDescription>
                                This training doesn't have lessons yet. Generate content or add lessons manually.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="space-y-6">
                              {editedContent.lessons.map((lesson, idx) => (
                                <Card key={lesson.id || idx}>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                        {lesson.lessonNumber || idx + 1}
                                      </span>
                                      {lesson.title}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                      <Label className="text-sm">Teaching Content</Label>
                                      <RichTextEditor
                                        content={lesson.teachingContent || ""}
                                        onChange={(val) => {
                                          const updated = [...editedContent.lessons];
                                          updated[idx] = { ...updated[idx], teachingContent: val };
                                          setEditedContent(prev => ({ ...prev, lessons: updated }));
                                        }}
                                        placeholder="Teaching content..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm">Why This Matters</Label>
                                      <RichTextEditor
                                        content={lesson.whyThisMatters || ""}
                                        onChange={(val) => {
                                          const updated = [...editedContent.lessons];
                                          updated[idx] = { ...updated[idx], whyThisMatters: val };
                                          setEditedContent(prev => ({ ...prev, lessons: updated }));
                                        }}
                                        placeholder="Why this matters..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm">Reflection Prompt</Label>
                                      <Textarea
                                        value={lesson.reflectionPrompt || ""}
                                        onChange={(e) => {
                                          const updated = [...editedContent.lessons];
                                          updated[idx] = { ...updated[idx], reflectionPrompt: e.target.value };
                                          setEditedContent(prev => ({ ...prev, lessons: updated }));
                                        }}
                                        placeholder="Reflection prompt for this lesson..."
                                        rows={2}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="reflection" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Final Reflection Prompt</Label>
                          <RichTextEditor
                            content={editedContent.reflectionPrompt}
                            onChange={(val) => setEditedContent(prev => ({ ...prev, reflectionPrompt: val }))}
                            placeholder="Enter final reflection prompt..."
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="preview" className="mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Content Preview
                            </CardTitle>
                            <CardDescription>This is how members will see the content</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {editedContent.description && (
                              <div>
                                <h4 className="font-semibold mb-2">Description</h4>
                                <MarkdownRenderer content={editedContent.description} />
                              </div>
                            )}
                            {editedContent.lessonSummary && (
                              <div>
                                <h4 className="font-semibold mb-2">Lesson Summary</h4>
                                <MarkdownRenderer content={editedContent.lessonSummary} />
                              </div>
                            )}
                            {editedContent.lessons.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">Lessons</h4>
                                {editedContent.lessons.map((lesson, idx) => (
                                  <div key={idx} className="mb-4 p-4 border rounded-lg">
                                    <h5 className="font-medium mb-2">
                                      Lesson {lesson.lessonNumber || idx + 1}: {lesson.title}
                                    </h5>
                                    <MarkdownRenderer content={lesson.teachingContent || ""} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back-step-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handlePublish} 
                  disabled={!selectedTraining || publishMutation.isPending}
                  data-testid="button-publish-training"
                >
                  {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Publish Training
                </Button>
              </CardFooter>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Training Published!
                </CardTitle>
                <CardDescription>
                  Your training is now live and visible to members
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
                <h3 className="text-xl font-semibold mt-4">{selectedTraining?.title}</h3>
                <p className="text-muted-foreground mt-2">
                  Members assigned to this ministry can now access this training in their dashboard.
                </p>
                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" onClick={() => { setCurrentStep(1); setSelectedTrainingId(""); setSelectedManualId(""); }} data-testid="button-create-another">
                    Create Another Training
                  </Button>
                  <Button onClick={() => navigate("/leadership/training")} data-testid="button-view-all-trainings">
                    View All Trainings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
