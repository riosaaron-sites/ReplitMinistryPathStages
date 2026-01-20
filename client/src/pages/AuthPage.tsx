import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Mail, ArrowLeft, ChevronRight } from "lucide-react";
import { SiGoogle } from "react-icons/si";

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

interface AccountStatus {
  exists: boolean;
  hasPassword: boolean;
  authMethod: 'password' | 'google' | null;
  firstName?: string;
}

export default function AuthPage() {
  const { toast } = useToast();
  const [loginStep, setLoginStep] = useState<LoginStep>('email');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

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
      if (!data.exists) {
        setLoginStep('signup');
      } else if (data.hasPassword) {
        setLoginStep('password');
        setUserName(data.firstName || '');
      } else {
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

  // Register new account
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
      password: data.password,
    });
  };

  const handleOAuthLogin = () => {
    window.location.href = "/api/login";
  };

  const resetLogin = () => {
    setLoginStep('email');
    setUserEmail('');
    setUserName('');
    emailForm.reset();
    passwordForm.reset();
    signupForm.reset();
  };

  const renderContent = () => {
    switch (loginStep) {
      case 'email':
        return (
          <>
            <CardHeader className="text-center space-y-2">
              <CardTitle className="font-serif-display text-3xl">Welcome</CardTitle>
              <CardDescription className="text-base">
                Enter your email to continue
              </CardDescription>
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
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              className="pl-10"
                              data-testid="input-email"
                              autoFocus
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={accountStatusMutation.isPending}
                    data-testid="button-continue-email"
                  >
                    {accountStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    Continue
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleOAuthLogin}
                data-testid="button-oauth-login"
              >
                <SiGoogle className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
            </CardContent>
          </>
        );

      case 'password':
        return (
          <>
            <CardHeader className="text-center space-y-2 relative">
              <button 
                onClick={resetLogin}
                className="absolute left-0 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="font-serif-display text-3xl">
                {userName ? `Welcome back, ${userName}!` : 'Welcome Back!'}
              </CardTitle>
              <CardDescription className="text-base flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                            data-testid="input-password"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-submit-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );

      case 'google':
        return (
          <>
            <CardHeader className="text-center space-y-2 relative">
              <button 
                onClick={resetLogin}
                className="absolute left-0 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="font-serif-display text-3xl">
                {userName ? `Welcome back, ${userName}!` : 'Welcome Back!'}
              </CardTitle>
              <CardDescription className="text-base flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <p className="text-sm text-muted-foreground">
                  Your account is linked to Google. Click below to sign in securely.
                </p>
              </div>
              
              <Button
                className="w-full"
                onClick={handleOAuthLogin}
                data-testid="button-google-signin"
              >
                <SiGoogle className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                After signing in, you can add a password in your profile settings for quicker future logins.
              </p>
            </CardContent>
          </>
        );

      case 'signup':
        return (
          <>
            <CardHeader className="text-center space-y-2 relative">
              <button 
                onClick={resetLogin}
                className="absolute left-0 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                data-testid="button-back-to-email"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <CardTitle className="font-serif-display text-3xl">Create Your Account</CardTitle>
              <CardDescription className="text-base flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" />
                {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                              data-testid="input-first-name"
                              autoFocus
                              {...field}
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
                              data-testid="input-last-name"
                              {...field}
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
                            data-testid="input-signup-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-create-account"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleOAuthLogin}
                data-testid="button-signup-google"
              >
                <SiGoogle className="h-4 w-4 mr-2" />
                Sign Up with Google
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
}
