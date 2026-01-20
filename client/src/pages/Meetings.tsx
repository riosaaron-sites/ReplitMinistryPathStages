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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isToday, isTomorrow, isPast, isFuture, addDays } from "date-fns";
import { Loader2, Plus, Calendar, Clock, MapPin, Users, Video, ChevronRight, CheckCircle } from "lucide-react";
import type { Meeting, User, Ministry } from "@shared/schema";
import { insertMeetingSchema } from "@shared/schema";
import { z } from "zod";
import { HelpLink } from "@/components/HelpLink";

const formSchema = insertMeetingSchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
});

type FormData = z.infer<typeof formSchema>;

function formatMeetingDate(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

function MeetingCard({ 
  meeting, 
  organizer,
  isOwner,
  onView
}: { 
  meeting: Meeting; 
  organizer?: User;
  isOwner: boolean;
  onView: () => void;
}) {
  const isPastMeeting = isPast(new Date(meeting.scheduledDate));
  
  return (
    <Card className="hover-elevate" data-testid={`card-meeting-${meeting.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
              {isPastMeeting && (
                <Badge variant="secondary" className="text-xs">Past</Badge>
              )}
              {meeting.isVirtual && (
                <Badge variant="outline" className="text-xs">Virtual</Badge>
              )}
            </div>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatMeetingDate(meeting.scheduledDate)}
              {meeting.duration && ` • ${meeting.duration} min`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onView} data-testid={`button-view-meeting-${meeting.id}`}>
            View
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {meeting.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{meeting.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {meeting.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{meeting.location}</span>
            </div>
          )}
          {meeting.virtualLink && (
            <div className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              <span>Virtual</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          {organizer && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={organizer.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{organizer.firstName?.[0]}{organizer.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {organizer.firstName} {organizer.lastName}
              </span>
            </div>
          )}
          {isOwner && (
            <Badge variant="outline" className="text-xs">Organizer</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Meetings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAccessLeadershipPortal } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      scheduledDate: new Date(),
      duration: 60,
      location: "",
      virtualLink: "",
      ministryId: null,
      isVirtual: false,
    },
  });

  const { data: meetings, isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/meetings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting Scheduled", description: "Your meeting has been created." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create meeting.", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset({
      title: "",
      description: "",
      scheduledDate: new Date(),
      duration: 60,
      location: "",
      virtualLink: "",
      ministryId: null,
      isVirtual: false,
    });
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

  const now = new Date();
  const upcomingMeetings = (meetings || [])
    .filter(m => isFuture(new Date(m.scheduledDate)) || isToday(new Date(m.scheduledDate)))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  
  const pastMeetings = (meetings || [])
    .filter(m => isPast(new Date(m.scheduledDate)) && !isToday(new Date(m.scheduledDate)))
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const myMeetings = (meetings || []).filter(m => m.organizerId === user?.id);
  
  const getUserById = (userId: string | null) => userId ? users?.find(u => u.id === userId) : undefined;

  const todaysMeetings = upcomingMeetings.filter(m => isToday(new Date(m.scheduledDate)));
  const thisWeekMeetings = upcomingMeetings.filter(m => {
    const meetingDate = new Date(m.scheduledDate);
    const weekFromNow = addDays(now, 7);
    return isFuture(meetingDate) && meetingDate <= weekFromNow;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Meetings</h1>
            <p className="text-muted-foreground">View and manage your meetings</p>
          </div>
          <HelpLink category="workboards" tooltip="Meeting Help" />
        </div>
        {canAccessLeadershipPortal && (
          <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : closeDialog()}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-meeting">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule a Meeting</DialogTitle>
                <DialogDescription>
                  Create a new meeting for your team or ministry.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Weekly Team Huddle" {...field} data-testid="input-meeting-title" />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What's this meeting about?" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-meeting-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date & Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              value={field.value ? format(new Date(field.value), "yyyy-MM-dd'T'HH:mm") : ""}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              data-testid="input-meeting-datetime" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (min)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value || 60}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                              data-testid="input-meeting-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Room 101 or Virtual" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-meeting-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="virtualLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Link (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://zoom.us/j/..." 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-meeting-url"
                          />
                        </FormControl>
                        <FormDescription>Zoom, Google Meet, or other video link</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ministryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ministry (optional)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "__none__" ? null : v)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-meeting-ministry">
                              <SelectValue placeholder="Select ministry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">All / General</SelectItem>
                            {ministries?.map(ministry => (
                              <SelectItem key={ministry.id} value={ministry.id}>{ministry.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-save-meeting"
                    >
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Schedule Meeting
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-today">{todaysMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-this-week">{thisWeekMeetings.length}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-my-meetings">{myMeetings.length}</p>
                <p className="text-sm text-muted-foreground">My Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-past">{pastMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
          <TabsTrigger value="past" data-testid="tab-past">Past ({pastMeetings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
                <p className="text-muted-foreground mb-4">
                  There are no meetings scheduled right now.
                </p>
                {canAccessLeadershipPortal && (
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-schedule-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Your First Meeting
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  organizer={getUserById(meeting.organizerId)}
                  isOwner={meeting.organizerId === user?.id}
                  onView={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Past Meetings</h3>
                <p className="text-muted-foreground">
                  Completed meetings will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  organizer={getUserById(meeting.organizerId)}
                  isOwner={meeting.organizerId === user?.id}
                  onView={() => setSelectedMeeting(meeting)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
            <DialogDescription>
              {selectedMeeting && formatMeetingDate(selectedMeeting.scheduledDate)}
              {selectedMeeting?.duration && ` • ${selectedMeeting.duration} minutes`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMeeting?.description && (
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedMeeting.description}</p>
              </div>
            )}
            
            {selectedMeeting?.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedMeeting.location}</span>
              </div>
            )}

            {selectedMeeting?.virtualLink && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <a 
                  href={selectedMeeting.virtualLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join Virtual Meeting
                </a>
              </div>
            )}

            {selectedMeeting?.organizerId && (
              <div className="flex items-center gap-3 pt-4 border-t">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getUserById(selectedMeeting.organizerId)?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {getUserById(selectedMeeting.organizerId)?.firstName?.[0]}
                    {getUserById(selectedMeeting.organizerId)?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {getUserById(selectedMeeting.organizerId)?.firstName} {getUserById(selectedMeeting.organizerId)?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Organizer</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMeeting(null)}>
              Close
            </Button>
            {selectedMeeting?.virtualLink && (
              <Button asChild data-testid="button-join-meeting">
                <a href={selectedMeeting.virtualLink} target="_blank" rel="noopener noreferrer">
                  <Video className="w-4 h-4 mr-2" />
                  Join Meeting
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
