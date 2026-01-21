import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  AlertTriangle,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  sortOrder: number;
}

interface QuizAttempt {
  id: string;
  userId: string;
  trainingId?: string;
  manualId?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  completedAt: string;
}

interface TrainingQuizProps {
  trainingId?: string;
  manualId?: string;
  quizCategory?: string;
  title: string;
  onComplete?: (passed: boolean, score: number) => void;
  onClose?: () => void;
}

const PASS_THRESHOLD = 80;

export function TrainingQuiz({ 
  trainingId, 
  manualId, 
  quizCategory, 
  title, 
  onComplete,
  onClose 
}: TrainingQuizProps) {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  const { data: questions = [], isLoading: questionsLoading } = useQuery<QuizQuestion[]>({
    queryKey: ["/api/quiz/questions", { trainingId, manualId, category: quizCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trainingId) params.append('trainingId', trainingId);
      if (manualId) params.append('manualId', manualId);
      if (quizCategory) params.append('category', quizCategory);
      const res = await fetch(`/api/quiz/questions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      return res.json();
    },
  });

  const { data: attempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ["/api/quiz/attempts", { trainingId, manualId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trainingId) params.append('trainingId', trainingId);
      if (manualId) params.append('manualId', manualId);
      const res = await fetch(`/api/quiz/attempts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch attempts');
      return res.json();
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: Record<string, string>): Promise<QuizAttempt> => {
      const response = await apiRequest("POST", "/api/quiz/submit", {
        trainingId,
        manualId,
        quizCategory,
        answers: quizAnswers,
      });
      return response.json();
    },
    onSuccess: (data: QuizAttempt) => {
      setLastAttempt(data);
      setShowResults(true);
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/quiz/attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-steps"] });
      
      if (data.passed) {
        toast({
          title: "Quiz Passed!",
          description: `Congratulations! You scored ${data.percentage}%.`,
        });
        onComplete?.(true, data.percentage);
      } else {
        toast({
          title: "Quiz Not Passed",
          description: `You scored ${data.percentage}%. You need ${PASS_THRESHOLD}% to pass. You can retake the quiz.`,
          variant: "destructive",
        });
        onComplete?.(false, data.percentage);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sortedQuestions = useMemo(() => 
    [...questions].sort((a, b) => a.sortOrder - b.sortOrder),
    [questions]
  );

  const currentQuestion = sortedQuestions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / sortedQuestions.length) * 100;
  const allAnswered = sortedQuestions.every(q => answers[q.id]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    submitQuizMutation.mutate(answers);
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setShowResults(false);
    setLastAttempt(null);
  };

  const bestAttempt = useMemo(() => {
    if (attempts.length === 0) return null;
    return attempts.reduce((best, current) => 
      (current.percentage > best.percentage) ? current : best, attempts[0]
    );
  }, [attempts]);

  if (questionsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (sortedQuestions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <HelpCircle className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No Quiz Available</p>
          <p className="text-sm">There are no quiz questions for this training yet.</p>
          {onClose && (
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showResults && lastAttempt) {
    const correctCount = lastAttempt.score;
    const totalCount = lastAttempt.totalQuestions;
    const percentage = lastAttempt.percentage;
    const passed = lastAttempt.passed;

    return (
      <Card>
        <CardHeader className="text-center">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {passed ? (
              <Trophy className="w-10 h-10 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <CardTitle className="text-2xl mt-4">
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </CardTitle>
          <CardDescription>
            {passed 
              ? `You passed the ${title} quiz!`
              : `You need ${PASS_THRESHOLD}% to pass. Don't give up!`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-primary">{percentage}%</p>
            <p className="text-muted-foreground mt-1">
              {correctCount} of {totalCount} correct
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Question Summary</h4>
            <div className="grid gap-2">
              {sortedQuestions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                return (
                  <div 
                    key={question.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect 
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' 
                        : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Q{index + 1}: {question.questionText}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Correct answer: {question.correctAnswer}
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {attempts.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Your Attempts: {attempts.length}</p>
              {bestAttempt && (
                <p className="text-xs text-muted-foreground">
                  Best score: {bestAttempt.percentage}%
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          {!passed && (
            <Button onClick={handleRetake}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake Quiz
            </Button>
          )}
          {passed && onClose && (
            <Button onClick={onClose}>
              Continue
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title} Quiz</CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {sortedQuestions.length}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {PASS_THRESHOLD}% to pass
          </Badge>
        </div>
        <Progress value={progressPercent} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{currentQuestion.questionText}</h3>
          
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
            className="space-y-3"
            data-testid={`quiz-question-${currentQuestionIndex}`}
          >
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-lg border hover-elevate cursor-pointer transition-all ${
                  answers[currentQuestion.id] === option
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => handleAnswer(currentQuestion.id, option)}
              >
                <RadioGroupItem 
                  value={option} 
                  id={`option-${index}`}
                  data-testid={`quiz-option-${index}`}
                />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {sortedQuestions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                index === currentQuestionIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id]
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
              }`}
              data-testid={`quiz-nav-${index}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          data-testid="button-quiz-previous"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        {currentQuestionIndex === sortedQuestions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitQuizMutation.isPending}
            data-testid="button-quiz-submit"
          >
            {submitQuizMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            data-testid="button-quiz-next"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
