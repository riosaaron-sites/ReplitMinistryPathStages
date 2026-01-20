import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoachBubbleProps {
  id: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaAction?: () => void;
  className?: string;
}

const DISMISSED_KEY_PREFIX = "coach_bubble_dismissed_";

export function CoachBubble({
  id,
  title,
  message,
  ctaText,
  ctaAction,
  className,
}: CoachBubbleProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${id}`);
    setIsDismissed(dismissed === "true");
    setIsLoaded(true);
  }, [id]);

  const handleDismiss = () => {
    localStorage.setItem(`${DISMISSED_KEY_PREFIX}${id}`, "true");
    setIsDismissed(true);
  };

  if (!isLoaded || isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border bg-primary/5 border-primary/20",
        className
      )}
      data-testid={`coach-bubble-${id}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Dismiss"
        data-testid={`button-dismiss-${id}`}
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      
      <div className="flex gap-3 pr-6">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{message}</p>
          {ctaText && ctaAction && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={ctaAction}
              data-testid={`button-cta-${id}`}
            >
              {ctaText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function resetCoachBubble(id: string) {
  localStorage.removeItem(`${DISMISSED_KEY_PREFIX}${id}`);
}

export function resetAllCoachBubbles() {
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith(DISMISSED_KEY_PREFIX)
  );
  keys.forEach(key => localStorage.removeItem(key));
}
