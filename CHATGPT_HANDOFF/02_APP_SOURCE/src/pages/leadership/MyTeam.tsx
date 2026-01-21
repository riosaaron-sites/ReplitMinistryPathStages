import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { 
  Users, UserPlus, Clock, CheckCircle2, XCircle, 
  AlertCircle, Loader2, Mail, Phone, Calendar, Star,
  Shield, ChevronRight, MessageSquare, UserMinus, Send,
  GraduationCap, Circle, Heart, TrendingUp, TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import type { Ministry, User, RoleAssignment, TeamJoinRequest } from "@shared/schema";

const addMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  roleName: z.string().optional(),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
});

type MessageFormData = z.infer<typeof messageSchema>;

const feedbackSchema = z.object({
  memberId: z.string(),
  feedbackType: z.enum(['encouragement', 'acknowledgment', 'training_complete', 'survey_reviewed', 'question_followup']),
  message: z.string().min(1, "Message is required"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface HealthIndicator {
  overall: 'green' | 'yellow' | 'red';
  onboardingComplete: boolean;
  trainingProgress: number;
  serveRate: number;
  hasUnansweredQuestions: boolean;
  biblicalLiteracy?: {
    level: 'low' | 'developing' | 'strong';
    percentage: number;
    levelName: string;
  };
}

interface MemberWithHealth extends MemberWithUser {
  healthIndicator?: HealthIndicator;
}

function getOnboardingStatus(user?: User): { color: string; label: string; description: string } {
  if (!user) return { color: "bg-gray-400", label: "Unknown", description: "No user data" };
  
  if (user.onboardingStatus === 'completed' && user.status === 'active') {
    return { color: "bg-green-500", label: "Thriving", description: "Fully onboarded and actively serving" };
  }
  if (user.onboardingStatus === 'in-progress') {
    return { color: "bg-yellow-500", label: "Growing", description: "Still completing their journey" };
  }
  if (user.onboardingStatus === 'blocked' || user.status === 'inactive') {
    return { color: "bg-red-500", label: "Needs Care", description: "May be experiencing challenges" };
  }
  if (user.onboardingStatus === 'not-started') {
    return { color: "bg-blue-500", label: "New Friend", description: "Just beginning their journey" };
  }
  return { color: "bg-gray-400", label: "Unknown", description: "Status unknown" };
}

function getHealthColor(health: HealthIndicator['overall']): string {
  switch (health) {
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-500';
    case 'red': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

function getHealthLabel(health: HealthIndicator): string {
  if (health.overall === 'green') return 'Thriving - Growing in faith and service';
  if (health.overall === 'yellow') return 'Would benefit from encouragement';
  return 'May benefit from a caring conversation';
}

interface MemberWithUser extends RoleAssignment {
  user?: User;
  trainingProgress?: number;
}

interface JoinRequestWithUser extends TeamJoinRequest {
  user?: User;
}

function TeamMemberCard({ 
  member, 
  isLeader,
  healthIndicator,
  onRemove,
  onMessage,
  onFeedback,
}: { 
  member: MemberWithUser;
  isLeader?: boolean;
  healthIndicator?: HealthIndicator;
  onRemove?: () => void;
  onMessage?: () => void;
  onFeedback?: () => void;
}) {
  const user = member.user;
  const status = getOnboardingStatus(user);
  const trainingProgress = member.trainingProgress || 0;
  
  return (
    <Card className="hover-elevate" data-testid={`card-member-${member.userId}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${healthIndicator ? getHealthColor(healthIndicator.overall) : status.color}`}
                  data-testid={`status-${member.userId}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                {healthIndicator ? (
                  <div className="space-y-1">
                    <p className="font-medium">{getHealthLabel(healthIndicator)}</p>
                    <div className="text-xs space-y-0.5">
                      <p>Training: {healthIndicator.trainingProgress}%</p>
                      <p>Serve Rate: {healthIndicator.serveRate}%</p>
                      {healthIndicator.biblicalLiteracy && (
                        <p>Biblical Formation: {healthIndicator.biblicalLiteracy.levelName} ({healthIndicator.biblicalLiteracy.percentage}%)</p>
                      )}
                      {healthIndicator.hasUnansweredQuestions && (
                        <p className="text-amber-400">Has unanswered questions</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>{status.label}: {status.description}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{user?.firstName} {user?.lastName}</h3>
              {isLeader && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Leader
                </Badge>
              )}
              {member.roleName && (
                <Badge variant="outline" className="text-xs">{member.roleName}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {user?.email && (
                <a href={`mailto:${user.email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </a>
              )}
              {user?.phone && (
                <a href={`tel:${user.phone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="h-3 w-3" />
                  {user.phone}
                </a>
              )}
            </div>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  Training Progress
                </span>
                <span className="font-medium">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-1.5" />
            </div>
            
            {member.assignedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                <Calendar className="h-3 w-3 inline mr-1" />
                Joined {format(new Date(member.assignedAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      {(onMessage || onRemove || onFeedback) && (
        <CardFooter className="pt-0 gap-2">
          {onFeedback && (
            <Button size="sm" variant="outline" onClick={onFeedback} data-testid={`button-feedback-${member.userId}`}>
              <Heart className="h-3 w-3 mr-1" />
              Encourage
            </Button>
          )}
          {onMessage && (
            <Button size="sm" variant="outline" onClick={onMessage} data-testid={`button-message-${member.userId}`}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Button>
          )}
          {onRemove && !isLeader && (
            <Button size="sm" variant="ghost" onClick={onRemove} className="text-red-600 hover:text-red-700" data-testid={`button-remove-${member.userId}`}>
              <UserMinus className="h-3 w-3 mr-1" />
              Remove
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function JoinRequestCard({
  request,
  onApprove,
  onDecline,
  isLoading,
}: {
  request: JoinRequestWithUser;
  onApprove: () => void;
  onDecline: () => void;
  isLoading: boolean;
}) {
  const user = request.user;

  return (
    <Card className="border-amber-200 dark:border-amber-800" data-testid={`card-request-${request.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-lg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold">{user?.firstName} {user?.lastName}</h3>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {request.message && (
              <div className="mt-2 p-2 rounded bg-muted text-sm">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {request.message}
              </div>
            )}
            {request.createdAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Requested {format(new Date(request.createdAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button 
          size="sm" 
          onClick={onApprove} 
          disabled={isLoading}
          data-testid={`button-approve-${request.id}`}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onDecline} 
          disabled={isLoading}
          data-testid={`button-decline-${request.id}`}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}

function MinistryTeamSection({
  ministry,
  users,
}: {
  ministry: Ministry;
  users: User[];
}) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("members");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null);
  const [removeMember, setRemoveMember] = useState<MemberWithUser | null>(null);

  const addMemberForm = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', roleName: '' },
  });

  const messageForm = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { subject: '', content: '' },
  });

  const feedbackForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { memberId: '', feedbackType: 'encouragement', message: '' },
  });

  const { data: members, isLoading: membersLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/ministries", ministry.id, "members"],
  });

  const { data: teamHealth } = useQuery<Record<string, HealthIndicator>>({
    queryKey: ["/api/ministries", ministry.id, "team-health"],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<JoinRequestWithUser[]>({
    queryKey: ["/api/ministries", ministry.id, "join-requests"],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'declined' }) => {
      return apiRequest("PATCH", `/api/team-join-requests/${id}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries", ministry.id, "join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ministries", ministry.id, "members"] });
      toast({ 
        title: variables.status === 'approved' ? "Request Approved" : "Request Declined",
        description: variables.status === 'approved' 
          ? "The member has been added to your team." 
          : "The request has been declined."
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update request.", variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberFormData) => {
      const targetUser = users.find(u => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!targetUser) throw new Error("User not found with that email");
      return apiRequest("POST", "/api/role-assignments", {
        userId: targetUser.id,
        ministryId: ministry.id,
        roleName: data.roleName || "Team Member",
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries", ministry.id, "members"] });
      toast({ title: "Member Added", description: "The member has been added to your team." });
      setAddMemberOpen(false);
      addMemberForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add member.", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest("PATCH", `/api/role-assignments/${assignmentId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministries", ministry.id, "members"] });
      toast({ title: "Member Removed", description: "The member has been removed from the team." });
      setRemoveMember(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormData) => {
      return apiRequest("POST", "/api/messages", {
        ...data,
        messageType: selectedMember ? 'direct' : 'channel',
        recipientId: selectedMember?.userId,
        ministryId: selectedMember ? undefined : ministry.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Message Sent", description: "Your message has been sent successfully." });
      setMessageOpen(false);
      setSelectedMember(null);
      messageForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    },
  });

  const sendFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return apiRequest("POST", "/api/member-feedback", {
        memberId: data.memberId,
        feedbackType: data.feedbackType,
        message: data.message,
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Encouragement Sent", 
        description: "Your encouragement has been sent to the team member." 
      });
      setFeedbackOpen(false);
      setSelectedMember(null);
      feedbackForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send encouragement.", variant: "destructive" });
    },
  });

  const leader = ministry.leaderId ? users.find(u => u.id === ministry.leaderId) : undefined;
  const pendingRequests = (requests || []).filter(r => r.status === 'pending');

  return (
    <>
      <Card className="mb-6" data-testid={`section-ministry-${ministry.id}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {ministry.name}
              </CardTitle>
              <CardDescription className="mt-1">{ministry.category}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => { setSelectedMember(null); setMessageOpen(true); }}
                data-testid={`button-message-team-${ministry.id}`}
              >
                <Send className="h-4 w-4 mr-1" />
                Message Team
              </Button>
              <Button 
                size="sm"
                onClick={() => setAddMemberOpen(true)}
                data-testid={`button-add-member-${ministry.id}`}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingRequests.length} pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="members" data-testid={`tab-members-${ministry.id}`}>
                Team Members ({members?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="requests" data-testid={`tab-requests-${ministry.id}`}>
                Join Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              {membersLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {members.map(member => (
                    <TeamMemberCard 
                      key={member.id} 
                      member={member}
                      isLeader={member.userId === ministry.leaderId}
                      healthIndicator={teamHealth?.[member.userId]}
                      onMessage={() => { setSelectedMember(member); setMessageOpen(true); }}
                      onRemove={() => setRemoveMember(member)}
                      onFeedback={() => { 
                        setSelectedMember(member); 
                        feedbackForm.setValue('memberId', member.userId);
                        setFeedbackOpen(true); 
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No team members yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              {requestsLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingRequests.map(request => (
                    <JoinRequestCard
                      key={request.id}
                      request={request}
                      onApprove={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                      onDecline={() => updateRequestMutation.mutate({ id: request.id, status: 'declined' })}
                      isLoading={updateRequestMutation.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No pending join requests</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Team Member
            </DialogTitle>
            <DialogDescription>
              Add a member to {ministry.name} by their email address.
            </DialogDescription>
          </DialogHeader>
          <Form {...addMemberForm}>
            <form onSubmit={addMemberForm.handleSubmit((data) => addMemberMutation.mutate(data))} className="space-y-4">
              <FormField
                control={addMemberForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="member@email.com" 
                        {...field} 
                        data-testid="input-add-member-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addMemberForm.control}
                name="roleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-add-member-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Team Member">Team Member</SelectItem>
                        <SelectItem value="Greeter">Greeter</SelectItem>
                        <SelectItem value="Vocalist">Vocalist</SelectItem>
                        <SelectItem value="Instrumentalist">Instrumentalist</SelectItem>
                        <SelectItem value="Sound Tech">Sound Tech</SelectItem>
                        <SelectItem value="Camera Operator">Camera Operator</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Usher">Usher</SelectItem>
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Leader">Leader</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddMemberOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addMemberMutation.isPending} data-testid="button-submit-add-member">
                  {addMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <Dialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMember?.user?.firstName} {removeMember?.user?.lastName} from {ministry.name}? 
              They will lose access to team resources but can rejoin later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMember(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => removeMember && removeMemberMutation.mutate(removeMember.id)}
              disabled={removeMemberMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={(open) => { if (!open) { setMessageOpen(false); setSelectedMember(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedMember ? `Message ${selectedMember.user?.firstName}` : `Message ${ministry.name} Team`}
            </DialogTitle>
            <DialogDescription>
              {selectedMember 
                ? "Send a direct message to this team member."
                : "Send a message to all members of this ministry."}
            </DialogDescription>
          </DialogHeader>
          <Form {...messageForm}>
            <form onSubmit={messageForm.handleSubmit((data) => sendMessageMutation.mutate(data))} className="space-y-4">
              <FormField
                control={messageForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Message subject" 
                        {...field} 
                        data-testid="input-message-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={messageForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Type your message here..." 
                        className="min-h-[120px]"
                        {...field} 
                        data-testid="input-message-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setMessageOpen(false); setSelectedMember(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                  {sendMessageMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Send className="h-4 w-4 mr-1" />
                  Send Message
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Feedback/Encouragement Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={(open) => { setFeedbackOpen(open); if (!open) setSelectedMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Send Encouragement
            </DialogTitle>
            <DialogDescription>
              Send a word of encouragement to {selectedMember?.user?.firstName || 'this team member'}.
            </DialogDescription>
          </DialogHeader>
          <Form {...feedbackForm}>
            <form onSubmit={feedbackForm.handleSubmit((data) => sendFeedbackMutation.mutate(data))} className="space-y-4">
              <FormField
                control={feedbackForm.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Encouragement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feedback-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="encouragement">General Encouragement</SelectItem>
                        <SelectItem value="acknowledgment">Acknowledge Good Work</SelectItem>
                        <SelectItem value="training_complete">Training Completion</SelectItem>
                        <SelectItem value="question_followup">Follow-up to Questions</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={feedbackForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your encouragement here... (e.g., 'Great job leading worship last Sunday!')"
                        className="min-h-[120px]"
                        {...field} 
                        data-testid="input-feedback-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setFeedbackOpen(false); setSelectedMember(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendFeedbackMutation.isPending} data-testid="button-send-feedback">
                  {sendFeedbackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Heart className="h-4 w-4 mr-1" />
                  Send Encouragement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MyTeam() {
  const { user } = useAuth();
  const { isLeader } = useRole();

  const { data: ministries, isLoading: ministriesLoading } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter to ministries this user leads
  const myMinistries = (ministries || []).filter(m => 
    m.leaderId === user?.id && m.isActive
  );

  // For admins, show all ministries
  const isAdmin = ['admin', 'pastor', 'leader'].includes(user?.role || '');
  const displayMinistries = isAdmin ? (ministries || []).filter(m => m.isActive) : myMinistries;

  if (!isLeader) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">You need leadership permissions to access this page.</p>
      </div>
    );
  }

  if (ministriesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (displayMinistries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Team</h1>
          <p className="text-muted-foreground text-lg">Manage your ministry team members</p>
        </div>
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium text-lg">No Teams Assigned</h3>
          <p className="text-muted-foreground">
            You are not currently leading any ministry teams.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">My Team</h1>
        <p className="text-muted-foreground text-lg">
          {isAdmin 
            ? "Manage all ministry team members and join requests" 
            : "Manage your ministry team members and join requests"}
        </p>
      </div>

      {displayMinistries.map(ministry => (
        <MinistryTeamSection
          key={ministry.id}
          ministry={ministry}
          users={users || []}
        />
      ))}
    </div>
  );
}
