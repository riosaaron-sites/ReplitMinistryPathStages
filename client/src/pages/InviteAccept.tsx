import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Church,
  Users,
  ArrowRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

interface InviteDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  ministryName?: string;
  roleName?: string;
  message?: string;
  inviterName: string;
  expiresAt: string;
}

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hasRefetched, setHasRefetched] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const { data: invite, isLoading, error, isError, refetch } = useQuery<InviteDetails>({
    queryKey: ["/api/team-invites/token", token],
    queryFn: async () => {
      const response = await fetch(`/api/team-invites/token/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to load invitation");
      }
      return response.json();
    },
    retry: false,
    // Refetch when auth status changes to get latest invite status
    refetchOnMount: true,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/team-invites/${token}/accept`);
      return response.json();
    },
    onSuccess: (data: { success: boolean; ministryId?: string }) => {
      // Clear stored invite token
      localStorage.removeItem('pendingInviteToken');
      toast({
        title: "Welcome aboard!",
        description: "Your invitation has been accepted. Let's get you started with onboarding!",
      });
      // Redirect to onboarding instead of home
      setLocation("/member/onboarding");
    },
    onError: (error: Error) => {
      // If the invite was already accepted (by auto-accept on login), just redirect to onboarding
      if (error.message.includes("already been used") || error.message.includes("already accepted")) {
        localStorage.removeItem('pendingInviteToken');
        toast({
          title: "Welcome aboard!",
          description: "Your invitation was accepted. Let's get you started!",
        });
        setLocation("/member/onboarding");
        return;
      }
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // After auth, refetch invite once to get latest status
  // Server-side auto-accept happens in /api/auth/user
  useEffect(() => {
    // Only refetch once after authentication is confirmed
    if (!isAuthenticated || hasRefetched || authLoading) return;
    
    // Set flag BEFORE async operation to prevent race conditions
    setHasRefetched(true);
    setIsRefetching(true);
    
    const storedToken = localStorage.getItem('pendingInviteToken');
    if (storedToken === token) {
      // Clear the stored token - user came through auth flow
      localStorage.removeItem('pendingInviteToken');
    }
    
    // Refetch invite to get updated status after server-side auto-accept
    refetch().then(({ data: updatedInvite }) => {
      setIsRefetching(false);
      if (updatedInvite && updatedInvite.status === 'accepted') {
        // Server already accepted, redirect to onboarding
        toast({
          title: "Welcome aboard!",
          description: "Your invitation has been accepted. Let's get you started!",
        });
        setLocation("/member/onboarding");
      }
      // If still pending, user can click the Accept button
    }).catch(() => {
      setIsRefetching(false);
    });
  }, [isAuthenticated, authLoading, token, toast, setLocation, refetch, hasRefetched]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invitation Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {(error as Error)?.message || "This invitation link may be invalid or expired."}
            </p>
            <Button onClick={() => setLocation("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Already Accepted</h2>
            <p className="text-muted-foreground mb-6">
              This invitation has already been accepted. You can sign in to access the portal.
            </p>
            <Button onClick={() => setLocation("/")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invitation Expired</h2>
            <p className="text-muted-foreground mb-6">
              This invitation has expired. Please contact the person who sent it for a new invitation.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresDate = new Date(invite.expiresAt);
  const isExpiringSoon = expiresDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // 3 days

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <img 
            src={ministryPathLogo} 
            alt="MinistryPath" 
            className="h-16 mx-auto mb-4"
          />
          <Badge variant="secondary" className="gap-1 mb-4">
            <Church className="h-3 w-3" />
            Garden City Church
          </Badge>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription className="text-lg">
              {invite.inviterName} has invited you to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-6 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">
                Welcome, {invite.firstName}!
              </p>
              {invite.ministryName && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Invited to join <strong>{invite.ministryName}</strong></span>
                </div>
              )}
              {invite.roleName && (
                <Badge variant="outline" className="mt-2">
                  Role: {invite.roleName}
                </Badge>
              )}
            </div>

            {invite.message && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Personal message from {invite.inviterName}:
                </p>
                <p className="text-muted-foreground italic">"{invite.message}"</p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold">By accepting, you'll be able to:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Complete your spiritual gifts assessment to discover how God has gifted you</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Connect with your ministry team and access training materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Track your discipleship journey and earn badges as you grow</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Stay informed about events, trainings, and ministry opportunities</span>
                </li>
              </ul>
            </div>

            {isExpiringSoon && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
                <Clock className="h-4 w-4" />
                <span>This invitation expires on {format(expiresDate, "MMMM d, yyyy")}</span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              {isAuthenticated ? (
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => {
                    // Check if invite is still pending before calling mutation
                    // The server auto-accept may have already processed it
                    if (invite.status === 'pending') {
                      acceptMutation.mutate();
                    } else {
                      // Already accepted, just redirect to onboarding
                      localStorage.removeItem('pendingInviteToken');
                      toast({
                        title: "Welcome aboard!",
                        description: "Your invitation was already accepted. Let's get you started!",
                      });
                      setLocation("/member/onboarding");
                    }
                  }}
                  disabled={acceptMutation.isPending || isRefetching}
                  data-testid="button-accept-invite"
                >
                  {acceptMutation.isPending || isRefetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isRefetching ? "Checking invitation..." : "Accepting..."}
                    </>
                  ) : (
                    <>
                      Accept Invitation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <p className="text-center text-muted-foreground text-sm mb-2">
                    Sign in with Replit to accept your invitation
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full" 
                    data-testid="button-login-to-accept"
                    onClick={() => {
                      // Store the invite token so we can auto-accept after auth
                      localStorage.setItem('pendingInviteToken', token || '');
                      // Redirect to login with return URL to this page
                      window.location.href = `/api/login?returnTo=/invite/${token}`;
                    }}
                  >
                    Sign In to Accept
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              
              <p className="text-center text-xs text-muted-foreground">
                By accepting, you agree to our community guidelines
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Have questions? Contact us at info@gardencitychurch.net
        </p>
      </div>
    </div>
  );
}
