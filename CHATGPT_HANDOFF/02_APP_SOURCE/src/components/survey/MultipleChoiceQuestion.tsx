import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Question } from "@shared/schema";

interface MultipleChoiceQuestionProps {
  question: Question;
  value: string | number | undefined;
  onChange: (value: string) => void;
}

export function MultipleChoiceQuestion({ question, value, onChange }: MultipleChoiceQuestionProps) {
  const options = question.options || [];

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium leading-relaxed" data-testid={`text-question-${question.id}`}>
        {question.text}
      </p>
      
      <RadioGroup
        value={value?.toString()}
        onValueChange={onChange}
        className="grid gap-3"
        data-testid={`radio-group-${question.id}`}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center">
            <RadioGroupItem
              value={option.value.toString()}
              id={`${question.id}-${option.value}`}
              className="peer sr-only"
              data-testid={`radio-${question.id}-${option.value}`}
            />
            <Label
              htmlFor={`${question.id}-${option.value}`}
              className={cn(
                "flex-1 cursor-pointer rounded-md border-2 border-muted bg-card p-4 transition-all",
                "hover-elevate",
                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
              )}
              data-testid={`label-${question.id}-${option.value}`}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                  value?.toString() === option.value.toString()
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {value?.toString() === option.value.toString() && (
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{option.label}</span>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
