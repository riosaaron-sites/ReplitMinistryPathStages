import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LikertQuestion } from "./LikertQuestion";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { YesNoQuestion } from "./YesNoQuestion";
import type { Question, SurveyAnswers } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  answers: SurveyAnswers;
  onAnswer: (questionId: string, value: string | number) => void;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  answers,
  onAnswer,
}: QuestionCardProps) {
  const currentValue = answers[question.id];

  const renderQuestion = () => {
    switch (question.type) {
      case "likert":
        return (
          <LikertQuestion
            question={question}
            value={currentValue as number}
            onChange={(value) => onAnswer(question.id, value)}
          />
        );
      case "multiple-choice":
        return (
          <MultipleChoiceQuestion
            question={question}
            value={currentValue as string}
            onChange={(value) => onAnswer(question.id, value)}
          />
        );
      case "yes-no":
        return (
          <YesNoQuestion
            question={question}
            value={currentValue as string}
            onChange={(value) => onAnswer(question.id, value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-card-border" data-testid={`card-question-${question.id}`}>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Badge variant="secondary" className="font-mono" data-testid={`badge-question-number-${question.id}`}>
                {questionNumber} / {totalQuestions}
              </Badge>
              {question.skillVerification && (
                <Badge variant="outline" className="text-xs">
                  Skill Verification
                </Badge>
              )}
            </div>
            
            {renderQuestion()}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
