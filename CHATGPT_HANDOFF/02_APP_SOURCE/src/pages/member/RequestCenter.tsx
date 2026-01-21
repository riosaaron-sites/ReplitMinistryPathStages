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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  HelpCircle,
  Plus,
  Megaphone,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface SupportRequest {
  id: string;
  requestType: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  eventDate?: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

const requestFormSchema = z.object({
  requestType: z.enum(['media-announcement', 'support-volunteers', 'resources-supplies']),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  volunteersNeeded: z.coerce.number().optional(),
  eventDate: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestFormSchema>;

const REQUEST_TYPE_CONFIG: Record<string, { icon: any; label: string; description: string }> = {
  'media-announcement': {
    icon: Megaphone,
    label: 'Media/Announcement',
    description: 'Request slides, bulletin announcements, or social media posts',
  },
  'support-volunteers': {
    icon: Users,
    label: 'Support Volunteers',
    description: 'Request additional volunteers for an event or ministry',
  },
  'resources-supplies': {
    icon: Package,
    label: 'Resources/Supplies',
    description: 'Request equipment, materials, or other supplies',
  },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  'new': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
  'in-review': { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  'approved': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  'in-progress': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Clock },
  'completed': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  'declined': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function RequestCenter() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      requestType: 'media-announcement',
      title: '',
      description: '',
      priority: 'normal',
    },
  });

  const { data: requests = [], isLoading } = useQuery<SupportRequest[]>({
    queryKey: ["/api/requests"],
  });

  const createRequest = useMutation({
    mutationFn: async (data: RequestFormData) => {
      return apiRequest("POST", "/api/requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Request Submitted",
        description: "Your request has been submitted and will be reviewed soon.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    createRequest.mutate(data);
  };

  const filteredRequests = activeTab === 'all' 
    ? requests 
    : requests.filter(r => r.requestType === activeTab);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

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
            <HelpCircle className="w-6 h-6" />
            Request Center
          </h1>
          <p className="text-muted-foreground">
            Ask for help with announcements, volunteers, or supplies
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-request">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="requestType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-request-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(REQUEST_TYPE_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="w-4 h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief description of your request" data-testid="input-request-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Provide additional details..." 
                          className="resize-none"
                          data-testid="textarea-request-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('requestType') === 'support-volunteers' && (
                  <FormField
                    control={form.control}
                    name="volunteersNeeded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volunteers Needed</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" placeholder="Number of volunteers" data-testid="input-volunteers-needed" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-event-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createRequest.isPending} data-testid="button-submit-request">
                    {createRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          {Object.entries(REQUEST_TYPE_CONFIG).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1">
              <config.icon className="w-4 h-4" />
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No Requests Yet</p>
                <p className="text-muted-foreground mb-4">
                  Need help with something? Create a new request.
                </p>
                <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-request">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map(request => {
                const typeConfig = REQUEST_TYPE_CONFIG[request.requestType] || REQUEST_TYPE_CONFIG['media-announcement'];
                const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG['new'];
                const TypeIcon = typeConfig.icon;
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{request.title}</CardTitle>
                            <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
                          </div>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {request.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    {request.description && (
                      <CardContent className="pb-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.description}
                        </p>
                      </CardContent>
                    )}
                    <CardFooter className="pt-2 text-xs text-muted-foreground flex justify-between">
                      <span>Submitted {getTimeAgo(request.createdAt)}</span>
                      {request.priority && request.priority !== 'normal' && (
                        <Badge variant="outline" className="text-xs">
                          {request.priority}
                        </Badge>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
