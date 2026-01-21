import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GraduationCap, 
  Inbox,
  Calendar,
  BarChart3,
  UserCheck,
  MessageSquare,
  ChevronLeft,
  Menu,
  X,
  Settings,
  UsersRound,
  UserPlus,
  Shield,
  ClipboardList,
  Heart,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { NotificationBell } from "@/components/NotificationBell";
import { InviteModal } from "@/components/InviteModal";
import { cn } from "@/lib/utils";
import { AdminBypassBanner } from "@/components/AdminBypassBanner";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

interface LeadershipLayoutProps {
  children: React.ReactNode;
}

const leadershipNavItems = [
  { path: "/leadership", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leadership/people", label: "People & Roles", icon: Users },
  { path: "/leadership/ministries", label: "Ministries", icon: Building2 },
  { path: "/leadership/trainings", label: "Training", icon: GraduationCap },
  { path: "/leadership/requests", label: "Requests", icon: Inbox },
  { path: "/leadership/rooms", label: "Rooms & Calendar", icon: Calendar },
  { path: "/leadership/metrics", label: "Attendance", icon: BarChart3 },
  { path: "/leadership/weekly-metrics", label: "Weekly Metrics", icon: ClipboardList },
  { path: "/leadership/interns", label: "Interns", icon: UserCheck },
  { path: "/leadership/meetings", label: "Meetings", icon: MessageSquare },
  { path: "/leadership/my-team", label: "My Team", icon: UsersRound },
  { path: "/leadership/workboards", label: "Workboards", icon: ClipboardList },
  { path: "/leadership/pastoral-care", label: "Pastoral Care", icon: Heart, pastoralOnly: true },
  { path: "/leadership/invites", label: "Invite People", icon: UserPlus },
  { path: "/leadership/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
  { path: "/help", label: "Help Center", icon: HelpCircle },
];

export function LeadershipLayout({ children }: LeadershipLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const { user, roleLabel, isAdmin, isPastoralRole } = useRole();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-2"
                data-testid="button-member-portal"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Member Portal</span>
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <img src={ministryPathLogo} alt="MinistryPath" className="h-7 w-auto" />
            <span className="font-semibold text-base">
              Leadership Portal
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              data-testid="button-global-invite"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
            <span className="hidden md:block text-sm">
              {user?.firstName} {user?.lastName}
            </span>
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar border-r pt-16 transition-transform lg:translate-x-0 lg:static lg:pt-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="p-4 space-y-1">
            <div className="mb-6 px-3 py-2">
              <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                Operations Hub
              </p>
              <p className="text-sm text-sidebar-foreground/80 mt-1">
                {roleLabel}
              </p>
            </div>
            
            {leadershipNavItems
              .filter((item) => {
                if ((item as any).adminOnly) {
                  return isAdmin;
                }
                if ((item as any).pastoralOnly) {
                  return isPastoralRole;
                }
                return true;
              })
              .map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || 
                (item.path !== "/leadership" && location.startsWith(item.path));
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`nav-${item.path.replace("/leadership/", "").replace("/leadership", "dashboard")}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </aside>
        
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        <main className="flex-1 p-6 lg:p-8">
          <AdminBypassBanner />
          {children}
        </main>
      </div>
      
      <InviteModal 
        open={inviteModalOpen} 
        onClose={() => setInviteModalOpen(false)} 
      />
    </div>
  );
}
