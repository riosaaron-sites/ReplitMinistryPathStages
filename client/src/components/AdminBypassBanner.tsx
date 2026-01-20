import { useAuth } from "@/hooks/useAuth";
import { Shield, ShieldOff, ToggleLeft, ToggleRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function AdminBypassBanner() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/toggle-bypass');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  });
  
  if (isLoading) return null;
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'owner') return null;
  
  const bypassEnabled = user.adminBypassMode === true;
  
  return (
    <Alert 
      className={`mb-4 ${bypassEnabled 
        ? 'border-purple-500/50 bg-purple-50 dark:bg-purple-950/20' 
        : 'border-slate-500/50 bg-slate-50 dark:bg-slate-950/20'
      }`} 
      data-testid="alert-admin-bypass"
    >
      {bypassEnabled ? (
        <Shield className="h-4 w-4 text-purple-600" />
      ) : (
        <ShieldOff className="h-4 w-4 text-slate-600" />
      )}
      <AlertTitle className={bypassEnabled 
        ? "text-purple-800 dark:text-purple-200" 
        : "text-slate-800 dark:text-slate-200"
      }>
        Admin Bypass Mode {bypassEnabled ? 'Active' : 'Inactive'}
      </AlertTitle>
      <AlertDescription className={bypassEnabled 
        ? "text-purple-700 dark:text-purple-300" 
        : "text-slate-700 dark:text-slate-300"
      }>
        <p className="mb-2">
          {bypassEnabled 
            ? "You have full access to all features regardless of role requirements."
            : "Role-based access controls are enforced normally."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`gap-1 ${bypassEnabled 
            ? "text-purple-800 border-purple-600 hover:bg-purple-100 dark:text-purple-200 dark:border-purple-600 dark:hover:bg-purple-900/30"
            : "text-slate-800 border-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-900/30"
          }`}
          data-testid="button-toggle-admin-bypass"
        >
          {bypassEnabled ? (
            <>
              <ToggleRight className="h-4 w-4" />
              {toggleMutation.isPending ? 'Disabling...' : 'Disable Bypass'}
            </>
          ) : (
            <>
              <ToggleLeft className="h-4 w-4" />
              {toggleMutation.isPending ? 'Enabling...' : 'Enable Bypass'}
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
