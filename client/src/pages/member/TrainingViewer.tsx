import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  AlertCircle,
  GraduationCap,
  FileText,
  HelpCircle,
  ClipboardCheck,
  Circle,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Eye,
  Video,
  Clock,
} from "lucide-react";
import { CoachBubble } from "@/components/CoachBubble";

interface DeepLesson {
  id: string;
  lessonNumber: number;
  title: string;
  teachingContent: string;
  whyThisMatters: string;
  reflectionPrompt: string;
  scriptureReferences?: string[];
}

interface KnowledgeCheckQuestion {
  id: string;
  questionType: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface IntensiveAssessmentQuestion {
  id: string;
  questionType: 'scenario' | 'application' | 'multiple-choice';
  scenario?: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  weight: number;
}

interface TrainingModule {
  id: string;
  ministryId?: string;
  title: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  contentSections?: ContentSection[];
  lessonSummary?: string;
  studyQuestions?: StudyQuestion[];
  isRequired?: boolean;
  assessments?: Assessment[];
  isDeepTraining?: boolean;
  lessons?: DeepLesson[];
  knowledgeCheckQuestions?: KnowledgeCheckQuestion[];
  intensiveAssessmentQuestions?: IntensiveAssessmentQuestion[];
  reflectionPrompt?: string;
  audience?: string;
  videoUrl?: string;
  requiresApproval?: boolean;
  sortOrder?: number;
}

interface ContentSection {
  title: string;
  content: string;
  keyPoints?: string[];
}

interface StudyQuestion {
  question: string;
  guidance?: string;
}

interface Assessment {
  id: string;
  moduleId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface UserTrainingProgress {
  id: string;
  moduleId: string;
  status?: string;
  progressPercent?: number;
  startedAt?: string;
  completedAt?: string;
  assessmentScore?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionFeedback?: string;
}

type TrainingStep = 'lesson' | 'study' | 'knowledge-check' | 'assessment' | 'results';

interface Ministry {
  id: string;
  name: string;
}

export default function TrainingViewer() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params.moduleId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<TrainingStep>('lesson');
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [reflectionNotes, setReflectionNotes] = useState<Record<number, string>>({});
  const [isRevisitMode, setIsRevisitMode] = useState(false);

  const { data: module, isLoading: moduleLoading } = useQuery<TrainingModule>({
    queryKey: [`/api/training/modules/${moduleId}`],
    enabled: !!moduleId,
  });

  const { data: progress } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress"],
  });

  // Fetch all modules to find next training in sequence
  const { data: allModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  // Fetch ministries to display ministry name
  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  // Get ministry name for current module
  const getMinistryName = (ministryId?: string): string | null => {
    if (!ministryId) return null;
    const ministry = ministries.find(m => m.id === ministryId);
    return ministry?.name || null;
  };

  // Find the next training in sequence (by sortOrder within same ministry or general trainings)
  const findNextTraining = (): TrainingModule | null => {
    if (!module) return null;
    
    // Get trainings in the same ministry (or general trainings if no ministry)
    const relevantModules = allModules.filter(m => {
      if (module.ministryId) {
        return m.ministryId === module.ministryId;
      }
      return !m.ministryId; // General trainings
    });
    
    // Sort by sortOrder
    const sortedModules = [...relevantModules].sort((a, b) => 
      (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    
    // Find current module index and get next one
    const currentIndex = sortedModules.findIndex(m => m.id === module.id);
    if (currentIndex >= 0 && currentIndex < sortedModules.length - 1) {
      const nextModule = sortedModules[currentIndex + 1];
      // Check if user hasn't already completed the next module
      const nextProgress = progress?.find(p => p.moduleId === nextModule.id);
      if (!nextProgress || (nextProgress.status !== 'completed' && nextProgress.status !== 'approved')) {
        return nextModule;
      }
    }
    return null;
  };

  const nextTraining = findNextTraining();

  const updateProgress = useMutation({
    mutationFn: async (data: { moduleId: string; status: string; progressPercent?: number; assessmentScore?: number }) => {
      return apiRequest("POST", "/api/training/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-progress"] });
    },
  });

  const currentProgress = progress?.find(p => p.moduleId === moduleId);
  const isCompleted = currentProgress?.status === 'completed' || currentProgress?.status === 'approved';
  const isSubmitted = currentProgress?.status === 'submitted';
  const isRejected = currentProgress?.status === 'rejected';
  
  // Explicitly parse lessons from the module data to handle potential type issues
  const parsedLessons: DeepLesson[] = (() => {
    // DIAGNOSTIC: Log module lessons data for debugging
    if (module) {
      console.log('[TrainingViewer] Module ID:', module.id);
      console.log('[TrainingViewer] typeof module.lessons:', typeof module.lessons);
      console.log('[TrainingViewer] Array.isArray(module.lessons):', Array.isArray(module.lessons));
      console.log('[TrainingViewer] module.lessons value:', module.lessons);
    }
    
    if (!module?.lessons) return [];
    // Handle case where lessons might be a string (unlikely but defensive)
    if (typeof module.lessons === 'string') {
      try {
        const parsed = JSON.parse(module.lessons);
        console.log('[TrainingViewer] Parsed string lessons, length:', Array.isArray(parsed) ? parsed.length : 'not array');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        console.log('[TrainingViewer] Failed to parse lessons string');
        return [];
      }
    }
    // Handle case where it's already an array
    if (Array.isArray(module.lessons)) {
      console.log('[TrainingViewer] Lessons is array, length:', module.lessons.length);
      return module.lessons;
    }
    console.log('[TrainingViewer] Lessons is neither string nor array');
    return [];
  })();
  
  // Infer deep training from presence of parsed lessons (flag may not be strictly boolean)
  const isDeepTraining = parsedLessons.length > 0;
  const lessons = parsedLessons;
  
  // Safe lesson index: ensure we always have a valid index when lessons exist
  const safeLessonIndex =
    typeof currentLessonIndex === "number" &&
    currentLessonIndex >= 0 &&
    currentLessonIndex < lessons.length
      ? currentLessonIndex
      : 0;
  
  const currentLesson = lessons.length > 0 ? lessons[safeLessonIndex] : null;
  
  const hasLesson = !!(module?.lessonSummary || (module?.contentSections && module.contentSections.length > 0) || isDeepTraining);
  const hasStudyQuestions = !!(module?.studyQuestions && module.studyQuestions.length > 0);
  const hasKnowledgeCheck = !!(module?.knowledgeCheckQuestions && module.knowledgeCheckQuestions.length > 0);
  const hasIntensiveAssessment = !!(module?.intensiveAssessmentQuestions && module.intensiveAssessmentQuestions.length > 0);
  const assessments = module?.assessments || [];
  const hasAssessment = assessments.length > 0 || hasIntensiveAssessment;

  useEffect(() => {
    setCurrentStep('lesson');
    setCurrentLessonIndex(0);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizScore(0);
    setReflectionNotes({});
    setIsRevisitMode(false);
  }, [moduleId]);

  // Don't auto-set revisit mode - let user choose from splash screen
  // This prevents blocking progress updates for partial completions

  useEffect(() => {
    // Only initialize progress if not completed (allow retake from splash)
    if (moduleId && !currentProgress) {
      updateProgress.mutate({
        moduleId,
        status: 'in-progress',
        progressPercent: 0,
      });
    }
  }, [moduleId, currentProgress]);

  // Get ordered list of enabled steps for this training type
  const getEnabledSteps = (): TrainingStep[] => {
    if (isDeepTraining) {
      const steps: TrainingStep[] = ['lesson'];
      if (hasKnowledgeCheck) steps.push('knowledge-check');
      if (hasIntensiveAssessment) steps.push('assessment');
      return steps;
    }
    const steps: TrainingStep[] = ['lesson'];
    if (hasStudyQuestions) steps.push('study');
    if (hasAssessment) steps.push('assessment');
    return steps;
  };

  // Calculate progress based on current/next position
  const calculateProgressForState = (step: TrainingStep, lessonIdx: number, questionIdx: number): number => {
    if (isDeepTraining) {
      // Deep training milestones: lessons (0-60%), knowledge-check (60-80%), assessment (80-100%)
      const totalLessons = lessons.length || 1;
      
      if (step === 'lesson') {
        // Each lesson is a portion of 60% (0-60 range)
        return Math.round(((lessonIdx + 1) / totalLessons) * 60);
      }
      if (step === 'knowledge-check') {
        // Knowledge check: 60% base + progress within 60-80% range (20% span)
        const kcTotal = module?.knowledgeCheckQuestions?.length || 1;
        return 60 + Math.round(((questionIdx + 1) / kcTotal) * 20);
      }
      if (step === 'assessment') {
        // Assessment: 80% base + progress within 80-100% range (20% span)
        const iaTotal = module?.intensiveAssessmentQuestions?.length || 1;
        return 80 + Math.round(((questionIdx + 1) / iaTotal) * 20);
      }
      if (step === 'results') return 100;
      return 0;
    }

    // Legacy training: use step position in enabled steps list
    const enabledSteps = getEnabledSteps();
    const stepIndex = enabledSteps.indexOf(step);
    const totalSteps = enabledSteps.length;
    
    if (step === 'results') return 100;
    
    if (step === 'assessment' && assessments.length > 0) {
      // Assessment step: base progress + quiz progress
      const baseProgress = (stepIndex / totalSteps) * 100;
      const quizProgress = ((questionIdx + 1) / assessments.length) * (100 / totalSteps);
      return Math.round(baseProgress + quizProgress);
    }
    
    // Step completion: (step position + 1) / total steps
    return Math.round(((stepIndex + 1) / totalSteps) * 100);
  };

  // Calculate display progress for current state
  const calculateProgress = (): number => {
    return calculateProgressForState(currentStep, currentLessonIndex, currentQuestion);
  };

  const handleNextLesson = () => {
    let nextStep: TrainingStep = 'lesson';
    let nextLessonIndex = currentLessonIndex;
    
    if (currentLessonIndex < lessons.length - 1) {
      nextLessonIndex = currentLessonIndex + 1;
      setCurrentLessonIndex(nextLessonIndex);
    } else {
      if (hasKnowledgeCheck) {
        nextStep = 'knowledge-check';
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
        setAnswers({});
      } else if (hasIntensiveAssessment) {
        nextStep = 'assessment';
        setCurrentStep('assessment');
        setCurrentQuestion(0);
        setAnswers({});
      } else {
        handleComplete();
        return;
      }
    }
    
    if (!isRevisitMode) {
      // Calculate progress for the next state (use index 0 for new phases)
      const progress = calculateProgressForState(nextStep, nextLessonIndex, 0);
      updateProgress.mutate({
        moduleId: moduleId!,
        status: 'in-progress',
        progressPercent: progress,
      });
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleNextStep = () => {
    let nextStep: TrainingStep = currentStep;
    
    if (currentStep === 'lesson') {
      if (hasStudyQuestions) {
        nextStep = 'study';
        setCurrentStep('study');
      } else if (hasKnowledgeCheck) {
        nextStep = 'knowledge-check';
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
      } else if (hasAssessment) {
        nextStep = 'assessment';
        setCurrentStep('assessment');
        setCurrentQuestion(0);
      } else {
        // For legacy trainings without assessment, submit for review
        if (!isRevisitMode) {
          updateProgress.mutate({
            moduleId: moduleId!,
            status: 'completed',
            progressPercent: 100,
          });
          toast({
            title: "Training Submitted!",
            description: "Your training has been submitted for leader review.",
          });
        }
        setLocation("/trainings");
        return;
      }
    } else if (currentStep === 'study') {
      if (hasKnowledgeCheck) {
        nextStep = 'knowledge-check';
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
      } else if (hasAssessment) {
        nextStep = 'assessment';
        setCurrentStep('assessment');
        setCurrentQuestion(0);
      } else {
        if (!isRevisitMode) {
          updateProgress.mutate({
            moduleId: moduleId!,
            status: 'completed',
            progressPercent: 100,
          });
          toast({
            title: "Training Submitted!",
            description: "Your training has been submitted for leader review.",
          });
        }
        setLocation("/trainings");
        return;
      }
    } else if (currentStep === 'knowledge-check') {
      if (hasIntensiveAssessment) {
        nextStep = 'assessment';
        setCurrentStep('assessment');
        setCurrentQuestion(0);
        setAnswers({});
      } else {
        if (!isRevisitMode) {
          updateProgress.mutate({
            moduleId: moduleId!,
            status: 'completed',
            progressPercent: 100,
          });
          toast({
            title: "Training Submitted!",
            description: "Your training has been submitted for leader review.",
          });
        }
        setLocation("/trainings");
        return;
      }
    }
    
    if (!isRevisitMode) {
      const progress = calculateProgressForState(nextStep, currentLessonIndex, 0);
      updateProgress.mutate({
        moduleId: moduleId!,
        status: 'in-progress',
        progressPercent: progress,
      });
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'study') {
      setCurrentStep('lesson');
      if (isDeepTraining) setCurrentLessonIndex(lessons.length - 1);
    } else if (currentStep === 'knowledge-check') {
      setCurrentStep('lesson');
      if (isDeepTraining) setCurrentLessonIndex(lessons.length - 1);
    } else if (currentStep === 'assessment') {
      if (hasKnowledgeCheck) {
        setCurrentStep('knowledge-check');
        setCurrentQuestion((module?.knowledgeCheckQuestions?.length || 1) - 1);
      } else if (hasStudyQuestions) {
        setCurrentStep('study');
      } else {
        setCurrentStep('lesson');
        if (isDeepTraining) setCurrentLessonIndex(lessons.length - 1);
      }
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const handleNextQuestion = () => {
    const questions = currentStep === 'knowledge-check' 
      ? module?.knowledgeCheckQuestions 
      : (currentStep === 'assessment' && hasIntensiveAssessment 
        ? module?.intensiveAssessmentQuestions 
        : assessments);
    
    if (!questions) return;
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateQuizScore();
    }
  };

  const calculateQuizScore = () => {
    const questions = hasIntensiveAssessment 
      ? module?.intensiveAssessmentQuestions || []
      : assessments;
    
    let correct = 0;
    let totalWeight = 0;
    let earnedWeight = 0;

    if (hasIntensiveAssessment && module?.intensiveAssessmentQuestions) {
      module.intensiveAssessmentQuestions.forEach((q, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === q.correctAnswer || 
                          (q.options && q.options.indexOf(userAnswer) === q.options.indexOf(q.correctAnswer));
        totalWeight += q.weight || 1;
        if (isCorrect) {
          correct++;
          earnedWeight += q.weight || 1;
        }
      });
      const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
      setQuizScore(score);
    } else {
      assessments.forEach((assessment, index) => {
        const userAnswer = parseInt(answers[index] || "-1");
        if (userAnswer === assessment.correctAnswer) {
          correct++;
        }
      });
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      setQuizScore(score);
    }
    
    setCurrentStep('results');

    const finalScore = hasIntensiveAssessment 
      ? (totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0)
      : (questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0);

    if (finalScore >= 70 && !isRevisitMode) {
      updateProgress.mutate({
        moduleId: moduleId!,
        status: 'completed',
        progressPercent: 100,
        assessmentScore: finalScore,
      });
      
      // All trainings require approval by default
      toast({
        title: "Training Submitted!",
        description: `You scored ${finalScore}%! Your training has been submitted for leader review.`,
      });
    } else if (!isRevisitMode) {
      toast({
        title: "Keep Learning",
        description: `You scored ${finalScore}%. Review the material and try again (70% needed to pass).`,
        variant: "destructive",
      });
    }
  };

  const handleComplete = () => {
    if (!isRevisitMode) {
      updateProgress.mutate({
        moduleId: moduleId!,
        status: 'completed',
        progressPercent: 100,
      });
      
      // All trainings require approval by default
      toast({
        title: "Training Submitted!",
        description: "Your training has been submitted for leader review. You'll be notified once approved.",
      });
    }
    setLocation("/trainings");
  };

  const handleRetryQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setCurrentStep('assessment');
  };

  const handleStartRevisit = () => {
    setIsRevisitMode(true);
    setCurrentStep('lesson');
    setCurrentLessonIndex(0);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizScore(0);
  };

  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Training Hub
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Training Not Found</p>
            <p className="text-muted-foreground">This training module doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StepIndicator = () => {
    const steps = isDeepTraining 
      ? [
          { id: 'lesson', label: `Lessons (${safeLessonIndex + 1}/${lessons.length})`, icon: BookOpen },
          ...(hasKnowledgeCheck ? [{ id: 'knowledge-check', label: 'Check', icon: HelpCircle }] : []),
          ...(hasIntensiveAssessment ? [{ id: 'assessment', label: 'Assessment', icon: ClipboardCheck }] : []),
        ]
      : [
          { id: 'lesson', label: 'Lesson', icon: BookOpen },
          ...(hasStudyQuestions ? [{ id: 'study', label: 'Reflect', icon: HelpCircle }] : []),
          ...(hasAssessment ? [{ id: 'assessment', label: 'Quiz', icon: ClipboardCheck }] : []),
        ];

    return (
      <div className="flex items-center justify-center gap-2 mb-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isPast = steps.findIndex(s => s.id === currentStep) > index;
          const isResults = currentStep === 'results';
          
          return (
            <div key={step.id} className="flex items-center">
              {index > 0 && (
                <div className={`w-8 h-0.5 mx-1 ${isPast || isResults ? 'bg-primary' : 'bg-muted'}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isPast || isResults ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {isPast || isResults ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs ${isActive ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isSubmitted && !isRevisitMode && currentStep === 'lesson') {
    const ministryName = getMinistryName(module.ministryId);
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Training Hub
        </Button>

        <CoachBubble
          id="training-submitted"
          title="Submitted for Review"
          message="Passing the quiz submits it for leader review. Completion happens after approval."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <CardTitle>{module.title}</CardTitle>
            </div>
            <CardDescription>
              {ministryName 
                ? `Awaiting review by ${ministryName} Leader`
                : 'Awaiting leader approval'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mt-4">Submitted for Approval</h2>
              <p className="text-muted-foreground mt-2">
                {currentProgress?.assessmentScore !== undefined 
                  ? `You scored ${currentProgress.assessmentScore}% on the assessment`
                  : 'You have finished this training'}
              </p>
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                Your training completion has been submitted for{ministryName ? ` ${ministryName}` : ''} leader review. 
                You'll receive a notification once approved.
                {nextTraining && (
                  <span className="block mt-2 font-medium text-primary">
                    You can continue to the next training while waiting!
                  </span>
                )}
              </p>
              {currentProgress?.submittedAt && (
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted on {new Date(currentProgress.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center flex-wrap">
            {nextTraining && (
              <Button 
                onClick={() => setLocation(`/trainings/${nextTraining.id}`)} 
                data-testid="button-continue-next-training"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Continue to Next Training
              </Button>
            )}
            <Button variant="outline" onClick={handleStartRevisit} data-testid="button-revisit-submitted">
              <Eye className="w-4 h-4 mr-2" />
              Review Training
            </Button>
            <Button variant="outline" onClick={() => setLocation("/trainings")} data-testid="button-back-hub-submitted">
              Back to Training Hub
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isRejected && !isRevisitMode && currentStep === 'lesson') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Training Hub
        </Button>

        <CoachBubble
          id="training-rejected"
          title="Needs Follow-Up"
          message="Review the notes and resubmit when ready."
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle>{module.title}</CardTitle>
            </div>
            <CardDescription>
              Needs revision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mt-4">Revision Requested</h2>
              {currentProgress?.rejectionFeedback && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Leader Feedback:</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{currentProgress.rejectionFeedback}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                Please review the training material and resubmit. Your leader will be notified when you complete it again.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button onClick={handleStartRevisit} data-testid="button-retry-rejected">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Training
            </Button>
            <Button variant="outline" onClick={() => setLocation("/trainings")} data-testid="button-back-hub-rejected">
              Back to Training Hub
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isCompleted && !isRevisitMode && currentStep === 'lesson') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Training Hub
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <CardTitle>{module.title}</CardTitle>
            </div>
            <CardDescription>
              You've {currentProgress?.status === 'approved' ? 'been approved for' : 'completed'} this training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <Award className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mt-4">
                {currentProgress?.status === 'approved' ? 'Training Approved!' : 'Training Completed'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {currentProgress?.assessmentScore !== undefined 
                  ? `You scored ${currentProgress.assessmentScore}% on the assessment`
                  : 'You have successfully completed this training'}
              </p>
              {currentProgress?.approvedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Approved on {new Date(currentProgress.approvedAt).toLocaleDateString()}
                </p>
              )}
              {currentProgress?.completedAt && !currentProgress?.approvedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Completed on {new Date(currentProgress.completedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleStartRevisit} data-testid="button-revisit">
              <Eye className="w-4 h-4 mr-2" />
              Review Training
            </Button>
            {hasAssessment && (
              <Button variant="outline" onClick={() => { setIsRevisitMode(true); setCurrentStep('assessment'); setCurrentQuestion(0); setAnswers({}); }} data-testid="button-retake">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake Quiz
              </Button>
            )}
            <Button onClick={() => setLocation("/trainings")} data-testid="button-back-hub">
              Back to Training Hub
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (currentStep === 'results') {
    const passed = quizScore >= 70;
    const questions = hasIntensiveAssessment ? module.intensiveAssessmentQuestions || [] : assessments;
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Training Hub
        </Button>

        <Card>
          <CardHeader>
            <StepIndicator />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                {passed ? (
                  <Award className="w-10 h-10 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <h2 className="text-2xl font-bold mt-4">
                {passed ? "Congratulations!" : "Keep Learning"}
              </h2>
              <p className="text-lg text-muted-foreground">
                You scored {quizScore}% on the {hasIntensiveAssessment ? 'intensive assessment' : 'quiz'}
              </p>
              <Progress value={quizScore} className="h-3 w-64 mx-auto mt-4" />
              <p className="text-sm text-muted-foreground mt-2">
                {passed 
                  ? (module?.requiresApproval !== false 
                    ? "Submitted for leader review" 
                    : "You've passed this training!") 
                  : "70% required to pass"}
              </p>
              {isRevisitMode && (
                <Badge variant="secondary" className="mt-2">Review Mode</Badge>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Your Answers:</h3>
              {hasIntensiveAssessment ? (
                (module.intensiveAssessmentQuestions || []).map((q, index) => {
                  const userAnswer = answers[index];
                  const isCorrect = userAnswer === q.correctAnswer || 
                                    (q.options && q.options.indexOf(userAnswer) === q.options.indexOf(q.correctAnswer));
                  return (
                    <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}>
                      {q.scenario && (
                        <p className="text-sm text-muted-foreground mb-2 italic">{q.scenario}</p>
                      )}
                      <p className="font-medium text-sm">{index + 1}. {q.question}</p>
                      <p className="text-sm mt-1">
                        Your answer: {userAnswer} {isCorrect ? <CheckCircle className="w-4 h-4 inline text-green-600" /> : <AlertCircle className="w-4 h-4 inline text-red-600" />}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Correct: {q.correctAnswer}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                assessments.map((assessment, index) => {
                  const userAnswer = parseInt(answers[index] || "-1");
                  const isCorrect = userAnswer === assessment.correctAnswer;
                  return (
                    <div key={assessment.id} className={`p-3 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}>
                      <p className="font-medium text-sm">{index + 1}. {assessment.question}</p>
                      <p className="text-sm mt-1">
                        Your answer: {assessment.options[userAnswer]} {isCorrect ? <CheckCircle className="w-4 h-4 inline text-green-600" /> : <AlertCircle className="w-4 h-4 inline text-red-600" />}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Correct: {assessment.options[assessment.correctAnswer]}
                        </p>
                      )}
                      {assessment.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{assessment.explanation}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button 
              variant={passed ? "outline" : "default"}
              onClick={handleRetryQuiz} 
              data-testid="button-retry-quiz"
            >
              {passed ? "Retake Quiz" : "Try Again"}
            </Button>
            <Button 
              variant={passed ? "default" : "outline"} 
              onClick={() => setLocation("/trainings")}
              data-testid="button-back-to-hub"
            >
              Back to Training Hub
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (currentStep === 'assessment' || currentStep === 'knowledge-check') {
    const isKnowledgeCheck = currentStep === 'knowledge-check';
    const questions = isKnowledgeCheck 
      ? (module?.knowledgeCheckQuestions || []) 
      : (hasIntensiveAssessment ? (module?.intensiveAssessmentQuestions || []) : assessments);
    
    const question = questions[currentQuestion];
    if (!question) return null;
    
    const isIntensiveQuestion = hasIntensiveAssessment && !isKnowledgeCheck;
    const intensiveQ = isIntensiveQuestion ? question as IntensiveAssessmentQuestion : null;
    const legacyQ = !isIntensiveQuestion && !isKnowledgeCheck ? question as Assessment : null;
    const kcQ = isKnowledgeCheck ? question as KnowledgeCheckQuestion : null;
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handlePrevStep} data-testid="button-back-content">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <StepIndicator />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="secondary">
                Question {currentQuestion + 1} of {questions.length}
              </Badge>
              <span className="text-sm text-muted-foreground">{module.title}</span>
            </div>
            <Progress value={(currentQuestion / questions.length) * 100} className="h-2 mt-3" />
            {isRevisitMode && (
              <Badge variant="outline" className="w-fit">Review Mode</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {intensiveQ?.scenario && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Scenario
                </h4>
                <p className="text-sm">{intensiveQ.scenario}</p>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold mb-6">
                {intensiveQ?.question || legacyQ?.question || kcQ?.question}
              </h2>
              <RadioGroup
                value={answers[currentQuestion] || ""}
                onValueChange={(value) => handleAnswerSelect(value)}
                className="space-y-3"
              >
                {(intensiveQ?.options || legacyQ?.options || kcQ?.options || []).map((option, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      answers[currentQuestion] === (legacyQ ? index.toString() : option)
                        ? 'border-primary bg-primary/5' 
                        : 'hover-elevate'
                    }`}
                    onClick={() => handleAnswerSelect(legacyQ ? index.toString() : option)}
                    data-testid={`option-${index}`}
                  >
                    <RadioGroupItem value={legacyQ ? index.toString() : option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              data-testid="button-prev-question"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNextQuestion}
              disabled={answers[currentQuestion] === undefined}
              data-testid="button-next-question"
            >
              {currentQuestion === questions.length - 1 ? "Submit" : "Next"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (currentStep === 'study') {
    const studyQuestions = module.studyQuestions || [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handlePrevStep} data-testid="button-back-lesson">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Lesson
        </Button>

        <Card>
          <CardHeader>
            <StepIndicator />
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Reflection Questions
            </CardTitle>
            <CardDescription>
              Take a moment to think about what you've learned
            </CardDescription>
            {isRevisitMode && (
              <Badge variant="outline" className="w-fit">Review Mode</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {studyQuestions.map((sq, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg border bg-muted/30"
                  data-testid={`study-question-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{sq.question}</p>
                      {sq.guidance && (
                        <p className="text-sm text-muted-foreground mt-2 italic">{sq.guidance}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                These questions are for personal reflection. Take time to consider each one before moving on.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrevStep} data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Lesson
            </Button>
            <Button onClick={handleNextStep} data-testid="button-continue">
              {hasKnowledgeCheck ? "Knowledge Check" : hasAssessment ? "Start Quiz" : "Submit for Review"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Deep training view: render when isDeepTraining is true and lessons exist
  // safeLessonIndex guarantees lesson is valid when lessons.length > 0
  if (isDeepTraining && lessons.length > 0) {
    // Derive non-null lesson inside this block - safeLessonIndex is always valid
    const lesson = lessons[safeLessonIndex];
    
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={safeLessonIndex === 0 ? () => setLocation("/trainings") : handlePrevLesson} 
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {safeLessonIndex === 0 ? 'Back to Training Hub' : 'Previous Lesson'}
        </Button>

        <Card>
          <CardHeader>
            <StepIndicator />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span className="font-medium">{module.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {module.isRequired && <Badge variant="secondary">Required</Badge>}
                {isRevisitMode && <Badge variant="outline">Review</Badge>}
              </div>
            </div>
            <Progress value={calculateProgress()} className="h-2 mt-3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                {lesson.lessonNumber}
              </div>
              <div>
                <h2 className="text-xl font-bold">{lesson.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Lesson {safeLessonIndex + 1} of {lessons.length}
                </p>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              {lesson.teachingContent.split('\n').map((paragraph, i) => (
                paragraph.trim() && <p key={i} className="mb-4">{paragraph}</p>
              ))}
            </div>

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Why This Matters
              </h4>
              <p className="text-sm">{lesson.whyThisMatters}</p>
            </div>

            {lesson.scriptureReferences && lesson.scriptureReferences.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Scripture References
                </h4>
                <div className="flex flex-wrap gap-2">
                  {lesson.scriptureReferences.map((ref, i) => (
                    <Badge key={i} variant="secondary">{ref}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Reflect
              </h4>
              <p className="text-sm italic">{lesson.reflectionPrompt}</p>
              <Textarea 
                placeholder="Write your thoughts here (optional)..."
                className="mt-3"
                value={reflectionNotes[safeLessonIndex] || ''}
                onChange={(e) => setReflectionNotes({ ...reflectionNotes, [safeLessonIndex]: e.target.value })}
                data-testid="input-reflection"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handlePrevLesson}
              disabled={safeLessonIndex === 0}
              data-testid="button-prev-lesson"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Lesson
            </Button>
            <Button onClick={handleNextLesson} data-testid="button-next-lesson">
              {safeLessonIndex === lessons.length - 1 
                ? (hasKnowledgeCheck ? "Knowledge Check" : hasIntensiveAssessment ? "Assessment" : "Submit for Review")
                : "Next Lesson"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const sections = module.contentSections || [];
  const lessonContent = module.lessonSummary || module.description || "";

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setLocation("/trainings")} data-testid="button-back-training">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to Training Hub
      </Button>

      <Card>
        <CardHeader>
          <StepIndicator />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-medium">{module.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {module.isRequired && <Badge variant="secondary">Required</Badge>}
              {isRevisitMode && <Badge variant="outline">Review</Badge>}
            </div>
          </div>
          <Progress value={calculateProgress()} className="h-2 mt-3" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lesson Overview
            </h2>
            
            {lessonContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {lessonContent.split('\n').map((paragraph, i) => (
                  paragraph.trim() && <p key={i} className="mb-3">{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {module.description || "This training module will help you learn important concepts for your ministry role."}
              </p>
            )}
          </div>

          {module.videoUrl && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                Training Video
              </h3>
              <div className="aspect-video w-full rounded-lg overflow-hidden border bg-muted">
                {module.videoUrl.includes('youtube.com') || module.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={module.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Training video"
                    data-testid="video-iframe-youtube"
                  />
                ) : module.videoUrl.includes('vimeo.com') ? (
                  <iframe
                    src={module.videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Training video"
                    data-testid="video-iframe-vimeo"
                  />
                ) : (
                  <video
                    src={module.videoUrl}
                    controls
                    className="w-full h-full"
                    data-testid="video-player"
                  />
                )}
              </div>
            </div>
          )}

          {sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {section.title}
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {section.content.split('\n').map((paragraph, i) => (
                      paragraph.trim() && <p key={i} className="mb-2">{paragraph}</p>
                    ))}
                  </div>
                  {section.keyPoints && section.keyPoints.length > 0 && (
                    <div className="bg-primary/5 p-3 rounded-lg mt-3">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Key Points
                      </h4>
                      <ul className="space-y-1">
                        {section.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Circle className="w-2 h-2 mt-1.5 text-primary fill-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {hasStudyQuestions 
                ? "When you're ready, continue to reflection questions to think about what you've learned."
                : hasKnowledgeCheck
                  ? "When you're ready, continue to the knowledge check."
                  : hasAssessment 
                    ? "When you're ready, continue to the quiz to test your understanding."
                    : "When you're ready, submit this training for leader review."
              }
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleNextStep} data-testid="button-next-step">
            {hasStudyQuestions ? "Continue to Reflection" : hasKnowledgeCheck ? "Knowledge Check" : hasAssessment ? "Start Quiz" : "Submit for Review"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
