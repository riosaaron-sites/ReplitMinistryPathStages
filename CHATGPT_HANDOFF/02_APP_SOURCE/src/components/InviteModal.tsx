import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole } from "@/hooks/useRole";
import { 
  UserPlus, 
  Users, 
  Loader2, 
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import type { Ministry, MinistryLeadershipAssignment } from "@shared/schema";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

const singleInviteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  ministryIds: z.array(z.string()).optional(),
  roleType: z.enum(['member', 'leader']).optional(),
  roleName: z.string().optional(),
  message: z.string().optional(),
});

type SingleInviteFormData = z.infer<typeof singleInviteSchema>;

interface BulkInviteResult {
  created: Array<{ email: string; firstName?: string; lastName?: string }>;
  failed: Array<{ email: string; reason: string; line: number }>;
}

function parseInviteLine(line: string): { firstName?: string; lastName?: string; email: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Format: "John Doe <john@example.com>"
  const angleMatch = trimmed.match(/^(.+?)\s*<(.+?)>$/);
  if (angleMatch) {
    const nameParts = angleMatch[1].trim().split(/\s+/);
    const email = angleMatch[2].trim();
    if (nameParts.length >= 2) {
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        email,
      };
    } else if (nameParts.length === 1) {
      return {
        firstName: nameParts[0],
        email,
      };
    }
    return { email };
  }

  // Format: "John Doe, john@example.com"
  const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    const nameParts = commaMatch[1].trim().split(/\s+/);
    const potentialEmail = commaMatch[2].trim();
    if (potentialEmail.includes('@')) {
      if (nameParts.length >= 2) {
        return {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          email: potentialEmail,
        };
      } else if (nameParts.length === 1) {
        return {
          firstName: nameParts[0],
          email: potentialEmail,
        };
      }
    }
  }

  // Format: just email
  if (trimmed.includes('@') && !trimmed.includes(' ')) {
    return { email: trimmed };
  }

  // Format: "email@example.com" with spaces around it
  const emailOnly = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailOnly) {
    return { email: emailOnly[0] };
  }

  return null;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const { toast } = useToast();
  const { isAdmin, isPastoralRole } = useRole();
  const [activeTab, setActiveTab] = useState<string>("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkMinistryIds, setBulkMinistryIds] = useState<string[]>([]);
  const [bulkRoleType, setBulkRoleType] = useState<'member' | 'leader'>('member');
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkInviteResult | null>(null);
  const [pendingClientErrors, setPendingClientErrors] = useState<Array<{ email: string; reason: string; line: number }>>([]);

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: myLeadership = [] } = useQuery<MinistryLeadershipAssignment[]>({
    queryKey: ["/api/ministry-leadership/my"],
    enabled: !isAdmin && !isPastoralRole,
  });

  const availableMinistries = (isAdmin || isPastoralRole) 
    ? ministries 
    : ministries.filter(m => myLeadership.some(l => l.ministryId === m.id));

  const form = useForm<SingleInviteFormData>({
    resolver: zodResolver(singleInviteSchema),
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

  const createSingleInvite = useMutation({
    mutationFn: async (data: SingleInviteFormData) => {
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
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createBulkInvites = useMutation({
    mutationFn: async (invites: Array<{ firstName?: string; lastName?: string; email: string; ministryIds?: string[]; roleType?: string; message?: string }>) => {
      const response = await apiRequest("POST", "/api/team-invites/bulk", { invites });
      return response.json() as Promise<BulkInviteResult>;
    },
    onSuccess: (result) => {
      // Merge with any pending client-side parse errors
      const mergedFailed = [...pendingClientErrors, ...result.failed];
      const totalFailed = mergedFailed.length;
      
      setBulkResult({
        created: result.created,
        failed: mergedFailed,
      });
      setPendingClientErrors([]); // Clear pending errors after merge
      
      queryClient.invalidateQueries({ queryKey: ["/api/team-invites"] });
      if (result.created.length > 0) {
        toast({
          title: `Invited ${result.created.length} ${result.created.length === 1 ? 'person' : 'people'}`,
          description: totalFailed > 0 
            ? `${totalFailed} failed - see details below.`
            : "All invitations sent successfully.",
        });
      } else {
        toast({
          title: "No invitations sent",
          description: "All entries failed validation.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setPendingClientErrors([]); // Clear on error too
      toast({
        title: "Bulk invite failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSingleSubmit = (data: SingleInviteFormData) => {
    createSingleInvite.mutate(data);
  };

  const handleBulkSubmit = () => {
    const lines = bulkText.split('\n');
    const invites: Array<{ firstName?: string; lastName?: string; email: string; ministryIds?: string[]; roleType?: string; message?: string }> = [];
    const clientParseErrors: Array<{ email: string; reason: string; line: number }> = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines silently
      
      const parsed = parseInviteLine(line);
      if (parsed) {
        invites.push({
          ...parsed,
          ministryIds: bulkMinistryIds.length > 0 ? bulkMinistryIds : undefined,
          roleType: bulkRoleType,
          message: bulkMessage || undefined,
        });
      } else {
        // Track unparseable lines for user feedback
        clientParseErrors.push({
          email: trimmed.substring(0, 50),
          reason: 'Could not parse email address',
          line: index + 1,
        });
      }
    });

    if (invites.length === 0) {
      // Show parse errors if there are any
      if (clientParseErrors.length > 0) {
        setBulkResult({ created: [], failed: clientParseErrors });
      } else {
        toast({
          title: "No valid entries",
          description: "Please enter at least one valid email address.",
          variant: "destructive",
        });
      }
      return;
    }

    // Store client-side parse errors to be merged with server response in onSuccess
    setPendingClientErrors(clientParseErrors);
    createBulkInvites.mutate(invites);
  };

  const handleClose = () => {
    form.reset();
    setBulkText("");
    setPendingClientErrors([]);
    setBulkMinistryIds([]);
    setBulkRoleType('member');
    setBulkMessage("");
    setBulkResult(null);
    onClose();
  };

  const toggleMinistry = (ministryId: string, isChecked: boolean) => {
    if (isChecked) {
      setBulkMinistryIds([...bulkMinistryIds, ministryId]);
    } else {
      setBulkMinistryIds(bulkMinistryIds.filter(id => id !== ministryId));
    }
  };

  const parsedCount = bulkText.split('\n').filter(line => parseInviteLine(line) !== null).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite People
          </DialogTitle>
          <DialogDescription>
            Invite new volunteers and members to join your ministry portal
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" data-testid="tab-single-invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Single Invite
            </TabsTrigger>
            <TabsTrigger value="bulk" data-testid="tab-bulk-invite">
              <Users className="h-4 w-4 mr-2" />
              Bulk Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="flex-1 overflow-auto mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSingleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-invite-firstname" />
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
                          <Input placeholder="Doe" {...field} data-testid="input-invite-lastname" />
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
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-invite-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {availableMinistries.length > 0 && (
                  <FormField
                    control={form.control}
                    name="ministryIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Ministries</FormLabel>
                        <ScrollArea className="h-32 border rounded-md p-3">
                          <div className="space-y-2">
                            {availableMinistries.map((ministry) => (
                              <div key={ministry.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`single-ministry-${ministry.id}`}
                                  checked={field.value?.includes(ministry.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), ministry.id]);
                                    } else {
                                      field.onChange(field.value?.filter((id: string) => id !== ministry.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`single-ministry-${ministry.id}`} className="text-sm cursor-pointer">
                                  {ministry.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <FormDescription>Select the ministries this person will serve in</FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role-type">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Team Member</SelectItem>
                            {(isAdmin || isPastoralRole) && <SelectItem value="leader">Leader</SelectItem>}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Title (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Worship Leader" {...field} data-testid="input-role-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Message (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a personal note to include in the invitation email..."
                          {...field}
                          data-testid="input-invite-message"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-invite">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSingleInvite.isPending} data-testid="button-send-invite">
                    {createSingleInvite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Invitation
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="bulk" className="flex-1 overflow-auto mt-4">
            {bulkResult ? (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>{bulkResult.created.length}</strong> invitation{bulkResult.created.length !== 1 ? 's' : ''} sent successfully
                  </AlertDescription>
                </Alert>

                {bulkResult.failed.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{bulkResult.failed.length}</strong> failed:
                      <ul className="mt-2 space-y-1 text-sm">
                        {bulkResult.failed.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">Line {f.line}:</span>
                            <span>{f.email}</span>
                            <span className="text-destructive">- {f.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setBulkResult(null); setBulkText(""); }}>
                    Invite More
                  </Button>
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paste one person per line</label>
                  <Textarea
                    placeholder={`John Doe <john@example.com>
jane@example.com
Bob Smith, bob@example.com`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    data-testid="input-bulk-invites"
                  />
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Supported formats: "Name &lt;email&gt;", "email", "Name, email"
                    {parsedCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{parsedCount} valid</Badge>
                    )}
                  </div>
                </div>

                {availableMinistries.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign to Ministries</label>
                    <ScrollArea className="h-32 border rounded-md p-3">
                      <div className="space-y-2">
                        {availableMinistries.map((ministry) => (
                          <div key={ministry.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bulk-ministry-${ministry.id}`}
                              checked={bulkMinistryIds.includes(ministry.id)}
                              onCheckedChange={(checked) => toggleMinistry(ministry.id, !!checked)}
                            />
                            <label htmlFor={`bulk-ministry-${ministry.id}`} className="text-sm cursor-pointer">
                              {ministry.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role Type</label>
                    <Select value={bulkRoleType} onValueChange={(v) => setBulkRoleType(v as 'member' | 'leader')}>
                      <SelectTrigger data-testid="select-bulk-role-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Team Member</SelectItem>
                        {(isAdmin || isPastoralRole) && <SelectItem value="leader">Leader</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Personal Message (optional, applies to all)</label>
                  <Textarea
                    placeholder="Add a personal note to include in all invitation emails..."
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    data-testid="input-bulk-message"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleClose} data-testid="button-cancel-bulk">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkSubmit} 
                    disabled={createBulkInvites.isPending || parsedCount === 0}
                    data-testid="button-send-bulk-invites"
                  >
                    {createBulkInvites.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send {parsedCount} Invitation{parsedCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
