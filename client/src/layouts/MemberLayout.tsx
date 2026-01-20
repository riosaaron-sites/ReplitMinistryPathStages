import { Link, useLocation } from "wouter";
import { 
  Home, 
  ClipboardList, 
  GraduationCap, 
  Users, 
  HelpCircle,
  Calendar,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Trophy,
  Compass,
  UsersRound,
  MessageSquare,
  BookOpen,
  ChevronDown,
  Check,
  TrendingUp,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { NotificationBell } from "@/components/NotificationBell";
import { useMinistryContext } from "@/contexts/MinistryContext";
import { cn } from "@/lib/utils";
import { AdminBypassBanner } from "@/components/AdminBypassBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ministryPathLogo from "@assets/MinistryPath_-_logo_1765238662754.png";

interface MemberLayoutProps {
  children: React.ReactNode;
}

const memberNavItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/my-path", label: "My Path", icon: Compass },
  { path: "/trainings", label: "My Trainings", icon: GraduationCap },
  { path: "/my-roles", label: "My Roles", icon: Users },
  { path: "/teams", label: "Team Connection", icon: UsersRound },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/resources", label: "Resources", icon: BookOpen },
  { path: "/requests", label: "Ask for Help", icon: HelpCircle },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/help", label: "Help Center", icon: HelpCircle },
];

export function MemberLayout({ children }: MemberLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, roleLabel, canAccessLeadershipPortal } = useRole();
  const { 
    selectedMinistryId, 
    setSelectedMinistryId, 
    selectedMinistry, 
    activeAssignments, 
    ministries, 
    hasMultipleMinistries 
  } = useMinistryContext();

  const selectedMinistryName = selectedMinistry?.name || "All Ministries";
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-primary text-primary-foreground">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-primary-foreground hover:bg-primary/80"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
                <img src={ministryPathLogo} alt="MinistryPath" className="h-8 w-auto" />
                <span className="font-semibold text-lg hidden sm:inline">MinistryPath</span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            {canAccessLeadershipPortal && (
              <Link href="/leadership">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="hidden sm:flex"
                  data-testid="button-leadership-portal"
                >
                  Leadership Portal
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
            
            <NotificationBell className="text-primary-foreground hover:bg-primary/80" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 text-primary-foreground hover:bg-primary/80"
                  data-testid="button-user-menu"
                >
                  <span className="hidden md:block text-sm">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer" data-testid="menu-my-profile">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                </Link>
                {canAccessLeadershipPortal && (
                  <>
                    <DropdownMenuSeparator />
                    <Link href="/leadership">
                      <DropdownMenuItem className="cursor-pointer" data-testid="menu-leadership-portal">
                        <Shield className="mr-2 h-4 w-4" />
                        Leadership Portal
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator />
                <a href="/api/logout">
                  <DropdownMenuItem className="cursor-pointer text-destructive" data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </a>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <div className="flex">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r pt-16 transition-transform lg:translate-x-0 lg:static lg:pt-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="p-4 space-y-2">
            <div className="mb-4 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Member Portal
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {roleLabel}
              </p>
            </div>
            
            {hasMultipleMinistries && (
              <div className="mb-4 px-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Active Ministry
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between gap-2"
                      data-testid="button-ministry-selector"
                    >
                      <span className="truncate">{selectedMinistryName}</span>
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuLabel>Switch Ministry</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {activeAssignments.map((assignment) => {
                      const ministry = ministries?.find(m => m.id === assignment.ministryId);
                      if (!ministry) return null;
                      return (
                        <DropdownMenuItem
                          key={assignment.id}
                          onClick={() => setSelectedMinistryId(ministry.id)}
                          className="cursor-pointer"
                          data-testid={`ministry-option-${ministry.id}`}
                        >
                          <Check 
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedMinistryId === ministry.id ? "opacity-100" : "opacity-0"
                            )} 
                          />
                          <span className="truncate">{ministry.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            {memberNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || 
                (item.path !== "/" && location.startsWith(item.path));
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            
            <div className="pt-4 border-t mt-4">
              <a href="/api/logout">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </a>
            </div>
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
    </div>
  );
}
