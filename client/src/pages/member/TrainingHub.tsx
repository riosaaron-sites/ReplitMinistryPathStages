import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole } from "@/hooks/useRole";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Play,
  Award,
  ChevronRight,
  Loader2,
  GraduationCap,
  Users,
  Music,
  Shield,
  Baby,
  Heart,
  RotateCcw,
  Eye,
} from "lucide-react";
import { HelpLink } from "@/components/HelpLink";
import { CoachBubble } from "@/components/CoachBubble";

interface TrainingModule {
  id: string;
  ministryId?: string;
  title: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  contentSections?: any[];
  isRequired?: boolean;
  sortOrder?: number;
  audience?: 'all' | 'leader' | 'ministry';
}

interface UserTrainingProgress {
  id: string;
  moduleId: string;
  status?: string;
  progressPercent?: number;
  startedAt?: string;
  completedAt?: string;
  assessmentScore?: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  'children': Baby,
  'youth': Users,
  'worship': Music,
  'safety': Shield,
  'pastoral': Heart,
  'general': BookOpen,
};

interface RoleAssignment {
  id: string;
  ministryId: string;
  isActive?: boolean;
}

export default function TrainingHub() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("required");
  const { isLeader } = useRole();

  const { data: modules = [], isLoading: modulesLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: progress = [] } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress"],
  });

  const { data: assignments = [] } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const updateProgress = useMutation({
    mutationFn: async (data: { moduleId: string; status: string; progressPercent?: number }) => {
      return apiRequest("POST", "/api/training/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
    },
  });

  const getModuleProgress = (moduleId: string) => {
    return progress.find(p => p.moduleId === moduleId);
  };

  const getProgressStatus = (moduleId: string) => {
    const p = getModuleProgress(moduleId);
    if (!p) return 'not-started';
    return p.status || 'not-started';
  };

  const getProgressPercent = (moduleId: string) => {
    const p = getModuleProgress(moduleId);
    return p?.progressPercent || 0;
  };

  const handleStartModule = (moduleId: string) => {
    updateProgress.mutate({
      moduleId,
      status: 'in-progress',
      progressPercent: 0,
    });
    setLocation(`/trainings/${moduleId}`);
  };

  const handleContinueModule = (moduleId: string) => {
    setLocation(`/trainings/${moduleId}`);
  };

  const handleReviewModule = (moduleId: string) => {
    setLocation(`/trainings/${moduleId}`);
  };

  // Get active ministry IDs for this user
  const myMinistryIds = assignments.filter(a => a.isActive).map(a => a.ministryId);
  
  // Get modules relevant to this user based on audience and ministry assignments
  // - audience='all': visible to everyone
  // - audience='leader': visible only to leaders/pastors
  // - audience='ministry': visible only to members of that specific ministry
  const myRelevantModules = modules.filter(m => {
    const audience = m.audience || 'all';
    
    // If audience is 'leader', only show to leaders/pastors
    if (audience === 'leader') {
      // For leader audience with ministry_id: must be leader AND in that ministry
      if (m.ministryId) {
        return isLeader && myMinistryIds.includes(m.ministryId);
      }
      // For leader audience without ministry_id: just need to be a leader
      return isLeader;
    }
    
    // If audience is 'ministry', only show to members of that ministry
    if (audience === 'ministry') {
      return m.ministryId ? myMinistryIds.includes(m.ministryId) : false;
    }
    
    // audience='all' or no audience: show to everyone (general training)
    // If it has a ministry_id, only show to that ministry
    if (m.ministryId) {
      return myMinistryIds.includes(m.ministryId);
    }
    
    return true;
  });

  // Categorize modules
  const requiredModules = myRelevantModules.filter(m => m.isRequired);
  const optionalModules = myRelevantModules.filter(m => !m.isRequired);
  
  // Get completed modules (includes 'completed' and 'approved' statuses)
  const completedModuleIds = new Set(
    progress.filter(p => p.status === 'completed' || p.status === 'approved').map(p => p.moduleId)
  );
  const completedModules = myRelevantModules.filter(m => completedModuleIds.has(m.id));
  
  // Get submitted (awaiting approval) modules
  const submittedModuleIds = new Set(
    progress.filter(p => p.status === 'submitted').map(p => p.moduleId)
  );
  
  // Filter for non-completed in Required/Optional tabs
  const requiredIncomplete = requiredModules.filter(m => !completedModuleIds.has(m.id));
  const optionalIncomplete = optionalModules.filter(m => !completedModuleIds.has(m.id));
  
  // Counts
  const completedCount = completedModules.length;
  const inProgressCount = progress.filter(p => p.status === 'in-progress').length;
  const totalRequired = requiredModules.length;
  const requiredComplete = requiredModules.filter(m => completedModuleIds.has(m.id)).length;

  const renderModuleCard = (module: TrainingModule, showReviewButton: boolean = false) => {
    const status = getProgressStatus(module.id);
    const percent = getProgressPercent(module.id);
    const Icon = CATEGORY_ICONS[module.category || 'general'] || BookOpen;
    const isCompleted = status === 'completed' || status === 'approved';
    const isSubmitted = status === 'submitted';

    return (
      <Card key={module.id} className="hover-elevate" data-testid={`card-training-module-${module.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'
            }`}>
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Icon className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {module.isRequired && !isCompleted && (
                <Badge variant="secondary" className="text-xs">
                  Required
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {status === 'approved' ? 'Approved' : 'Complete'}
                </Badge>
              )}
              {isSubmitted && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Awaiting Review
                </Badge>
              )}
              {status === 'in-progress' && (
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  In Progress
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-lg mt-2">{module.title}</CardTitle>
          {module.description && (
            <CardDescription className="line-clamp-2">
              {module.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-3">
          {module.estimatedMinutes && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
              <Clock className="w-4 h-4" />
              ~{module.estimatedMinutes} minutes
            </p>
          )}
          {status !== 'not-started' && !isCompleted && !isSubmitted && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
          )}
          {isSubmitted && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Submitted for leader review
            </p>
          )}
          {isCompleted && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {status === 'approved' ? 'Approved by leader' : 'Completed'}
            </p>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          {status === 'not-started' ? (
            <Button 
              className="w-full" 
              onClick={() => handleStartModule(module.id)}
              disabled={updateProgress.isPending}
              data-testid={`button-start-training-${module.id}`}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Training
            </Button>
          ) : isCompleted || isSubmitted ? (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleReviewModule(module.id)}
              data-testid={`button-review-training-${module.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Content
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => handleContinueModule(module.id)}
              data-testid={`button-continue-training-${module.id}`}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-training-hub-title">
            <GraduationCap className="w-6 h-6" />
            Training Hub
          </h1>
          <p className="text-muted-foreground">
            Complete training modules to prepare for ministry service
          </p>
        </div>
        <HelpLink category="trainings" tooltip="Training Help" />
      </div>

      <CoachBubble
        id="training-hub-welcome"
        title="Grow Through Training"
        message="Complete required trainings to prepare for ministry service. Each module includes teaching, study questions, and an assessment. Your progress is saved automatically."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-count">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-in-progress-count">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-required-progress">{requiredComplete}/{totalRequired}</p>
                <p className="text-sm text-muted-foreground">Required Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Required / Optional / Completed */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="required" className="gap-2" data-testid="tab-required">
            <Award className="w-4 h-4" />
            Required ({requiredIncomplete.length})
          </TabsTrigger>
          <TabsTrigger value="optional" className="gap-2" data-testid="tab-optional">
            <BookOpen className="w-4 h-4" />
            Optional ({optionalIncomplete.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
            <CheckCircle className="w-4 h-4" />
            Completed ({completedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="required" className="mt-4">
          {requiredIncomplete.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">All Required Trainings Complete!</p>
                <p className="text-muted-foreground">
                  Great job! You've completed all required trainings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requiredIncomplete.map(module => renderModuleCard(module))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="optional" className="mt-4">
          {optionalIncomplete.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No Optional Trainings Available</p>
                <p className="text-muted-foreground">
                  Check back later for additional learning opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {optionalIncomplete.map(module => renderModuleCard(module))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedModules.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No Completed Trainings Yet</p>
                <p className="text-muted-foreground">
                  Complete your first training to see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You can review any completed training at any time. Click "Review Content" to revisit the material.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedModules.map(module => renderModuleCard(module, true))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
