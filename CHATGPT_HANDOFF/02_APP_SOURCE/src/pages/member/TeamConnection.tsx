import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, Search, Shield, Clock, CheckCircle2, XCircle, 
  ArrowRight, UserPlus, Heart, Star, AlertCircle, Loader2,
  ChevronRight, Baby, GraduationCap, Music, Coffee, Wrench,
  BookOpen
} from "lucide-react";
import type { Ministry, User, RoleAssignment, TeamJoinRequest } from "@shared/schema";

interface MemberWithUser extends RoleAssignment {
  user?: User;
}

interface JoinRequestWithUser extends TeamJoinRequest {
  user?: User;
}

const CATEGORY_ICONS: Record<string, any> = {
  "Children & Youth": Baby,
  "Worship & Creative Arts": Music,
  "Guest Services": Heart,
  "Operations & Facilities": Wrench,
  "Hospitality": Coffee,
  "Discipleship & Groups": GraduationCap,
  "default": Users,
};

function MinistryCard({ 
  ministry, 
  memberCount, 
  leader,
  myAssignments,
  myRequests,
  onViewDetails,
  onJoinRequest,
}: { 
  ministry: Ministry;
  memberCount: number;
  leader?: User;
  myAssignments: RoleAssignment[];
  myRequests: TeamJoinRequest[];
  onViewDetails: () => void;
  onJoinRequest: () => void;
}) {
  const isMember = myAssignments.some(a => a.ministryId === ministry.id && a.isActive);
  const hasPendingRequest = myRequests.some(r => r.ministryId === ministry.id && r.status === 'pending');
  const CategoryIcon = CATEGORY_ICONS[ministry.category] || CATEGORY_ICONS.default;

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-ministry-${ministry.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <CategoryIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{ministry.name}</CardTitle>
              {isMember && (
                <Badge variant="default" className="text-xs" data-testid={`badge-member-${ministry.id}`}>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Member
                </Badge>
              )}
              {hasPendingRequest && (
                <Badge variant="secondary" className="text-xs" data-testid={`badge-pending-${ministry.id}`}>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">{ministry.category}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ministry.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{ministry.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{memberCount} members</span>
          </div>
          {leader && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              <span>Led by {leader.firstName}</span>
            </div>
          )}
        </div>
        {(ministry.requiresBackgroundCheck || ministry.minimumAge) && (
          <div className="flex flex-wrap gap-2">
            {ministry.requiresBackgroundCheck && (
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Background Check
              </Badge>
            )}
            {ministry.minimumAge && (
              <Badge variant="outline" className="text-xs">
                {ministry.minimumAge}+ years
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2 flex-wrap">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onViewDetails}
          data-testid={`button-view-${ministry.id}`}
        >
          View Team
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        {!isMember && !hasPendingRequest && (
          <Button 
            size="sm" 
            onClick={onJoinRequest}
            data-testid={`button-join-${ministry.id}`}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Request to Join
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function TeamRosterDialog({
  ministry,
  members,
  leader,
  isOpen,
  onClose,
}: {
  ministry: Ministry;
  members: MemberWithUser[];
  leader?: User;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {ministry.name} Team
          </DialogTitle>
          <DialogDescription>
            {ministry.category} • {members.length} members
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {leader && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Team Leader</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={leader.profileImageUrl || undefined} />
                  <AvatarFallback>{leader.firstName?.[0]}{leader.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{leader.firstName} {leader.lastName}</p>
                  <p className="text-sm text-muted-foreground">{leader.email}</p>
                </div>
              </div>
            </div>
          )}
          
          {members.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Team Members</p>
              <div className="grid gap-2">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    data-testid={`member-${member.userId}`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.user?.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {member.user?.firstName?.[0]}{member.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {member.user?.firstName} {member.user?.lastName}
                      </p>
                      {member.roleName && (
                        <p className="text-xs text-muted-foreground">{member.roleName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Be the first to join!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ROLE_OPTIONS: Record<string, string[]> = {
  "Worship & Creative Arts": ["Vocalist", "Instrumentalist", "Sound Tech", "Camera Operator", "Lighting Tech", "ProPresenter Operator", "Photographer"],
  "Guest Services": ["Greeter", "Usher", "Security", "Parking Team", "Information Desk"],
  "Children & Youth": ["Teacher", "Small Group Leader", "Check-in Volunteer", "Nursery Volunteer", "Youth Leader"],
  "Hospitality": ["Host", "Food Prep", "Setup/Cleanup", "Cafe Team"],
  "Operations & Facilities": ["Setup Team", "Maintenance", "Grounds", "Tech Support"],
  "Discipleship & Groups": ["Small Group Leader", "Study Guide", "Mentor", "Prayer Partner"],
  "default": ["Team Member", "Volunteer", "Support"],
};

function JoinRequestDialog({
  ministry,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: {
  ministry: Ministry | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, preferredRole?: string) => void;
  isPending: boolean;
}) {
  const [message, setMessage] = useState("");
  const [preferredRole, setPreferredRole] = useState("");

  const handleSubmit = () => {
    onSubmit(message, preferredRole || undefined);
    setMessage("");
    setPreferredRole("");
  };

  if (!ministry) return null;

  const roleOptions = ROLE_OPTIONS[ministry.category] || ROLE_OPTIONS.default;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join {ministry.name}
          </DialogTitle>
          <DialogDescription>
            Submit a request to join this team. The ministry leader will review your request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {(ministry.requiresBackgroundCheck || ministry.requiresSpiritBaptism) && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Requirements</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {ministry.requiresBackgroundCheck && (
                      <li>• Background check required</li>
                    )}
                    {ministry.requiresSpiritBaptism && (
                      <li>• Spirit Baptism affirmation required</li>
                    )}
                    {ministry.minimumAge && (
                      <li>• Must be {ministry.minimumAge}+ years old</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Role</label>
            <select 
              value={preferredRole}
              onChange={(e) => setPreferredRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="select-preferred-role"
            >
              <option value="">Select a role (optional)</option>
              {roleOptions.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              This helps the leader know what role you're interested in
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Why do you want to join? (optional)</label>
            <Textarea
              placeholder="Share a bit about yourself or why you're interested in this ministry..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="input-join-message"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">Training Included</p>
                <p className="text-muted-foreground mt-1">
                  Once approved, you'll be enrolled in the required training modules for this ministry.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-request">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const { data: ministries, isLoading: ministriesLoading } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: myAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: myRequests } = useQuery<TeamJoinRequest[]>({
    queryKey: ["/api/team-join-requests/my"],
  });

  const { data: memberCounts } = useQuery<{ ministryId: string; count: number }[]>({
    queryKey: ["/api/ministries/member-counts"],
  });

  const { data: selectedMembers } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/ministries", selectedMinistry?.id, "members"],
    enabled: !!selectedMinistry && showRosterDialog,
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { ministryId: string; message?: string; preferredRole?: string }) => {
      return apiRequest("POST", "/api/team-join-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-join-requests/my"] });
      toast({ title: "Request Sent!", description: "The team leader will review your request." });
      setShowJoinDialog(false);
      setSelectedMinistry(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Request Failed", 
        description: error.message || "Could not submit join request.", 
        variant: "destructive" 
      });
    },
  });

  const activeMinistries = (ministries || []).filter(m => m.isActive);
  const categories = ["all", ...Array.from(new Set(activeMinistries.map(m => m.category)))];

  const filteredMinistries = activeMinistries.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getMemberCount = (ministryId: string) => {
    const countEntry = memberCounts?.find(c => c.ministryId === ministryId);
    return countEntry?.count || 0;
  };

  const getLeader = (leaderId: string | null) => {
    return leaderId ? users?.find(u => u.id === leaderId) : undefined;
  };

  const handleViewDetails = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setShowRosterDialog(true);
  };

  const handleJoinRequest = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setShowJoinDialog(true);
  };

  const handleSubmitJoin = (message: string, preferredRole?: string) => {
    if (selectedMinistry) {
      joinMutation.mutate({ 
        ministryId: selectedMinistry.id, 
        message: message || undefined,
        preferredRole 
      });
    }
  };

  if (ministriesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pendingRequests = (myRequests || []).filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Team Connection</h1>
        <p className="text-muted-foreground text-lg">
          Browse ministry teams and find your place to serve
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pendingRequests.map(request => {
                const ministry = ministries?.find(m => m.id === request.ministryId);
                return (
                  <Badge key={request.id} variant="secondary" className="text-sm py-1">
                    {ministry?.name || "Unknown"}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ministries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-sm" data-testid={`tab-${cat}`}>
              {cat === "all" ? "All Teams" : cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredMinistries.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg">No teams found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMinistries.map(ministry => (
                <MinistryCard
                  key={ministry.id}
                  ministry={ministry}
                  memberCount={getMemberCount(ministry.id)}
                  leader={getLeader(ministry.leaderId)}
                  myAssignments={myAssignments || []}
                  myRequests={myRequests || []}
                  onViewDetails={() => handleViewDetails(ministry)}
                  onJoinRequest={() => handleJoinRequest(ministry)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedMinistry && (
        <>
          <TeamRosterDialog
            ministry={selectedMinistry}
            members={selectedMembers || []}
            leader={getLeader(selectedMinistry.leaderId)}
            isOpen={showRosterDialog}
            onClose={() => {
              setShowRosterDialog(false);
              setSelectedMinistry(null);
            }}
          />
          <JoinRequestDialog
            ministry={selectedMinistry}
            isOpen={showJoinDialog}
            onClose={() => {
              setShowJoinDialog(false);
              setSelectedMinistry(null);
            }}
            onSubmit={handleSubmitJoin}
            isPending={joinMutation.isPending}
          />
        </>
      )}
    </div>
  );
}
