import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { User } from "@shared/schema";

export default function OnboardingController() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (!user || isLoading) return;

    const state = user.onboardingState || 'AUTH';

    switch (state) {
      case 'AUTH':
      case 'WELCOME':
        setLocation("/onboarding/welcome");
        break;
      case 'PROFILE':
        setLocation("/onboarding/profile");
        break;
      case 'LEADERSHIP':
        setLocation("/onboarding/leadership");
        break;
      case 'MINISTRIES':
        setLocation("/onboarding/ministries");
        break;
      case 'FAITH_COMMITMENT':
        setLocation("/onboarding/faith");
        break;
      case 'PHOTO':
        if (user.profileImageUrl) {
          setLocation("/onboarding/classes");
        } else {
          setLocation("/onboarding/photo");
        }
        break;
      case 'CLASS_STATUS':
        setLocation("/onboarding/classes");
        break;
      case 'DONE':
        setLocation("/");
        break;
      default:
        setLocation("/onboarding/welcome");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  return null;
}
