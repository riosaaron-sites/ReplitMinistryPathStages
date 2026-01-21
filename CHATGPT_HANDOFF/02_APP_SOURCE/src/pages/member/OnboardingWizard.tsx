import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ONBOARDING_STEPS } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  AlertCircle,
  Sparkles,
  Heart,
  Loader2,
  MessageCircleQuestion,
} from "lucide-react";

interface StepResponse {
  agreed: boolean;
  notes?: string;
}

interface OnboardingProgress {
  currentStep: number;
  stepResponses: Record<string, StepResponse>;
  spiritBaptismExperience?: {
    hasBaptismExperience: boolean;
    speaksInTongues: boolean;
    seekingBaptism: boolean;
    experienceDescription?: string;
  };
  isComplete: boolean;
  isBlocked: boolean;
  blockedAtStep?: number;
}

const STEP_CONTENT: Record<number, {
  title: string;
  scripture: string;
  scriptureRef: string;
  content: string;
  question: string;
  isSpecial?: boolean;
}> = {
  1: {
    title: "Scripture & Authority",
    scripture: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness.",
    scriptureRef: "2 Timothy 3:16",
    content: "We believe the Bible is the inspired, infallible Word of God—the final authority for faith and practice. It reveals God's character, His plan for humanity, and how we are to live.",
    question: "I affirm that the Bible is God's inspired Word and the ultimate authority for my faith and life.",
  },
  2: {
    title: "Nature of God",
    scripture: "Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.",
    scriptureRef: "Matthew 28:19",
    content: "We believe in one God, eternally existing in three persons: Father, Son, and Holy Spirit. Each is fully God, co-equal and co-eternal, yet distinct in role and relationship.",
    question: "I believe in one God who exists eternally as Father, Son, and Holy Spirit—the Trinity.",
  },
  3: {
    title: "Jesus Christ",
    scripture: "For what I received I passed on to you as of first importance: that Christ died for our sins according to the Scriptures, that he was buried, that he was raised on the third day.",
    scriptureRef: "1 Corinthians 15:3-4",
    content: "We believe Jesus Christ is fully God and fully man. He was born of a virgin, lived a sinless life, died on the cross for our sins, rose bodily from the grave, and will return in power and glory.",
    question: "I believe Jesus is the Son of God who died for my sins, rose from the dead, and is coming again.",
  },
  4: {
    title: "Salvation",
    scripture: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.",
    scriptureRef: "Ephesians 2:8-9",
    content: "We believe salvation is a gift of God's grace, received through faith in Jesus Christ alone. It cannot be earned by good works but results in a transformed life that produces good works.",
    question: "I believe salvation comes by grace through faith in Jesus Christ alone, not by works.",
  },
  5: {
    title: "Baptism in the Holy Spirit",
    scripture: "You will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.",
    scriptureRef: "Acts 1:8",
    content: "We believe the Baptism in the Holy Spirit is a distinct experience from salvation, empowering believers for witness and service. The initial physical evidence is speaking in tongues as the Spirit gives utterance (Acts 2:4). This is a core distinctive of Assemblies of God doctrine.",
    question: "I understand and embrace this doctrine as taught by the Assemblies of God.",
    isSpecial: true,
  },
  6: {
    title: "Sanctity of Life",
    scripture: "For you created my inmost being; you knit me together in my mother's womb. I praise you because I am fearfully and wonderfully made.",
    scriptureRef: "Psalm 139:13-14",
    content: "We believe every human life is sacred from conception to natural death. Life is a gift from God to be protected and cherished. This includes the unborn, the elderly, and every person created in God's image.",
    question: "I affirm the sanctity of human life from conception to natural death.",
  },
  7: {
    title: "Sexuality & Marriage",
    scripture: "For this reason a man will leave his father and mother and be united to his wife, and they will become one flesh.",
    scriptureRef: "Genesis 2:24",
    content: "We believe God designed marriage as a lifelong covenant between one man and one woman. Sexual intimacy is a beautiful gift reserved for this covenant relationship. We call all people to sexual purity, whether single or married.",
    question: "I uphold the biblical view of marriage as between one man and one woman, and commit to sexual purity.",
  },
  8: {
    title: "Sobriety & Witness",
    scripture: "Do not get drunk with wine, for that is debauchery, but be filled with the Spirit.",
    scriptureRef: "Ephesians 5:18",
    content: "We believe followers of Jesus are called to practice sobriety — not just as a behavior, but as a posture of the heart. Sobriety reflects a life that is alert, disciplined, and yielded to the Holy Spirit rather than influenced or impaired by any substance, activity, or habit.\n\nScripture calls believers to avoid drunkenness, addiction, and anything that diminishes judgment, weakens witness, or causes another person to stumble (Romans 14:21; 1 Corinthians 8:9; 1 Peter 5:8). Our goal is to live in a way that reflects wisdom, responsibility, and love for others.\n\nThose who serve or represent the ministry of Garden City Church agree to maintain a sober and clear mind while serving, leading, on church property, or participating in ministry-related activities. This standard is rooted in responsibility, influence, and example — recognizing that leadership is both seen and followed.",
    question: "I commit to living sober-minded and exercising wisdom, self-control, and responsibility in my personal conduct.",
  },
  9: {
    title: "Majors & Minors",
    scripture: "Accept the one whose faith is weak, without quarreling over disputable matters.",
    scriptureRef: "Romans 14:1",
    content: "We distinguish between essential doctrines (salvation, deity of Christ, Scripture) and secondary issues where believers may disagree in good conscience. We maintain unity on the essentials and extend grace on matters of personal conviction.",
    question: "I understand the difference between essential and secondary matters, and commit to unity and grace.",
  },
  10: {
    title: "Social Media & Representation",
    scripture: "Whatever you do, whether in word or deed, do it all in the name of the Lord Jesus, giving thanks to God the Father through him.",
    scriptureRef: "Colossians 3:17",
    content: "As representatives of Christ and Garden City Church, we are mindful that our public presence—including social media—reflects on Him and His body. We commit to wisdom, integrity, and Christ-honoring conduct in all public forums.",
    question: "I will represent Christ and this church with integrity in all public and social media contexts.",
  },
  11: {
    title: "Final Commitment",
    scripture: "Therefore, I urge you, brothers and sisters, in view of God's mercy, to offer your bodies as a living sacrifice, holy and pleasing to God—this is your true and proper worship.",
    scriptureRef: "Romans 12:1",
    content: "By completing this commitment, you are affirming your alignment with the core beliefs and values of Garden City Church. You understand that serving in ministry means representing these beliefs faithfully.",
    question: "I am in full agreement with the doctrines and values of Garden City Church and desire to serve faithfully.",
  },
};

export default function OnboardingWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: progress, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [stepResponses, setStepResponses] = useState<Record<string, StepResponse>>({});
  const [spiritBaptismExperience, setSpiritBaptismExperience] = useState({
    hasBaptismExperience: false,
    speaksInTongues: false,
    seekingBaptism: false,
    experienceDescription: "",
  });
  const [showQuestionsField, setShowQuestionsField] = useState(false);
  const [questionsText, setQuestionsText] = useState("");

  useEffect(() => {
    if (progress) {
      setCurrentStep(progress.currentStep);
      setStepResponses(progress.stepResponses || {});
      if (progress.spiritBaptismExperience) {
        setSpiritBaptismExperience(progress.spiritBaptismExperience as typeof spiritBaptismExperience);
      }
    }
  }, [progress]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingProgress>) => {
      return apiRequest("POST", "/api/onboarding/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
  });

  const handleResponse = async (agreed: boolean) => {
    const stepKey = `step-${currentStep}`;
    const newResponses = {
      ...stepResponses,
      [stepKey]: {
        agreed,
        notes: questionsText || undefined,
      },
    };
    setStepResponses(newResponses);
    setQuestionsText("");
    setShowQuestionsField(false);

    if (!agreed) {
      saveMutation.mutate({
        currentStep,
        stepResponses: newResponses,
        spiritBaptismExperience: currentStep === 5 ? spiritBaptismExperience : undefined,
        isComplete: false,
        isBlocked: true,
        blockedAtStep: currentStep,
      });
      toast({
        title: "Onboarding Paused",
        description: "A pastor will reach out to discuss this with you. Thank you for your honesty.",
        variant: "default",
      });
    } else {
      if (currentStep < 11) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        saveMutation.mutate({
          currentStep: nextStep,
          stepResponses: newResponses,
          spiritBaptismExperience: currentStep === 5 ? spiritBaptismExperience : undefined,
          isComplete: false,
          isBlocked: false,
        });
      } else {
        saveMutation.mutate({
          currentStep: 11,
          stepResponses: newResponses,
          spiritBaptismExperience,
          isComplete: true,
          isBlocked: false,
        });
        try {
          await apiRequest("POST", "/api/profile", { onboardingState: 'PHOTO' });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({
            title: "Faith Commitment Complete!",
            description: "Almost done! Let's finish setting up your profile.",
          });
          setLocation("/onboarding/photo");
        } catch (error) {
          toast({
            title: "Almost there!",
            description: "Please complete the final step to finish onboarding.",
          });
          setLocation("/onboarding/photo");
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveMutation.mutate({
        currentStep: prevStep,
        stepResponses,
        spiritBaptismExperience,
        isComplete: false,
        isBlocked: false,
      });
    } else {
      setLocation("/onboarding/ministries");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (progress?.isComplete) {
    const handleContinueOnboarding = async () => {
      try {
        await apiRequest("POST", "/api/profile", { onboardingState: 'PHOTO' });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/onboarding/photo");
      } catch (error) {
        setLocation("/onboarding/photo");
      }
    };
    
    return (
      <OnboardingLayout
        currentStep="faith"
        title="Faith Commitment Complete"
        subtitle="You've affirmed your alignment with our beliefs"
        showBackButton={false}
      >
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold">Commitment Complete!</h2>
            <p className="text-muted-foreground">
              Thank you for affirming your alignment with Garden City Church's beliefs and values.
            </p>
            <Button 
              onClick={handleContinueOnboarding} 
              className="w-full"
              size="lg"
              data-testid="button-continue-onboarding"
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              Continue Onboarding
            </Button>
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

  if (progress?.isBlocked) {
    return (
      <OnboardingLayout
        currentStep="faith"
        title="Onboarding Paused"
        subtitle="We'd like to have a conversation with you"
        showBackButton={false}
      >
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold">Let's Talk</h2>
            <p className="text-muted-foreground">
              You indicated you had questions at Step {progress.blockedAtStep}. 
              A pastor will reach out to discuss this with you.
            </p>
            <p className="text-sm text-muted-foreground">
              This is not a rejection—it's an invitation to conversation. We value 
              your honesty and want to help you understand our beliefs.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-return-home">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

  const stepInfo = STEP_CONTENT[currentStep];
  const progressPercent = ((currentStep - 1) / 11) * 100;
  const isStep5 = currentStep === 5;

  const helpContent = (
    <>
      <p>
        <strong>What is this?</strong> These are the core beliefs of Garden City Church. 
        As a ministry volunteer, we ask that you affirm alignment with these values.
      </p>
      <p>
        <strong>What if I have questions?</strong> That's completely okay! Click 
        "I Have Questions" and a pastor will reach out to discuss it with you.
      </p>
      <p>
        <strong>Is this required?</strong> Yes, affirming these beliefs is required 
        to serve in ministry. This helps ensure we're united in purpose.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="faith"
      title="Faith & Community Commitment"
      subtitle={`Step ${currentStep} of 11`}
      showBackButton
      backUrl="/onboarding/ministries"
      onBackClick={currentStep > 1 ? handlePrevious : undefined}
      helpContent={helpContent}
    >
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your progress</span>
          <span className="font-medium">{Math.round(progressPercent)}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" data-testid="progress-onboarding" />
      </div>

      {/* Step Card */}
      <Card>
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isStep5 ? (
                <Sparkles className="w-6 h-6 text-primary" />
              ) : currentStep === 11 ? (
                <Heart className="w-6 h-6 text-primary" />
              ) : (
                <BookOpen className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{stepInfo.title}</CardTitle>
              <CardDescription>
                {ONBOARDING_STEPS.find(s => s.id === currentStep)?.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scripture Quote */}
          <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r-lg">
            <p className="italic text-muted-foreground">"{stepInfo.scripture}"</p>
            <footer className="mt-2 text-sm font-medium">— {stepInfo.scriptureRef}</footer>
          </blockquote>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="leading-relaxed whitespace-pre-line">{stepInfo.content}</p>
          </div>

          {/* Special Step 5: Holy Spirit Experience */}
          {isStep5 && (
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Your Experience with the Holy Spirit
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Have you experienced the Baptism in the Holy Spirit?</Label>
                  <RadioGroup
                    value={spiritBaptismExperience.hasBaptismExperience ? "yes" : "no"}
                    onValueChange={(v) => setSpiritBaptismExperience(prev => ({ ...prev, hasBaptismExperience: v === "yes" }))}
                    className="flex gap-4"
                    data-testid="radio-spirit-baptism-experience"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="baptism-yes" />
                      <Label htmlFor="baptism-yes">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="baptism-no" />
                      <Label htmlFor="baptism-no">Not yet</Label>
                    </div>
                  </RadioGroup>
                </div>

                {spiritBaptismExperience.hasBaptismExperience && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Do you speak in tongues?</Label>
                    <RadioGroup
                      value={spiritBaptismExperience.speaksInTongues ? "yes" : "no"}
                      onValueChange={(v) => setSpiritBaptismExperience(prev => ({ ...prev, speaksInTongues: v === "yes" }))}
                      className="flex gap-4"
                      data-testid="radio-speaks-tongues"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="tongues-yes" />
                        <Label htmlFor="tongues-yes">Yes</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="tongues-no" />
                        <Label htmlFor="tongues-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {!spiritBaptismExperience.hasBaptismExperience && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Are you seeking the Baptism in the Holy Spirit?</Label>
                    <RadioGroup
                      value={spiritBaptismExperience.seekingBaptism ? "yes" : "no"}
                      onValueChange={(v) => setSpiritBaptismExperience(prev => ({ ...prev, seekingBaptism: v === "yes" }))}
                      className="flex gap-4"
                      data-testid="radio-seeking-baptism"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="seeking-yes" />
                        <Label htmlFor="seeking-yes">Yes, I am open to it</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="seeking-no" />
                        <Label htmlFor="seeking-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Share more about your experience (optional)</Label>
                  <Textarea
                    placeholder="Feel free to share your testimony or questions..."
                    value={spiritBaptismExperience.experienceDescription || ""}
                    onChange={(e) => setSpiritBaptismExperience(prev => ({ ...prev, experienceDescription: e.target.value }))}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-spirit-experience"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Affirmation Section */}
          <div className="border-t pt-4 space-y-4">
            <p className="font-medium text-primary">{stepInfo.question}</p>
            
            {/* I Have Questions Field */}
            {showQuestionsField && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <MessageCircleQuestion className="w-4 h-4" />
                  <span className="font-medium text-sm">Share your questions or concerns</span>
                </div>
                <Textarea
                  placeholder="What questions do you have about this belief? A pastor will reach out to discuss with you..."
                  value={questionsText}
                  onChange={(e) => setQuestionsText(e.target.value)}
                  className="resize-none bg-white dark:bg-background"
                  rows={3}
                  data-testid="textarea-questions"
                />
                <p className="text-xs text-muted-foreground">
                  After submitting, a pastor will reach out to have a conversation with you.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => handleResponse(true)}
                size="lg"
                className="w-full"
                disabled={saveMutation.isPending}
                data-testid="button-agree"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Check className="w-5 h-5 mr-2" />
                )}
                I Affirm This
              </Button>
              
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                    data-testid="button-previous"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button
                  variant={showQuestionsField ? "default" : "ghost"}
                  onClick={() => {
                    if (showQuestionsField && questionsText.trim()) {
                      handleResponse(false);
                    } else {
                      setShowQuestionsField(!showQuestionsField);
                    }
                  }}
                  disabled={saveMutation.isPending}
                  className={`flex-1 ${showQuestionsField ? "" : "text-muted-foreground"}`}
                  data-testid="button-have-questions"
                >
                  <MessageCircleQuestion className="w-4 h-4 mr-1" />
                  {showQuestionsField ? "Submit Questions" : "I Have Questions"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save Indicator */}
      <p className="text-xs text-center text-muted-foreground">
        Your progress is saved automatically
      </p>
    </OnboardingLayout>
  );
}
