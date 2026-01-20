import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ministry, User } from "@shared/schema";
import {
  ChevronRight,
  Check,
  Circle,
  AlertCircle,
  BookOpen,
  Shield,
  Users,
  Music,
  Heart,
  GraduationCap,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Baby,
  ChurchIcon as Church,
} from "lucide-react";

interface MinistrySelection {
  id: string;
  userId: string;
  ministryId: string;
  isActive: boolean;
  createdAt: string;
}

interface OnboardingStep {
  id: string;
  userId: string;
  stepType: string;
  ministryId?: string;
  isComplete: boolean;
  completedAt?: string;
  quizScore?: number;
  quizPassed?: boolean;
  attempts: number;
}

interface OnboardingProgress {
  currentStep: number;
  stepResponses: Record<string, { agreed: boolean; notes?: string }>;
  spiritBaptismExperience?: Record<string, boolean | string>;
  isComplete: boolean;
  isBlocked: boolean;
}

type OnboardingPhase = 'ministry-selection' | 'requirements-overview' | 'faith-commitment' | 'training' | 'complete';

const MINISTRY_ICONS: Record<string, typeof Church> = {
  'worship': Music,
  'children': Baby,
  'youth': Users,
  'hospitality': Heart,
  'prayer': Church,
  'admin': BookOpen,
};

const MINISTRY_CATEGORIES = [
  { id: 'weekend', label: 'Weekend Worship', description: 'Sunday services and worship experiences' },
  { id: 'next-gen', label: 'Next Gen', description: 'Children and youth ministries' },
  { id: 'hospitality', label: 'Hospitality', description: 'Welcome and guest services' },
  { id: 'operations', label: 'Operations', description: 'Behind-the-scenes support' },
  { id: 'outreach', label: 'Outreach', description: 'Community and missions' },
];

export default function OnboardingHub() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('ministry-selection');

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: ministries = [], isLoading: ministriesLoading } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: savedSelections = [] } = useQuery<MinistrySelection[]>({
    queryKey: ["/api/ministry-selections"],
  });

  const { data: onboardingSteps = [] } = useQuery<OnboardingStep[]>({
    queryKey: ["/api/onboarding-steps"],
  });

  const { data: faithProgress } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
  });

  const activeMinistries = useMemo(() => 
    ministries.filter(m => m.isActive && !m.isArchived),
    [ministries]
  );

  const ministrySelectionMutation = useMutation({
    mutationFn: async (ministryIds: string[]) => {
      return apiRequest("POST", "/api/ministry-selections", { ministryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-selections"] });
      toast({
        title: "Ministries Selected",
        description: "Your ministry interests have been saved.",
      });
    },
  });

  const onboardingStepMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingStep>) => {
      return apiRequest("POST", "/api/onboarding-steps", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-steps"] });
    },
  });

  const toggleMinistry = (ministryId: string) => {
    setSelectedMinistries(prev => 
      prev.includes(ministryId) 
        ? prev.filter(id => id !== ministryId)
        : [...prev, ministryId]
    );
  };

  const handleSaveMinistrySelection = async () => {
    if (selectedMinistries.length === 0) {
      toast({
        title: "Please Select Ministries",
        description: "Choose at least one ministry you're interested in joining.",
        variant: "destructive",
      });
      return;
    }
    await ministrySelectionMutation.mutateAsync(selectedMinistries);
    setCurrentPhase('requirements-overview');
  };

  const getSelectedMinistryDetails = () => {
    return activeMinistries.filter(m => selectedMinistries.includes(m.id));
  };

  const requiresBackgroundCheck = useMemo(() => {
    return getSelectedMinistryDetails().some(m => m.requiresBackgroundCheck);
  }, [selectedMinistries, activeMinistries]);

  const requiresSpiritBaptism = useMemo(() => {
    return getSelectedMinistryDetails().some(m => m.requiresSpiritBaptism);
  }, [selectedMinistries, activeMinistries]);

  const getStepStatus = (stepType: string, ministryId?: string): 'complete' | 'in-progress' | 'pending' => {
    const step = onboardingSteps.find(s => 
      s.stepType === stepType && (ministryId ? s.ministryId === ministryId : true)
    );
    if (step?.isComplete) return 'complete';
    if (step) return 'in-progress';
    return 'pending';
  };

  const overallProgress = useMemo(() => {
    const steps = [
      { type: 'ministry-selection', weight: 10 },
      { type: 'faith-commitment', weight: 30 },
      { type: 'background-check', weight: 20, conditional: requiresBackgroundCheck },
      { type: 'training', weight: 40 },
    ];
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    steps.forEach(step => {
      if (step.conditional === false) return;
      totalWeight += step.weight;
      if (getStepStatus(step.type) === 'complete') {
        completedWeight += step.weight;
      }
    });
    
    return Math.round((completedWeight / totalWeight) * 100);
  }, [onboardingSteps, requiresBackgroundCheck]);

  if (ministriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderMinistrySelectionPhase = () => {
    const groupedMinistries = MINISTRY_CATEGORIES.map(category => ({
      ...category,
      ministries: activeMinistries.filter(m => m.category.toLowerCase() === category.id),
    })).filter(g => g.ministries.length > 0);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Choose Your Ministry Interests
            </CardTitle>
            <CardDescription>
              Select one or more ministries you'd like to explore. You can always change these later.
              Each ministry may have specific requirements based on the role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupedMinistries.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{category.label}</h3>
                  <Badge variant="secondary" className="text-xs">{category.ministries.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{category.description}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.ministries.map((ministry) => {
                    const isSelected = selectedMinistries.includes(ministry.id);
                    const IconComponent = MINISTRY_ICONS[ministry.category.toLowerCase()] || Church;
                    
                    return (
                      <div
                        key={ministry.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover-elevate ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleMinistry(ministry.id)}
                        data-testid={`ministry-card-${ministry.slug}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onChange={() => toggleMinistry(ministry.id)}
                            className="mt-1"
                            data-testid={`checkbox-ministry-${ministry.slug}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-medium truncate">{ministry.name}</span>
                            </div>
                            {ministry.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {ministry.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ministry.requiresBackgroundCheck && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Background Check
                                </Badge>
                              )}
                              {ministry.requiresSpiritBaptism && (
                                <Badge variant="outline" className="text-xs">
                                  <Heart className="w-3 h-3 mr-1" />
                                  Spirit Baptism
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedMinistries.length} ministries selected
            </div>
            <Button 
              onClick={handleSaveMinistrySelection}
              disabled={selectedMinistries.length === 0 || ministrySelectionMutation.isPending}
              data-testid="button-continue-to-requirements"
            >
              {ministrySelectionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderRequirementsOverview = () => {
    const selectedDetails = getSelectedMinistryDetails();
    
    const requirements = [
      {
        id: 'faith-commitment',
        title: 'Faith & Community Commitment',
        description: 'Affirm your alignment with our core beliefs and values',
        icon: BookOpen,
        status: faithProgress?.isComplete ? 'complete' : 'pending',
        required: true,
        action: () => setLocation('/onboarding'),
      },
      {
        id: 'background-check',
        title: 'Background Check',
        description: 'Required for ministries working with children or vulnerable populations',
        icon: Shield,
        status: getStepStatus('background-check'),
        required: requiresBackgroundCheck,
        action: () => toast({ title: "Background Check", description: "A staff member will contact you to initiate this process." }),
      },
      {
        id: 'training',
        title: 'Ministry Training',
        description: 'Complete required training modules for your selected ministries',
        icon: GraduationCap,
        status: getStepStatus('training'),
        required: true,
        action: () => setLocation('/training'),
      },
    ];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Onboarding Path</CardTitle>
            <CardDescription>
              Based on your ministry selections, here's what you'll need to complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Selected Ministries</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDetails.map(m => (
                  <Badge key={m.id} variant="secondary">{m.name}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Requirements</h4>
              {requirements.filter(r => r.required).map((req) => {
                const StatusIcon = req.status === 'complete' ? CheckCircle2 : 
                                   req.status === 'in-progress' ? Clock : Circle;
                const statusColor = req.status === 'complete' ? 'text-green-600' :
                                    req.status === 'in-progress' ? 'text-amber-500' : 'text-muted-foreground';
                
                return (
                  <div 
                    key={req.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover-elevate cursor-pointer"
                    onClick={req.action}
                    data-testid={`requirement-${req.id}`}
                  >
                    <div className={`p-2 rounded-full bg-primary/10`}>
                      <req.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{req.title}</span>
                        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>

            {requiresBackgroundCheck && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Next Gen Ministry Requirements</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Your selection includes children's or youth ministry. A background check is required 
                      before serving. This is for the safety of our children and is standard for all volunteers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPhase('ministry-selection')}
              data-testid="button-back-to-selection"
            >
              Back to Selection
            </Button>
            <Button 
              onClick={() => setLocation('/onboarding')}
              data-testid="button-start-faith-commitment"
            >
              Start Faith Commitment
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome to MinistryPath</h1>
          <Badge variant="outline">{overallProgress}% Complete</Badge>
        </div>
        <Progress value={overallProgress} className="h-2" data-testid="progress-overall-onboarding" />
        <p className="text-sm text-muted-foreground">
          {user?.firstName}, let's get you set up to serve. We'll guide you through each step.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex gap-1">
          <div className={`w-3 h-3 rounded-full ${currentPhase === 'ministry-selection' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          <div className={`w-3 h-3 rounded-full ${currentPhase === 'requirements-overview' ? 'bg-primary' : savedSelections.length > 0 ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
          <div className={`w-3 h-3 rounded-full ${faithProgress?.isComplete ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
          <div className={`w-3 h-3 rounded-full ${getStepStatus('training') === 'complete' ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
        </div>
        <span className="text-sm text-muted-foreground">
          {currentPhase === 'ministry-selection' ? 'Select Ministries' : 
           currentPhase === 'requirements-overview' ? 'Review Requirements' :
           currentPhase === 'faith-commitment' ? 'Faith Commitment' : 'Training'}
        </span>
      </div>

      {currentPhase === 'ministry-selection' && renderMinistrySelectionPhase()}
      {currentPhase === 'requirements-overview' && renderRequirementsOverview()}
    </div>
  );
}
