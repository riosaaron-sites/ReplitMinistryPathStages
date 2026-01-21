import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChevronRight, Heart, Info, Star, Users } from "lucide-react";
import type { User, MinistrySelection, Ministry } from "@shared/schema";
import { ONBOARDING_MINISTRIES } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";

const ONBOARDING_ORDER = ['AUTH', 'WELCOME', 'PROFILE', 'LEADERSHIP', 'MINISTRIES', 'FAITH_COMMITMENT', 'PHOTO', 'CLASS_STATUS', 'DONE'];

export default function MinistriesStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [hasLoadedSelections, setHasLoadedSelections] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: existingSelections } = useQuery<MinistrySelection[]>({
    queryKey: ["/api/ministry-selections"],
    enabled: !!user,
  });

  const { data: invitedMinistries } = useQuery<Ministry[]>({
    queryKey: ["/api/user-ministries/invited"],
    enabled: !!user,
  });

  useEffect(() => {
    if (existingSelections && !hasLoadedSelections) {
      const existingIds = existingSelections.map(s => s.ministryId);
      setSelectedMinistries(existingIds);
      setHasLoadedSelections(true);
    }
  }, [existingSelections, hasLoadedSelections]);

  useEffect(() => {
    if (!user || userLoading) return;
    const currentIndex = ONBOARDING_ORDER.indexOf(user.onboardingState || 'PROFILE');
    const ministriesIndex = ONBOARDING_ORDER.indexOf('MINISTRIES');
    
    if (currentIndex > ministriesIndex) {
      setLocation("/onboarding");
    }
  }, [user, userLoading, setLocation]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ministry-selections", {
        ministryIds: selectedMinistries,
      });
    },
    onSuccess: async () => {
      await apiRequest("POST", "/api/profile", {
        onboardingState: "FAITH_COMMITMENT",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-selections"] });
      toast({
        title: "Ministries saved!",
        description: "Moving to faith commitment...",
      });
      setLocation("/onboarding/faith");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save ministries. Please try again.",
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
    saveMutation.mutate();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasInvitedMinistries = invitedMinistries && invitedMinistries.length > 0;

  const helpContent = (
    <>
      <p>
        <strong>What if I'm not sure?</strong> That's okay! You can skip this step 
        and explore ministries later from your dashboard.
      </p>
      <p>
        <strong>Can I join multiple ministries?</strong> Yes! Many volunteers serve 
        in more than one area. Select all that interest you.
      </p>
      <p>
        <strong>What about background checks?</strong> Some ministries (like children's 
        ministry) require background checks. We'll guide you through that process.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="ministries"
      title="Choose Your Ministry"
      subtitle="Select the ministry areas you'd like to serve in"
      showBackButton
      backUrl="/onboarding/profile"
      helpContent={helpContent}
    >
      {/* Invited Ministries (if any) */}
      {hasInvitedMinistries && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-5 w-5 text-yellow-500" />
              You've Been Invited!
            </CardTitle>
            <CardDescription>
              You have ministry invitations waiting for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitedMinistries.map(ministry => (
                <div
                  key={ministry.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                  data-testid={`invited-ministry-${ministry.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{ministry.name}</div>
                    <p className="text-xs text-muted-foreground">
                      {ministry.description || "You've been invited to join this ministry"}
                    </p>
                  </div>
                  <Badge variant="secondary">Invited</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ministry Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-5 w-5 text-red-500" />
            {hasInvitedMinistries ? "Additional Ministries" : "Available Ministries"}
          </CardTitle>
          <CardDescription>
            {hasInvitedMinistries 
              ? "Interested in serving elsewhere too? Select additional ministries below."
              : "Select all the ministries you're interested in. You can select one or more."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ONBOARDING_MINISTRIES.map(ministry => {
              const isSelected = selectedMinistries.includes(ministry.id);
              return (
                <div
                  key={ministry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleMinistry(ministry.id)}
                  data-testid={`ministry-${ministry.id}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMinistry(ministry.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{ministry.name}</div>
                    {'requiresBackgroundCheck' in ministry && ministry.requiresBackgroundCheck && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Info className="h-3 w-3" />
                        Requires background check
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Badge>Selected</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* What to Expect */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="font-medium text-sm mb-2">What to expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              Your ministry leader will reach out to you
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              You'll complete any required training
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              Start serving with your team!
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleContinue}
        disabled={saveMutation.isPending}
        data-testid="button-continue"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        {selectedMinistries.length === 0 ? "Skip for Now" : "Continue to Faith Commitment"}
      </Button>
    </OnboardingLayout>
  );
}
