import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import type { User } from "@shared/schema";

interface DatabaseUnavailableProps {
  user?: User | null;
  onRetry: () => void;
}

export function DatabaseUnavailable({ user, onRetry }: DatabaseUnavailableProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onRetry();
    setIsRetrying(false);
  };

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Database className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl">Database temporarily unavailable</CardTitle>
          <CardDescription className="text-base">
            MinistryPath can't reach the database right now. Please refresh in a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full"
            data-testid="button-retry-connection"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </>
            )}
          </Button>

          {isAdmin && (
            <div className="mt-4 p-3 bg-muted rounded-md text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Admin Note</p>
                  <p>
                    If using Neon, the database endpoint may be paused or disabled. 
                    Check the Neon dashboard or Replit's database panel to re-enable it.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
