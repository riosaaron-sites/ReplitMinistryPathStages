import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

interface SurveyNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isSaving?: boolean;
}

export function SurveyNavigation({
  onPrevious,
  onNext,
  onSave,
  canGoBack,
  canGoNext,
  isFirstQuestion,
  isLastQuestion,
  isSaving,
}: SurveyNavigationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
      <div className="flex gap-2">
        {!isFirstQuestion && (
          <Button
            variant="ghost"
            onClick={onPrevious}
            disabled={!canGoBack}
            className="gap-2"
            data-testid="button-previous"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isSaving}
          className="gap-2"
          data-testid="button-save-progress"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Progress"}
        </Button>

        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-2"
          data-testid="button-next"
        >
          {isLastQuestion ? "View Results" : "Next"}
          {!isLastQuestion && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
