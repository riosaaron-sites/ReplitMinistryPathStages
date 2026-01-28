import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Save,
  BookOpen,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Edit3,
} from "lucide-react";
import { useLocation, Link } from "wouter";

interface AgreementStep {
  id: string;
  stepNumber: number;
  title: string;
  scripture: string;
  scriptureRef: string;
  content: string;
  question: string;
  isActive?: boolean;
  isRequired?: boolean;
  version?: number;
  updatedAt?: string;
  lastEditedBy?: string;
}

export default function AgreementEditor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editedSteps, setEditedSteps] = useState<Record<number, AgreementStep>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | undefined>(undefined);

  const { data: agreementSteps, isLoading, error } = useQuery<AgreementStep[]>({
    queryKey: ["/api/agreement-content"],
  });

  useEffect(() => {
    if (agreementSteps) {
      const stepsMap: Record<number, AgreementStep> = {};
      agreementSteps.forEach(step => {
        stepsMap[step.stepNumber] = { ...step };
      });
      setEditedSteps(stepsMap);
    }
  }, [agreementSteps]);

  const saveMutation = useMutation({
    mutationFn: async (step: AgreementStep) => {
      return apiRequest("PATCH", `/api/agreement-content/${step.stepNumber}`, {
        title: step.title,
        scripture: step.scripture,
        scriptureRef: step.scriptureRef,
        content: step.content,
        question: step.question,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agreement-content"] });
      toast({
        title: "Saved",
        description: "Agreement step updated successfully.",
      });
      setHasUnsavedChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes.",
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (stepNumber: number, field: keyof AgreementStep, value: string) => {
    setEditedSteps(prev => ({
      ...prev,
      [stepNumber]: {
        ...prev[stepNumber],
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveStep = async (stepNumber: number) => {
    const step = editedSteps[stepNumber];
    if (step) {
      await saveMutation.mutateAsync(step);
    }
  };

  const handleSaveAll = async () => {
    const stepsToSave = Object.values(editedSteps);
    for (const step of stepsToSave) {
      await saveMutation.mutateAsync(step);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl" data-testid="agreement-editor-loading">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading agreement content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 max-w-4xl" data-testid="agreement-editor-error">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load agreement content. Please try again.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl" data-testid="agreement-editor-page">
      <div className="mb-6">
        <Link href="/leadership">
          <Button variant="ghost" size="sm" data-testid="button-back-leadership">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Leadership
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Faith Commitment Editor
              </CardTitle>
              <CardDescription>
                Edit the onboarding agreement content that new members see during their faith commitment process.
                Changes will be reflected immediately for all users going through onboarding.
              </CardDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="animate-pulse" data-testid="badge-unsaved-changes">
                <Edit3 className="h-3 w-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <Accordion 
        type="single" 
        collapsible 
        value={expandedStep}
        onValueChange={setExpandedStep}
        className="space-y-3"
      >
        {Object.values(editedSteps)
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .map(step => (
            <AccordionItem 
              key={step.stepNumber} 
              value={`step-${step.stepNumber}`}
              className="border rounded-lg bg-card"
              data-testid={`accordion-step-${step.stepNumber}`}
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Badge variant="outline" className="font-mono">
                    {step.stepNumber}
                  </Badge>
                  <span className="font-medium">{step.title}</span>
                  {step.version && step.version > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      v{step.version}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${step.stepNumber}`}>Title</Label>
                      <Input
                        id={`title-${step.stepNumber}`}
                        value={step.title}
                        onChange={(e) => handleFieldChange(step.stepNumber, 'title', e.target.value)}
                        data-testid={`input-title-${step.stepNumber}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`scriptureRef-${step.stepNumber}`}>Scripture Reference</Label>
                      <Input
                        id={`scriptureRef-${step.stepNumber}`}
                        value={step.scriptureRef}
                        onChange={(e) => handleFieldChange(step.stepNumber, 'scriptureRef', e.target.value)}
                        placeholder="e.g., John 3:16"
                        data-testid={`input-scriptureRef-${step.stepNumber}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`scripture-${step.stepNumber}`}>Scripture Text</Label>
                    <Textarea
                      id={`scripture-${step.stepNumber}`}
                      value={step.scripture}
                      onChange={(e) => handleFieldChange(step.stepNumber, 'scripture', e.target.value)}
                      rows={2}
                      data-testid={`textarea-scripture-${step.stepNumber}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`content-${step.stepNumber}`}>Content</Label>
                    <Textarea
                      id={`content-${step.stepNumber}`}
                      value={step.content}
                      onChange={(e) => handleFieldChange(step.stepNumber, 'content', e.target.value)}
                      rows={4}
                      data-testid={`textarea-content-${step.stepNumber}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-${step.stepNumber}`}>Agreement Question</Label>
                    <Textarea
                      id={`question-${step.stepNumber}`}
                      value={step.question}
                      onChange={(e) => handleFieldChange(step.stepNumber, 'question', e.target.value)}
                      rows={2}
                      placeholder="The statement members will agree to"
                      data-testid={`textarea-question-${step.stepNumber}`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {step.updatedAt && (
                        <span>
                          Last updated: {new Date(step.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSaveStep(step.stepNumber)}
                      disabled={saveMutation.isPending}
                      data-testid={`button-save-step-${step.stepNumber}`}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Step
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>

      {hasUnsavedChanges && Object.keys(editedSteps).length > 0 && (
        <Card className="mt-6 sticky bottom-4 border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>You have unsaved changes</span>
              </div>
              <Button
                onClick={handleSaveAll}
                disabled={saveMutation.isPending}
                data-testid="button-save-all"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Save All Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
          <CardDescription>
            This is how the content will appear to members during onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expandedStep && editedSteps[parseInt(expandedStep.replace('step-', ''))] ? (
            <div className="rounded-lg border bg-muted/50 p-6">
              {(() => {
                const previewStep = editedSteps[parseInt(expandedStep.replace('step-', ''))];
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-3">{previewStep.title}</h3>
                    <blockquote className="border-l-4 border-primary pl-4 italic mb-4 text-muted-foreground">
                      "{previewStep.scripture}"
                      <cite className="block mt-1 text-sm not-italic">— {previewStep.scriptureRef}</cite>
                    </blockquote>
                    <p className="text-sm mb-4 whitespace-pre-wrap">{previewStep.content}</p>
                    <div className="rounded-md bg-background p-3 border">
                      <p className="text-sm font-medium">Agreement Statement:</p>
                      <p className="text-sm text-muted-foreground mt-1">{previewStep.question}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Expand a step above to see a preview of how it will appear to members.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
