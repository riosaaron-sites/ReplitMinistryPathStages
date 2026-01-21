import { useQuery } from "@tanstack/react-query";

export interface RequirementsStatus {
  canAccessFeatures: boolean;
  nextStep: 'onboarding' | 'photo' | 'bio' | 'complete' | 'blocked';
  completionPercentage: number;
  requirements: {
    onboarding: {
      complete: boolean;
      blocked: boolean;
      currentStep: number;
      totalSteps: number;
    };
    profile: {
      complete: boolean;
      hasPhoto: boolean;
      hasBio: boolean;
      photoUrl?: string;
      bio?: string;
    };
  };
}

export function useRequirements() {
  const { data, isLoading, error, refetch } = useQuery<RequirementsStatus>({
    queryKey: ['/api/requirements/status'],
    staleTime: 30000,
  });

  return {
    status: data,
    isLoading,
    error,
    refetch,
    canAccessFeatures: data?.canAccessFeatures ?? false,
    nextStep: data?.nextStep ?? 'onboarding',
    completionPercentage: data?.completionPercentage ?? 0,
  };
}
