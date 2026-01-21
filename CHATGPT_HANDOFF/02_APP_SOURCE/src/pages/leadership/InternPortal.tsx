import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, differenceInWeeks, differenceInDays, isPast, isFuture } from "date-fns";
import { 
  Loader2, Plus, Users, Calendar, Clock, Target, 
  CheckCircle, AlertCircle, TrendingUp, Award,
  BookOpen, Briefcase, ChevronRight, Star
} from "lucide-react";
import type { InternProfile, InternLog, User } from "@shared/schema";
import { insertInternProfileSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertInternProfileSchema.extend({
  userId: z.string().min(1, "Please select a user"),
});

type FormData = z.infer<typeof formSchema>;

interface InternWithUser extends InternProfile {
  user?: User;
  supervisor?: User;
  logs?: InternLog[];
}

function calculateProgress(intern: InternWithUser): number {
  if (!intern.startDate || !intern.endDate) return 0;
  const start = new Date(intern.startDate);
  const end = new Date(intern.endDate);
  const now = new Date();
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  return Math.round((elapsedDays / totalDays) * 100);
}

function getStatusBadge(status: string | null) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
    active: { variant: "default", label: "Active" },
    completed: { variant: "secondary", label: "Completed" },
    on_hold: { variant: "outline", label: "On Hold" },
    terminated: { variant: "outline", label: "Terminated" },
  };
  const config = variants[status || "active"] || variants.active;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function InternCard({ 
  intern, 
  onView 
}: { 
  intern: InternWithUser; 
  onView: () => void;
}) {
  const progress = calculateProgress(intern);
  const weeksRemaining = intern.endDate ? 
    Math.max(0, differenceInWeeks(new Date(intern.endDate), new Date())) : 0;
  const totalHours = (intern.logs || []).reduce((sum, log) => sum + (log.hoursWorked || 0), 0);
  
  return (
    <Card className="hover-elevate" data-testid={`card-intern-${intern.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={intern.user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {intern.user?.firstName?.[0]}{intern.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {intern.user?.firstName} {intern.user?.lastName}
                {getStatusBadge(intern.status)}
              </CardTitle>
              <CardDescription>
                {intern.supervisor ? `Supervised by ${intern.supervisor.firstName} ${intern.supervisor.lastName}` : "No supervisor assigned"}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onView} data-testid={`button-view-intern-${intern.id}`}>
            View
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Internship Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <div 
              className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary/80 to-primary animate-pulse"
              style={{ width: `${Math.min(progress + 5, 100)}%`, opacity: 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{totalHours}</p>
            <p className="text-xs text-muted-foreground">Hours Logged</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{weeksRemaining}</p>
            <p className="text-xs text-muted-foreground">Weeks Left</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold">{(intern.logs || []).length}</p>
            <p className="text-xs text-muted-foreground">Log Entries</p>
          </div>
        </div>

        {intern.goals && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground line-clamp-2">{intern.goals}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InternDetailDialog({
  intern,
  open,
  onClose,
}: {
  intern: InternWithUser | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!intern) return null;

  const progress = calculateProgress(intern);
  const totalHours = (intern.logs || []).reduce((sum, log) => sum + (log.hoursWorked || 0), 0);
  const recentLogs = (intern.logs || []).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={intern.user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xl">
                {intern.user?.firstName?.[0]}{intern.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">
                {intern.user?.firstName} {intern.user?.lastName}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {getStatusBadge(intern.status)}
                {intern.hoursPerWeek && <span>{intern.hoursPerWeek} hrs/week</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{progress}% Complete</span>
            </div>
            <div className="relative h-4 rounded-full bg-muted overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground drop-shadow-sm">
                  {progress}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totalHours}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="pt-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{(intern.logs || []).length}</p>
                <p className="text-xs text-muted-foreground">Entries</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
              <CardContent className="pt-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">
                  {intern.startDate ? format(new Date(intern.startDate), 'MMM d') : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Start Date</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <CardContent className="pt-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">
                  {intern.endDate ? format(new Date(intern.endDate), 'MMM d') : '-'}
                </p>
                <p className="text-xs text-muted-foreground">End Date</p>
              </CardContent>
            </Card>
          </div>

          {intern.goals && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goals
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{intern.goals}</p>
            </div>
          )}

          {intern.supervisor && (
            <div>
              <h4 className="font-semibold mb-2">Supervisor</h4>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={intern.supervisor.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {intern.supervisor.firstName?.[0]}{intern.supervisor.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{intern.supervisor.firstName} {intern.supervisor.lastName}</p>
                  <p className="text-sm text-muted-foreground">{intern.supervisor.email}</p>
                </div>
              </div>
            </div>
          )}

          {recentLogs.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Recent Activity Logs
              </h4>
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {format(new Date(log.date), 'MMM d, yyyy')}
                      </span>
                      {log.hoursWorked && (
                        <Badge variant="outline">{log.hoursWorked} hrs</Badge>
                      )}
                    </div>
                    {log.activitiesCompleted && (
                      <p className="text-sm text-muted-foreground">{log.activitiesCompleted}</p>
                    )}
                    {log.highlights && (
                      <div className="mt-2 flex items-start gap-2 text-sm">
                        <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-amber-700 dark:text-amber-400">{log.highlights}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InternPortal() {
  const { toast } = useToast();
  const { user, isLeader } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<InternWithUser | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      supervisorId: undefined,
      hoursPerWeek: 10,
      goals: "",
      status: "active",
    },
  });

  const { data: internProfiles, isLoading } = useQuery<InternProfile[]>({
    queryKey: ["/api/interns"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/interns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interns"] });
      toast({ title: "Intern Added", description: "The intern profile has been created." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create intern profile.", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset();
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">You need leadership permissions to access this page.</p>
      </div>
    );
  }

  const getUserById = (id: string | null) => id ? users?.find(u => u.id === id) : undefined;

  const internsWithUsers: InternWithUser[] = (internProfiles || []).map(profile => ({
    ...profile,
    user: getUserById(profile.userId),
    supervisor: getUserById(profile.supervisorId),
  }));

  const activeInterns = internsWithUsers.filter(i => i.status === 'active');
  const completedInterns = internsWithUsers.filter(i => i.status === 'completed');
  const totalHoursLogged = internsWithUsers.reduce((sum, i) => 
    sum + ((i.logs || []).reduce((s, l) => s + (l.hoursWorked || 0), 0)), 0);

  const potentialInterns = (users || []).filter(u => 
    u.role === 'dream-team' && !internProfiles?.some(p => p.userId === u.id)
  );
  const supervisors = (users || []).filter(u => 
    ['admin', 'pastor', 'leader'].includes(u.role || '')
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Intern Portal</h1>
          <p className="text-muted-foreground">Manage and track your intern team</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-intern">
              <Plus className="w-4 h-4 mr-2" />
              Add Intern
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Intern</DialogTitle>
              <DialogDescription>Create a new intern profile to track their progress.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Intern</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-intern-user">
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {potentialInterns.length === 0 ? (
                            <SelectItem value="__none__" disabled>No eligible users (set role to Intern first)</SelectItem>
                          ) : (
                            potentialInterns.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>User must have the "Intern" role assigned</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-supervisor">
                            <SelectValue placeholder="Assign a supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">No supervisor</SelectItem>
                          {supervisors.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="hoursPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours per Week</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          value={field.value || 10}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                          data-testid="input-hours-week"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goals</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What should this intern accomplish?" 
                          {...field}
                          value={field.value || ""}
                          data-testid="input-goals"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-intern">
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Intern Profile
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="stat-total">{internsWithUsers.length}</p>
                <p className="text-sm text-muted-foreground">Total Interns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="stat-active">{activeInterns.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="stat-hours">{totalHoursLogged}</p>
                <p className="text-sm text-muted-foreground">Hours Logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Award className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold" data-testid="stat-completed">{completedInterns.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeInterns.length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All Interns ({internsWithUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeInterns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Active Interns</h3>
                <p className="text-muted-foreground mb-4">
                  Add an intern to start tracking their progress.
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-intern">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Intern
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeInterns.map(intern => (
                <InternCard 
                  key={intern.id} 
                  intern={intern} 
                  onView={() => setSelectedIntern(intern)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {internsWithUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Intern Profiles</h3>
                <p className="text-muted-foreground">
                  Create intern profiles to manage your intern team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {internsWithUsers.map(intern => (
                <InternCard 
                  key={intern.id} 
                  intern={intern} 
                  onView={() => setSelectedIntern(intern)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InternDetailDialog
        intern={selectedIntern}
        open={!!selectedIntern}
        onClose={() => setSelectedIntern(null)}
      />
    </div>
  );
}
