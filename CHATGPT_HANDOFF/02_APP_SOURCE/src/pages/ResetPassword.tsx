import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, Lock } from "lucide-react";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [resetComplete, setResetComplete] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { data: tokenStatus, isLoading: isVerifying } = useQuery<{ valid: boolean; message?: string }>({
    queryKey: ['/api/auth/verify-reset-token', token],
    queryFn: async () => {
      if (!token) return { valid: false, message: "No reset token provided" };
      const res = await fetch(`/api/auth/verify-reset-token?token=${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return res.json();
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({
        title: "Password Reset",
        description: "Your password has been reset successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PasswordFormData) => {
    if (!token) return;
    resetMutation.mutate({ token, password: data.password });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or missing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenStatus?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Link Expired</CardTitle>
            <CardDescription>
              {tokenStatus?.message || "This password reset link has expired or is invalid."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Please request a new password reset link.
            </p>
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <CardTitle>Password Reset!</CardTitle>
            <CardDescription>
              Your password has been reset successfully. You can now log in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation("/")} 
              className="w-full"
              style={{ backgroundColor: '#f2660f' }}
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Create New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="At least 6 characters" 
                        {...field}
                        data-testid="input-new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Re-enter your password" 
                        {...field}
                        data-testid="input-confirm-password"
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
                disabled={resetMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
