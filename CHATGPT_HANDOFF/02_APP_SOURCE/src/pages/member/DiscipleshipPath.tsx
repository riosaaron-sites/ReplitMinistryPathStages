import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DISCIPLESHIP_STEPS, type MinistryPathStatus } from "@shared/schema";
import {
  Music,
  Users,
  BookOpen,
  Heart,
  Compass,
  Check,
  ChevronRight,
  Loader2,
  Target,
  Sparkles,
  Trophy,
  Star,
  Zap,
} from "lucide-react";

interface MinistryPathProgress {
  hasAttendedSunday: boolean;
  hasAttendedNextNight: boolean;
  learnStatus: MinistryPathStatus;
  loveStatus: MinistryPathStatus;
  leadStatus: MinistryPathStatus;
  ministryPathLastUpdated: string | null;
}

interface MinistryPathUpdate {
  hasAttendedSunday?: boolean;
  hasAttendedNextNight?: boolean;
  learnStatus?: MinistryPathStatus;
  loveStatus?: MinistryPathStatus;
  leadStatus?: MinistryPathStatus;
}

const STEP_ICONS: Record<string, typeof Music> = {
  music: Music,
  users: Users,
  'book-open': BookOpen,
  heart: Heart,
  compass: Compass,
};

const STEP_XP_REWARDS: Record<string, number> = {
  worship: 100,
  'next-night': 100,
  learn: 200,
  love: 300,
  lead: 500,
};

function getStepStatus(stepId: string, progress: MinistryPathProgress): MinistryPathStatus {
  switch (stepId) {
    case 'worship':
      return progress.hasAttendedSunday ? 'complete' : 'not-started';
    case 'next-night':
      return progress.hasAttendedNextNight ? 'complete' : 'not-started';
    case 'learn':
      return progress.learnStatus;
    case 'love':
      return progress.loveStatus;
    case 'lead':
      return progress.leadStatus;
    default:
      return 'not-started';
  }
}

function getStatusColor(status: MinistryPathStatus) {
  switch (status) {
    case 'complete':
      return 'bg-green-500';
    case 'in-progress':
      return 'bg-amber-500';
    default:
      return 'bg-muted';
  }
}

function getStatusBadge(status: MinistryPathStatus, stepId?: string) {
  const testIdSuffix = stepId ? `-${stepId}` : '';
  switch (status) {
    case 'complete':
      return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-complete${testIdSuffix}`}>Complete</Badge>;
    case 'in-progress':
      return <Badge variant="secondary" className="bg-amber-500 text-white" data-testid={`badge-status-in-progress${testIdSuffix}`}>In Progress</Badge>;
    default:
      return <Badge variant="outline" data-testid={`badge-status-not-started${testIdSuffix}`}>Not Started</Badge>;
  }
}

export default function DiscipleshipPath() {
  const { toast } = useToast();

  const { data: progress, isLoading } = useQuery<MinistryPathProgress>({
    queryKey: ["/api/ministry-path"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: MinistryPathUpdate) => {
      return apiRequest("POST", "/api/ministry-path", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-path"] });
      toast({
        title: "Progress Updated",
        description: "Your discipleship journey has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = (stepId: string) => {
    switch (stepId) {
      case 'worship':
        updateMutation.mutate({ hasAttendedSunday: true });
        break;
      case 'next-night':
        updateMutation.mutate({ hasAttendedNextNight: true });
        break;
      case 'learn':
        updateMutation.mutate({ learnStatus: 'complete' });
        break;
      case 'love':
        updateMutation.mutate({ loveStatus: 'complete' });
        break;
      case 'lead':
        updateMutation.mutate({ leadStatus: 'complete' });
        break;
    }
  };

  const handleStartStep = (stepId: string) => {
    switch (stepId) {
      case 'learn':
        updateMutation.mutate({ learnStatus: 'in-progress' });
        break;
      case 'love':
        updateMutation.mutate({ loveStatus: 'in-progress' });
        break;
      case 'lead':
        updateMutation.mutate({ leadStatus: 'in-progress' });
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultProgress: MinistryPathProgress = {
    hasAttendedSunday: false,
    hasAttendedNextNight: false,
    learnStatus: 'not-started',
    loveStatus: 'not-started',
    leadStatus: 'not-started',
    ministryPathLastUpdated: null,
  };

  const currentProgress = progress || defaultProgress;

  const completedSteps = DISCIPLESHIP_STEPS.filter(
    step => getStepStatus(step.id, currentProgress) === 'complete'
  ).length;

  const progressPercent = (completedSteps / DISCIPLESHIP_STEPS.length) * 100;

  const totalXpEarned = DISCIPLESHIP_STEPS.reduce((acc, step) => {
    const status = getStepStatus(step.id, currentProgress);
    if (status === 'complete') {
      return acc + (STEP_XP_REWARDS[step.id] || 0);
    }
    return acc;
  }, 0);

  const totalXpAvailable = Object.values(STEP_XP_REWARDS).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Discipleship Path</h1>
          <p className="text-muted-foreground">
            Live the Life. Tell the Story.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Steps Complete</p>
            <p className="text-xl font-bold" data-testid="text-progress-count">{completedSteps}/{DISCIPLESHIP_STEPS.length}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center" data-testid="icon-progress">
            {progressPercent === 100 ? (
              <Trophy className="w-7 h-7 text-primary" />
            ) : (
              <Target className="w-7 h-7 text-primary" />
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6">
            <div className="flex items-center justify-between relative">
              {DISCIPLESHIP_STEPS.map((step, index) => {
                const IconComponent = STEP_ICONS[step.icon] || Target;
                const status = getStepStatus(step.id, currentProgress);
                const isComplete = status === 'complete';
                const isInProgress = status === 'in-progress';
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isComplete 
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                          : isInProgress
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse'
                          : 'bg-muted text-muted-foreground'
                      }`} data-testid={`journey-icon-${step.id}`}>
                        {isComplete ? (
                          <Check className="w-6 h-6" />
                        ) : (
                          <IconComponent className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`text-xs font-medium mt-2 text-center max-w-[60px] ${
                        isComplete ? 'text-green-600 dark:text-green-400' : 
                        isInProgress ? 'text-amber-600 dark:text-amber-400' : 
                        'text-muted-foreground'
                      }`}>{step.title}</span>
                      {isComplete && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5 mt-0.5">
                          <Zap className="w-3 h-3" />+{STEP_XP_REWARDS[step.id]}
                        </span>
                      )}
                    </div>
                    {index < DISCIPLESHIP_STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-green-500' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Journey Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Your Discipleship Journey
          </CardTitle>
          <CardDescription>
            Follow the path from Worship to Lead as you grow in your faith and serve others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-muted hidden sm:block" />
            <div 
              className="absolute left-8 top-0 w-1 bg-primary transition-all duration-500 hidden sm:block"
              style={{ height: `${progressPercent}%` }}
            />
            
            <div className="space-y-6">
              {DISCIPLESHIP_STEPS.map((step, index) => {
                const IconComponent = STEP_ICONS[step.icon] || Target;
                const status = getStepStatus(step.id, currentProgress);
                const isComplete = status === 'complete';
                const isInProgress = status === 'in-progress';
                const isPreviousComplete = index === 0 || 
                  getStepStatus(DISCIPLESHIP_STEPS[index - 1].id, currentProgress) === 'complete';

                return (
                  <div
                    key={step.id}
                    className={`relative flex items-start gap-4 p-4 rounded-lg transition-all ${
                      isComplete 
                        ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' 
                        : isInProgress
                        ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                        : 'bg-muted/30 border border-transparent'
                    }`}
                    data-testid={`card-step-${step.id}`}
                  >
                    <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      isComplete 
                        ? 'bg-green-500 text-white' 
                        : isInProgress
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isComplete ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <IconComponent className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-lg ${
                          isComplete ? 'text-green-700 dark:text-green-400' : ''
                        }`}>
                          {step.title}
                        </h3>
                        {getStatusBadge(status, step.id)}
                        <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-xp-${step.id}`}>
                          <Star className="w-3 h-3" />
                          {STEP_XP_REWARDS[step.id]} XP
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">
                        {step.description}
                      </p>

                      {!isComplete && isPreviousComplete && (
                        <div className="flex flex-wrap gap-2">
                          {step.id === 'worship' || step.id === 'next-night' ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleMarkComplete(step.id)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-complete-${step.id}`}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              I've Done This
                            </Button>
                          ) : (
                            <>
                              {status === 'not-started' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStartStep(step.id)}
                                  disabled={updateMutation.isPending}
                                  data-testid={`button-start-${step.id}`}
                                >
                                  <ChevronRight className="w-4 h-4 mr-1" />
                                  Start This Step
                                </Button>
                              )}
                              {status === 'in-progress' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkComplete(step.id)}
                                  disabled={updateMutation.isPending}
                                  data-testid={`button-complete-${step.id}`}
                                >
                                  {updateMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-1" />
                                  )}
                                  Mark Complete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!isPreviousComplete && !isComplete && (
                        <p className="text-xs text-muted-foreground italic">
                          Complete the previous step to unlock this one
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Learn Classes</h4>
                <p className="text-xs text-muted-foreground">Discipleship courses</p>
              </div>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Following Jesus</li>
              <li>Holy Spirit Class</li>
              <li>Language of a Leader</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Love Opportunities</h4>
                <p className="text-xs text-muted-foreground">Service & community</p>
              </div>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Join a Ministry Team</li>
              <li>Serve in CORE Groups</li>
              <li>Outreach Events</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Lead Pathways</h4>
                <p className="text-xs text-muted-foreground">Mentoring & leadership</p>
              </div>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>CORE Minister Training</li>
              <li>Ministry Leader Manual</li>
              <li>Mentor New Believers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
