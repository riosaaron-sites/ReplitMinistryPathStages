import { Progress } from "@/components/ui/progress";
import { SURVEY_SECTIONS, getTotalQuestionCount } from "@/lib/surveyQuestions";

interface ProgressBarProps {
  currentSection: number;
  currentQuestionIndex: number;
  totalAnswered: number;
}

export function ProgressBar({ currentSection, currentQuestionIndex, totalAnswered }: ProgressBarProps) {
  const totalQuestions = getTotalQuestionCount();
  const overallProgress = Math.round((totalAnswered / totalQuestions) * 100);
  
  const currentSectionData = SURVEY_SECTIONS.find(s => s.id === currentSection);
  
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Section {currentSection + 1} of {SURVEY_SECTIONS.length}: {currentSectionData?.title}
        </span>
        <span className="font-medium text-primary" data-testid="text-progress-percentage">
          {overallProgress}% Complete
        </span>
      </div>
      
      <Progress value={overallProgress} className="h-2" data-testid="progress-bar-main" />
      
      <div className="flex gap-1">
        {SURVEY_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              section.id < currentSection
                ? "bg-primary"
                : section.id === currentSection
                ? "bg-primary/50"
                : "bg-muted"
            }`}
            data-testid={`progress-section-${section.id}`}
          />
        ))}
      </div>
      
      {overallProgress > 0 && overallProgress < 100 && (
        <p className="text-center text-sm text-muted-foreground">
          {overallProgress < 33 
            ? "You're doing great! Keep going." 
            : overallProgress < 66 
            ? "Wonderful progress! You're over halfway there." 
            : "Almost done! Just a few more questions."}
        </p>
      )}
    </div>
  );
}
