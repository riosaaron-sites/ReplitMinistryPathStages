import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Calendar, CheckCircle2, HelpCircle, Clock, ChevronRight, AlertCircle, PartyPopper } from "lucide-react";
import type { ClassStatus, User } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";

const CLASS_STATUS_OPTIONS: { value: ClassStatus; label: string; description: string; icon: typeof CheckCircle2 }[] = [
  { value: 'COMPLETE', label: 'Completed', description: "I've attended this class", icon: CheckCircle2 },
  { value: 'SCHEDULED', label: 'Scheduled / Intend to Take', description: "I'm signed up or plan to attend", icon: Calendar },
  { value: 'INCOMPLETE', label: 'Not Yet', description: "I haven't attended but want to", icon: Clock },
  { value: 'UNKNOWN', label: 'Not Sure', description: "I don't remember or I'm not sure", icon: HelpCircle },
];

export default function ClassStatusStep() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [nextNightStatus, setNextNightStatus] = useState<ClassStatus>('UNKNOWN');
  const [followingJesusStatus, setFollowingJesusStatus] = useState<ClassStatus>('UNKNOWN');
  const [nextNightDate, setNextNightDate] = useState<string>('');
  const [followingJesusDate, setFollowingJesusDate] = useState<string>('');
  const [attendsSunday, setAttendsSunday] = useState<boolean | null>(null);
  const [attendsDiscipleshipHour, setAttendsDiscipleshipHour] = useState<boolean | null>(null);
  const [hasLoadedUserData, setHasLoadedUserData] = useState(false);
  const [dateErrors, setDateErrors] = useState<{ nextNight?: string; followingJesus?: string }>({});

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (user && !hasLoadedUserData) {
      if (user.nextNightStatus) setNextNightStatus(user.nextNightStatus as ClassStatus);
      if (user.followingJesusStatus) setFollowingJesusStatus(user.followingJesusStatus as ClassStatus);
      if (user.nextNightCompletedAt) setNextNightDate(new Date(user.nextNightCompletedAt).toISOString().split('T')[0]);
      if (user.followingJesusCompletedAt) setFollowingJesusDate(new Date(user.followingJesusCompletedAt).toISOString().split('T')[0]);
      setHasLoadedUserData(true);
    }
  }, [user, hasLoadedUserData]);

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { 
      nextNightStatus: ClassStatus; 
      followingJesusStatus: ClassStatus;
      nextNightDate?: string;
      followingJesusDate?: string;
      attendsSunday?: boolean;
      attendsDiscipleshipHour?: boolean;
    }) => {
      return apiRequest("POST", "/api/onboarding/class-status", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/onboarding/complete");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const errors: { nextNight?: string; followingJesus?: string } = {};
    
    if (nextNightStatus === 'COMPLETE' && !nextNightDate) {
      errors.nextNight = "Please enter the date you completed Next Night";
    }
    if (followingJesusStatus === 'COMPLETE' && !followingJesusDate) {
      errors.followingJesus = "Please enter the date you completed Following Jesus";
    }
    
    if (Object.keys(errors).length > 0) {
      setDateErrors(errors);
      toast({
        title: "Date Required",
        description: "Please enter the completion date for classes marked as complete",
        variant: "destructive",
      });
      return;
    }
    
    setDateErrors({});
    updateStatusMutation.mutate({ 
      nextNightStatus, 
      followingJesusStatus,
      nextNightDate: nextNightStatus === 'COMPLETE' ? nextNightDate : undefined,
      followingJesusDate: followingJesusStatus === 'COMPLETE' ? followingJesusDate : undefined,
      attendsSunday: attendsSunday ?? undefined,
      attendsDiscipleshipHour: attendsDiscipleshipHour ?? undefined,
    });
  };

  const helpContent = (
    <>
      <p>
        <strong>What is Next Night?</strong> Next Night is our monthly gathering 
        where you learn about who we are and commit to community. It's NOT the 
        same as regular Sunday worship.
      </p>
      <p>
        <strong>What is Following Jesus?</strong> Following Jesus is our foundational 
        discipleship class that helps you grow in your faith.
      </p>
      <p>
        <strong>What if I haven't attended?</strong> That's okay! You can still 
        complete onboarding. We'll remind you to attend when available.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="classes"
      title="Required Classes"
      subtitle="Let us know your status with these important classes"
      showBackButton
      backUrl="/onboarding/photo"
      helpContent={helpContent}
    >
      {/* Sunday Attendance */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Sunday Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Do you consistently attend Sunday morning services?</Label>
            <RadioGroup
              value={attendsSunday === null ? '' : attendsSunday ? 'yes' : 'no'}
              onValueChange={(v) => setAttendsSunday(v === 'yes')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="sunday-yes" data-testid="radio-sunday-yes" />
                <Label htmlFor="sunday-yes">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="sunday-no" data-testid="radio-sunday-no" />
                <Label htmlFor="sunday-no">Not regularly</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Do you attend Discipleship Hour (Sunday School)?</Label>
            <RadioGroup
              value={attendsDiscipleshipHour === null ? '' : attendsDiscipleshipHour ? 'yes' : 'no'}
              onValueChange={(v) => setAttendsDiscipleshipHour(v === 'yes')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="dh-yes" data-testid="radio-dh-yes" />
                <Label htmlFor="dh-yes">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="dh-no" data-testid="radio-dh-no" />
                <Label htmlFor="dh-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Next Night */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-primary" />
            Next Night
          </CardTitle>
          <CardDescription>
            Learn who we are and commit to community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={nextNightStatus}
            onValueChange={(value) => setNextNightStatus(value as ClassStatus)}
            className="grid gap-2"
          >
            {CLASS_STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = nextNightStatus === option.value;
              return (
                <div 
                  key={option.value} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`next-night-${option.value}`}
                    data-testid={`radio-next-night-${option.value.toLowerCase()}`}
                  />
                  <Label
                    htmlFor={`next-night-${option.value}`}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm hidden sm:inline">{option.description}</span>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {nextNightStatus === 'COMPLETE' && (
            <div className="pl-4 pt-2 space-y-2 border-l-2 border-primary/20">
              <Label htmlFor="next-night-date">When did you attend? *</Label>
              <Input
                id="next-night-date"
                type="date"
                value={nextNightDate}
                onChange={(e) => {
                  setNextNightDate(e.target.value);
                  setDateErrors(prev => ({ ...prev, nextNight: undefined }));
                }}
                className={`max-w-xs ${dateErrors.nextNight ? 'border-red-500' : ''}`}
                data-testid="input-next-night-date"
              />
              {dateErrors.nextNight && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {dateErrors.nextNight}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Following Jesus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-primary" />
            Following Jesus
          </CardTitle>
          <CardDescription>
            Our foundational discipleship class for growing in faith
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={followingJesusStatus}
            onValueChange={(value) => setFollowingJesusStatus(value as ClassStatus)}
            className="grid gap-2"
          >
            {CLASS_STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = followingJesusStatus === option.value;
              return (
                <div 
                  key={option.value} 
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value={option.value}
                    id={`following-jesus-${option.value}`}
                    data-testid={`radio-following-jesus-${option.value.toLowerCase()}`}
                  />
                  <Label
                    htmlFor={`following-jesus-${option.value}`}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm hidden sm:inline">{option.description}</span>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {followingJesusStatus === 'COMPLETE' && (
            <div className="pl-4 pt-2 space-y-2 border-l-2 border-primary/20">
              <Label htmlFor="following-jesus-date">When did you attend? *</Label>
              <Input
                id="following-jesus-date"
                type="date"
                value={followingJesusDate}
                onChange={(e) => {
                  setFollowingJesusDate(e.target.value);
                  setDateErrors(prev => ({ ...prev, followingJesus: undefined }));
                }}
                className={`max-w-xs ${dateErrors.followingJesus ? 'border-red-500' : ''}`}
                data-testid="input-following-jesus-date"
              />
              {dateErrors.followingJesus && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {dateErrors.followingJesus}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Even if you haven't completed these classes yet, you can still 
            access the dashboard and start serving. We'll remind you about 
            upcoming class opportunities.
          </p>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={updateStatusMutation.isPending}
        className="w-full"
        size="lg"
        data-testid="button-complete-onboarding"
      >
        {updateStatusMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PartyPopper className="w-4 h-4 mr-2" />
        )}
        Complete Onboarding
      </Button>
    </OnboardingLayout>
  );
}
