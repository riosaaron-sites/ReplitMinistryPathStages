import { ReactNode, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronLeft, HelpCircle, ChevronDown, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

interface OnboardingStep {
  id: string;
  name: string;
  shortName: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: "welcome", name: "Welcome", shortName: "Welcome" },
  { id: "profile", name: "Your Profile", shortName: "Profile" },
  { id: "leadership", name: "Leadership", shortName: "Leader" },
  { id: "ministries", name: "Ministries", shortName: "Ministry" },
  { id: "faith", name: "Faith & Commitment", shortName: "Faith" },
  { id: "photo", name: "Photo", shortName: "Photo" },
  { id: "classes", name: "Classes", shortName: "Classes" },
];

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: string;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  helpContent?: ReactNode;
}

export function OnboardingLayout({
  children,
  currentStep,
  title,
  subtitle,
  showBackButton = false,
  backUrl,
  helpContent,
}: OnboardingLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStep);
  
  const handleBack = () => {
    if (backUrl) {
      setLocation(backUrl);
    }
  };
  const progressPercent = ((currentIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Progress Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progressPercent)}% complete
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Step indicators for larger screens */}
          <div className="hidden sm:flex items-center justify-between mt-3 gap-1">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-1 text-xs ${
                  index <= currentIndex
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index < currentIndex
                      ? "bg-primary text-primary-foreground"
                      : index === currentIndex
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="hidden md:inline">{step.shortName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        {showBackButton && backUrl && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4 -ml-2"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="font-serif-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {children}
        </div>

        {/* Need Help Panel */}
        {helpContent && (
          <div className="mt-8">
            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  data-testid="button-need-help"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Need help?
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${helpOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-4 rounded-lg bg-muted/50 text-sm space-y-3">
                  {helpContent}
                  <div className="pt-2 border-t">
                    <Link href="/requests">
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Ask for Help
                      </Button>
                    </Link>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </div>
  );
}

export { ONBOARDING_STEPS };
