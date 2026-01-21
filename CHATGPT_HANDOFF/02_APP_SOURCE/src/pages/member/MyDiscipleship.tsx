import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  BookOpen,
  Users,
  Heart,
  Compass,
  Music,
  Target,
  Sparkles,
  Play,
  Trophy,
  GraduationCap,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { CoachBubble } from "@/components/CoachBubble";

interface UserProgress {
  totals: {
    totalModules: number;
    completedModules: number;
    totalRequired: number;
    completedRequired: number;
    pathTotal: number;
    pathCompleted: number;
    percentComplete: number;
  };
  pathSteps: {
    id: string;
    name: string;
    status: 'COMPLETE' | 'IN_PROGRESS' | 'INCOMPLETE';
  }[];
  modules: {
    id: string;
    title: string;
    description?: string;
    category: string;
    isRequired: boolean;
    estimatedMinutes: number;
    xpReward: number;
    status: 'COMPLETE' | 'IN_PROGRESS' | 'INCOMPLETE';
    progressPercent: number;
    completedAt?: string;
  }[];
  nextActions: {
    id: string;
    title: string;
    type: string;
    estimatedMinutes?: number;
  }[];
  lastUpdated: string;
}

interface MinistryPathData {
  hasAttendedSunday: boolean;
  hasAttendedNextNight: boolean;
  nextNightDate?: string;
  learnStatus: string;
  loveStatus: string;
  leadStatus: string;
}

const PATH_ICONS: Record<string, typeof Music> = {
  'worship': Music,
  'next-night': Users,
  'learn': BookOpen,
  'love': Heart,
  'lead': Compass,
};

const STEP_DESCRIPTIONS: Record<string, { what: string; details: string[] }> = {
  'worship': {
    what: "Join us for Sunday morning worship to connect with God and our church family.",
    details: [
      "Sunday services at 9:00 AM and 11:00 AM",
      "Experience praise, prayer, and teaching",
      "Connect with fellow believers"
    ]
  },
  'next-night': {
    what: "Attend our monthly Next Night gathering to learn more about Garden City Church.",
    details: [
      "Learn about our mission, vision, and values",
      "Meet church leadership",
      "Discover how to get connected",
      "Held monthly on the first Sunday evening"
    ]
  },
  'learn': {
    what: "Complete foundational learning to deepen your faith and knowledge.",
    details: [
      "Following Jesus - Core discipleship training",
      "About Us - Understanding our church",
      "Discipleship Pathway - Growing in your faith",
      "SERVE - Discovering your calling",
      "Live the Life / Tell the Story - Sharing your faith"
    ]
  },
  'love': {
    what: "Put your faith into action through serving and building community.",
    details: [
      "Join a ministry team",
      "Serve in CORE Groups",
      "Participate in outreach events",
      "Care for others in the church family"
    ]
  },
  'lead': {
    what: "Step into leadership and help disciple others.",
    details: [
      "Complete leadership training",
      "Mentor new believers",
      "Lead a ministry team or group",
      "Multiply disciples"
    ]
  },
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'COMPLETE':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'IN_PROGRESS':
      return <Clock className="h-5 w-5 text-amber-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETE':
      return <Badge className="bg-green-600">Complete</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="secondary" className="bg-amber-500 text-white">In Progress</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

export default function MyDiscipleship() {
  const { toast } = useToast();
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const { data: progress, isLoading, error } = useQuery<UserProgress>({
    queryKey: ["/api/user-progress"],
  });

  const { data: ministryPath } = useQuery<MinistryPathData>({
    queryKey: ["/api/ministry-path"],
  });

  const updatePathMutation = useMutation({
    mutationFn: async (updates: Record<string, boolean | string>) => {
      return apiRequest("POST", "/api/ministry-path", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-path"] });
      toast({ title: "Progress updated!", description: "Your discipleship journey has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update progress", variant: "destructive" });
    },
  });

  const handleMarkComplete = (stepId: string) => {
    switch (stepId) {
      case 'worship':
        updatePathMutation.mutate({ hasAttendedSunday: true });
        break;
      case 'next-night':
        updatePathMutation.mutate({ hasAttendedNextNight: true });
        break;
      case 'learn':
        updatePathMutation.mutate({ learnStatus: 'complete' });
        break;
      case 'love':
        updatePathMutation.mutate({ loveStatus: 'complete' });
        break;
      case 'lead':
        updatePathMutation.mutate({ leadStatus: 'complete' });
        break;
    }
  };

  const toggleStep = (stepId: string) => {
    if (stepId === 'worship') return; // Sunday attendance doesn't expand
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Failed to load progress. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totals, pathSteps, modules, nextActions } = progress;
  const coreTrainings = modules.filter(m => m.isRequired);
  
  // Determine which CoachBubble to show based on priority
  const submittedTrainings = modules.filter(m => m.status === 'IN_PROGRESS');
  const hasSubmittedForReview = submittedTrainings.length > 0;
  const hasIncompleteRequired = coreTrainings.some(m => m.status !== 'COMPLETE');
  const hasNoTeam = pathSteps.every(s => s.status === 'INCOMPLETE');

  // Priority: 1) Submitted for review, 2) Incomplete required, 3) No team, 4) Welcome
  const getCoachBubbleProps = () => {
    if (hasSubmittedForReview) {
      return {
        id: "my-path-awaiting-review",
        title: "Awaiting Leader Review",
        message: "You've done your part. A leader will review this before it's marked complete.",
        ctaText: "View Training Hub",
        ctaAction: () => window.location.href = "/trainings"
      };
    }
    if (hasIncompleteRequired && totals.completedRequired > 0) {
      return {
        id: "my-path-next-step",
        title: "Next Step",
        message: "Complete the next required step to keep moving forward.",
        ctaText: nextActions[0] ? "Go to Next Step" : undefined,
        ctaAction: nextActions[0] ? () => window.location.href = `/trainings/${nextActions[0].id}` : undefined
      };
    }
    if (hasNoTeam) {
      return {
        id: "my-path-choose-team",
        title: "Choose a Team",
        message: "Pick a team to begin serving and see your required path.",
        ctaText: "View Teams",
        ctaAction: () => window.location.href = "/team-center"
      };
    }
    return {
      id: "my-path-welcome",
      title: "Welcome to Your Discipleship Journey",
      message: "This page tracks your growth through our five-step pathway. Complete each step to progress in your faith journey and unlock new opportunities to serve."
    };
  };

  const coachBubbleProps = getCoachBubbleProps();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Compass className="w-6 h-6" />
          My Path
        </h1>
        <p className="text-muted-foreground">
          Your journey: WORSHIP → NEXT NIGHT → LEARN → LOVE → LEAD
        </p>
      </div>

      <CoachBubble
        id={coachBubbleProps.id}
        title={coachBubbleProps.title}
        message={coachBubbleProps.message}
        ctaText={coachBubbleProps.ctaText}
        ctaAction={coachBubbleProps.ctaAction}
      />

      {/* Progress Summary */}
      <Card data-testid="card-progress-summary">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">{totals.percentComplete}% Complete</span>
              </div>
              <Progress value={totals.percentComplete} className="h-3" data-testid="progress-overall" />
              <p className="text-sm text-muted-foreground mt-2">
                {totals.pathCompleted}/{totals.pathTotal} path steps • {totals.completedRequired}/{totals.totalRequired} required trainings
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totals.completedModules}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totals.totalModules - totals.completedModules}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <Card data-testid="card-next-actions">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              What's Next
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextActions.slice(0, 3).map((action, index) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover-elevate"
                data-testid={`next-action-${index}`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{action.title}</span>
                  {action.estimatedMinutes && (
                    <span className="text-xs text-muted-foreground">~{action.estimatedMinutes} min</span>
                  )}
                </div>
                {action.type === 'training' ? (
                  <Link href={`/trainings/${action.id}`}>
                    <Button size="sm" data-testid={`button-start-${action.id}`}>
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkComplete(action.id)}
                    disabled={updatePathMutation.isPending}
                    data-testid={`button-complete-${action.id}`}
                  >
                    {updatePathMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Complete'}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Discipleship Path Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Your Discipleship Path</CardTitle>
          <CardDescription>Each step builds on the previous. Click to expand and learn more.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pathSteps.map((step, index) => {
            const Icon = PATH_ICONS[step.id] || Compass;
            const isLocked = index > 0 && pathSteps[index - 1].status !== 'COMPLETE';
            const isExpanded = expandedSteps[step.id];
            const canExpand = step.id !== 'worship';
            const stepInfo = STEP_DESCRIPTIONS[step.id];

            return (
              <Collapsible
                key={step.id}
                open={isExpanded}
                onOpenChange={() => canExpand && toggleStep(step.id)}
              >
                <div
                  className={`rounded-lg border transition-all ${
                    step.status === 'COMPLETE' 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : isLocked 
                      ? 'bg-muted/30 opacity-60' 
                      : 'bg-card'
                  }`}
                  data-testid={`path-step-${step.id}`}
                >
                  <CollapsibleTrigger asChild disabled={!canExpand}>
                    <div className={`flex items-center justify-between p-4 ${canExpand ? 'cursor-pointer' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          step.status === 'COMPLETE' ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            step.status === 'COMPLETE' ? 'text-green-600' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {step.name}
                            {canExpand && (
                              isExpanded 
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stepInfo?.what.slice(0, 60)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(step.status)}
                        {step.status !== 'COMPLETE' && !isLocked && !canExpand && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkComplete(step.id);
                            }}
                            disabled={updatePathMutation.isPending}
                            data-testid={`button-mark-${step.id}`}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t">
                      <div className="space-y-4">
                        {/* What this is */}
                        <div>
                          <h4 className="text-sm font-medium mb-1">What this is</h4>
                          <p className="text-sm text-muted-foreground">{stepInfo?.what}</p>
                        </div>

                        {/* Your status */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Your Status</h4>
                          {step.id === 'next-night' && ministryPath?.nextNightDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Calendar className="h-4 w-4" />
                              Attended: {new Date(ministryPath.nextNightDate).toLocaleDateString()}
                            </div>
                          )}
                          {step.id === 'learn' && (
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground mb-2">
                                Core trainings: {totals.completedRequired}/{totals.totalRequired} complete
                              </p>
                              {coreTrainings.slice(0, 5).map(training => (
                                <div 
                                  key={training.id} 
                                  className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    {training.status === 'COMPLETE' 
                                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      : <Circle className="h-4 w-4 text-muted-foreground" />
                                    }
                                    <span>{training.title}</span>
                                  </div>
                                  {training.status !== 'COMPLETE' && (
                                    <Link href={`/trainings/${training.id}`}>
                                      <Button size="sm" variant="ghost">
                                        <ArrowRight className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {step.id === 'love' && (
                            <p className="text-sm text-muted-foreground">
                              Track your serving involvement and community engagement.
                            </p>
                          )}
                          {step.id === 'lead' && (
                            <p className="text-sm text-muted-foreground">
                              Leadership training and mentoring progress.
                            </p>
                          )}
                        </div>

                        {/* What to do next */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">What to do next</h4>
                          <div className="flex flex-wrap gap-2">
                            {step.status !== 'COMPLETE' && !isLocked && (
                              <>
                                {step.id === 'next-night' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkComplete(step.id)}
                                    disabled={updatePathMutation.isPending}
                                    data-testid={`button-complete-${step.id}`}
                                  >
                                    {updatePathMutation.isPending 
                                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      : <CheckCircle2 className="h-3 w-3 mr-1" />
                                    }
                                    I've Attended Next Night
                                  </Button>
                                )}
                                {step.id === 'learn' && (
                                  <Link href="/trainings">
                                    <Button size="sm">
                                      <GraduationCap className="h-3 w-3 mr-1" />
                                      Go to Training Hub
                                    </Button>
                                  </Link>
                                )}
                                {step.id === 'love' && (
                                  <>
                                    <Link href="/teams">
                                      <Button size="sm" variant="outline">
                                        <Users className="h-3 w-3 mr-1" />
                                        Join a Team
                                      </Button>
                                    </Link>
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkComplete(step.id)}
                                      disabled={updatePathMutation.isPending}
                                    >
                                      Mark Complete
                                    </Button>
                                  </>
                                )}
                                {step.id === 'lead' && (
                                  <>
                                    <Link href="/trainings">
                                      <Button size="sm" variant="outline">
                                        <BookOpen className="h-3 w-3 mr-1" />
                                        Leadership Training
                                      </Button>
                                    </Link>
                                    <Button
                                      size="sm"
                                      onClick={() => handleMarkComplete(step.id)}
                                      disabled={updatePathMutation.isPending}
                                    >
                                      Mark Complete
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {step.status === 'COMPLETE' && (
                              <Badge className="bg-green-100 text-green-700">Step Completed!</Badge>
                            )}
                            {isLocked && (
                              <p className="text-sm text-muted-foreground italic">
                                Complete the previous step to unlock this one.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Additional details */}
                        {stepInfo?.details && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Details</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {stepInfo.details.map((detail, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <ChevronRight className="h-3 w-3" />
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/trainings">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Training Hub</h4>
                  <p className="text-sm text-muted-foreground">Access all your trainings</p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/teams">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Team Connection</h4>
                  <p className="text-sm text-muted-foreground">Join a ministry team</p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
