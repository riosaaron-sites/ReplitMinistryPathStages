import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Star,
  Award,
  Target,
  TrendingUp,
  Loader2,
  Sparkles,
  CheckCircle2,
  Circle,
  Users,
  GraduationCap,
  Heart,
  UserCheck,
  BookOpen,
} from "lucide-react";

interface Milestone {
  id: string;
  name: string;
  description: string;
  reached: boolean;
  reachedAt?: string;
  count?: number;
  teamsCount?: number;
}

interface PathProgress {
  milestones: Milestone[];
  milestonesReached: number;
  totalMilestones: number;
  pathProgress: number;
  nextMilestone?: { id: string; name: string; order: number } | null;
  badges: UserBadge[];
  isProgressing: boolean;
  encouragement: string;
}

interface UserBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  badge?: BadgeType;
}

interface BadgeType {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  rarity?: string;
}

const MILESTONE_ICONS: Record<string, any> = {
  'onboarding_started': UserCheck,
  'profile_completed': Heart,
  'team_joined': Users,
  'training_submitted': BookOpen,
  'training_affirmed': GraduationCap,
  'ready_to_serve': Star,
};

const RARITY_COLORS: Record<string, string> = {
  'common': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'uncommon': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'rare': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'epic': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'legendary': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function XpDashboard() {
  const { data: profile, isLoading } = useQuery<PathProgress>({
    queryKey: ["/api/gamification/profile"],
  });

  const { data: allBadges = [] } = useQuery<BadgeType[]>({
    queryKey: ["/api/gamification/badges"],
  });

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-path-progress" />
      </div>
    );
  }

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const earnedBadgeIds = new Set(profile.badges.map(b => b.badgeId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-path-progress">
          <Trophy className="w-6 h-6" />
          My Path
        </h1>
        <p className="text-muted-foreground">
          Track your journey and celebrate each meaningful step forward
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Your Progress
            </CardTitle>
            <CardDescription>
              {profile.encouragement}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Path Progress</span>
                <span className="font-medium">{profile.milestonesReached} of {profile.totalMilestones} milestones</span>
              </div>
              <Progress value={profile.pathProgress} className="h-3" />
            </div>

            {profile.nextMilestone && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Milestone</p>
                    <p className="font-medium">{profile.nextMilestone.name}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center" data-testid="stat-milestones-reached">
                <p className="text-3xl font-bold text-primary">{profile.milestonesReached}</p>
                <p className="text-sm text-muted-foreground">Milestones Reached</p>
              </div>
              <div className="text-center" data-testid="stat-achievements">
                <p className="text-3xl font-bold text-primary">{profile.badges.length}</p>
                <p className="text-sm text-muted-foreground">Achievements Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'onboarding_started', name: 'Onboarding Started' },
                { id: 'profile_completed', name: 'Profile Completed' },
                { id: 'team_joined', name: 'Team Joined' },
                { id: 'training_submitted', name: 'Training Submitted' },
                { id: 'training_affirmed', name: 'Training Affirmed' },
                { id: 'ready_to_serve', name: 'Ready to Serve' },
              ].map((milestone) => {
                const reached = profile.milestones.find(m => m.id === milestone.id);
                const Icon = MILESTONE_ICONS[milestone.id] || Star;
                
                return (
                  <div 
                    key={milestone.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${reached ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/30'}`}
                    data-testid={`milestone-${milestone.id}`}
                  >
                    {reached ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <Icon className={`w-4 h-4 ${reached ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`} />
                    <span className={reached ? 'font-medium' : 'text-muted-foreground'}>
                      {milestone.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Achievements
          </CardTitle>
          <CardDescription>
            Special recognitions earned on your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.badges.length === 0 && allBadges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Achievements will appear here as you progress</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allBadges.map((badge) => {
                const isEarned = earnedBadgeIds.has(badge.id);
                const earnedBadge = profile.badges.find(b => b.badgeId === badge.id);
                
                return (
                  <div 
                    key={badge.id}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      isEarned 
                        ? 'bg-card border-primary/20 shadow-sm' 
                        : 'bg-muted/20 border-transparent opacity-50'
                    }`}
                    data-testid={`achievement-${badge.id}`}
                  >
                    <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      isEarned ? 'bg-primary/10' : 'bg-muted/50'
                    }`}>
                      <Award className={`w-6 h-6 ${isEarned ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <p className={`font-medium text-sm ${!isEarned && 'text-muted-foreground'}`}>
                      {badge.name}
                    </p>
                    {badge.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {badge.description}
                      </p>
                    )}
                    {isEarned && earnedBadge && (
                      <Badge variant="secondary" className={`mt-2 text-xs ${RARITY_COLORS[badge.rarity || 'common']}`}>
                        Earned {getTimeAgo(earnedBadge.earnedAt)}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
