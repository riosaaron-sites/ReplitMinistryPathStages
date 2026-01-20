import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  BookOpen,
  Users,
  Star,
  Award,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
  Zap,
  Medal,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

interface TrainingModule {
  id: string;
  ministryId?: string;
  title: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  isRequired?: boolean;
}

interface UserTrainingProgress {
  id: string;
  moduleId: string;
  module?: TrainingModule;
  status?: string;
  progressPercent?: number;
  startedAt?: string;
  completedAt?: string;
  assessmentScore?: number;
}

interface Ministry {
  id: string;
  name: string;
  category: string;
}

interface RoleAssignment {
  id: string;
  ministryId: string;
  ministry?: Ministry;
  roleName?: string;
  isActive?: boolean;
}

interface BadgeData {
  id: string;
  badgeId: string;
  badge?: {
    id: string;
    name: string;
    description?: string;
    iconName?: string;
    rarity?: string;
    category?: string;
    xpValue?: number;
  };
  awardedAt?: string;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  reached: boolean;
  reachedAt?: string;
  count?: number;
  teamsCount?: number;
}

interface GamificationProfile {
  milestones: Milestone[];
  milestonesReached: number;
  totalMilestones: number;
  pathProgress: number;
  nextMilestone?: { id: string; name: string; order: number } | null;
  badges: BadgeData[];
  isProgressing: boolean;
  encouragement: string;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  variant = "default"
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  description?: string;
  variant?: "default" | "success" | "warning" | "primary";
}) {
  const bgColors = {
    default: "bg-muted/50",
    success: "bg-green-500/10",
    warning: "bg-yellow-500/10",
    primary: "bg-primary/10",
  };
  const iconColors = {
    default: "text-muted-foreground",
    success: "text-green-500",
    warning: "text-yellow-500",
    primary: "text-primary",
  };

  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${bgColors[variant]}`}>
            <Icon className={`h-5 w-5 ${iconColors[variant]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingCard({ 
  progress,
  onContinue,
}: { 
  progress: UserTrainingProgress;
  onContinue?: () => void;
}) {
  const module = progress.module;
  const isCompleted = progress.status === 'completed';
  const isInProgress = progress.status === 'in-progress';
  const percent = progress.progressPercent || 0;

  return (
    <Card className="hover-elevate" data-testid={`card-training-${progress.moduleId}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{module?.title || "Training Module"}</h3>
              {isCompleted && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              {isInProgress && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
            {module?.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {module.description}
              </p>
            )}
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percent}%</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>

            {progress.assessmentScore !== undefined && progress.assessmentScore !== null && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Quiz Score: <strong>{progress.assessmentScore}%</strong></span>
              </div>
            )}

            {progress.completedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Completed {format(new Date(progress.completedAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      {!isCompleted && (
        <CardFooter className="pt-0">
          <Link href="/trainings">
            <Button size="sm" data-testid={`button-continue-${progress.moduleId}`}>
              {isInProgress ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Continue
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Retake
                </>
              )}
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

function NextStepCard({
  title,
  description,
  href,
  icon: Icon,
  priority = "normal",
}: {
  title: string;
  description: string;
  href: string;
  icon: any;
  priority?: "normal" | "high";
}) {
  return (
    <Card className={`hover-elevate ${priority === "high" ? "border-primary/30" : ""}`} data-testid={`card-nextstep-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${priority === "high" ? "bg-primary/10" : "bg-muted/50"}`}>
            <Icon className={`h-5 w-5 ${priority === "high" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              {priority === "high" && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Link href={href}>
            <Button size="icon" variant="ghost">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyProgress() {
  const { user } = useAuth();
  const [ministryFilter, setMinistryFilter] = useState<string>("all");

  const { data: trainingProgress = [], isLoading: progressLoading } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress"],
  });

  const { data: modules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: assignments = [] } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: xpProfile } = useQuery<GamificationProfile>({
    queryKey: ["/api/gamification/profile"],
  });

  const progressWithModules = trainingProgress.map(p => ({
    ...p,
    module: modules.find(m => m.id === p.moduleId),
  }));

  // Get active ministry IDs
  const myMinistryIds = assignments.filter(a => a.isActive).map(a => a.ministryId);
  
  // Get modules relevant to this user: general trainings + their ministry trainings
  const myRelevantModules = modules.filter(m => 
    !m.ministryId || myMinistryIds.includes(m.ministryId)
  );
  
  // Filter modules based on selected ministry (from user's relevant modules only)
  const filteredModules = ministryFilter === "all" 
    ? myRelevantModules 
    : ministryFilter === "general" 
      ? myRelevantModules.filter(m => !m.ministryId) 
      : myRelevantModules.filter(m => m.ministryId === ministryFilter);

  // Get relevant module IDs for quick lookup
  const myRelevantModuleIds = new Set(myRelevantModules.map(m => m.id));
  
  const filteredProgress = progressWithModules.filter(p => {
    // Only include progress for modules relevant to this user
    if (!p.module || !myRelevantModuleIds.has(p.module.id)) return false;
    if (ministryFilter === "all") return true;
    if (ministryFilter === "general") return !p.module?.ministryId;
    return p.module?.ministryId === ministryFilter;
  });

  const completedTrainings = filteredProgress.filter(p => p.status === 'completed');
  const inProgressTrainings = filteredProgress.filter(p => p.status === 'in-progress');
  // notStarted should check against ALL training progress since completion is global
  const notStarted = filteredModules.filter(m => !trainingProgress.some(p => p.moduleId === m.id));

  const averageScore = completedTrainings.length > 0
    ? Math.round(
        completedTrainings
          .filter(t => t.assessmentScore !== undefined && t.assessmentScore !== null)
          .reduce((sum, t) => sum + (t.assessmentScore || 0), 0) /
        completedTrainings.filter(t => t.assessmentScore !== undefined && t.assessmentScore !== null).length
      ) || 0
    : 0;

  // Use filtered modules for progress calculation to be consistent with filter
  const overallProgress = filteredModules.length > 0
    ? Math.round((completedTrainings.length / filteredModules.length) * 100)
    : 0;

  const activeMinistries = assignments.filter(a => a.isActive);

  const getNextSteps = () => {
    const steps = [];

    if (inProgressTrainings.length > 0) {
      steps.push({
        title: "Complete In-Progress Training",
        description: `You have ${inProgressTrainings.length} training module${inProgressTrainings.length > 1 ? 's' : ''} to finish`,
        href: "/trainings",
        icon: GraduationCap,
        priority: "high" as const,
      });
    }

    if (user?.learnStatus !== 'complete') {
      steps.push({
        title: "Complete LEARN Step",
        description: "Advance on your discipleship journey",
        href: "/discipleship",
        icon: BookOpen,
        priority: "high" as const,
      });
    }

    if (activeMinistries.length === 0) {
      steps.push({
        title: "Join a Ministry Team",
        description: "Find your place to serve in the church",
        href: "/teams",
        icon: Users,
        priority: "normal" as const,
      });
    }

    if (notStarted.length > 0) {
      steps.push({
        title: "Explore More Training",
        description: `${notStarted.length} training module${notStarted.length > 1 ? 's' : ''} available`,
        href: "/trainings",
        icon: Target,
        priority: "normal" as const,
      });
    }

    return steps;
  };

  const nextSteps = getNextSteps();

  if (progressLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <TrendingUp className="w-6 h-6" />
          My Progress
        </h1>
        <p className="text-muted-foreground">
          Track your training, achievements, and next steps in your ministry journey
        </p>
      </div>

      {/* Ministry Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by Ministry:</span>
          <Select value={ministryFilter} onValueChange={setMinistryFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-ministry-filter">
              <SelectValue placeholder="All Trainings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainings</SelectItem>
              <SelectItem value="general">General (No Ministry)</SelectItem>
              {ministries.filter(m => myMinistryIds.includes(m.id)).map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Milestones"
          value={xpProfile?.milestonesReached || 0}
          icon={Star}
          description="Steps on your path"
          variant="primary"
        />
        <StatCard 
          title="Trainings Completed"
          value={completedTrainings.length}
          icon={CheckCircle2}
          description={`of ${filteredModules.length} total`}
          variant="success"
        />
        <StatCard 
          title="Average Quiz Score"
          value={`${averageScore}%`}
          icon={Trophy}
          description="Across all quizzes"
        />
        <StatCard 
          title="In Progress"
          value={inProgressTrainings.length}
          icon={Clock}
          description="Continue where you left off"
          variant="warning"
        />
        <StatCard 
          title="Ministry Teams"
          value={activeMinistries.length}
          icon={Users}
          description="Active memberships"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {ministryFilter === "all" ? "Overall Training Progress" : "Filtered Training Progress"}
            </span>
            <span className="text-sm font-bold">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {completedTrainings.length} of {filteredModules.length} modules completed
          </p>
        </CardContent>
      </Card>

      {/* Path Progress & Achievements */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Path Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Path Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xl">
                {xpProfile?.milestonesReached || 0}
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {xpProfile?.milestonesReached || 0} of {xpProfile?.totalMilestones || 6} Milestones
                </p>
                <p className="text-sm text-muted-foreground">
                  {xpProfile?.isProgressing ? "You're making progress!" : "Start your journey"}
                </p>
              </div>
            </div>
            {xpProfile?.nextMilestone && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Next: {xpProfile.nextMilestone.name}</span>
                  <span className="font-medium">{xpProfile.pathProgress || 0}%</span>
                </div>
                <Progress value={xpProfile.pathProgress || 0} className="h-2" />
              </div>
            )}
            {!xpProfile?.nextMilestone && (xpProfile?.milestonesReached || 0) > 0 && (
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <Sparkles className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-sm font-medium text-primary">All milestones reached!</p>
              </div>
            )}
            {xpProfile?.encouragement && (
              <p className="text-xs text-muted-foreground mt-3 italic">
                {xpProfile.encouragement}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Medal className="h-5 w-5 text-amber-500" />
              Achievements
            </CardTitle>
            <CardDescription>
              {xpProfile?.badges?.length || 0} achievements earned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {xpProfile?.badges && xpProfile.badges.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {xpProfile.badges.slice(0, 8).map((badge) => (
                  <div 
                    key={badge.id}
                    className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 flex flex-col items-center text-center"
                    title={badge.badge?.description || badge.badge?.name}
                  >
                    <Award className="h-6 w-6 text-amber-500 mb-1" />
                    <span className="text-xs font-medium truncate w-full">
                      {badge.badge?.name || "Achievement"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Medal className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Complete trainings to earn achievements!</p>
              </div>
            )}
            {xpProfile?.badges && xpProfile.badges.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{xpProfile.badges.length - 8} more achievements
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {nextSteps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Next Steps
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {nextSteps.map((step, index) => (
              <NextStepCard key={index} {...step} />
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="completed">
        <TabsList>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedTrainings.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" data-testid="tab-in-progress">
            In Progress ({inProgressTrainings.length})
          </TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available">
            Available ({notStarted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="mt-4">
          {completedTrainings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {completedTrainings.map(training => (
                <TrainingCard key={training.id} progress={training} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg">No completed trainings yet</h3>
              <p className="text-muted-foreground mb-4">
                Start a training module to see your progress here
              </p>
              <Link href="/trainings">
                <Button>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Browse Training
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="mt-4">
          {inProgressTrainings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressTrainings.map(training => (
                <TrainingCard key={training.id} progress={training} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg">No training in progress</h3>
              <p className="text-muted-foreground mb-4">
                Pick up where you left off or start something new
              </p>
              <Link href="/trainings">
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Start Training
                </Button>
              </Link>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-4">
          {notStarted.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notStarted.map(module => (
                <Card key={module.id} className="hover-elevate" data-testid={`card-available-${module.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      {module.isRequired && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                    {module.category && (
                      <CardDescription>{module.category}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    {module.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {module.description}
                      </p>
                    )}
                    {module.estimatedMinutes && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3 inline mr-1" />
                        ~{module.estimatedMinutes} min
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Link href="/trainings">
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="font-medium text-lg">All caught up!</h3>
              <p className="text-muted-foreground">
                You've started all available training modules
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
