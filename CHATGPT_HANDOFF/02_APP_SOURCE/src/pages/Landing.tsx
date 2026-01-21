import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Users, 
  ArrowRight,
  ClipboardCheck,
  GraduationCap,
  Calendar,
  Shield,
  Heart,
  BarChart3,
  CheckCircle2
} from "lucide-react";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={ministryPathLogo} 
              alt="MinistryPath" 
              className="h-9 w-auto"
            />
            <span className="font-semibold text-lg hidden sm:block">MinistryPath</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-landing-title">
            Welcome to MinistryPath
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your hub for serving at Garden City Church. Get onboarded, discover your gifts, 
            complete trainings, and stay connected with your team.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <Button 
            size="lg" 
            className="text-lg px-8 gap-2"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-sign-in"
          >
            Sign In to Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">For Team Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Faith Commitment</p>
                  <p className="text-sm text-muted-foreground">Affirm your alignment with our beliefs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Ministry Survey</p>
                  <p className="text-sm text-muted-foreground">Discover your gifts and find where you fit</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Trainings</p>
                  <p className="text-sm text-muted-foreground">Complete required and optional courses</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Your Roles</p>
                  <p className="text-sm text-muted-foreground">See where you serve and explore new opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">For Leaders</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">People & Roles</p>
                  <p className="text-sm text-muted-foreground">Manage team members and assignments</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Requests Hub</p>
                  <p className="text-sm text-muted-foreground">Handle media, facility, and support requests</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Rooms & Calendar</p>
                  <p className="text-sm text-muted-foreground">Schedule spaces and coordinate events</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Metrics</p>
                  <p className="text-sm text-muted-foreground">Track attendance and engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="py-8">
            <h2 className="text-xl font-semibold text-center mb-6">How It Works</h2>
            <div className="grid sm:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium mb-1">1. Onboard</p>
                <p className="text-sm text-muted-foreground">Affirm your faith commitment</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium mb-1">2. Discover</p>
                <p className="text-sm text-muted-foreground">Take the ministry survey</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium mb-1">3. Train</p>
                <p className="text-sm text-muted-foreground">Complete your trainings</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium mb-1">4. Serve</p>
                <p className="text-sm text-muted-foreground">Start serving your team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={ministryPathLogo} 
                alt="MinistryPath" 
                className="h-10 w-auto"
              />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">MinistryPath</p>
                <p>Garden City Church, Beverly MA</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => window.open('https://www.gardencitychurch.net', '_blank')}
              data-testid="button-church-website"
            >
              Visit Church Website
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
