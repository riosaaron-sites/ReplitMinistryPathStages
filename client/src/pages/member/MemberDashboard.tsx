import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { 
  ChevronRight,
  ArrowRight,
  GraduationCap,
  Compass,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Users,
  BookOpen,
  ShieldCheck,
  Heart,
  Sparkles,
  Music,
  Play,
  Award,
} from "lucide-react";
import type { SurveyResults, MinistrySelection, RoleAssignment, Ministry, BiblicalLiteracyResult } from "@shared/schema";
import { BIBLICAL_LITERACY_LEVELS } from "@/lib/giftDescriptions";
import { ONBOARDING_MINISTRIES } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarCheck, TrendingUp, TrendingDown, MessageCircle, Minus } from "lucide-react";

interface ServingMetrics {
  totalScheduled: number;
  totalServed: number;
  totalDeclined: number;
  totalNoResponse: number;
  serveRate: number;
  trend: 'up' | 'down' | 'steady';
  encouragement: string;
  recentRecords: {
    id: string;
    date: string;
    ministryName: string | null;
    status: string;
  }[];
}

interface MemberFeedback {
  id: string;
  leaderId: string;
  leaderName?: string;
  feedbackType: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface MinistryWithLeaders {
  ministryId: string;
  ministryName: string;
  primaryLeader: { id: string; name: string } | null;
  coLeaders: { id: string; name: string }[];
  expectations: string[] | null;
}

interface FellowTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  role?: string | null;
}

interface MinistryTeamMembers {
  ministryId: string;
  ministryName: string;
  members: FellowTeamMember[];
}

interface UserProgress {
  totals: {
    totalModules: number;
    completedModules: number;
    totalRequired: number;
    completedRequired: number;
    pathTotal: number;
    pathCompleted: number;
    percentComplete: number;
  };
  pathSteps: {
    id: string;
    name: string;
    status: 'COMPLETE' | 'IN_PROGRESS' | 'INCOMPLETE';
  }[];
  modules: {
    id: string;
    title: string;
    isRequired: boolean;
    status: 'COMPLETE' | 'IN_PROGRESS' | 'INCOMPLETE';
  }[];
  nextActions: {
    id: string;
    title: string;
    type: string;
  }[];
}

interface OnboardingProgress {
  currentStep: number;
  isComplete: boolean;
}

const BIBLE_VERSES = [
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope." },
  { reference: "Philippians 4:13", text: "I can do all things through him who strengthens me." },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { reference: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { reference: "Isaiah 40:31", text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { reference: "Matthew 6:33", text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd, I lack nothing." },
  { reference: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go." },
  { reference: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
  { reference: "Ephesians 2:10", text: "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." },
  { reference: "1 Peter 2:9", text: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession." },
  { reference: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path." },
];

const ENCOURAGEMENTS = [
  "God has uniquely gifted you for His purposes. Step into your calling today!",
  "Every step of obedience brings you closer to God's best for your life.",
  "You were created to make a difference. Your gifts matter to the Kingdom!",
  "Growth happens one step at a time. Keep pressing forward!",
  "God is faithful to complete the good work He started in you.",
  "Your service to others is worship to God. Keep serving with joy!",
  "Don't underestimate what God can do through a willing heart.",
];

function getDailyVerse() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return BIBLE_VERSES[dayOfYear % BIBLE_VERSES.length];
}

function getDailyEncouragement() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return ENCOURAGEMENTS[dayOfYear % ENCOURAGEMENTS.length];
}

const PATH_ICONS: Record<string, typeof Music> = {
  'worship': Music,
  'next-night': Users,
  'learn': BookOpen,
  'love': Heart,
  'lead': Compass,
};

function getWhatsNextPriority(
  user: any,
  onboardingProgress: OnboardingProgress | undefined,
  userProgress: UserProgress | undefined,
  surveyResults: SurveyResults | undefined
): { title: string; description: string; action: string; href: string; icon: typeof AlertCircle; priority: number } | null {
  
  // 1) Onboarding incomplete
  if (user?.onboardingState && user.onboardingState !== 'DONE') {
    return {
      title: "Complete Your Profile",
      description: "Finish setting up your profile to unlock all features.",
      action: "Continue",
      href: "/onboarding",
      icon: AlertCircle,
      priority: 1,
    };
  }

  // 2) Agreement/Faith commitment incomplete (check onboarding progress)
  if (onboardingProgress && !onboardingProgress.isComplete) {
    return {
      title: "Faith Commitment",
      description: "Complete your faith and community commitment.",
      action: "Continue",
      href: "/onboarding/faith",
      icon: Heart,
      priority: 2,
    };
  }

  // 3) Required core trainings incomplete
  if (userProgress && userProgress.modules) {
    const incompleteRequired = userProgress.modules.filter(
      m => m.isRequired && m.status !== 'COMPLETE'
    );
    if (incompleteRequired.length > 0) {
      const next = incompleteRequired[0];
      return {
        title: "Required Training",
        description: `Complete "${next.title}" to continue your discipleship journey.`,
        action: "Start Training",
        href: `/trainings/${next.id}`,
        icon: GraduationCap,
        priority: 3,
      };
    }
  }

  // 4) Next Night status missing
  if (userProgress?.pathSteps) {
    const nextNight = userProgress.pathSteps.find(s => s.id === 'next-night');
    if (nextNight && nextNight.status === 'INCOMPLETE') {
      return {
        title: "Attend Next Night",
        description: "Join our monthly gathering to connect with your church family.",
        action: "Learn More",
        href: "/my-path",
        icon: Users,
        priority: 4,
      };
    }
  }

  // 5) Following Jesus / Learn status
  if (userProgress?.pathSteps) {
    const learn = userProgress.pathSteps.find(s => s.id === 'learn');
    if (learn && learn.status === 'INCOMPLETE') {
      return {
        title: "Continue Learning",
        description: "Complete foundational learning on your discipleship path.",
        action: "View Journey",
        href: "/my-path",
        icon: BookOpen,
        priority: 5,
      };
    }
  }

  // 6) Background check (placeholder - show if user is in ministry requiring it)
  // This would need a real check against user's ministry assignments
  
  // 7) Ministry-specific required trainings
  if (userProgress?.nextActions && userProgress.nextActions.length > 0) {
    const nextAction = userProgress.nextActions[0];
    if (nextAction.type === 'training') {
      return {
        title: "Ministry Training",
        description: `Complete "${nextAction.title}" for your ministry role.`,
        action: "Start",
        href: `/trainings/${nextAction.id}`,
        icon: GraduationCap,
        priority: 7,
      };
    }
  }

  // All caught up!
  return null;
}

export default function MemberDashboard() {
  const { user, roleLabel, isAuthenticated } = useRole();
  
  const { data: userProgress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ['/api/user-progress'],
    enabled: isAuthenticated,
  });

  const { data: surveyResults } = useQuery<SurveyResults>({
    queryKey: ['/api/survey/results'],
    enabled: isAuthenticated,
  });

  const { data: ministrySelections } = useQuery<MinistrySelection[]>({
    queryKey: ['/api/ministry-selections'],
    enabled: isAuthenticated,
  });

  const { data: myAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ['/api/role-assignments/my'],
    enabled: isAuthenticated,
  });

  const { data: onboardingProgress } = useQuery<OnboardingProgress>({
    queryKey: ['/api/onboarding/progress'],
    enabled: isAuthenticated,
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ['/api/ministries'],
    enabled: isAuthenticated,
  });

  const { data: ministriesWithLeaders } = useQuery<MinistryWithLeaders[]>({
    queryKey: ['/api/my-ministries-with-leaders'],
    enabled: isAuthenticated,
  });

  const { data: fellowTeamMembers, isLoading: isLoadingTeamMembers } = useQuery<MinistryTeamMembers[]>({
    queryKey: ['/api/my-fellow-team-members'],
    enabled: isAuthenticated,
  });

  const { data: servingMetrics } = useQuery<ServingMetrics>({
    queryKey: ['/api/serving-records/metrics'],
    enabled: isAuthenticated,
  });

  const { data: memberFeedback } = useQuery<MemberFeedback[]>({
    queryKey: ['/api/member-feedback'],
    enabled: isAuthenticated,
  });

  const dailyVerse = getDailyVerse();
  const dailyEncouragement = getDailyEncouragement();

  const whatsNext = getWhatsNextPriority(user, onboardingProgress, userProgress, surveyResults);

  // Ministry display - compact badges
  const activeAssignments = (myAssignments || []).filter(a => a.isActive);
  const selectedMinistryNames = (ministrySelections || [])
    .map(s => {
      const ministry = ONBOARDING_MINISTRIES.find(m => m.id === s.ministryId);
      return ministry?.name;
    })
    .filter(Boolean);

  const ministryNames = selectedMinistryNames.length > 0 
    ? selectedMinistryNames 
    : activeAssignments.map(a => {
        const ministry = ministries?.find(m => m.id === a.ministryId);
        return ministry?.name;
      }).filter(Boolean);

  const displayedMinistries = ministryNames.slice(0, 3);
  const remainingCount = ministryNames.length - 3;

  // Training counts
  const requiredRemaining = userProgress?.modules 
    ? userProgress.modules.filter(m => m.isRequired && m.status !== 'COMPLETE').length 
    : 0;
  const completedCount = userProgress?.modules 
    ? userProgress.modules.filter(m => m.status === 'COMPLETE').length 
    : 0;

  // Survey recommendations
  const topRecommendations = surveyResults?.ministryMatches
    ? Object.entries(surveyResults.ministryMatches)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([name, score]) => ({ name, score: score as number }))
    : [];

  if (progressLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <h1 className="font-serif-display text-3xl font-bold" data-testid="text-dashboard-title">
          Welcome, {user?.firstName || 'Friend'}!
        </h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          Live the Life. Tell the Story.
        </p>
      </div>

      {/* What's Next - Priority Panel */}
      {whatsNext && (
        <Card className="border-primary/50 bg-primary/5" data-testid="card-whats-next">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <whatsNext.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" className="text-xs">What's Next</Badge>
                </div>
                <h3 className="font-semibold text-lg mb-1" data-testid="text-whats-next-title">
                  {whatsNext.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4" data-testid="text-whats-next-description">
                  {whatsNext.description}
                </p>
                <Link href={whatsNext.href}>
                  <Button className="gap-2" data-testid="button-whats-next-action">
                    {whatsNext.action}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Trainings + Discipleship */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* My Trainings - Prominent Button */}
        <Card data-testid="card-my-trainings">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">My Trainings</CardTitle>
                  <CardDescription>Continue your learning journey</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>{requiredRemaining} required remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{completedCount} completed</span>
              </div>
            </div>
            {userProgress?.totals && (
              <Progress 
                value={(completedCount / Math.max(userProgress.totals.totalModules, 1)) * 100} 
                className="h-2"
                data-testid="progress-trainings"
              />
            )}
            <Link href="/trainings">
              <Button className="w-full gap-2" data-testid="button-open-trainings">
                <Play className="h-4 w-4" />
                Open Training Hub
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Discipleship Path Summary */}
        <Card data-testid="card-discipleship-summary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Compass className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">My Discipleship</CardTitle>
                  <CardDescription>WORSHIP → NEXT NIGHT → LEARN → LOVE → LEAD</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userProgress?.pathSteps && (
              <>
                <div className="flex items-center justify-between gap-4">
                  {userProgress.pathSteps.map((step) => {
                    const Icon = PATH_ICONS[step.id] || Compass;
                    return (
                      <div 
                        key={step.id} 
                        className="flex flex-col items-center gap-1"
                        title={step.name}
                        data-testid={`path-icon-${step.id}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.status === 'COMPLETE' 
                            ? 'bg-green-500 text-white' 
                            : step.status === 'IN_PROGRESS'
                            ? 'bg-amber-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.status === 'COMPLETE' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">
                          {step.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {userProgress.totals && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {userProgress.totals.pathCompleted}/{userProgress.totals.pathTotal} steps complete
                      </span>
                      <span className="font-medium text-primary">
                        {userProgress.totals.percentComplete}%
                      </span>
                    </div>
                    <Progress value={userProgress.totals.percentComplete} className="h-2" />
                  </>
                )}
              </>
            )}
            <Link href="/my-discipleship">
              <Button variant="outline" className="w-full gap-2" data-testid="button-view-discipleship">
                View Full Journey
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Biblical Formation Card */}
      {surveyResults?.biblicalLiteracy && (() => {
        const literacy = surveyResults.biblicalLiteracy as BiblicalLiteracyResult;
        const level = literacy.level || 'low';
        const levelInfo = BIBLICAL_LITERACY_LEVELS[level as keyof typeof BIBLICAL_LITERACY_LEVELS] || BIBLICAL_LITERACY_LEVELS.low;
        
        return (
          <Card data-testid="card-biblical-literacy">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <BookOpen className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Biblical Formation</CardTitle>
                    <CardDescription>Your Scripture knowledge journey</CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={level === 'strong' ? 'default' : 'secondary'}
                  className={level === 'strong' ? 'bg-green-600' : ''}
                  data-testid="badge-literacy-level"
                >
                  {literacy.levelName || levelInfo.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Score</span>
                <span className="font-medium">{literacy.percentage || literacy.score}%</span>
              </div>
              <Progress value={literacy.percentage || literacy.score} className="h-2" data-testid="progress-literacy" />
              
              <p className="text-sm text-muted-foreground">{levelInfo.encouragement}</p>
              
              {/* Bucket highlights - show lowest scoring area as focus */}
              {literacy.bucketScores && literacy.bucketScores.length > 0 && (() => {
                const lowestBucket = [...literacy.bucketScores].sort((a, b) => a.percentage - b.percentage)[0];
                const highestBucket = [...literacy.bucketScores].sort((a, b) => b.percentage - a.percentage)[0];
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-green-600 font-medium">Strongest Area</p>
                      <p className="text-muted-foreground">{highestBucket.bucketName} ({highestBucket.percentage}%)</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-600 font-medium">Growth Focus</p>
                      <p className="text-muted-foreground">{lowestBucket.bucketName} ({lowestBucket.percentage}%)</p>
                    </div>
                  </div>
                );
              })()}
              
              <Link href="/results">
                <Button variant="outline" className="w-full gap-2" data-testid="button-view-literacy-results">
                  View Full Results
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      {/* My Ministries & Leaders */}
      {(ministriesWithLeaders && ministriesWithLeaders.length > 0) && (
        <Card data-testid="card-my-ministries-leaders">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base">My Ministries & Leaders</CardTitle>
                  <CardDescription>Who you serve with and report to</CardDescription>
                </div>
              </div>
              <Link href="/my-roles">
                <Button variant="ghost" size="sm" data-testid="button-view-all-ministries">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ministriesWithLeaders.slice(0, 3).map((ministry, index) => (
                <div 
                  key={ministry.ministryId} 
                  className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border border-transparent hover-elevate"
                  data-testid={`ministry-card-${index}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm" data-testid={`text-ministry-name-${index}`}>
                        {ministry.ministryName}
                      </h4>
                    </div>
                    
                    {ministry.primaryLeader && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Reports to:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {ministry.primaryLeader.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium" data-testid={`text-leader-name-${index}`}>
                            {ministry.primaryLeader.name}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {ministry.coLeaders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Co-Leaders:</span>
                        <div className="flex -space-x-1">
                          {ministry.coLeaders.slice(0, 3).map((leader, lIdx) => (
                            <Avatar key={leader.id} className="h-5 w-5 border-2 border-background">
                              <AvatarFallback className="text-[8px]">
                                {leader.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {ministry.coLeaders.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {ministry.coLeaders.map(l => l.name.split(' ')[0]).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {!ministry.primaryLeader && ministry.coLeaders.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No leader assigned yet</span>
                    )}

                    {/* Ministry Expectations */}
                    {ministry.expectations && ministry.expectations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">What's expected:</p>
                        <ul className="space-y-1">
                          {ministry.expectations.slice(0, 3).map((expectation, eIdx) => (
                            <li 
                              key={eIdx} 
                              className="text-xs text-muted-foreground flex items-start gap-2"
                              data-testid={`expectation-${index}-${eIdx}`}
                            >
                              <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                              <span>{expectation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {ministriesWithLeaders.length > 3 && (
                <div className="text-center pt-2">
                  <Link href="/my-roles">
                    <Button variant="ghost" size="sm" data-testid="button-see-more-ministries">
                      See {ministriesWithLeaders.length - 3} more ministries
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Team Members - only shown when there are team members */}
      {fellowTeamMembers && fellowTeamMembers.some(m => m.members.length > 0) && (
        <Card data-testid="card-my-team-members">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Heart className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">My Team Members</CardTitle>
                  <CardDescription>People you serve with</CardDescription>
                </div>
              </div>
              <Link href="/teams">
                <Button variant="ghost" size="sm" data-testid="button-view-all-team">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fellowTeamMembers.filter(m => m.members.length > 0).slice(0, 3).map((ministry) => (
                <div key={ministry.ministryId} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{ministry.ministryName}</p>
                  <div className="flex flex-wrap gap-2">
                    {ministry.members.slice(0, 6).map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50"
                        data-testid={`team-member-${member.id}`}
                      >
                        <Avatar className="h-6 w-6">
                          {member.profilePhotoUrl ? (
                            <AvatarImage src={member.profilePhotoUrl} alt={member.firstName} />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {member.firstName} {member.lastName?.[0]}.
                        </span>
                      </div>
                    ))}
                    {ministry.members.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{ministry.members.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Serving Metrics Card - Enhanced with Interpretation */}
      {servingMetrics && (servingMetrics.totalScheduled > 0 || servingMetrics.totalServed > 0) && (
        <Card data-testid="card-serving-metrics">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CalendarCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Your Serving Summary</CardTitle>
                  <CardDescription>Last 90 days of faithful service</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {servingMetrics.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                {servingMetrics.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
                {servingMetrics.trend === 'steady' && (
                  <Minus className="h-4 w-4 text-gray-400" />
                )}
                <Badge 
                  variant={servingMetrics.serveRate >= 80 ? "default" : "secondary"}
                  data-testid="badge-serve-rate"
                >
                  {Math.round(servingMetrics.serveRate)}% Serve Rate
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Encouragement message */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
              <p className="text-sm text-primary/90" data-testid="text-encouragement">
                {servingMetrics.encouragement}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600" data-testid="text-served-count">
                  {servingMetrics.totalServed}
                </p>
                <p className="text-xs text-muted-foreground">Served</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600" data-testid="text-scheduled-count">
                  {servingMetrics.totalScheduled}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-amber-600" data-testid="text-declined-count">
                  {servingMetrics.totalDeclined}
                </p>
                <p className="text-xs text-muted-foreground">Declined</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-500" data-testid="text-no-response-count">
                  {servingMetrics.totalNoResponse}
                </p>
                <p className="text-xs text-muted-foreground">No Response</p>
              </div>
            </div>
            
            {servingMetrics.recentRecords.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
                <div className="space-y-1">
                  {servingMetrics.recentRecords.slice(0, 3).map((record, idx) => (
                    <div key={record.id} className="flex items-center justify-between text-sm" data-testid={`serving-record-${idx}`}>
                      <span className="text-muted-foreground">
                        {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {record.ministryName && ` - ${record.ministryName}`}
                      </span>
                      <Badge 
                        variant={record.status === 'served' ? 'default' : record.status === 'declined' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leader Feedback Section */}
      {memberFeedback && memberFeedback.length > 0 && (
        <Card data-testid="card-leader-feedback">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <MessageCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <CardTitle className="text-base">Leader Encouragement</CardTitle>
                <CardDescription>Notes from your ministry leaders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberFeedback.slice(0, 3).map((feedback, idx) => (
                <div 
                  key={feedback.id} 
                  className={`p-3 rounded-lg border ${!feedback.isRead ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                  data-testid={`feedback-${idx}`}
                >
                  <p className="text-sm mb-2" data-testid={`feedback-message-${idx}`}>
                    "{feedback.message}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(feedback.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {!feedback.isRead && (
                      <Badge variant="outline" className="ml-2 text-xs">New</Badge>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback: Simple badges if no detailed data */}
      {(!ministriesWithLeaders || ministriesWithLeaders.length === 0) && ministryNames.length > 0 && (
        <Card data-testid="card-my-ministries">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base">My Ministries</CardTitle>
                  <CardDescription>Your current serving areas</CardDescription>
                </div>
              </div>
              <Link href="/my-roles">
                <Button variant="ghost" size="sm" data-testid="button-view-all-ministries-fallback">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {displayedMinistries.map((name, index) => (
                <Badge key={index} variant="secondary" className="text-sm" data-testid={`badge-ministry-${index}`}>
                  {name}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge variant="outline" className="text-sm" data-testid="badge-ministry-more">
                  +{remainingCount} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Survey Results Section */}
      {surveyResults && (
        <Card data-testid="card-survey-results">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <FileText className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Ministry Survey Results</CardTitle>
                  <CardDescription>Your spiritual gifts and recommendations</CardDescription>
                </div>
              </div>
              <Link href="/results">
                <Button variant="ghost" size="sm" data-testid="button-view-full-results">
                  View Full Results
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topRecommendations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Top recommended ministries for you:</p>
                <div className="flex flex-wrap gap-2">
                  {topRecommendations.map((rec, index) => (
                    <div 
                      key={rec.name}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      data-testid={`recommendation-${index}`}
                    >
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">{rec.name}</span>
                      <Badge variant="outline" className="text-xs">{Math.round(rec.score)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">View your detailed results to see ministry recommendations.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Background Check Status */}
      <Card data-testid="card-background-check">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h3 className="font-medium">Background Check</h3>
                <p className="text-sm text-muted-foreground">
                  Status for ministry roles requiring clearance
                </p>
              </div>
            </div>
            <Badge variant="outline" data-testid="badge-background-status">
              Not on file
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daily Encouragement + Bible Verse */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" data-testid="card-daily-encouragement">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary mb-2" data-testid="text-verse-reference">
                {dailyVerse.reference}
              </p>
              <blockquote className="text-muted-foreground italic mb-3" data-testid="text-verse">
                "{dailyVerse.text}"
              </blockquote>
              <p className="text-sm text-foreground" data-testid="text-encouragement">
                {dailyEncouragement}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
