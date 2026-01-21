import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { Question } from "@shared/schema";

interface YesNoQuestionProps {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function YesNoQuestion({ question, value, onChange }: YesNoQuestionProps) {
  return (
    <div className="space-y-6">
      <p className="text-lg font-medium leading-relaxed" data-testid={`text-question-${question.id}`}>
        {question.text}
      </p>
      
      <div className="flex gap-4" data-testid={`buttons-${question.id}`}>
        <Button
          type="button"
          variant={value === "yes" ? "default" : "outline"}
          className={cn(
            "flex-1 h-14 text-base gap-2",
            value === "yes" && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={() => onChange("yes")}
          data-testid={`button-${question.id}-yes`}
        >
          <Check className="h-5 w-5" />
          Yes
        </Button>
        
        <Button
          type="button"
          variant={value === "no" ? "default" : "outline"}
          className={cn(
            "flex-1 h-14 text-base gap-2",
            value === "no" && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={() => onChange("no")}
          data-testid={`button-${question.id}-no`}
        >
          <X className="h-5 w-5" />
          No
        </Button>
      </div>
    </div>
  );
}
