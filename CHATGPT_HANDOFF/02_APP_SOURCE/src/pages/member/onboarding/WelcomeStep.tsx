import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import {
  Loader2,
  Sparkles,
  Users,
  GraduationCap,
  Heart,
  Trophy,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { User } from "@shared/schema";

const WELCOME_BULLETS = [
  {
    icon: Users,
    title: "Connect with Your Church Family",
    description: "Join ministry teams and build meaningful relationships",
  },
  {
    icon: GraduationCap,
    title: "Grow Through Training",
    description: "Access courses designed to equip you for service",
  },
  {
    icon: Heart,
    title: "Discover Your Gifts",
    description: "Take assessments to find where you can serve best",
  },
  {
    icon: Trophy,
    title: "Track Your Journey",
    description: "Follow the discipleship path from WORSHIP to LEAD",
  },
];

const NEXT_STEPS = [
  "Set up your profile",
  "Select your ministries",
  "Confirm your faith commitment",
  "Complete a quick class survey",
];

export default function WelcomeStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/profile", {
        onboardingState: "PROFILE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/onboarding/profile");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStart = () => {
    startOnboardingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const helpContent = (
    <>
      <p>
        <strong>What is MinistryPath?</strong> It's your personal hub for connecting
        with Garden City Church, joining ministry teams, and growing in your faith journey.
      </p>
      <p>
        This quick setup takes about 5 minutes. You can always update your information later.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="welcome"
      title="Welcome to MinistryPath!"
      subtitle="You've been invited to join our ministry team"
      helpContent={helpContent}
    >
      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Hi{user?.firstName ? `, ${user.firstName}` : ""}! You're Almost In
            </h2>
            <p className="text-muted-foreground">
              Let's get you set up in just a few quick steps
            </p>
          </div>

          {/* What MinistryPath Is */}
          <div className="space-y-3 mb-6">
            {WELCOME_BULLETS.map((bullet, index) => {
              const Icon = bullet.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50"
                  data-testid={`welcome-bullet-${index}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{bullet.title}</h3>
                    <p className="text-xs text-muted-foreground">{bullet.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* What You'll Do */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            What you'll do next:
          </h3>
          <div className="space-y-2 mb-6">
            {NEXT_STEPS.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-sm"
                data-testid={`next-step-${index}`}
              >
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleStart}
            className="w-full text-lg py-6"
            size="lg"
            disabled={startOnboardingMutation.isPending}
            data-testid="button-start-onboarding"
          >
            {startOnboardingMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-5 w-5 mr-2" />
            )}
            Start Onboarding
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Takes about 5 minutes
          </p>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
