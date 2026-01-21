import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpLinkProps {
  articleId?: string;
  category?: string;
  tooltip?: string;
  variant?: "icon" | "text" | "inline";
  className?: string;
  testId?: string;
}

export function HelpLink({ 
  articleId, 
  category, 
  tooltip = "Get Help",
  variant = "icon",
  className = "",
  testId
}: HelpLinkProps) {
  const path = articleId 
    ? `/help/article/${articleId}` 
    : category 
      ? `/help?category=${category}`
      : '/help';

  const resolvedTestId = testId || `button-help-${articleId || category || 'general'}`;

  if (variant === "inline") {
    return (
      <Link href={path} className={`text-primary hover:underline inline-flex items-center gap-1 ${className}`}>
        <HelpCircle className="h-3 w-3" />
        <span className="text-sm">{tooltip}</span>
      </Link>
    );
  }

  if (variant === "text") {
    return (
      <Link href={path}>
        <Button variant="ghost" size="sm" className={className} data-testid={resolvedTestId}>
          <HelpCircle className="h-4 w-4 mr-1" />
          Help
        </Button>
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={className} 
          data-testid={resolvedTestId}
          asChild
        >
          <Link href={path}>
            <HelpCircle className="h-4 w-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
