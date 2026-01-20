import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GIFT_DESCRIPTIONS, MINISTRY_DESCRIPTIONS, DISC_DESCRIPTIONS, BIBLICAL_LITERACY_LEVELS } from "@/lib/giftDescriptions";
import type { SurveyResults, GiftScore, DISCProfile, BiblicalLiteracyResult, TechnicalSkillsProfile, MinistryMatch } from "@shared/schema";
import { 
  LogOut, 
  Gift, 
  Sparkles, 
  Users, 
  BookOpen,
  CheckCircle,
  ArrowRight,
  Star,
  Heart,
  Mail,
  Coffee,
  Wrench,
  Music,
  Volume2,
  Monitor,
  Video,
  Palette,
  Image,
  Camera,
  GraduationCap,
  Baby,
  Globe,
  Shield,
  Car,
  HandshakeIcon,
  Brain,
  Headphones,
  AlertCircle,
  TrendingUp,
  FileText,
  Home
} from "lucide-react";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

const MINISTRY_ICONS: Record<string, React.ReactNode> = {
  greeters: <HandshakeIcon className="h-5 w-5" />,
  "welcome-table": <Gift className="h-5 w-5" />,
  ushers: <Users className="h-5 w-5" />,
  security: <Shield className="h-5 w-5" />,
  transportation: <Car className="h-5 w-5" />,
  cafe: <Coffee className="h-5 w-5" />,
  facilities: <Wrench className="h-5 w-5" />,
  worship: <Music className="h-5 w-5" />,
  sound: <Volume2 className="h-5 w-5" />,
  lyrics: <Monitor className="h-5 w-5" />,
  livestream: <Video className="h-5 w-5" />,
  "visual-art": <Palette className="h-5 w-5" />,
  "graphic-design": <Image className="h-5 w-5" />,
  dance: <Sparkles className="h-5 w-5" />,
  drama: <Star className="h-5 w-5" />,
  photography: <Camera className="h-5 w-5" />,
  teaching: <BookOpen className="h-5 w-5" />,
  youth: <GraduationCap className="h-5 w-5" />,
  children: <Baby className="h-5 w-5" />,
  nursery: <Heart className="h-5 w-5" />,
  "young-adults": <Users className="h-5 w-5" />,
  outreach: <Globe className="h-5 w-5" />,
};

export default function Results() {
  const [, navigate] = useLocation();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: results, isLoading: isResultsLoading, error } = useQuery<SurveyResults>({
    queryKey: ["/api/survey/results"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to view your results.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthLoading, isAuthenticated, toast]);

  if (isAuthLoading || isResultsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <img 
              src={ministryPathLogo} 
              alt="Garden City Church" 
              className="h-8 w-auto dark:invert"
            />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  // Show error or no results state
  if (error || !results) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <img 
              src={ministryPathLogo} 
              alt="Garden City Church" 
              className="h-8 w-auto dark:invert"
            />
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-card-border">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f8a84a]/20 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-[#f2660f]" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[#f8a84a]">
                {error ? "Unable to Load Results" : "No Results Found"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {error 
                  ? "We had trouble loading your assessment results. This could be a temporary issue."
                  : "It looks like you haven't completed the assessment yet. Complete the survey to discover your spiritual gifts and ministry matches!"
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {error && (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                    data-testid="button-retry"
                  >
                    Try Again
                  </Button>
                )}
                <Button 
                  className="gap-2 bg-[#f2660f] hover:bg-[#f2660f]/90"
                  onClick={() => navigate("/survey")}
                  data-testid="button-start-survey"
                >
                  {error ? "Go to Survey" : "Start Survey"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        
        {/* Footer */}
        <footer className="py-12 mt-8 bg-[#f8a84a] text-black">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col items-center gap-6">
              <img 
                src={ministryPathLogo} 
                alt="Garden City Church" 
                className="h-12 w-auto"
              />
              <p className="text-xl font-serif italic text-center">
                "Live the life. Tell the Story."
              </p>
              <Button 
                variant="outline"
                size="lg"
                className="rounded-full gap-2 bg-white hover:bg-white/90 text-black border-black"
                onClick={() => window.open('https://www.gardencitychurch.net', '_blank')}
                data-testid="button-home-church"
              >
                <Home className="h-5 w-5" />
                Visit Our Website
              </Button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  const spiritualGifts = (results.spiritualGifts as GiftScore[]) || [];
  const discProfile = results.personalityProfile as DISCProfile | undefined;
  const biblicalLiteracy = results.biblicalLiteracy as BiblicalLiteracyResult | undefined;
  const technicalSkills = results.technicalSkills as TechnicalSkillsProfile | undefined;
  const ministryMatches = (results.ministryMatches as MinistryMatch[]) || [];

  const topGifts = spiritualGifts.slice(0, 5);
  const primaryMinistries = ministryMatches.filter(m => m?.isPrimary);
  const secondaryMinistries = ministryMatches.filter(m => !m?.isPrimary && (m?.score || 0) > 0.5).slice(0, 6);

  const literacyLevel = biblicalLiteracy?.level || 'low';
  const literacyInfo = BIBLICAL_LITERACY_LEVELS[literacyLevel as keyof typeof BIBLICAL_LITERACY_LEVELS] || BIBLICAL_LITERACY_LEVELS.low;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src={ministryPathLogo} 
            alt="Garden City Church" 
            className="h-8 w-auto dark:invert"
          />
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.firstName || user.email?.split('@')[0]}
              </span>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/api/logout"}
              title="Sign out"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Congratulations Hero */}
      <section className="bg-gradient-to-b from-[#f8a84a]/20 to-background py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-[#f2660f]/10 text-[#f2660f] rounded-full px-4 py-2 mb-6">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Assessment Complete</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[#f8a84a]" data-testid="text-results-heading">
            Your Ministry Profile
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Thank you for completing the assessment, {user?.firstName || 'friend'}! 
            Here's a comprehensive look at how God has uniquely designed you for ministry.
          </p>

          {results.emailSent && (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>A copy of these results has been emailed to you</span>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Spiritual Gifts Section */}
        {topGifts.length > 0 && (
        <Card className="border-card-border" data-testid="card-spiritual-gifts">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f2660f]/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-[#f2660f]" />
              </div>
              <CardTitle className="text-xl text-[#f8a84a]">Your Spiritual Gifts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              These are the gifts that God has placed in you for building up the body of Christ. 
              Your top gifts suggest areas where you can have the greatest Kingdom impact.
            </p>
            
            <div className="space-y-4">
              {topGifts.map((gift, index) => (
                <div key={gift.gift} className="space-y-2" data-testid={`gift-${gift.gift}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <Badge className="text-xs bg-[#f2660f]">Primary Gift</Badge>
                      )}
                      <span className="font-medium">
                        {GIFT_DESCRIPTIONS[gift.gift as keyof typeof GIFT_DESCRIPTIONS]?.name || gift.gift}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{gift.score}%</span>
                  </div>
                  <Progress value={gift.score} className="h-2" />
                  <p className="text-sm text-muted-foreground">{gift.description}</p>
                  <p className="text-xs text-muted-foreground italic">
                    {gift.biblicalReference}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {/* DISC Personality Section */}
        {discProfile && (
          <Card className="border-card-border" data-testid="card-disc-profile">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f2660f]/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-[#f2660f]" />
                </div>
                <CardTitle className="text-xl text-[#f8a84a]">Your DISC Personality Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-[#f8a84a]/10 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-[#f2660f]">{discProfile.primaryType || "N/A"}</span>
                  {discProfile.secondaryType && (
                    <span className="text-xl text-muted-foreground">/ {discProfile.secondaryType}</span>
                  )}
                </div>
                <h3 className="text-2xl font-semibold mb-3" data-testid="text-personality-type">
                  {discProfile.primaryType ? (DISC_DESCRIPTIONS[discProfile.primaryType]?.name || discProfile.primaryType) : "Personality Profile"}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(discProfile.strengths || []).map((strength: string) => (
                    <Badge key={strength} variant="secondary">
                      {strength}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground">{discProfile.description || "Your personality profile helps identify how you work best with others."}</p>
              </div>

              {/* DISC Score Bars */}
              {discProfile.scores && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['D', 'I', 'S', 'C'] as const).map((letter) => {
                    const score = discProfile.scores[letter] || 0;
                    return (
                      <div key={letter} className="text-center">
                        <div className="text-2xl font-bold text-[#f2660f] mb-1">{letter}</div>
                        <Progress value={score} className="h-3 mb-2" />
                        <div className="text-sm text-muted-foreground">{score}%</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Communication & Decision Style */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <div className="text-sm text-muted-foreground mb-1">Communication Style</div>
                  <div className="font-medium">{discProfile.communicationStyle || "Not assessed"}</div>
                </div>
                <div className="p-4 rounded-md bg-card border border-card-border">
                  <div className="text-sm text-muted-foreground mb-1">Decision Making</div>
                  <div className="font-medium">{discProfile.decisionMaking || "Not assessed"}</div>
                </div>
              </div>

              {/* Best Team Environments */}
              {discProfile.bestTeamEnvironments && discProfile.bestTeamEnvironments.length > 0 && (
                <div className="p-4 rounded-md bg-[#f2660f]/5 border border-[#f2660f]/20">
                  <div className="text-sm font-medium text-[#f2660f] mb-2">You Thrive In</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {discProfile.bestTeamEnvironments.map((env: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-[#f2660f]" />
                        {env}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Biblical Literacy Section - Enhanced with bucket breakdown */}
        {biblicalLiteracy && (
          <Card className="border-card-border" data-testid="card-biblical-literacy">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f2660f]/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[#f2660f]" />
                </div>
                <CardTitle className="text-xl text-[#f8a84a]">Biblical Formation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level and Overall Score */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-semibold">{biblicalLiteracy.levelName || literacyInfo.name}</h3>
                  <p className="text-muted-foreground">Overall: {biblicalLiteracy.percentage || biblicalLiteracy.score}%</p>
                </div>
                <Badge 
                  variant={literacyInfo.canTeach ? "default" : "secondary"}
                  className={literacyInfo.canTeach ? "bg-green-600" : ""}
                  data-testid="badge-literacy-level"
                >
                  {literacyInfo.canTeach ? "Ready to Teach" : literacyLevel === 'developing' ? "Growing" : "Building"}
                </Badge>
              </div>
              
              <Progress value={biblicalLiteracy.percentage || biblicalLiteracy.score} className="h-3" />
              
              {/* Description with encouragement */}
              <div className="space-y-2">
                <p className="text-muted-foreground">{biblicalLiteracy.description || literacyInfo.description}</p>
                {(biblicalLiteracy.encouragement || literacyInfo.encouragement) && (
                  <p className="text-sm text-[#f2660f] font-medium">{biblicalLiteracy.encouragement || literacyInfo.encouragement}</p>
                )}
              </div>
              
              {/* Bucket Breakdown */}
              {biblicalLiteracy.bucketScores && biblicalLiteracy.bucketScores.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Your Growth Areas</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {biblicalLiteracy.bucketScores.map((bucket) => (
                      <div key={bucket.bucket} className="p-3 rounded-md bg-card border border-card-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{bucket.bucketName}</span>
                          <span className="text-sm text-muted-foreground">{bucket.percentage}%</span>
                        </div>
                        <Progress value={bucket.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Next Steps */}
              {(biblicalLiteracy.nextSteps || literacyInfo.recommendation) && (
                <div className="bg-[#f8a84a]/10 rounded-md p-4 border border-[#f8a84a]/20">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-[#f2660f] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-2">Recommended Next Steps</p>
                      {biblicalLiteracy.nextSteps && biblicalLiteracy.nextSteps.length > 0 ? (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {biblicalLiteracy.nextSteps.slice(0, 3).map((step, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-[#f2660f] shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">{literacyInfo.recommendation}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Discipleship Focus */}
              {biblicalLiteracy.discipleshipFocus && (
                <div className="text-sm text-muted-foreground italic border-l-2 border-[#f8a84a] pl-3">
                  <strong>Focus:</strong> {biblicalLiteracy.discipleshipFocus}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Technical Skills Section */}
        {technicalSkills && (
          <Card className="border-card-border" data-testid="card-technical-skills">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f2660f]/10 flex items-center justify-center">
                  <Headphones className="h-5 w-5 text-[#f2660f]" />
                </div>
                <CardTitle className="text-xl text-[#f8a84a]">Technical Skills Assessment</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Your technical proficiency for production and media ministry roles.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Sound Skills */}
                {technicalSkills.soundTech && (
                  <div className="p-4 rounded-md bg-card border border-card-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-[#f2660f]" />
                        <span className="font-medium">Sound Tech</span>
                      </div>
                      <Badge variant={technicalSkills.soundTech.canServe ? "default" : "secondary"}>
                        {technicalSkills.soundTech.level || "N/A"}
                      </Badge>
                    </div>
                    <Progress value={technicalSkills.soundTech.score || 0} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{technicalSkills.soundTech.description || "No data available"}</p>
                  </div>
                )}

                {/* Media/Video Skills */}
                {technicalSkills.mediaTech && (
                  <div className="p-4 rounded-md bg-card border border-card-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-[#f2660f]" />
                        <span className="font-medium">Media/Livestream</span>
                      </div>
                      <Badge variant={technicalSkills.mediaTech.canServe ? "default" : "secondary"}>
                        {technicalSkills.mediaTech.level || "N/A"}
                      </Badge>
                    </div>
                    <Progress value={technicalSkills.mediaTech.score || 0} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{technicalSkills.mediaTech.description || "No data available"}</p>
                  </div>
                )}

                {/* ProPresenter Skills */}
                {technicalSkills.proPresenter && (
                  <div className="p-4 rounded-md bg-card border border-card-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-[#f2660f]" />
                        <span className="font-medium">ProPresenter/Lyrics</span>
                      </div>
                      <Badge variant={technicalSkills.proPresenter.canServe ? "default" : "secondary"}>
                        {technicalSkills.proPresenter.level || "N/A"}
                      </Badge>
                    </div>
                    <Progress value={technicalSkills.proPresenter.score || 0} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{technicalSkills.proPresenter.description || "No data available"}</p>
                  </div>
                )}

                {/* Photography Skills */}
                {technicalSkills.photography && (
                  <div className="p-4 rounded-md bg-card border border-card-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-[#f2660f]" />
                        <span className="font-medium">Photography</span>
                      </div>
                      <Badge variant={technicalSkills.photography.canServe ? "default" : "secondary"}>
                        {technicalSkills.photography.level || "N/A"}
                      </Badge>
                    </div>
                    <Progress value={technicalSkills.photography.score || 0} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{technicalSkills.photography.description || "No data available"}</p>
                  </div>
                )}
              </div>

              {/* Overall Readiness & Training */}
              <div className="bg-[#f8a84a]/10 rounded-md p-4 border border-[#f8a84a]/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#f2660f] mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Technical Readiness</p>
                    <p className="text-sm text-muted-foreground">
                      {technicalSkills.overallReadiness || "We offer training for all technical roles! Your willingness to learn is more valuable than prior experience."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ministry Recommendations */}
        <Card className="border-card-border" data-testid="card-ministry-matches">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f2660f]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#f2660f]" />
              </div>
              <CardTitle className="text-xl text-[#f8a84a]">Recommended Ministries</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Based on your gifts, personality, skills, and availability, here are the ministry areas where 
              you could thrive at Garden City Church.
            </p>

            {/* Primary Recommendations */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Top Matches
              </h4>
              <div className="grid gap-4">
                {primaryMinistries.map((match, index) => (
                  <Card 
                    key={match.ministryId} 
                    className={`border-card-border ${index === 0 ? 'ring-2 ring-[#f2660f] ring-offset-2' : ''}`}
                    data-testid={`ministry-${match.ministryId}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#f2660f]/10 flex items-center justify-center flex-shrink-0">
                          {MINISTRY_ICONS[match.ministryId] || <Star className="h-6 w-6 text-[#f2660f]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h5 className="font-semibold">{match.name}</h5>
                            {index === 0 && (
                              <Badge className="text-xs bg-[#f2660f]">Best Match</Badge>
                            )}
                            {match.requiresSkillVerification && (
                              <Badge variant="outline" className="text-xs">Training Available</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{match.category}</p>
                          <p className="text-sm mb-3">{MINISTRY_DESCRIPTIONS[match.ministryId]?.roleDetails}</p>
                          <div className="bg-[#f8a84a]/10 rounded-md p-3">
                            <p className="text-sm">
                              <span className="font-medium">Why you're matched: </span>
                              {match.whyMatched}
                            </p>
                          </div>
                          {match.growthPathway && (
                            <div className="mt-3 p-3 bg-[#f2660f]/5 rounded-md border border-[#f2660f]/20">
                              <p className="text-sm text-[#f2660f]">
                                <span className="font-medium">Growth Pathway: </span>
                                {match.growthPathway}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Secondary Recommendations */}
            {secondaryMinistries.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  You May Also Consider
                </h4>
                <Accordion type="single" collapsible className="w-full">
                  {secondaryMinistries.map((match) => (
                    <AccordionItem key={match.ministryId} value={match.ministryId}>
                      <AccordionTrigger className="hover:no-underline" data-testid={`accordion-${match.ministryId}`}>
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {MINISTRY_ICONS[match.ministryId] || <Star className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-medium">{match.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">({match.category})</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-11">
                        <p className="text-sm text-muted-foreground mb-2">
                          {MINISTRY_DESCRIPTIONS[match.ministryId]?.roleDetails}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Why: </span>
                          {match.whyMatched}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-[#f2660f]/20 bg-[#f2660f]/5" data-testid="card-next-steps">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-semibold mb-4 text-[#f8a84a]">
              Your Next Step
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Thank you for completing the Garden City Church Ministry Assessment! 
              A leader from our team may reach out to help you take your next step in serving. 
              In the meantime, feel free to share your results with a pastor or ministry leader you trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gap-2 bg-[#f2660f] hover:bg-[#f2660f]/90"
                onClick={() => window.print()}
                data-testid="button-print-results"
              >
                <FileText className="h-4 w-4" />
                Print / Save PDF
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="gap-2"
                onClick={() => navigate("/survey")}
                data-testid="button-retake-survey"
              >
                Retake Survey
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-12 mt-8 bg-[#f8a84a] text-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <img 
              src={ministryPathLogo} 
              alt="Garden City Church" 
              className="h-12 w-auto"
            />
            
            <p className="text-xl font-serif italic text-center">
              "Live the life. Tell the Story."
            </p>
            
            <Button 
              variant="outline"
              size="lg"
              className="rounded-full gap-2 bg-white hover:bg-white/90 text-black border-black"
              onClick={() => window.open('https://www.gardencitychurch.net', '_blank')}
              data-testid="button-home-church"
            >
              <Home className="h-5 w-5" />
              Visit Our Website
            </Button>
            
            <p className="text-sm text-black/70 mt-4">
              God has uniquely gifted you for His purposes. We're excited to help you find your place!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
