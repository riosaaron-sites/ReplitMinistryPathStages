import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart3,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  Droplets,
  Flame,
  Heart,
} from "lucide-react";

interface AttendanceReport {
  id: string;
  eventDate: string;
  eventType: string;
  totalCount?: number;
  adultCount?: number;
  childCount?: number;
  youthCount?: number;
  visitorCount?: number;
  salvations?: number;
  waterBaptisms?: number;
  spiritBaptisms?: number;
  notes?: string;
  submittedBy: string;
  createdAt: string;
}

const attendanceFormSchema = z.object({
  eventDate: z.string().min(1, "Date is required"),
  eventType: z.string().min(1, "Event type is required"),
  adultCount: z.coerce.number().min(0).optional(),
  childCount: z.coerce.number().min(0).optional(),
  youthCount: z.coerce.number().min(0).optional(),
  visitorCount: z.coerce.number().min(0).optional(),
  salvations: z.coerce.number().min(0).optional(),
  waterBaptisms: z.coerce.number().min(0).optional(),
  spiritBaptisms: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceFormSchema>;

const EVENT_TYPES = [
  { value: 'sunday-service', label: 'Sunday Service' },
  { value: 'wednesday-service', label: 'Wednesday Service' },
  { value: 'youth-service', label: 'Youth Service' },
  { value: 'kids-ministry', label: 'Kids Ministry' },
  { value: 'small-group', label: 'Small Group' },
  { value: 'special-event', label: 'Special Event' },
  { value: 'outreach', label: 'Outreach' },
];

export default function MetricsDashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<string>("30");
  const { toast } = useToast();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      eventDate: new Date().toISOString().split('T')[0],
      eventType: 'sunday-service',
      adultCount: 0,
      childCount: 0,
      youthCount: 0,
      visitorCount: 0,
      salvations: 0,
      waterBaptisms: 0,
      spiritBaptisms: 0,
      notes: '',
    },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  const { data: reports = [], isLoading } = useQuery<AttendanceReport[]>({
    queryKey: ["/api/attendance", { start: startDate.toISOString() }],
  });

  const createReport = useMutation({
    mutationFn: async (data: AttendanceFormData) => {
      return apiRequest("POST", "/api/attendance", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Report Submitted",
        description: "Attendance report has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttendanceFormData) => {
    createReport.mutate(data);
  };

  const totalAttendance = reports.reduce((sum, r) => sum + (r.totalCount || 0), 0);
  const avgAttendance = reports.length > 0 ? Math.round(totalAttendance / reports.length) : 0;
  const totalSalvations = reports.reduce((sum, r) => sum + (r.salvations || 0), 0);
  const totalWaterBaptisms = reports.reduce((sum, r) => sum + (r.waterBaptisms || 0), 0);
  const totalSpiritBaptisms = reports.reduce((sum, r) => sum + (r.spiritBaptisms || 0), 0);
  const totalVisitors = reports.reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  if (isLoading) {
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Metrics & Attendance
          </h1>
          <p className="text-muted-foreground">
            Track attendance, decisions, and ministry growth
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32" data-testid="select-date-range">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-report">
                <Plus className="w-4 h-4 mr-2" />
                Log Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Attendance Report</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-event-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-event-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EVENT_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="adultCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adults</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" data-testid="input-adult-count" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="youthCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Youth</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" data-testid="input-youth-count" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="childCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Children</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" data-testid="input-child-count" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="visitorCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visitors</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" data-testid="input-visitor-count" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Decisions & Milestones</p>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="salvations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salvations</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" data-testid="input-salvations" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterBaptisms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Baptisms</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" data-testid="input-water-baptisms" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="spiritBaptisms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spirit Baptisms</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" data-testid="input-spirit-baptisms" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional notes..." className="resize-none" data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={createReport.isPending} data-testid="button-submit-report">
                      {createReport.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Report
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{avgAttendance}</p>
                <p className="text-xs text-muted-foreground">Avg Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalVisitors}</p>
                <p className="text-xs text-muted-foreground">Total Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSalvations}</p>
                <p className="text-xs text-muted-foreground">Salvations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalWaterBaptisms}</p>
                <p className="text-xs text-muted-foreground">Water Baptisms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSpiritBaptisms}</p>
                <p className="text-xs text-muted-foreground">Spirit Baptisms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{reports.length}</p>
                <p className="text-xs text-muted-foreground">Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Attendance logs from the last {dateRange} days</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No reports yet</p>
              <p className="text-sm">Start logging attendance to see data here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`report-${report.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {EVENT_TYPES.find(t => t.value === report.eventType)?.label || report.eventType}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.eventDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{report.totalCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    {(report.salvations || 0) > 0 && (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <Heart className="w-3 h-3 mr-1" />
                        {report.salvations}
                      </Badge>
                    )}
                    {(report.waterBaptisms || 0) > 0 && (
                      <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                        <Droplets className="w-3 h-3 mr-1" />
                        {report.waterBaptisms}
                      </Badge>
                    )}
                    {(report.spiritBaptisms || 0) > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        <Flame className="w-3 h-3 mr-1" />
                        {report.spiritBaptisms}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
