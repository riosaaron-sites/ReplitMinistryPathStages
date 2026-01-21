import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { 
  Users, 
  Building2, 
  GraduationCap, 
  Inbox,
  BarChart3,
  UserCheck,
  Calendar,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Trophy,
  Sparkles,
  ChevronRight
} from "lucide-react";
import type { User, Ministry, SupportRequest, Meeting } from "@shared/schema";

function CircularProgress({ value, size = 80, strokeWidth = 6, children, color = "primary" }: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  children?: React.ReactNode;
  color?: "primary" | "green" | "amber" | "blue";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const colorClasses = {
    primary: "text-primary",
    green: "text-green-500",
    amber: "text-amber-500",
    blue: "text-blue-500"
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClasses[color]} stroke-current transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function MetricBar({ 
  label, 
  value, 
  total, 
  color = "primary" 
}: { 
  label: string; 
  value: number; 
  total: number;
  color?: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} / {total}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function LeadershipDashboard() {
  const { user, roleLabel } = useRole();
  
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: requests } = useQuery<SupportRequest[]>({
    queryKey: ["/api/requests"],
  });

  const { data: meetings } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const allUsers = users || [];
  const volunteers = allUsers.filter(u => 
    ['dream-team', 'leader'].includes(u.role || '')
  );
  const dreamTeamMembers = allUsers.filter(u => u.role === 'dream-team');
  const pendingRequests = (requests || []).filter(r => r.status === 'new' || r.status === 'pending');
  const upcomingMeetings = (meetings || []).filter(m => 
    m.status === 'scheduled' && new Date(m.scheduledDate) > new Date()
  );

  const totalMembers = allUsers.length;
  const profileComplete = allUsers.filter(u => u.profileImageUrl && u.bio).length;
  const onboardingComplete = allUsers.filter(u => u.onboardingStatus === 'completed').length;
  const acpEligible = allUsers.filter(u => u.acpStatus === 'eligible' || u.acpStatus === 'approved').length;

  const profilePercent = totalMembers > 0 ? Math.round((profileComplete / totalMembers) * 100) : 0;
  const onboardingPercent = totalMembers > 0 ? Math.round((onboardingComplete / totalMembers) * 100) : 0;
  const acpPercent = totalMembers > 0 ? Math.round((acpEligible / totalMembers) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif-display text-3xl font-bold" data-testid="text-leadership-title">
          Leadership Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Garden City Church Operations Hub
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20" data-testid="stat-total-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <div className="p-2 rounded-full bg-primary/20">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMembers}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>{volunteers.length} active volunteers</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20" data-testid="stat-pending-requests">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <div className="p-2 rounded-full bg-amber-500/20">
              <Inbox className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingRequests.length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>Awaiting review</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20" data-testid="stat-ministries">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Ministries</CardTitle>
            <div className="p-2 rounded-full bg-green-500/20">
              <Building2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(ministries || []).filter(m => m.isActive).length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>{(ministries || []).length} total configured</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20" data-testid="stat-meetings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <div className="p-2 rounded-full bg-purple-500/20">
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingMeetings.length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Target className="h-3 w-3" />
              <span>{dreamTeamMembers.length} team members</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Congregation Progress
            </CardTitle>
            <CardDescription>Member completion metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center">
                <CircularProgress value={profilePercent} size={100} color="primary">
                  <div className="text-center">
                    <span className="text-xl font-bold">{profilePercent}%</span>
                  </div>
                </CircularProgress>
                <p className="mt-3 text-sm font-medium">Profiles Complete</p>
                <p className="text-xs text-muted-foreground">{profileComplete} of {totalMembers}</p>
              </div>
              
              <div className="flex flex-col items-center">
                <CircularProgress value={onboardingPercent} size={100} color="green">
                  <div className="text-center">
                    <span className="text-xl font-bold">{onboardingPercent}%</span>
                  </div>
                </CircularProgress>
                <p className="mt-3 text-sm font-medium">Onboarding Done</p>
                <p className="text-xs text-muted-foreground">{onboardingComplete} of {totalMembers}</p>
              </div>
              
              <div className="flex flex-col items-center">
                <CircularProgress value={acpPercent} size={100} color="amber">
                  <div className="text-center">
                    <span className="text-xl font-bold">{acpPercent}%</span>
                  </div>
                </CircularProgress>
                <p className="mt-3 text-sm font-medium">ACP Eligible</p>
                <p className="text-xs text-muted-foreground">{acpEligible} of {totalMembers}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-medium">{profilePercent}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                    style={{ width: `${profilePercent}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Onboarding Completion</span>
                  <span className="font-medium">{onboardingPercent}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                    style={{ width: `${onboardingPercent}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ACP Eligibility</span>
                  <span className="font-medium">{acpPercent}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${acpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Team Highlights
            </CardTitle>
            <CardDescription>Recent accomplishments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">New Volunteers</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{volunteers.length}</p>
              <p className="text-xs text-muted-foreground">Active this month</p>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Trainings Completed</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Team Members</span>
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dreamTeamMembers.length}</p>
              <p className="text-xs text-muted-foreground">Active volunteers</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card data-testid="card-pending-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Action Items
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate">
                  <div className="flex items-center gap-3">
                    <Inbox className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.requestType}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Inbox className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Media Request</p>
                      <p className="text-xs text-muted-foreground">Submitted 2 days ago</p>
                    </div>
                  </div>
                  <Badge variant="secondary">New</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Training Overdue</p>
                      <p className="text-xs text-muted-foreground">3 team members pending</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Urgent</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Room Request</p>
                      <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </>
            )}
            
            <Link href="/leadership/requests">
              <Button variant="outline" className="w-full mt-2" data-testid="button-view-all-requests">
                View All Requests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card data-testid="card-quick-links">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Frequently used actions</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/leadership/people">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-people">
                <Users className="h-5 w-5 mb-2" />
                <span className="text-sm">People & Roles</span>
              </Button>
            </Link>
            
            <Link href="/leadership/ministries">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-ministries">
                <Building2 className="h-5 w-5 mb-2" />
                <span className="text-sm">Ministries</span>
              </Button>
            </Link>
            
            <Link href="/leadership/trainings">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-trainings">
                <GraduationCap className="h-5 w-5 mb-2" />
                <span className="text-sm">Training</span>
              </Button>
            </Link>
            
            <Link href="/leadership/metrics">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-metrics">
                <BarChart3 className="h-5 w-5 mb-2" />
                <span className="text-sm">Metrics</span>
              </Button>
            </Link>
            
            <Link href="/leadership/interns">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-interns">
                <UserCheck className="h-5 w-5 mb-2" />
                <span className="text-sm">Interns</span>
              </Button>
            </Link>
            
            <Link href="/leadership/meetings">
              <Button variant="outline" className="w-full h-auto py-4 flex-col" data-testid="link-meetings">
                <Calendar className="h-5 w-5 mb-2" />
                <span className="text-sm">Meetings</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
