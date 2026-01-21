import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProgressBar } from "@/components/survey/ProgressBar";
import { QuestionCard } from "@/components/survey/QuestionCard";
import { SurveyNavigation } from "@/components/survey/SurveyNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  SURVEY_QUESTIONS, 
  SURVEY_SECTIONS,
  getQuestionsForSection 
} from "@/lib/surveyQuestions";
import type { SurveyAnswers, SurveyProgress } from "@shared/schema";
import { LogOut } from "lucide-react";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

export default function Survey() {
  const [, navigate] = useLocation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});

  // Fetch existing progress
  const { data: progress, isLoading: isProgressLoading } = useQuery<SurveyProgress>({
    queryKey: ["/api/survey/progress"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Load saved progress with safe index calculation
  useEffect(() => {
    if (progress && !progress.isComplete) {
      const savedAnswers = progress.answers as SurveyAnswers;
      const savedSection = progress.currentSection;
      
      // Get filtered questions for the saved section based on saved answers
      const filteredQuestions = getQuestionsForSection(savedSection).filter((q) => {
        if (!q.conditionalTrigger) return true;
        return savedAnswers[q.conditionalTrigger] === "yes";
      });
      
      // Calculate safe index within filtered question bounds
      const maxIndex = Math.max(0, filteredQuestions.length - 1);
      const safeIndex = Math.min(progress.currentQuestion, maxIndex);
      
      setCurrentSection(savedSection);
      setCurrentQuestionIndex(safeIndex);
      setAnswers(savedAnswers);
    }
  }, [progress]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to take the survey.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthLoading, isAuthenticated, toast]);

  // Redirect if already completed
  useEffect(() => {
    if (progress?.isComplete) {
      navigate("/results");
    }
  }, [progress, navigate]);

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async (data: { 
      currentSection: number; 
      currentQuestion: number; 
      answers: SurveyAnswers;
    }) => {
      return apiRequest("POST", "/api/survey/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey/progress"] });
      toast({
        title: "Progress saved",
        description: "Your answers have been saved. You can continue later.",
      });
    },
    onError: () => {
      toast({
        title: "Error saving",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit survey mutation
  const submitSurveyMutation = useMutation({
    mutationFn: async (data: { answers: SurveyAnswers }) => {
      return apiRequest("POST", "/api/survey/submit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/results"] });
      navigate("/results");
    },
    onError: () => {
      toast({
        title: "Error submitting",
        description: "Failed to submit survey. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get current section questions with conditional logic
  const sectionQuestions = useMemo(() => {
    const questions = getQuestionsForSection(currentSection);
    
    // Filter out conditional questions if trigger not met
    return questions.filter((q) => {
      if (!q.conditionalTrigger) return true;
      const triggerAnswer = answers[q.conditionalTrigger];
      return triggerAnswer === "yes";
    });
  }, [currentSection, answers]);

  // Ensure question index is within bounds of filtered questions
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(0, sectionQuestions.length - 1));
  const currentQuestion = sectionQuestions[safeQuestionIndex];
  
  // Sync index if it's out of bounds (e.g., after conditional filtering)
  useEffect(() => {
    if (sectionQuestions.length > 0 && currentQuestionIndex !== safeQuestionIndex) {
      setCurrentQuestionIndex(safeQuestionIndex);
    }
  }, [sectionQuestions.length, currentQuestionIndex, safeQuestionIndex]);

  // Calculate total answered
  const totalAnswered = Object.keys(answers).length;

  // Handle answer
  const handleAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (safeQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
    } else if (currentSection > 0) {
      // Get filtered questions for previous section
      const prevQuestions = getQuestionsForSection(currentSection - 1).filter((q) => {
        if (!q.conditionalTrigger) return true;
        return answers[q.conditionalTrigger] === "yes";
      });
      setCurrentSection((prev) => prev - 1);
      setCurrentQuestionIndex(Math.max(0, prevQuestions.length - 1));
    }
  };

  // Navigate to next question
  const handleNext = () => {
    if (!currentQuestion) return;

    // Check if question is answered
    if (answers[currentQuestion.id] === undefined) {
      toast({
        title: "Please answer the question",
        description: "Select an option to continue.",
        variant: "destructive",
      });
      return;
    }

    const maxSectionId = SURVEY_SECTIONS[SURVEY_SECTIONS.length - 1].id;

    if (safeQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(safeQuestionIndex + 1);
    } else if (currentSection < maxSectionId) {
      setCurrentSection((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      // Submit survey
      submitSurveyMutation.mutate({ answers });
    }
  };

  // Save progress
  const handleSave = () => {
    saveProgressMutation.mutate({
      currentSection,
      currentQuestion: currentQuestionIndex,
      answers,
    });
  };

  // Calculate question numbers
  const globalQuestionNumber = useMemo(() => {
    let count = 0;
    for (let s = 0; s < currentSection; s++) {
      count += getQuestionsForSection(s).filter(q => {
        if (!q.conditionalTrigger) return true;
        return answers[q.conditionalTrigger] === "yes";
      }).length;
    }
    return count + safeQuestionIndex + 1;
  }, [currentSection, safeQuestionIndex, answers]);

  const isFirstQuestion = currentSection === 0 && safeQuestionIndex === 0;
  const lastSectionId = SURVEY_SECTIONS[SURVEY_SECTIONS.length - 1].id;
  const isLastQuestion = currentSection === lastSectionId && 
    safeQuestionIndex === sectionQuestions.length - 1;

  if (isAuthLoading || isProgressLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <img 
              src={ministryPathLogo} 
              alt="Garden City Church" 
              className="h-8 w-auto dark:invert"
            />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <img 
              src={ministryPathLogo} 
              alt="Garden City Church" 
              className="h-8 w-auto dark:invert"
            />
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Hi, {user.firstName || user.email?.split('@')[0]}
                </span>
              )}
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
          
          <ProgressBar
            currentSection={currentSection}
            currentQuestionIndex={currentQuestionIndex}
            totalAnswered={totalAnswered}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Section Header */}
        {safeQuestionIndex === 0 && (
          <Card className="mb-8 border-card-border bg-primary/5">
            <CardContent className="p-6">
              <h2 className="font-serif-display text-xl font-semibold mb-2" data-testid="text-section-title">
                Section {currentSection + 1}: {SURVEY_SECTIONS.find(s => s.id === currentSection)?.title}
              </h2>
              <p className="text-muted-foreground">
                {currentSection === 0 && "Let's start by getting to know you a little better."}
                {currentSection === 1 && "These questions will help identify your spiritual gifts based on Scripture."}
                {currentSection === 2 && "These questions assess your familiarity with Scripture and biblical foundations."}
                {currentSection === 3 && "These questions explore your personality type and how you relate to others."}
                {currentSection === 4 && "These questions evaluate your practical skills and ministry experience."}
                {currentSection === 5 && "These questions test your technical proficiency for production and media roles."}
                {currentSection === 6 && "These questions help us understand your ideal serving environment."}
                {currentSection === 7 && "These questions help us assess your fit for serving with children and youth."}
                {currentSection === 8 && "These questions explore your calling to support group ministries like GriefShare, Celebrate Recovery, and The Landing Team."}
                {currentSection === 9 && "These questions help us understand your availability and capacity to serve."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <QuestionCard
          question={currentQuestion}
          questionNumber={globalQuestionNumber}
          totalQuestions={SURVEY_QUESTIONS.length}
          answers={answers}
          onAnswer={handleAnswer}
        />

        {/* Navigation */}
        <SurveyNavigation
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSave={handleSave}
          canGoBack={!isFirstQuestion}
          canGoNext={answers[currentQuestion.id] !== undefined}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          isSaving={saveProgressMutation.isPending}
        />
      </main>

    </div>
  );
}
