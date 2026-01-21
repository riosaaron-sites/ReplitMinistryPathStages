// v2.1 - Case-insensitive email login with full signup form
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  Users, 
  BookOpen, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  GraduationCap,
  ChevronRight,
  ArrowLeft,
  Mail
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

type LoginStep = 'email' | 'password' | 'google' | 'signup';
type UserIntent = 'new' | 'returning';

interface AccountStatus {
  exists: boolean;
  hasPassword: boolean;
  authMethod: 'password' | 'google' | null;
  firstName?: string;
}

const features = [
  {
    icon: GraduationCap,
    title: "Onboarding & Training",
    description: "Step-by-step guidance to get started and grow in your calling"
  },
  {
    icon: BookOpen,
    title: "Ministry Manuals",
    description: "Deep training modules created from your ministry resources"
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description: "See your journey and discover what's next in discipleship"
  },
  {
    icon: Users,
    title: "Team Connection",
    description: "Find your place on a team and connect with fellow servants"
  },
  {
    icon: MessageSquare,
    title: "Communication",
    description: "Stay connected with your ministry leaders and teams"
  },
  {
    icon: Calendar,
    title: "Calendar & Planning",
    description: "View schedules, sign up to serve, and plan ahead"
  }
];

export default function LandingPage() {
  const { toast } = useToast();
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('email');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userIntent, setUserIntent] = useState<UserIntent>('returning');
  const [intentMismatch, setIntentMismatch] = useState<string | null>(null);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", password: "" },
  });

  // Check account status by email
  const accountStatusMutation = useMutation({
    mutationFn: async (email: string): Promise<AccountStatus> => {
      const response = await apiRequest("POST", "/api/auth/account-status", { email });
      return await response.json() as AccountStatus;
    },
    onSuccess: (data: AccountStatus) => {
      setIntentMismatch(null);
      
      if (!data.exists) {
        // No account exists - show signup form
        if (userIntent === 'returning') {
          // They clicked "Log In" but don't have an account
          setIntentMismatch("No account found with this email. Let's create one for you!");
        }
        setLoginStep('signup');
      } else if (data.hasPassword) {
        // Account exists with password
        if (userIntent === 'new') {
          // They clicked "Get Started" but already have an account
          setIntentMismatch("Great news! You already have an account. Please sign in below.");
        }
        setLoginStep('password');
        setUserName(data.firstName || '');
      } else {
        // Account exists with Google auth only
        if (userIntent === 'new') {
          setIntentMismatch("Great news! You already have an account. Please sign in with Google.");
        }
        setLoginStep('google');
        setUserName(data.firstName || '');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not check account status",
        variant: "destructive",
      });
    },
  });

  // Login with password
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid password",
        variant: "destructive",
      });
    },
  });

  // Register new account with email + password
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; password: string }) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = (data: EmailFormData) => {
    setUserEmail(data.email);
    accountStatusMutation.mutate(data.email);
  };

  const handlePasswordSubmit = (data: PasswordFormData) => {
    loginMutation.mutate({ email: userEmail, password: data.password });
  };

  const handleSignupSubmit = (data: SignupFormData) => {
    registerMutation.mutate({ 
      email: userEmail, 
      firstName: data.firstName, 
      lastName: data.lastName, 
      password: data.password 
    });
  };

  const handleOAuthLogin = () => {
    window.location.href = "/api/login";
  };

  const handleForgotPassword = async () => {
    if (!userEmail) return;
    
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: userEmail });
      toast({
        title: "Check Your Email",
        description: "If an account exists with that email, you'll receive a password reset link.",
      });
      closeModal();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not send reset email",
        variant: "destructive",
      });
    }
  };

  const resetLogin = () => {
    setLoginStep('email');
    setUserEmail('');
    setUserName('');
    setIntentMismatch(null);
    emailForm.reset();
    passwordForm.reset();
    signupForm.reset();
  };

  const closeModal = () => {
    setShowLogin(false);
    resetLogin();
  };

  const openLoginModal = (intent: UserIntent) => {
    setUserIntent(intent);
    setShowLogin(true);
  };

  const renderLoginContent = () => {
    switch (loginStep) {
      case 'email':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">
                {userIntent === 'new' ? 'Create Your Account' : 'Welcome Back'}
              </CardTitle>
              <p style={{ color: '#424242' }}>
                {userIntent === 'new' 
                  ? "Enter your email to get started" 
                  : "Enter your email to sign in"}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="your@email.com" 
                            {...field} 
                            data-testid="input-email"
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-semibold"
                    style={{ backgroundColor: '#f2660f' }}
                    disabled={accountStatusMutation.isPending}
                    data-testid="button-continue-email"
                  >
                    {accountStatusMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" style={{ borderColor: '#223134' }} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2" style={{ color: '#424242' }}>
                    Or
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 font-semibold"
                onClick={handleOAuthLogin}
                style={{ borderColor: '#223134' }}
                data-testid="button-oauth-login"
              >
                <SiGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
            </CardContent>
          </>
        );

      case 'password':
        return (
          <>
            <CardHeader className="text-center">
              <button 
                onClick={resetLogin}
                className="absolute left-4 top-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="text-2xl font-bold">
                {userName ? `Welcome back, ${userName}!` : 'Welcome Back!'}
              </CardTitle>
              <p style={{ color: '#424242' }} className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {intentMismatch && (
                <div 
                  className="p-3 rounded-lg text-sm text-center"
                  style={{ backgroundColor: '#f2660f15', color: '#f2660f' }}
                  data-testid="text-intent-mismatch"
                >
                  {intentMismatch}
                </div>
              )}
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your password" 
                            {...field}
                            data-testid="input-password"
                            autoFocus
                          />
                        </FormControl>
                        {passwordForm.formState.errors.password && (
                          <FormMessage />
                        )}
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-semibold"
                    style={{ backgroundColor: '#f2660f' }}
                    disabled={loginMutation.isPending}
                    data-testid="button-submit-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="w-full text-sm text-center hover:underline"
                    style={{ color: '#f2660f' }}
                    data-testid="button-forgot-password"
                  >
                    Forgot your password?
                  </button>
                </form>
              </Form>
            </CardContent>
          </>
        );

      case 'google':
        return (
          <>
            <CardHeader className="text-center relative">
              <button 
                onClick={resetLogin}
                className="absolute left-4 top-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="text-2xl font-bold">
                {userName ? `Welcome back, ${userName}!` : 'Welcome Back!'}
              </CardTitle>
              <p style={{ color: '#424242' }} className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {intentMismatch && (
                <div 
                  className="p-3 rounded-lg text-sm text-center"
                  style={{ backgroundColor: '#f2660f15', color: '#f2660f' }}
                  data-testid="text-intent-mismatch"
                >
                  {intentMismatch}
                </div>
              )}
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f2660f10' }}>
                <p className="text-sm" style={{ color: '#424242' }}>
                  Your account is linked to Google. Click below to sign in securely.
                </p>
              </div>
              
              <Button 
                className="w-full h-12 font-semibold"
                onClick={handleOAuthLogin}
                style={{ backgroundColor: '#f2660f' }}
                data-testid="button-google-signin"
              >
                <SiGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>

              <p className="text-center text-xs" style={{ color: '#424242' }}>
                After signing in, you can add a password in your profile settings for quicker future logins.
              </p>
            </CardContent>
          </>
        );

      case 'signup':
        return (
          <>
            <CardHeader className="text-center relative">
              <button 
                onClick={resetLogin}
                className="absolute left-4 top-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
              <p style={{ color: '#424242' }} className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {intentMismatch && (
                <div 
                  className="p-3 rounded-lg text-sm text-center"
                  style={{ backgroundColor: '#f2660f15', color: '#f2660f' }}
                  data-testid="text-intent-mismatch"
                >
                  {intentMismatch}
                </div>
              )}
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="First" 
                              {...field}
                              data-testid="input-first-name"
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Last" 
                              {...field}
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Create Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="At least 6 characters" 
                            {...field}
                            data-testid="input-signup-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-semibold"
                    style={{ backgroundColor: '#f2660f' }}
                    disabled={registerMutation.isPending}
                    data-testid="button-create-account"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2" style={{ color: '#424242' }}>Or</span>
                </div>
              </div>

              <Button 
                variant="outline"
                className="w-full h-12 font-semibold"
                onClick={handleOAuthLogin}
                data-testid="button-signup-google"
              >
                <SiGoogle className="mr-2 h-5 w-5" />
                Sign Up with Google
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Header */}
      <header className="w-full py-4 px-6 flex items-center justify-between border-b" style={{ borderColor: '#223134' }}>
        <div className="flex items-center gap-3">
          <img src={ministryPathLogo} alt="MinistryPath" className="h-8 w-auto" />
          <span className="text-xl font-bold tracking-tight">MinistryPath</span>
        </div>
        <Button 
          onClick={() => openLoginModal('returning')}
          className="font-semibold"
          style={{ backgroundColor: '#f2660f' }}
          data-testid="button-login-header"
        >
          Log In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your Journey to <span style={{ color: '#f2660f' }}>Serve</span> Starts Here
          </h1>
          <p className="text-lg md:text-xl" style={{ color: '#424242' }}>
            MinistryPath guides you through onboarding, training, and discipleship — 
            helping you discover your gifts, connect with teams, and live the life God has called you to.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => openLoginModal('new')}
              className="font-semibold text-lg px-8"
              style={{ backgroundColor: '#f2660f' }}
              data-testid="button-get-started"
            >
              Get Started
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => openLoginModal('returning')}
              className="font-semibold text-lg px-8"
              style={{ borderColor: '#223134', color: '#223134' }}
              data-testid="button-login-hero"
            >
              Log In
            </Button>
          </div>
        </div>

        {/* Garden City Church Badge */}
        <div className="mt-12 flex items-center gap-2 text-sm" style={{ color: '#424242' }}>
          <span>Powered by</span>
          <span className="font-semibold">Garden City Church</span>
          <span>• Beverly, MA</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Everything You Need to <span style={{ color: '#f2660f' }}>Grow & Serve</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-2 hover-elevate transition-all"
                style={{ borderColor: '#223134' }}
                data-testid={`card-feature-${index}`}
              >
                <CardHeader className="pb-2">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: '#f2660f20' }}
                  >
                    <feature.icon className="h-6 w-6" style={{ color: '#f2660f' }} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p style={{ color: '#424242' }}>{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6" style={{ backgroundColor: '#223134' }}>
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join hundreds of others who are discovering their purpose and serving with passion.
          </p>
          <Button 
            size="lg"
            onClick={() => openLoginModal('new')}
            className="font-semibold text-lg px-8"
            style={{ backgroundColor: '#f2660f' }}
            data-testid="button-join-now"
          >
            Join Now
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center text-sm border-t" style={{ color: '#424242', borderColor: '#223134' }}>
        <div className="flex items-center justify-center gap-4 mb-2">
          <a href="/help" className="hover:underline" style={{ color: '#424242' }}>Help Center</a>
          <span style={{ color: '#424242' }}>|</span>
          <a href="/resources" className="hover:underline" style={{ color: '#424242' }}>Resources</a>
        </div>
        <p>&copy; Aaron Rios — Garden City Church</p>
        <p className="mt-1">Live the life. Tell the Story.</p>
      </footer>

      {/* Smart Login Modal */}
      {showLogin && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <Card 
            className="w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            {renderLoginContent()}
          </Card>
        </div>
      )}
    </div>
  );
}
