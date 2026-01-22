import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, RotateCcw, CheckCircle, Trash2, AlertCircle, Shield, User } from "lucide-react";

export default function AdminTesting() {
  const { user, isAdmin, role, isLoading: roleLoading } = useRole();
  const { isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const resetOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/testing/reset-my-onboarding");
      return response.json();
    },
    onSuccess: async (data) => {
      setMessage({ type: "success", text: `Onboarding reset to "${data.user.onboardingState}". Redirecting...` });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      setTimeout(() => navigate("/onboarding"), 1500);
    },
    onError: async (error: any) => {
      const errorMessage = error?.message || "Failed to reset onboarding";
      setMessage({ type: "error", text: `Error ${error?.status || 500}: ${errorMessage}` });
    },
  });

  const forceCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/testing/force-complete-my-onboarding");
      return response.json();
    },
    onSuccess: async (data) => {
      setMessage({ type: "success", text: `Onboarding set to "${data.user.onboardingState}". Dashboard ready.` });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: async (error: any) => {
      const errorMessage = error?.message || "Failed to complete onboarding";
      setMessage({ type: "error", text: `Error ${error?.status || 500}: ${errorMessage}` });
    },
  });

  const handleClearCache = async () => {
    await queryClient.invalidateQueries();
    await queryClient.refetchQueries();
    setMessage({ type: "success", text: "Client cache cleared and refetched." });
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This page is only accessible to administrators and owners.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your current role: <Badge variant="outline">{role}</Badge>
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Admin Testing Tools
          </h1>
          <p className="text-muted-foreground">
            Self-service testing tools for administrators. All actions apply only to your own account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Current User Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-mono" data-testid="text-user-email">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge variant="secondary" data-testid="badge-user-role">{role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Onboarding State:</span>
              <Badge variant="outline" data-testid="badge-onboarding-state">{user?.onboardingState || "N/A"}</Badge>
            </div>
          </CardContent>
        </Card>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} data-testid="alert-message">
            {message.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertTitle>{message.type === "success" ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Onboarding Controls</CardTitle>
            <CardDescription>
              Reset or skip onboarding for your account to test different flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => resetOnboardingMutation.mutate()}
                disabled={resetOnboardingMutation.isPending}
                data-testid="button-reset-onboarding"
              >
                {resetOnboardingMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Reset My Onboarding
              </Button>

              <Button
                variant="default"
                className="flex-1"
                onClick={() => forceCompleteMutation.mutate()}
                disabled={forceCompleteMutation.isPending}
                data-testid="button-force-complete"
              >
                {forceCompleteMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Force Complete My Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Controls</CardTitle>
            <CardDescription>
              Clear locally cached data to force fresh data from the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              onClick={handleClearCache}
              data-testid="button-clear-cache"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear My Client Cache
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-dashboard">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
