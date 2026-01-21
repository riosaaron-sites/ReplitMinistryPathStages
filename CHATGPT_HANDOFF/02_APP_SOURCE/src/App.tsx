import { useEffect, useState, useCallback } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, setDbUnavailableCallback } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { DatabaseUnavailable } from "@/components/DatabaseUnavailable";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import LandingPage from "@/pages/LandingPage";
import AdminLogin from "@/pages/AdminLogin";

// Coming Soon mode disabled - app is live
const SHOW_COMING_SOON = false;
import AuthPage from "@/pages/AuthPage";
import Survey from "@/pages/Survey";
import Results from "@/pages/Results";
import MemberDashboard from "@/pages/member/MemberDashboard";
import OnboardingWizard from "@/pages/member/OnboardingWizard";
import OnboardingHub from "@/pages/member/OnboardingHub";
import ProfileWizard from "@/pages/member/ProfileWizard";
import MinistryCalendar from "@/pages/member/MinistryCalendar";
import TrainingHub from "@/pages/member/TrainingHub";
import TrainingViewer from "@/pages/member/TrainingViewer";
import XpDashboard from "@/pages/member/XpDashboard";
import RequestCenter from "@/pages/member/RequestCenter";
import MyDiscipleship from "@/pages/member/MyDiscipleship";
import MyRoles from "@/pages/member/MyRoles";
import AboutUs from "@/pages/member/AboutUs";
import Meetings from "@/pages/Meetings";
import LeadershipDashboard from "@/pages/leadership/LeadershipDashboard";
import MetricsDashboard from "@/pages/leadership/MetricsDashboard";
import WeeklyMinistryMetrics from "@/pages/leadership/WeeklyMinistryMetrics";
import RoomsManagement from "@/pages/leadership/RoomsManagement";
import PeopleRoles from "@/pages/leadership/PeopleRoles";
import MinistriesManagement from "@/pages/leadership/MinistriesManagement";
import TrainingManagement from "@/pages/leadership/TrainingManagement";
import InternPortal from "@/pages/leadership/InternPortal";
import MyTeam from "@/pages/leadership/MyTeam";
import InviteManagement from "@/pages/leadership/InviteManagement";
import AdminPanel from "@/pages/leadership/AdminPanel";
import Workboards from "@/pages/leadership/Workboards";
import PastoralCare from "@/pages/leadership/PastoralCare";
import InviteAccept from "@/pages/InviteAccept";
import TeamConnection from "@/pages/member/TeamConnection";
import MyProfile from "@/pages/member/MyProfile";
import Messages from "@/pages/member/Messages";
import ManualsLibrary from "@/pages/member/ManualsLibrary";
import HelpCenter from "@/pages/HelpCenter";
import ResourcesLibrary from "@/pages/ResourcesLibrary";
import ResetPassword from "@/pages/ResetPassword";
import ClassStatusStep from "@/pages/member/ClassStatusStep";
import OnboardingController from "@/pages/member/OnboardingController";
import WelcomeStep from "@/pages/member/onboarding/WelcomeStep";
import ProfileStep from "@/pages/member/onboarding/ProfileStep";
import LeadershipStep from "@/pages/member/onboarding/LeadershipStep";
import MinistriesStep from "@/pages/member/onboarding/MinistriesStep";
import PhotoStep from "@/pages/member/onboarding/PhotoStep";
import CompletionStep from "@/pages/member/onboarding/CompletionStep";
import { MemberLayout } from "@/layouts/MemberLayout";
import { LeadershipLayout } from "@/layouts/LeadershipLayout";
import { MinistryProvider } from "@/contexts/MinistryContext";

function RedirectToMyPath() {
  const [, setLocation] = useLocation();
  
  // Use effect to avoid render-phase navigation
  useEffect(() => {
    setLocation("/my-path");
  }, [setLocation]);
  
  return null;
}

function AuthenticatedRouter() {
  const { canAccessLeadershipPortal, user } = useRole();
  const [location, setLocation] = useLocation();
  
  const isLeadershipRoute = location.startsWith('/leadership');
  const isOnboardingRoute = location.startsWith('/onboarding');
  
  // Redirect to onboarding if user hasn't completed it (unless already on onboarding route)
  useEffect(() => {
    if (!user) return;
    
    const onboardingState = user.onboardingState || 'PROFILE';
    const needsOnboarding = onboardingState !== 'DONE';
    
    if (needsOnboarding && !isOnboardingRoute) {
      setLocation("/onboarding");
    }
  }, [user, isOnboardingRoute, setLocation]);
  
  if (isLeadershipRoute && canAccessLeadershipPortal) {
    return (
      <MinistryProvider>
        <LeadershipLayout>
          <Switch>
            <Route path="/leadership" component={LeadershipDashboard} />
            <Route path="/leadership/people" component={PeopleRoles} />
            <Route path="/leadership/ministries" component={MinistriesManagement} />
            <Route path="/leadership/trainings" component={TrainingManagement} />
            <Route path="/leadership/requests" component={RequestCenter} />
            <Route path="/leadership/rooms" component={RoomsManagement} />
            <Route path="/leadership/metrics" component={MetricsDashboard} />
            <Route path="/leadership/weekly-metrics" component={WeeklyMinistryMetrics} />
            <Route path="/leadership/interns" component={InternPortal} />
            <Route path="/leadership/meetings" component={Meetings} />
            <Route path="/leadership/my-team" component={MyTeam} />
            <Route path="/leadership/workboards" component={Workboards} />
            <Route path="/leadership/pastoral-care" component={PastoralCare} />
            <Route path="/leadership/invites" component={InviteManagement} />
            <Route path="/leadership/admin" component={AdminPanel} />
            <Route component={NotFound} />
          </Switch>
        </LeadershipLayout>
      </MinistryProvider>
    );
  }
  
  return (
    <MinistryProvider>
      <MemberLayout>
        <Switch>
          <Route path="/" component={MemberDashboard} />
          <Route path="/dashboard" component={MemberDashboard} />
          <Route path="/profile" component={MyProfile} />
          <Route path="/survey" component={Survey} />
          <Route path="/results" component={Results} />
          <Route path="/trainings" component={TrainingHub} />
          <Route path="/trainings/:moduleId" component={TrainingViewer} />
          <Route path="/my-path" component={MyDiscipleship} />
          <Route path="/my-discipleship" component={RedirectToMyPath} />
          <Route path="/journey" component={RedirectToMyPath} />
          <Route path="/progress" component={RedirectToMyPath} />
          <Route path="/discipleship" component={RedirectToMyPath} />
          <Route path="/my-progress" component={RedirectToMyPath} />
          <Route path="/my-roles" component={MyRoles} />
          <Route path="/teams" component={TeamConnection} />
          <Route path="/messages" component={Messages} />
          <Route path="/manuals" component={ManualsLibrary} />
          <Route path="/resources" component={ResourcesLibrary} />
          <Route path="/help" component={HelpCenter} />
          <Route path="/requests" component={RequestCenter} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/about" component={AboutUs} />
          <Route path="/onboarding" component={OnboardingController} />
          <Route path="/onboarding/welcome" component={WelcomeStep} />
          <Route path="/onboarding/profile" component={ProfileStep} />
          <Route path="/onboarding/leadership" component={LeadershipStep} />
          <Route path="/onboarding/ministries" component={MinistriesStep} />
          <Route path="/onboarding/faith" component={OnboardingWizard} />
          <Route path="/onboarding/photo" component={PhotoStep} />
          <Route path="/onboarding/classes" component={ClassStatusStep} />
          <Route path="/onboarding/complete" component={CompletionStep} />
          <Route path="/join" component={OnboardingHub} />
          <Route path="/profile/setup" component={ProfileWizard} />
          <Route path="/calendar" component={MinistryCalendar} />
          <Route component={NotFound} />
        </Switch>
      </MemberLayout>
    </MinistryProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [adminBypass, setAdminBypass] = useState(() => {
    return sessionStorage.getItem("adminAccess") === "true";
  });

  // Check for admin bypass on mount
  const { data: bypassData } = useQuery<{ hasAdminBypass: boolean }>({
    queryKey: ["/api/admin/check-bypass"],
    enabled: SHOW_COMING_SOON && !adminBypass,
  });

  // Sync server-side admin bypass status
  useEffect(() => {
    if (bypassData?.hasAdminBypass) {
      sessionStorage.setItem("adminAccess", "true");
      setAdminBypass(true);
    }
  }, [bypassData]);

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setAdminBypass(true);
    setLocation("/");
  };

  // Admin login route (accessible without authentication)
  if (location === "/admin") {
    return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
  }

  // Public invite page - accessible without authentication
  if (location.startsWith('/invite/')) {
    return <Route path="/invite/:token" component={InviteAccept} />;
  }

  // Help center - accessible without authentication
  if (location === '/help') {
    return <HelpCenter />;
  }

  // Password reset - accessible without authentication
  if (location.startsWith('/reset-password')) {
    return <ResetPassword />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading MinistryPath...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedRouter />;
}

function AppWithDbCheck() {
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const handleDbUnavailable = useCallback(() => {
    setDbUnavailable(true);
  }, []);

  useEffect(() => {
    setDbUnavailableCallback(handleDbUnavailable);
  }, [handleDbUnavailable]);

  const handleRetry = useCallback(() => {
    setDbUnavailable(false);
    queryClient.invalidateQueries();
    window.location.reload();
  }, []);

  // Public routes that should still work even when DB is unavailable
  const isPublicRoute = !isAuthenticated || 
    location === '/help' || 
    location.startsWith('/invite/') ||
    location === '/admin';

  // Only block authenticated routes when DB is unavailable
  // Public pages (landing, help, invite) can still render
  if (dbUnavailable && !isPublicRoute) {
    return <DatabaseUnavailable user={user} onRetry={handleRetry} />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="garden-city-theme">
        <TooltipProvider>
          <Toaster />
          <AppWithDbCheck />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
