import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Church, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Church className="h-6 w-6 text-primary" />
            <span className="font-serif-display text-lg font-semibold">Garden City Church</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex items-center justify-center min-h-screen px-4 pt-16">
        <Card className="max-w-md w-full border-card-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl font-bold text-muted-foreground">404</span>
            </div>
            
            <h1 className="font-serif-display text-2xl font-semibold mb-3">
              Page Not Found
            </h1>
            
            <p className="text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="gap-2"
                data-testid="button-go-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="gap-2"
                data-testid="button-go-home"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
