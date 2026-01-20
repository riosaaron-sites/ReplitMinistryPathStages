import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Users,
  Copy,
  ExternalLink,
  Church,
  RefreshCw,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import type { TeamInvite, Ministry, InviteMinistryAssignment } from "@shared/schema";

const inviteFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  ministryIds: z.array(z.string()).optional(),
  roleType: z.enum(['member', 'leader']).optional(),
  roleName: z.string().optional(),
  message: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case 'accepted':
      return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Accepted</Badge>;
    case 'declined':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Declined</Badge>;
    case 'expired':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function InviteManagement() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  const { data: invites = [], isLoading: loadingInvites } = useQuery<TeamInvite[]>({
    queryKey: ["/api/team-invites"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      ministryIds: [],
      roleType: "member",
      roleName: "",
      message: "",
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await apiRequest("POST", "/api/team-invites", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "An email has been sent with instructions to join.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-invites"] });
      form.reset();
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      setResendingInviteId(inviteId);
      const response = await apiRequest("POST", `/api/team-invites/${inviteId}/resend`);
      return response.json();
    },
    onSuccess: () => {
      setResendingInviteId(null);
      toast({
        title: "Invitation resent!",
        description: "A new email has been sent to the invitee.",
      });
    },
    onError: (error: Error) => {
      setResendingInviteId(null);
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await apiRequest("DELETE", `/api/team-invites/${inviteId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been removed. The old invite link will no longer work.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team-invites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    createInviteMutation.mutate(data);
  };

  const copyInviteLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "The invite link has been copied to your clipboard.",
    });
  };

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const completedInvites = invites.filter(i => i.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invite People</h1>
          <p className="text-muted-foreground">
            Invite new volunteers and members to join your ministry portal
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-new-invite">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Someone
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send an Invitation
            </CardTitle>
            <CardDescription>
              Fill in their details below. They'll receive an email with a link to create their account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            {...field} 
                            data-testid="input-invite-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Smith" 
                            {...field} 
                            data-testid="input-invite-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john.smith@example.com" 
                          {...field} 
                          data-testid="input-invite-email"
                        />
                      </FormControl>
                      <FormDescription>
                        They'll receive an invitation email at this address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Ministry Pre-Selection */}
                <FormField
                  control={form.control}
                  name="ministryIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Church className="h-4 w-4" />
                        Pre-Select Ministry Teams (Optional)
                      </FormLabel>
                      <FormDescription className="mb-2">
                        These ministries will be automatically selected for the new member
                      </FormDescription>
                      <FormControl>
                        <ScrollArea className="h-48 border rounded-lg p-3">
                          <div className="space-y-2">
                            {ministries.map((ministry) => {
                              const isChecked = field.value?.includes(ministry.id) || false;
                              return (
                                <label
                                  key={ministry.id}
                                  htmlFor={`ministry-checkbox-${ministry.id}`}
                                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    isChecked ? 'bg-primary/10' : 'hover:bg-muted/50'
                                  }`}
                                  data-testid={`checkbox-ministry-invite-${ministry.id}`}
                                >
                                  <Checkbox
                                    id={`ministry-checkbox-${ministry.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, ministry.id]);
                                      } else {
                                        field.onChange(current.filter(id => id !== ministry.id));
                                      }
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{ministry.name}</p>
                                    {ministry.category && (
                                      <p className="text-xs text-muted-foreground">{ministry.category}</p>
                                    )}
                                  </div>
                                  {isChecked && (
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </FormControl>
                      {(field.value?.length || 0) > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {field.value?.length} ministries selected
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invite-role-type">
                              <SelectValue placeholder="Select role type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Team Member</SelectItem>
                            <SelectItem value="leader">Ministry Leader</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Title (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Volunteer, Team Lead, Greeter" 
                            {...field} 
                            data-testid="input-invite-role"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a personal welcome message..." 
                          className="resize-none"
                          {...field} 
                          data-testid="textarea-invite-message"
                        />
                      </FormControl>
                      <FormDescription>
                        This will be included in the invitation email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInviteMutation.isPending}
                    data-testid="button-send-invite"
                  >
                    {createInviteMutation.isPending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedInvites.filter(i => i.status === 'accepted').length}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invites.length}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              These people haven't accepted their invitation yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                // Handle both old format (string[]) and new format (InviteMinistryAssignment[])
                const rawMinistries = invite.ministries || [];
                const inviteMinistries = rawMinistries
                  .map(item => {
                    const ministryId = typeof item === 'string' ? item : (item as InviteMinistryAssignment).ministryId;
                    return ministries.find(m => m.id === ministryId);
                  })
                  .filter(Boolean) as Ministry[];
                return (
                  <div 
                    key={invite.id} 
                    className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg"
                    data-testid={`invite-pending-${invite.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{invite.firstName} {invite.lastName}</p>
                        {invite.roleType === 'leader' && (
                          <Badge variant="default" className="text-xs">Leader</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{invite.email}</p>
                      {inviteMinistries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {inviteMinistries.map(m => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invite.status || 'pending')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resendInviteMutation.mutate(invite.id)}
                        disabled={resendingInviteId === invite.id}
                        data-testid={`button-resend-${invite.id}`}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${resendingInviteId === invite.id ? 'animate-spin' : ''}`} />
                        Resend
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyInviteLink(invite.token)}
                        data-testid={`button-copy-link-${invite.id}`}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to cancel the invitation for ${invite.firstName} ${invite.lastName}? The old invite link will no longer work.`)) {
                            cancelInviteMutation.mutate(invite.id);
                          }
                        }}
                        disabled={cancelInviteMutation.isPending}
                        data-testid={`button-cancel-${invite.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedInvites.map((invite) => {
                // Handle both old format (string[]) and new format (InviteMinistryAssignment[])
                const rawMinistries = invite.ministries || [];
                const inviteMinistries = rawMinistries
                  .map(item => {
                    const ministryId = typeof item === 'string' ? item : (item as InviteMinistryAssignment).ministryId;
                    return ministries.find(m => m.id === ministryId);
                  })
                  .filter(Boolean) as Ministry[];
                return (
                  <div 
                    key={invite.id} 
                    className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg"
                    data-testid={`invite-history-${invite.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{invite.firstName} {invite.lastName}</p>
                        {invite.roleType === 'leader' && (
                          <Badge variant="default" className="text-xs">Leader</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{invite.email}</p>
                      {inviteMinistries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {inviteMinistries.map(m => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(invite.status || 'pending')}
                      {invite.acceptedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(invite.acceptedAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingInvites && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitations...</p>
          </CardContent>
        </Card>
      )}

      {!loadingInvites && invites.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No invitations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start inviting people to join your ministry portal
            </p>
            <Button onClick={() => setShowForm(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Your First Invitation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
