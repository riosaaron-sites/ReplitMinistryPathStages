import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  Check,
  AlertCircle,
  Users,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks } from "date-fns";
import type { User } from "@shared/schema";

interface MinistryMetricStatus {
  ministryId: string;
  ministryName: string;
  hasSubmitted: boolean;
  metric: WeeklyMetric | null;
}

interface WeeklyMetric {
  id: string;
  ministryId: string;
  weekStartDate: string;
  attendanceCount: number;
  volunteersCount?: number;
  firstTimersCount?: number;
  altarResponsesCount?: number;
  followUpsNeededCount?: number;
  winsNotes?: string;
  concernsNotes?: string;
  nextStepsNotes?: string;
  submittedByUserId: string;
  submittedAt: string;
}

interface CurrentWeekResponse {
  weekStartDate: string;
  ministries: MinistryMetricStatus[];
}

interface MissingMetricsResponse {
  weekStartDate: string;
  missingCount: number;
  missing: {
    ministryId: string;
    ministryName: string;
    leaders: { id: string; name: string }[];
  }[];
}

const metricsFormSchema = z.object({
  attendanceCount: z.coerce.number().min(0, "Required"),
  volunteersCount: z.coerce.number().min(0).optional(),
  firstTimersCount: z.coerce.number().min(0).optional(),
  altarResponsesCount: z.coerce.number().min(0).optional(),
  followUpsNeededCount: z.coerce.number().min(0).optional(),
  winsNotes: z.string().optional(),
  concernsNotes: z.string().optional(),
  nextStepsNotes: z.string().optional(),
});

type MetricsFormData = z.infer<typeof metricsFormSchema>;

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeeklyMinistryMetrics() {
  const [selectedMinistry, setSelectedMinistry] = useState<MinistryMetricStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("submit");
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAdminOrPastor = user?.role && ['admin', 'owner', 'pastor', 'system-admin', 'lead-pastor'].includes(user.role);

  const { data: currentWeekData, isLoading: loadingCurrentWeek } = useQuery<CurrentWeekResponse>({
    queryKey: ["/api/weekly-metrics/current-week"],
  });

  const { data: missingData, isLoading: loadingMissing } = useQuery<MissingMetricsResponse>({
    queryKey: ["/api/weekly-metrics/missing"],
    enabled: !!isAdminOrPastor,
  });

  const eightWeeksAgo = subWeeks(getMonday(new Date()), 8);
  const { data: historicalMetrics = [], isLoading: loadingHistory } = useQuery<WeeklyMetric[]>({
    queryKey: ["/api/weekly-metrics/weeks", { start: eightWeeksAgo.toISOString(), end: new Date().toISOString() }],
    queryFn: async () => {
      const res = await fetch(`/api/weekly-metrics/weeks?start=${eightWeeksAgo.toISOString()}&end=${new Date().toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const form = useForm<MetricsFormData>({
    resolver: zodResolver(metricsFormSchema),
    defaultValues: {
      attendanceCount: 0,
      volunteersCount: 0,
      firstTimersCount: 0,
      altarResponsesCount: 0,
      followUpsNeededCount: 0,
      winsNotes: "",
      concernsNotes: "",
      nextStepsNotes: "",
    },
  });

  const submitMetricsMutation = useMutation({
    mutationFn: async (data: MetricsFormData) => {
      if (!selectedMinistry || !currentWeekData) throw new Error("No ministry selected");
      return apiRequest("POST", "/api/weekly-metrics", {
        ...data,
        ministryId: selectedMinistry.ministryId,
        weekStartDate: currentWeekData.weekStartDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-metrics/current-week"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-metrics/missing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-metrics/weeks"] });
      setDialogOpen(false);
      setSelectedMinistry(null);
      form.reset();
      toast({
        title: "Metrics Submitted",
        description: "Weekly metrics have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit metrics. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openSubmitDialog = (ministry: MinistryMetricStatus) => {
    setSelectedMinistry(ministry);
    if (ministry.metric) {
      form.reset({
        attendanceCount: ministry.metric.attendanceCount,
        volunteersCount: ministry.metric.volunteersCount || 0,
        firstTimersCount: ministry.metric.firstTimersCount || 0,
        altarResponsesCount: ministry.metric.altarResponsesCount || 0,
        followUpsNeededCount: ministry.metric.followUpsNeededCount || 0,
        winsNotes: ministry.metric.winsNotes || "",
        concernsNotes: ministry.metric.concernsNotes || "",
        nextStepsNotes: ministry.metric.nextStepsNotes || "",
      });
    } else {
      form.reset({
        attendanceCount: 0,
        volunteersCount: 0,
        firstTimersCount: 0,
        altarResponsesCount: 0,
        followUpsNeededCount: 0,
        winsNotes: "",
        concernsNotes: "",
        nextStepsNotes: "",
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (data: MetricsFormData) => {
    submitMetricsMutation.mutate(data);
  };

  const weekStart = currentWeekData?.weekStartDate ? new Date(currentWeekData.weekStartDate) : getMonday(new Date());
  const weekEnd = addWeeks(weekStart, 1);
  weekEnd.setDate(weekEnd.getDate() - 1);

  const submittedCount = currentWeekData?.ministries.filter(m => m.hasSubmitted).length || 0;
  const totalCount = currentWeekData?.ministries.length || 0;

  if (loadingCurrentWeek) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Weekly Ministry Metrics</h1>
          <p className="text-muted-foreground">
            Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={submittedCount === totalCount ? "default" : "secondary"} className="text-sm px-3 py-1">
            {submittedCount}/{totalCount} Submitted
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="submit" data-testid="tab-submit">Submit Metrics</TabsTrigger>
          {isAdminOrPastor && (
            <TabsTrigger value="missing" data-testid="tab-missing">
              Missing ({missingData?.missingCount || 0})
            </TabsTrigger>
          )}
          <TabsTrigger value="history" data-testid="tab-history">Past 8 Weeks</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          {currentWeekData?.ministries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No ministries assigned to you for metrics submission.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentWeekData?.ministries.map((ministry) => (
                <Card key={ministry.ministryId} className={ministry.hasSubmitted ? "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/30" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{ministry.ministryName}</CardTitle>
                      {ministry.hasSubmitted ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          <Check className="w-3 h-3 mr-1" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    {ministry.hasSubmitted && ministry.metric ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Attendance:</span>
                          <span className="font-medium">{ministry.metric.attendanceCount}</span>
                        </div>
                        {ministry.metric.volunteersCount ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Volunteers:</span>
                            <span>{ministry.metric.volunteersCount}</span>
                          </div>
                        ) : null}
                        {ministry.metric.firstTimersCount ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">First Timers:</span>
                            <span>{ministry.metric.firstTimersCount}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No metrics submitted yet for this week.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant={ministry.hasSubmitted ? "outline" : "default"} 
                      size="sm" 
                      className="w-full"
                      onClick={() => openSubmitDialog(ministry)}
                      data-testid={`button-submit-${ministry.ministryId}`}
                    >
                      {ministry.hasSubmitted ? (
                        <>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Metrics
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-4 h-4 mr-2" /> Submit Metrics
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdminOrPastor && (
          <TabsContent value="missing" className="space-y-4">
            {loadingMissing ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : missingData?.missing.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium text-green-700 dark:text-green-400">All ministries have submitted metrics!</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Missing Submissions
                  </CardTitle>
                  <CardDescription>
                    {missingData?.missingCount} ministries haven't submitted metrics for this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ministry</TableHead>
                        <TableHead>Leader(s)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingData?.missing.map((m) => (
                        <TableRow key={m.ministryId}>
                          <TableCell className="font-medium">{m.ministryName}</TableCell>
                          <TableCell>
                            {m.leaders.length > 0 
                              ? m.leaders.map(l => l.name).join(", ")
                              : <span className="text-muted-foreground">No leader assigned</span>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : historicalMetrics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No historical metrics available.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Past 8 Weeks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Ministry</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Volunteers</TableHead>
                      <TableHead className="text-right">First Timers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalMetrics.slice(0, 50).map((metric) => (
                      <TableRow key={metric.id}>
                        <TableCell>{format(new Date(metric.weekStartDate), "MMM d")}</TableCell>
                        <TableCell>
                          {currentWeekData?.ministries.find(m => m.ministryId === metric.ministryId)?.ministryName || "Unknown"}
                        </TableCell>
                        <TableCell className="text-right font-medium">{metric.attendanceCount}</TableCell>
                        <TableCell className="text-right">{metric.volunteersCount || "-"}</TableCell>
                        <TableCell className="text-right">{metric.firstTimersCount || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMinistry?.hasSubmitted ? "Edit" : "Submit"} Weekly Metrics - {selectedMinistry?.ministryName}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="attendanceCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendance *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-attendance" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="volunteersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volunteers</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-volunteers" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstTimersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Timers</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-first-timers" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="altarResponsesCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altar Responses</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-altar-responses" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="followUpsNeededCount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Follow-ups Needed</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-follow-ups" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="winsNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wins & Highlights</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What went well this week?" {...field} data-testid="input-wins" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="concernsNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concerns</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any concerns or challenges?" {...field} data-testid="input-concerns" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextStepsNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Steps</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Plans for the coming week" {...field} data-testid="input-next-steps" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitMetricsMutation.isPending} data-testid="button-save-metrics">
                  {submitMetricsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Metrics
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
