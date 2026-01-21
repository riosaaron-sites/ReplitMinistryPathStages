import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import type { SurveyProgress, SurveyResults } from "@shared/schema";
import { 
  LogOut, 
  PlayCircle, 
  RotateCcw, 
  FileText,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Check for existing progress
  const { data: progress, isLoading: isProgressLoading } = useQuery<SurveyProgress>({
    queryKey: ["/api/survey/progress"],
    retry: false,
  });

  // Check for completed results
  const { data: results, isLoading: isResultsLoading } = useQuery<SurveyResults>({
    queryKey: ["/api/survey/results"],
    retry: false,
  });

  const isLoading = isAuthLoading || isProgressLoading || isResultsLoading;
  const hasProgress = progress && !progress.isComplete;
  const hasResults = !!results;

  const totalAnswered = progress?.answers 
    ? Object.keys(progress.answers).length 
    : 0;

  const progressPercentage = Math.round((totalAnswered / 49) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <img 
              src={ministryPathLogo} 
              alt="MinistryPath" 
              className="h-8 w-auto"
            />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src={ministryPathLogo} 
            alt="MinistryPath" 
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/api/logout"}
              title="Sign out"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="font-serif-display text-3xl font-bold mb-2" data-testid="text-welcome">
            Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'friend'}!
          </h1>
          <p className="text-muted-foreground">
            Discover your spiritual gifts and find your place to serve.
          </p>
        </div>

        <div className="space-y-4">
          {/* Resume Survey Card */}
          {hasProgress && (
            <Card className="border-card-border hover-elevate" data-testid="card-resume-survey">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Continue Your Survey</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      You're {progressPercentage}% complete. Pick up where you left off!
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <Button onClick={() => navigate("/survey")} className="gap-2" data-testid="button-resume">
                      <PlayCircle className="h-4 w-4" />
                      Resume Survey
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Results Card */}
          {hasResults && (
            <Card className="border-card-border hover-elevate" data-testid="card-view-results">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">View Your Results</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      See your spiritual gifts, personality profile, and ministry recommendations.
                    </p>
                    <Button onClick={() => navigate("/results")} className="gap-2" data-testid="button-view-results">
                      <FileText className="h-4 w-4" />
                      View Results
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start New Survey Card */}
          {!hasProgress && (
            <Card className="border-card-border hover-elevate" data-testid="card-start-survey">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PlayCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {hasResults ? "Take Survey Again" : "Start Your Survey"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {hasResults 
                        ? "Retake the survey to update your profile and discover new insights."
                        : "Discover your spiritual gifts and find where you can serve at Garden City Church."}
                    </p>
                    <Button onClick={() => navigate("/survey")} className="gap-2" data-testid="button-start">
                      {hasResults ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      {hasResults ? "Retake Survey" : "Start Survey"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            The survey takes about 10-15 minutes to complete. Your progress is saved automatically.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            God has uniquely gifted you for His purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}
