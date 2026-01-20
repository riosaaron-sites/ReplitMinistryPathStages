import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function RequiredClassesBanner() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const nextNightIncomplete = user.nextNightStatus !== 'COMPLETE';
  const followingJesusIncomplete = user.followingJesusStatus !== 'COMPLETE';
  const hasIncomplete = nextNightIncomplete || followingJesusIncomplete;
  
  if (!hasIncomplete) return null;
  
  const incompleteClasses: string[] = [];
  if (nextNightIncomplete) incompleteClasses.push("Next Night");
  if (followingJesusIncomplete) incompleteClasses.push("Following Jesus");
  
  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 mb-4" data-testid="alert-required-classes">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Required Classes</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-2">
          You're not blocked, but <strong>{incompleteClasses.join(" and ")}</strong> {incompleteClasses.length === 1 ? 'is' : 'are'} still required. 
          This notice will remain until completed.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Check the church calendar for upcoming class dates.</span>
        </div>
        <div className="mt-3">
          <Link href="/my-path">
            <Button variant="outline" size="sm" className="gap-1 text-amber-800 border-amber-600 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-600 dark:hover:bg-amber-900/30" data-testid="button-update-class-status">
              Update Status
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
