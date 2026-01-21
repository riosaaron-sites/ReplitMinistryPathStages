import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Calendar, ChevronRight, ClipboardCheck, Users, Star, Award } from "lucide-react";
import type { Ministry, RoleAssignment, UserTrainingProgress, User, SurveyResults } from "@shared/schema";

interface MinistryWithProgress {
  ministry: Ministry;
  assignment: RoleAssignment;
  enrollments: UserTrainingProgress[];
  completedCount: number;
  totalCount: number;
}

export default function MyRoles() {
  const { user } = useAuth();

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: progress } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress"],
  });

  const { data: surveyResults } = useQuery<SurveyResults | null>({
    queryKey: ["/api/survey/results"],
  });

  const isLoading = assignmentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Roles</h1>
          <p className="text-muted-foreground">Your ministry assignments and serving areas</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const myMinistries: MinistryWithProgress[] = (assignments || []).map(assignment => {
    const ministry = ministries?.find(m => m.id === assignment.ministryId);
    const ministryProgress = (progress || []).filter(p => 
      p.moduleId && ministry
    );
    const completedCount = ministryProgress.filter(p => p.status === 'completed').length;
    
    return {
      ministry: ministry!,
      assignment,
      enrollments: ministryProgress,
      completedCount,
      totalCount: ministryProgress.length || 1,
    };
  }).filter(m => m.ministry);

  const surveyCompleted = !!surveyResults;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Roles</h1>
          <p className="text-muted-foreground">Your ministry assignments and serving areas</p>
        </div>
        <Link href="/survey">
          <Button variant={surveyCompleted ? "outline" : "default"} data-testid="button-take-survey">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            {surveyCompleted ? "Retake Ministry Survey" : "Take Ministry Survey"}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-ministry-count">{myMinistries.length}</p>
                <p className="text-sm text-muted-foreground">Ministries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-trainings-completed">
                  {(progress || []).filter(p => p.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Trainings Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-in-progress">
                  {(progress || []).filter(p => p.status === 'in_progress').length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total-trainings">{(progress || []).length}</p>
                <p className="text-sm text-muted-foreground">Total Trainings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {myMinistries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Ministry Assignments Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              You haven't been assigned to any ministries yet. Take the ministry survey to discover where you might fit best, or speak with a ministry leader.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/survey">
                <Button data-testid="button-discover-gifts">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Discover Your Gifts
                </Button>
              </Link>
              <Link href="/discipleship">
                <Button variant="outline" data-testid="button-view-path">
                  View Discipleship Path
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {myMinistries.map(({ ministry, assignment, completedCount, totalCount }) => {
              const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const status = progressPercent === 100 ? "Fully Trained" : 
                             progressPercent > 0 ? "In Training" : "Onboarding";
              
              return (
                <Card key={assignment.id} className="hover-elevate" data-testid={`card-ministry-role-${ministry.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{ministry.name}</CardTitle>
                          <Badge 
                            variant={status === "Fully Trained" ? "default" : "secondary"}
                            className={status === "Fully Trained" ? "bg-green-600" : ""}
                          >
                            {status}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {ministry.category}
                          {assignment.roleName && ` • ${assignment.roleName}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ministry.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ministry.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Training Progress</span>
                        <span className="font-medium">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ministry.requiresBackgroundCheck && (
                        <Badge variant="outline" className="text-xs">Background Check</Badge>
                      )}
                      {ministry.requiresSpiritBaptism && (
                        <Badge variant="outline" className="text-xs">Spirit Baptism</Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link href="/trainings">
                        <Button size="sm" data-testid={`button-trainings-${ministry.id}`}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          My Trainings
                        </Button>
                      </Link>
                      <Link href="/calendar">
                        <Button size="sm" variant="outline" data-testid={`button-schedule-${ministry.id}`}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!surveyCompleted && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <ClipboardCheck className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold mb-1">Want Better Ministry Suggestions?</h3>
                    <p className="text-sm text-muted-foreground">
                      Take the Ministry Survey to discover where you might also excel. It helps us (and you) better understand your gifts and strengths.
                    </p>
                  </div>
                  <Link href="/survey">
                    <Button data-testid="button-take-survey-cta">
                      Take Ministry Survey
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
          <CardDescription>Your recommended next steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!surveyCompleted && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Complete Ministry Survey</p>
                  <p className="text-sm text-muted-foreground">Discover your spiritual gifts and ministry fit</p>
                </div>
                <Link href="/survey">
                  <Button size="sm" variant="outline" data-testid="button-next-survey">
                    Start
                  </Button>
                </Link>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Continue Trainings</p>
                <p className="text-sm text-muted-foreground">Complete your assigned training modules</p>
              </div>
              <Link href="/trainings">
                <Button size="sm" variant="outline" data-testid="button-next-trainings">
                  View
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Award className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">View Discipleship Path</p>
                <p className="text-sm text-muted-foreground">Track your journey: Worship → NEXT → Learn → Love → Lead</p>
              </div>
              <Link href="/discipleship">
                <Button size="sm" variant="outline" data-testid="button-next-discipleship">
                  View
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
