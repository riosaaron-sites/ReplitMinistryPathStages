import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChevronRight, Crown, Users, Info } from "lucide-react";
import type { User, Ministry } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";

const ONBOARDING_ORDER = ['AUTH', 'WELCOME', 'PROFILE', 'LEADERSHIP', 'MINISTRIES', 'FAITH_COMMITMENT', 'PHOTO', 'CLASS_STATUS', 'DONE'];

export default function LeadershipStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLeader, setIsLeader] = useState<boolean | null>(null);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: ministries, isLoading: ministriesLoading } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  useEffect(() => {
    if (!user || userLoading) return;
    const currentIndex = ONBOARDING_ORDER.indexOf(user.onboardingState || 'LEADERSHIP');
    const leadershipIndex = ONBOARDING_ORDER.indexOf('LEADERSHIP');
    
    if (currentIndex > leadershipIndex) {
      setLocation("/onboarding");
    }
  }, [user, userLoading, setLocation]);

  const leadershipMutation = useMutation({
    mutationFn: async (data: { isLeader: boolean; ministryIds: string[] }) => {
      return apiRequest("POST", "/api/onboarding/leadership", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (isLeader && selectedMinistries.length > 0) {
        toast({
          title: "Leadership confirmed!",
          description: "Moving to faith commitment...",
        });
        setLocation("/onboarding/faith");
      } else {
        toast({
          title: "Got it!",
          description: "Moving to ministry selection...",
        });
        setLocation("/onboarding/ministries");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/profile", {
        onboardingState: "MINISTRIES",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Got it!",
        description: "Moving to ministry selection...",
      });
      setLocation("/onboarding/ministries");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to continue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleMinistry = (ministryId: string) => {
    setSelectedMinistries(prev =>
      prev.includes(ministryId)
        ? prev.filter(id => id !== ministryId)
        : [...prev, ministryId]
    );
  };

  const handleContinue = () => {
    if (isLeader === null) {
      toast({
        title: "Please select an option",
        description: "Let us know if you lead a ministry.",
        variant: "destructive",
      });
      return;
    }

    if (isLeader && selectedMinistries.length === 0) {
      toast({
        title: "Please select at least one ministry",
        description: "Which ministries do you lead?",
        variant: "destructive",
      });
      return;
    }

    leadershipMutation.mutate({
      isLeader,
      ministryIds: selectedMinistries,
    });
  };

  const handleNotALeader = () => {
    setIsLeader(false);
    setSelectedMinistries([]);
    skipMutation.mutate();
  };

  if (userLoading || ministriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-leadership" />
      </div>
    );
  }

  const activeMinistries = ministries?.filter(m => m.isActive && !m.isArchived) || [];

  const helpContent = (
    <>
      <p>
        <strong>What is a ministry leader?</strong> A ministry leader is someone 
        who has been officially appointed to lead or co-lead a ministry team at 
        Garden City Church.
      </p>
      <p>
        <strong>Not sure?</strong> If you're unsure whether you lead a ministry, 
        select "No, I'm here to serve" — you can be added as a leader later by 
        an administrator.
      </p>
      <p>
        <strong>What happens if I select yes?</strong> You'll be set up as the 
        Primary Leader for the ministries you select, with full team management 
        capabilities.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="leadership"
      title="Leadership at Garden City Church"
      subtitle="Help us understand your role"
      showBackButton
      backUrl="/onboarding/profile"
      helpContent={helpContent}
    >
      {isLeader === null ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-yellow-500" />
              Do You Lead a Ministry?
            </CardTitle>
            <CardDescription>
              This includes official ministry leadership roles, not just volunteering.
              If you're unsure, select "No" — you can always be added as a leader later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 p-4 h-auto"
              onClick={() => setIsLeader(true)}
              data-testid="button-yes-leader"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium">Yes, I lead a ministry</div>
                <p className="text-xs text-muted-foreground">
                  I'm a ministry leader or co-leader at Garden City Church
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 p-4 h-auto"
              onClick={handleNotALeader}
              disabled={skipMutation.isPending}
              data-testid="button-no-leader"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <div className="font-medium">No, I'm here to serve</div>
                <p className="text-xs text-muted-foreground">
                  I want to volunteer and serve on ministry teams
                </p>
              </div>
              {skipMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-auto" />
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-5 w-5 text-yellow-500" />
                Which Ministries Do You Lead?
              </CardTitle>
              <CardDescription>
                Select all the ministries where you serve as a leader or co-leader.
                You'll be set up as the Primary Leader for these teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeMinistries.map(ministry => (
                  <label
                    key={ministry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMinistries.includes(ministry.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid={`ministry-checkbox-${ministry.id}`}
                  >
                    <Checkbox
                      checked={selectedMinistries.includes(ministry.id)}
                      onCheckedChange={() => toggleMinistry(ministry.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{ministry.name}</div>
                      {ministry.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ministry.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="bg-muted/50 border rounded-lg p-4 flex gap-3">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                As a Primary Leader, you'll be able to manage your team members, 
                view health indicators, send encouragements, and add Secondary Leaders.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsLeader(null);
                setSelectedMinistries([]);
              }}
              className="flex-1"
              data-testid="button-back-choice"
            >
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={leadershipMutation.isPending || selectedMinistries.length === 0}
              className="flex-1 gap-2"
              data-testid="button-confirm-leadership"
            >
              {leadershipMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Confirm Leadership
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </OnboardingLayout>
  );
}
