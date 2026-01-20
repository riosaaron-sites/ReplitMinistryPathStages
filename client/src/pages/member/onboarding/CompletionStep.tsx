import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import type { User } from "@shared/schema";
import Confetti from "@/components/ui/confetti";
import { useEffect, useState } from "react";

const ENCOURAGEMENTS = [
  "God has great plans for you here!",
  "We're so glad you're part of the family!",
  "Your gifts are needed in this community!",
  "Excited to see how God will use you!",
  "Welcome to MinistryPath!",
];

const NEXT_STEPS = [
  "Explore your personalized dashboard",
  "Check out available trainings",
  "Connect with your ministry team",
  "Take the spiritual gifts survey",
];

export default function CompletionStep() {
  const [, setLocation] = useLocation();
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const randomEncouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

  const handleGoToDashboard = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-8">
      {showConfetti && <Confetti />}
      
      <div className="max-w-lg w-full space-y-6">
        {/* Celebration Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <PartyPopper className="h-12 w-12 text-primary" />
              </div>
              <Sparkles className="absolute top-0 right-1/4 h-6 w-6 text-yellow-500 animate-pulse" />
              <Sparkles className="absolute bottom-0 left-1/4 h-4 w-4 text-primary animate-pulse delay-150" />
            </div>

            <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
              You're In!
            </h1>
            
            <p className="text-lg text-primary font-medium mb-4" data-testid="text-user-name">
              Welcome, {user?.firstName || "Friend"}!
            </p>

            <p className="text-muted-foreground mb-6" data-testid="text-encouragement">
              {randomEncouragement}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Onboarding Complete
            </div>
          </CardContent>
        </Card>

        {/* What's Next Card */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Here's what you can do next:</h3>
            <div className="space-y-3 mb-6">
              {NEXT_STEPS.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/50"
                  data-testid={`completion-next-step-${index}`}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGoToDashboard}
              className="w-full text-lg py-6"
              size="lg"
              data-testid="button-go-to-dashboard"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Live the Life. Tell the Story.
        </p>
      </div>
    </div>
  );
}
