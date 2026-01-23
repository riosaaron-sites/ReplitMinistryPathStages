import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Download,
  ExternalLink,
  Bug,
  List,
} from "lucide-react";
import { CoachBubble } from "@/components/CoachBubble";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

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

interface Manual {
  id: string;
  title: string;
  fileUrl: string;
  category?: string;
}

interface TrainingModule {
  id: string;
  ministryId?: string;
  manualId?: string;
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

interface User {
  id: string;
  role?: string;
  username?: string;
}

type TrainingStep = 'lesson' | 'study' | 'knowledge-check' | 'assessment' | 'results' | 'submit';

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
  const [finalReflection, setFinalReflection] = useState('');
  const [isRevisitMode, setIsRevisitMode] = useState(false);
  const [visitedLessons, setVisitedLessons] = useState<Set<number>>(new Set([0]));
  const [showDebug, setShowDebug] = useState(false);

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: module, isLoading: moduleLoading } = useQuery<TrainingModule>({
    queryKey: [`/api/training/modules/${moduleId}`],
    enabled: !!moduleId,
  });

  const { data: progress } = useQuery<UserTrainingProgress[]>({
    queryKey: ["/api/training/progress"],
  });

  const { data: allModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: manual } = useQuery<Manual>({
    queryKey: ["/api/manuals", module?.manualId],
    enabled: !!module?.manualId,
  });

  const isAdminOrLeader = currentUser?.role && ['owner', 'admin', 'system-admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(currentUser.role);

  const getMinistryName = (ministryId?: string): string | null => {
    if (!ministryId) return null;
    const ministry = ministries.find(m => m.id === ministryId);
    return ministry?.name || null;
  };

  const findNextTraining = (): TrainingModule | null => {
    if (!module) return null;
    
    const relevantModules = allModules.filter(m => {
      if (module.ministryId) {
        return m.ministryId === module.ministryId;
      }
      return !m.ministryId;
    });
    
    const sortedModules = [...relevantModules].sort((a, b) => 
      (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    
    const currentIndex = sortedModules.findIndex(m => m.id === module.id);
    if (currentIndex >= 0 && currentIndex < sortedModules.length - 1) {
      const nextModule = sortedModules[currentIndex + 1];
      const nextProgress = progress?.find(p => p.moduleId === nextModule.id);
      if (!nextProgress || (nextProgress.status !== 'completed' && nextProgress.status !== 'approved')) {
        return nextModule;
      }
    }
    return null;
  };

  const nextTraining = findNextTraining();

  const updateProgress = useMutation({
    mutationFn: async (data: { moduleId: string; status: string; progressPercent?: number; assessmentScore?: number; finalReflection?: string }) => {
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
  
  const parsedLessons: DeepLesson[] = useMemo(() => {
    if (!module?.lessons) return [];
    if (typeof module.lessons === 'string') {
      try {
        const parsed = JSON.parse(module.lessons);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(module.lessons)) {
      return module.lessons;
    }
    return [];
  }, [module?.lessons]);
  
  const hasDeepLessons = parsedLessons.length > 0;
  const lessons = parsedLessons;
  
  const safeLessonIndex = useMemo(() => {
    if (typeof currentLessonIndex === "number" && currentLessonIndex >= 0 && currentLessonIndex < lessons.length) {
      return currentLessonIndex;
    }
    return 0;
  }, [currentLessonIndex, lessons.length]);
  
  const currentLesson = lessons.length > 0 ? lessons[safeLessonIndex] : null;
  
  const hasLegacyLesson = !!(module?.lessonSummary || (module?.contentSections && module.contentSections.length > 0));
  const hasStudyQuestions = !!(module?.studyQuestions && module.studyQuestions.length > 0);
  const hasKnowledgeCheck = !!(module?.knowledgeCheckQuestions && module.knowledgeCheckQuestions.length > 0);
  const hasIntensiveAssessment = !!(module?.intensiveAssessmentQuestions && module.intensiveAssessmentQuestions.length > 0);
  const assessments = module?.assessments || [];
  const hasAssessment = assessments.length > 0 || hasIntensiveAssessment || hasKnowledgeCheck;
  const hasManual = !!(manual && manual.fileUrl);
  const hasVideo = !!module?.videoUrl;

  const allLessonsVisited = lessons.length === 0 || visitedLessons.size >= lessons.length;
  const quizAttempted = Object.keys(answers).length > 0 || quizScore > 0;
  
  // Reflection word count validation (minimum 10 words)
  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const reflectionWordCount = getWordCount(finalReflection);
  const isReflectionValid = reflectionWordCount >= 10;
  
  const canSubmit = hasDeepLessons 
    ? (allLessonsVisited && (!hasAssessment || quizAttempted) && isReflectionValid) 
    : isReflectionValid;

  useEffect(() => {
    setCurrentStep('lesson');
    setCurrentLessonIndex(0);
    setCurrentQuestion(0);
    setAnswers({});
    setQuizScore(0);
    setReflectionNotes({});
    setIsRevisitMode(false);
    setVisitedLessons(new Set([0]));
  }, [moduleId]);

  useEffect(() => {
    if (moduleId && !currentProgress) {
      updateProgress.mutate({
        moduleId,
        status: 'in-progress',
        progressPercent: 0,
      });
    }
  }, [moduleId, currentProgress]);

  useEffect(() => {
    if (lessons.length > 0 && currentLessonIndex >= 0) {
      setVisitedLessons(prev => {
        const arr = Array.from(prev);
        arr.push(currentLessonIndex);
        return new Set(arr);
      });
    }
  }, [currentLessonIndex, lessons.length]);

  const calculateProgress = (): number => {
    if (hasDeepLessons) {
      const totalLessons = lessons.length || 1;
      const quizWeight = hasAssessment ? 20 : 0;
      const lessonsWeight = 100 - quizWeight;
      
      if (currentStep === 'lesson') {
        return Math.round(((safeLessonIndex + 1) / totalLessons) * lessonsWeight);
      }
      if (currentStep === 'study') {
        return Math.round(lessonsWeight + 5);
      }
      if (currentStep === 'knowledge-check' || currentStep === 'assessment') {
        const questions = currentStep === 'knowledge-check' 
          ? module?.knowledgeCheckQuestions?.length || 1
          : (hasIntensiveAssessment ? module?.intensiveAssessmentQuestions?.length : assessments.length) || 1;
        return Math.round(lessonsWeight + ((currentQuestion + 1) / questions) * quizWeight);
      }
      if (currentStep === 'results' || currentStep === 'submit') return 100;
      return 0;
    }
    return currentStep === 'lesson' ? 50 : currentStep === 'results' ? 100 : 75;
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextIndex = currentLessonIndex + 1;
      setCurrentLessonIndex(nextIndex);
      
      if (!isRevisitMode) {
        const totalLessons = lessons.length;
        const progressPct = Math.round(((nextIndex + 1) / totalLessons) * (hasAssessment ? 80 : 100));
        updateProgress.mutate({
          moduleId: moduleId!,
          status: 'in-progress',
          progressPercent: progressPct,
        });
      }
    } else {
      if (hasStudyQuestions) {
        setCurrentStep('study');
      } else if (hasKnowledgeCheck) {
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
        setAnswers({});
      } else if (hasIntensiveAssessment || assessments.length > 0) {
        setCurrentStep('assessment');
        setCurrentQuestion(0);
        setAnswers({});
      } else {
        setCurrentStep('submit');
      }
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleLessonSelect = (lessonIndex: string) => {
    const index = parseInt(lessonIndex, 10);
    if (!isNaN(index) && index >= 0 && index < lessons.length) {
      setCurrentLessonIndex(index);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'lesson' && !hasDeepLessons) {
      if (hasStudyQuestions) {
        setCurrentStep('study');
      } else if (hasKnowledgeCheck) {
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
      } else if (hasAssessment) {
        setCurrentStep('assessment');
        setCurrentQuestion(0);
      } else {
        handleSubmitTraining();
      }
    } else if (currentStep === 'study') {
      if (hasKnowledgeCheck) {
        setCurrentStep('knowledge-check');
        setCurrentQuestion(0);
      } else if (hasIntensiveAssessment || assessments.length > 0) {
        setCurrentStep('assessment');
        setCurrentQuestion(0);
      } else {
        setCurrentStep('submit');
      }
    } else if (currentStep === 'knowledge-check') {
      if (hasIntensiveAssessment) {
        setCurrentStep('assessment');
        setCurrentQuestion(0);
        setAnswers({});
      } else {
        setCurrentStep('submit');
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'study') {
      setCurrentStep('lesson');
      if (hasDeepLessons) setCurrentLessonIndex(lessons.length - 1);
    } else if (currentStep === 'knowledge-check') {
      if (hasStudyQuestions) {
        setCurrentStep('study');
      } else {
        setCurrentStep('lesson');
        if (hasDeepLessons) setCurrentLessonIndex(lessons.length - 1);
      }
    } else if (currentStep === 'assessment') {
      if (hasKnowledgeCheck) {
        setCurrentStep('knowledge-check');
        setCurrentQuestion((module?.knowledgeCheckQuestions?.length || 1) - 1);
      } else if (hasStudyQuestions) {
        setCurrentStep('study');
      } else {
        setCurrentStep('lesson');
        if (hasDeepLessons) setCurrentLessonIndex(lessons.length - 1);
      }
    } else if (currentStep === 'submit') {
      if (hasAssessment) {
        setCurrentStep('results');
      } else if (hasStudyQuestions) {
        setCurrentStep('study');
      } else {
        setCurrentStep('lesson');
        if (hasDeepLessons) setCurrentLessonIndex(lessons.length - 1);
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
  };

  const handleSubmitTraining = () => {
    if (!isRevisitMode) {
      updateProgress.mutate({
        moduleId: moduleId!,
        status: 'completed',
        progressPercent: 100,
        assessmentScore: quizScore || undefined,
        finalReflection: finalReflection.trim(),
      });
      
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
    setVisitedLessons(new Set([0]));
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

  const DebugPanel = () => {
    if (!isAdminOrLeader) return null;
    
    return (
      <div className="mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
          className="text-muted-foreground text-xs"
          data-testid="button-toggle-debug"
        >
          <Bug className="w-3 h-3 mr-1" />
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </Button>
        {showDebug && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs font-mono space-y-1 border" data-testid="debug-panel">
            <div><strong>moduleId:</strong> {moduleId}</div>
            <div><strong>manualId:</strong> {module?.manualId || 'null'}</div>
            <div><strong>lessons.length:</strong> {lessons.length}</div>
            <div><strong>hasDeepLessons:</strong> {hasDeepLessons.toString()}</div>
            <div><strong>studyQuestions:</strong> {module?.studyQuestions?.length || 0}</div>
            <div><strong>knowledgeCheckQuestions:</strong> {module?.knowledgeCheckQuestions?.length || 0}</div>
            <div><strong>assessments:</strong> {assessments.length}</div>
            <div><strong>currentStep:</strong> {currentStep}</div>
            <div><strong>currentLessonIndex:</strong> {safeLessonIndex}</div>
            <div><strong>visitedLessons:</strong> {Array.from(visitedLessons).join(', ')}</div>
            <div><strong>allLessonsVisited:</strong> {allLessonsVisited.toString()}</div>
            <div><strong>canSubmit:</strong> {canSubmit.toString()}</div>
            <div><strong>isRevisitMode:</strong> {isRevisitMode.toString()}</div>
          </div>
        )}
      </div>
    );
  };

  const ManualAccessButtons = () => {
    if (!hasManual) return null;
    
    return (
      <div className="flex gap-2 flex-wrap" data-testid="manual-buttons">
        <Button
          variant="outline"
          size="sm"
          asChild
          data-testid="button-view-manual"
        >
          <a href={manual!.fileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Manual PDF
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          data-testid="button-download-manual"
        >
          <a href={manual!.fileUrl} download>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </a>
        </Button>
      </div>
    );
  };

  const LessonNavigation = () => {
    if (!hasDeepLessons || lessons.length <= 1) return null;
    
    return (
      <div className="flex items-center gap-3 flex-wrap" data-testid="lesson-navigation">
        <Select value={safeLessonIndex.toString()} onValueChange={handleLessonSelect}>
          <SelectTrigger className="w-[200px]" data-testid="lesson-select">
            <SelectValue placeholder="Select lesson" />
          </SelectTrigger>
          <SelectContent>
            {lessons.map((lesson, idx) => (
              <SelectItem key={lesson.id || idx} value={idx.toString()} data-testid={`lesson-option-${idx}`}>
                <span className="flex items-center gap-2">
                  {visitedLessons.has(idx) && <CheckCircle className="w-3 h-3 text-green-500" />}
                  Lesson {idx + 1}: {lesson.title?.substring(0, 25)}...
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" data-testid="lesson-counter">
          Lesson {safeLessonIndex + 1} of {lessons.length}
        </span>
      </div>
    );
  };

  const StepIndicator = () => {
    const steps = hasDeepLessons 
      ? [
          { id: 'lesson', label: `Lessons (${safeLessonIndex + 1}/${lessons.length})`, icon: BookOpen },
          ...(hasStudyQuestions ? [{ id: 'study', label: 'Reflect', icon: HelpCircle }] : []),
          ...(hasKnowledgeCheck ? [{ id: 'knowledge-check', label: 'Check', icon: HelpCircle }] : []),
          ...(hasIntensiveAssessment || assessments.length > 0 ? [{ id: 'assessment', label: 'Quiz', icon: ClipboardCheck }] : []),
          { id: 'submit', label: 'Submit', icon: CheckCircle },
        ]
      : [
          { id: 'lesson', label: 'Lesson', icon: BookOpen },
          ...(hasStudyQuestions ? [{ id: 'study', label: 'Reflect', icon: HelpCircle }] : []),
          ...(hasAssessment ? [{ id: 'assessment', label: 'Quiz', icon: ClipboardCheck }] : []),
        ];

    return (
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep || (step.id === 'submit' && currentStep === 'results');
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
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
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
              {currentProgress?.submittedAt && (
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted on {new Date(currentProgress.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <ManualAccessButtons />
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
          </CardFooter>
        </Card>
        <DebugPanel />
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle>{module.title}</CardTitle>
            </div>
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
            </div>
            <ManualAccessButtons />
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button onClick={handleStartRevisit} data-testid="button-retry-rejected">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Training
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
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
            </div>
            <ManualAccessButtons />
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
        <DebugPanel />
      </div>
    );
  }

  if (currentStep === 'results') {
    const passed = quizScore >= 70;
    const questions = hasIntensiveAssessment ? module.intensiveAssessmentQuestions || [] : assessments;
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handlePrevStep} data-testid="button-back-content">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
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
                {passed ? "Quiz passed! Continue to submit for leader review." : "70% required to pass"}
              </p>
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
                      <p className="font-medium text-sm">{index + 1}. {q.question}</p>
                      <p className="text-sm mt-1">
                        Your answer: {userAnswer} {isCorrect ? <CheckCircle className="w-4 h-4 inline text-green-600" /> : <AlertCircle className="w-4 h-4 inline text-red-600" />}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-muted-foreground mt-1">Correct: {q.correctAnswer}</p>
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
                        <p className="text-sm text-muted-foreground mt-1">Correct: {assessment.options[assessment.correctAnswer]}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center flex-wrap">
            {!passed && (
              <Button onClick={handleRetryQuiz} data-testid="button-retry-quiz">
                Try Again
              </Button>
            )}
            {passed && (
              <Button onClick={() => setCurrentStep('submit')} data-testid="button-continue-submit">
                Continue to Submit
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation("/trainings")} data-testid="button-back-to-hub">
              Back to Training Hub
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
      </div>
    );
  }

  if (currentStep === 'submit') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handlePrevStep} data-testid="button-back-results">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <StepIndicator />
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Ready to Submit
            </CardTitle>
            <CardDescription>
              Submit your training completion for leader review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-primary/10">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mt-4">Training Complete!</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                You've completed all the lessons{hasAssessment ? ' and passed the quiz' : ''}. 
                Submit now to request leader approval.
              </p>
              {quizScore > 0 && (
                <Badge variant="secondary" className="mt-3">Quiz Score: {quizScore}%</Badge>
              )}
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Completion Summary:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{lessons.length > 0 ? `${lessons.length} lessons completed` : 'Lesson content reviewed'}</span>
                </div>
                {hasAssessment && quizScore >= 70 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Quiz passed ({quizScore}%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Final Reflection - Required for submission */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Final Reflection
                </h4>
                <span className={`text-xs ${isReflectionValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {reflectionWordCount}/10 words minimum
                </span>
              </div>
              <Textarea
                placeholder="Share what you learned from this training. How will you apply these lessons in your ministry? What stood out to you most? (Minimum 10 words)"
                value={finalReflection}
                onChange={(e) => setFinalReflection(e.target.value)}
                className="min-h-[120px] resize-y"
                data-testid="textarea-final-reflection"
              />
              {!isReflectionValid && finalReflection.length > 0 && (
                <p className="text-xs text-destructive">
                  Please write at least 10 words to share your thoughts on this training.
                </p>
              )}
            </div>

            <ManualAccessButtons />
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button onClick={handleSubmitTraining} disabled={!canSubmit} data-testid="button-submit-training">
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit for Leader Review
            </Button>
            <Button variant="outline" onClick={() => setLocation("/trainings")} data-testid="button-cancel-submit">
              Cancel
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
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
                onValueChange={handleAnswerSelect}
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
              {currentQuestion === questions.length - 1 ? "Submit Quiz" : "Next"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
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
            
            <ManualAccessButtons />
          </CardContent>
          <CardFooter className="flex justify-between gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrevStep} data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Lesson
            </Button>
            <Button onClick={handleNextStep} data-testid="button-continue">
              {hasKnowledgeCheck ? "Knowledge Check" : hasAssessment ? "Start Quiz" : "Continue to Submit"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
      </div>
    );
  }

  if (hasDeepLessons && lessons.length > 0 && currentLesson) {
    const lesson = currentLesson;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button 
            variant="ghost" 
            onClick={safeLessonIndex === 0 ? () => setLocation("/trainings") : handlePrevLesson} 
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {safeLessonIndex === 0 ? 'Back to Training Hub' : 'Previous Lesson'}
          </Button>
          <LessonNavigation />
        </div>

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
                {lesson.lessonNumber || safeLessonIndex + 1}
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="lesson-title">{lesson.title}</h2>
                <p className="text-sm text-muted-foreground" data-testid="lesson-progress">
                  Lesson {safeLessonIndex + 1} of {lessons.length}
                </p>
              </div>
            </div>

            <div data-testid="lesson-content">
              <MarkdownRenderer content={lesson.teachingContent || ''} />
            </div>

            {lesson.whyThisMatters && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Why This Matters
                </h3>
                <p className="text-sm">{lesson.whyThisMatters}</p>
              </div>
            )}

            {lesson.scriptureReferences && lesson.scriptureReferences.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Scripture References
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.scriptureReferences.map((ref, i) => (
                    <Badge key={i} variant="outline">{ref}</Badge>
                  ))}
                </div>
              </div>
            )}

            {lesson.reflectionPrompt && (
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Reflection
                </h3>
                <p className="text-sm italic">{lesson.reflectionPrompt}</p>
              </div>
            )}

            <ManualAccessButtons />
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
                ? (hasStudyQuestions ? 'Continue to Reflection' : hasAssessment ? 'Start Quiz' : 'Continue to Submit')
                : 'Next Lesson'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
        <DebugPanel />
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
          {!lessonContent && !hasManual && !hasVideo && sections.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Training Not Generated Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                This training module doesn't have content generated yet. 
                A ministry leader can generate content from the linked manual.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Lesson Overview
                </h2>
                
                {lessonContent ? (
                  <MarkdownRenderer content={lessonContent} />
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

              <ManualAccessButtons />

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
            </>
          )}
        </CardContent>
        {(lessonContent || hasManual || hasVideo || sections.length > 0) && (
          <CardFooter className="flex justify-end">
            <Button onClick={handleNextStep} data-testid="button-next-step">
              {hasStudyQuestions ? "Continue to Reflection" : hasKnowledgeCheck ? "Knowledge Check" : hasAssessment ? "Start Quiz" : "Submit for Review"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        )}
      </Card>
      <DebugPanel />
    </div>
  );
}
