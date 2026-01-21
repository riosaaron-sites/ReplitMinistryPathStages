import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, addYears, subYears, startOfYear, endOfYear, eachMonthOfInterval, startOfDay, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRequirements } from "@/hooks/useRequirements";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Music, 
  RefreshCw,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  List,
  Grid3X3,
  CalendarDays,
  Filter,
  Maximize2
} from "lucide-react";
import type { CalendarEvent, ServiceAssignment, Ministry, CalendarCategory } from "@shared/schema";
import { HelpLink } from "@/components/HelpLink";
import { CoachBubble } from "@/components/CoachBubble";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

type ViewMode = 'month' | 'agenda' | 'year';
type EventType = 'all' | 'meeting' | 'event' | 'reservation';

interface UnifiedCalendarItem {
  id: string;
  type: 'meeting' | 'event' | 'reservation';
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  roomId?: string | null;
  room?: { name: string } | null;
  ministryId?: string | null;
  isVirtual?: boolean;
  virtualLink?: string | null;
  status?: string;
  category?: string | null;
}

interface UnifiedCalendarResponse {
  items: UnifiedCalendarItem[];
  range: { start: string; end: string };
}

const EVENT_PRESETS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'This Month', days: 30 },
  { id: 'quarter', label: 'Next 3 Months', days: 90 },
];

export default function MinistryCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterType, setFilterType] = useState<EventType>('all');
  const [filterMinistryId, setFilterMinistryId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [agendaDays, setAgendaDays] = useState(30);
  const { toast } = useToast();
  const { canAccessFeatures } = useRequirements();

  // Date ranges based on view mode
  const startDate = useMemo(() => {
    switch (viewMode) {
      case 'year':
        return startOfYear(currentYear);
      case 'agenda':
        return startOfDay(new Date());
      default:
        return startOfMonth(currentMonth);
    }
  }, [viewMode, currentMonth, currentYear]);

  const endDate = useMemo(() => {
    switch (viewMode) {
      case 'year':
        return endOfYear(currentYear);
      case 'agenda':
        return addDays(startOfDay(new Date()), agendaDays);
      default:
        return endOfMonth(currentMonth);
    }
  }, [viewMode, currentMonth, currentYear, agendaDays]);

  // Fetch ministries for filter
  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ['/api/ministries'],
    enabled: canAccessFeatures,
  });

  // Fetch calendar categories for filter (from dynamic categories API)
  const { data: calendarCategories = [] } = useQuery<CalendarCategory[]>({
    queryKey: ['/api/categories'],
    enabled: canAccessFeatures,
  });

  // Unified calendar data
  const { data: unifiedData, isLoading: unifiedLoading } = useQuery<UnifiedCalendarResponse>({
    queryKey: ['/api/calendar/unified', { start: startDate.toISOString(), end: endDate.toISOString(), ministryId: filterMinistryId !== 'all' ? filterMinistryId : undefined }],
    enabled: canAccessFeatures,
  });

  // Legacy events for compatibility
  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events', { start: startDate.toISOString(), end: endDate.toISOString() }],
    enabled: canAccessFeatures,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ServiceAssignment[]>({
    queryKey: ['/api/services/assignments'],
    enabled: canAccessFeatures,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/services/sync');
      return res.json() as Promise<{ message: string; count: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/services/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/unified'] });
      toast({
        title: "Sync Complete",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Could not sync with Planning Center. Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Filter unified items by type and category
  const filteredItems = useMemo(() => {
    let items = unifiedData?.items || [];
    
    // Filter by type
    if (filterType !== 'all') {
      items = items.filter(item => item.type === filterType);
    }
    
    // Filter by category - API returns both category (display) and categorySlug (normalized)
    // Items without a category are excluded from category filtering (only show when "All" selected)
    if (filterCategoryId !== 'all') {
      const selectedCategory = calendarCategories.find(c => c.id === filterCategoryId);
      if (selectedCategory) {
        const targetSlug = selectedCategory.slug || slugify(selectedCategory.name);
        items = items.filter(item => {
          const itemSlug = (item as any).categorySlug;
          // Match by categorySlug if available
          if (itemSlug) {
            return itemSlug === targetSlug;
          }
          // Fall back to slugified category name comparison for legacy data
          if (item.category) {
            return slugify(item.category) === targetSlug;
          }
          // Items without any category don't match category filters
          return false;
        });
      }
    }
    
    return items;
  }, [unifiedData, filterType, filterCategoryId, calendarCategories]);

  // Group items by date for agenda view
  const groupedItems = useMemo(() => {
    const grouped: Record<string, UnifiedCalendarItem[]> = {};
    filteredItems.forEach(item => {
      const dateKey = format(new Date(item.startTime), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const monthsInYear = eachMonthOfInterval({ start: startOfYear(currentYear), end: endOfYear(currentYear) });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, day);
    });
  };

  const getAssignmentsForDay = (day: Date) => {
    return assignments.filter(assignment => {
      if (!assignment.scheduledDate) return false;
      const assignmentDate = new Date(assignment.scheduledDate);
      return isSameDay(assignmentDate, day);
    });
  };

  const getUnifiedItemsForDay = (day: Date) => {
    return filteredItems.filter(item => isSameDay(new Date(item.startTime), day));
  };

  const pendingAssignments = assignments.filter(a => a.needsResponse);
  const upcomingAssignments = assignments
    .filter(a => a.scheduledDate && new Date(a.scheduledDate) >= new Date())
    .slice(0, 5);

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const selectedDayAssignments = selectedDate ? getAssignmentsForDay(selectedDate) : [];
  const selectedDayItems = selectedDate ? getUnifiedItemsForDay(selectedDate) : [];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'declined':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline"><HelpCircle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Meeting</Badge>;
      case 'event':
        return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Event</Badge>;
      case 'reservation':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Room</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (!canAccessFeatures) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Calendar Locked</h3>
            <p className="text-muted-foreground">Complete your profile to access the ministry calendar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calendar-title">Ministry Calendar</h1>
            <p className="text-muted-foreground">View church events, meetings, and your service schedule</p>
          </div>
          <HelpLink articleId="calendar-overview" tooltip="Calendar Help" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-sync-calendar"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      <CoachBubble
        id="calendar-welcome"
        title="Your Ministry Calendar"
        message="View all church events, team meetings, and room reservations in one place. Use the filters to focus on specific types of events or ministries."
      />

      {/* View Tabs and Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
          <TabsList>
            <TabsTrigger value="month" data-testid="tab-month-view">
              <Grid3X3 className="h-4 w-4 mr-1" />
              Month
            </TabsTrigger>
            <TabsTrigger value="agenda" data-testid="tab-agenda-view">
              <List className="h-4 w-4 mr-1" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="year" data-testid="tab-year-view">
              <CalendarDays className="h-4 w-4 mr-1" />
              Year
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType)}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="event">Events</SelectItem>
              <SelectItem value="reservation">Rooms</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterMinistryId} onValueChange={setFilterMinistryId}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-ministry">
              <SelectValue placeholder="Ministry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ministries</SelectItem>
              {ministries.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {calendarCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: c.color || '#3B82F6' }}
                    />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {viewMode === 'agenda' && (
            <Select value={String(agendaDays)} onValueChange={(v) => setAgendaDays(Number(v))}>
              <SelectTrigger className="w-[140px]" data-testid="select-agenda-range">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_PRESETS.map(p => (
                  <SelectItem key={p.id} value={String(p.days || 30)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Month View */}
          {viewMode === 'month' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(currentMonth, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                      data-testid="button-today"
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading || assignmentsLoading || unifiedLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    
                    {/* Leading empty cells for first week */}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`empty-start-${i}`} className="aspect-square" />
                    ))}
                    
                    {daysInMonth.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const dayAssignments = getAssignmentsForDay(day);
                      const dayUnifiedItems = getUnifiedItemsForDay(day);
                      const hasItems = dayEvents.length > 0 || dayAssignments.length > 0 || dayUnifiedItems.length > 0;
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`
                            aspect-square p-1 rounded-md text-sm relative w-full
                            hover-elevate transition-colors
                            ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : ''}
                            ${isToday(day) ? 'bg-primary/10 font-bold text-primary' : ''}
                            ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          `}
                          data-testid={`button-day-${format(day, 'yyyy-MM-dd')}`}
                        >
                          <span>{format(day, 'd')}</span>
                          {hasItems && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {dayEvents.length > 0 && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-blue-500'}`} />
                              )}
                              {dayAssignments.length > 0 && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-green-500'}`} />
                              )}
                              {dayUnifiedItems.some(i => i.type === 'meeting') && (
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : 'bg-purple-500'}`} />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agenda View */}
          {viewMode === 'agenda' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>
                  {filteredItems.length} items in the next {agendaDays} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unifiedLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : Object.keys(groupedItems).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events scheduled in this period</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([dateKey, items]) => (
                      <div key={dateKey}>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isToday(new Date(dateKey)) ? 'bg-primary' : 'bg-muted-foreground'}`} />
                          {format(new Date(dateKey), 'EEEE, MMMM d')}
                          {isToday(new Date(dateKey)) && <Badge variant="secondary" className="text-xs">Today</Badge>}
                        </h3>
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {items.map(item => (
                            <div 
                              key={`${item.type}-${item.id}`}
                              className="p-3 rounded-lg border hover-elevate bg-card"
                              data-testid={`agenda-item-${item.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-medium">{item.title}</span>
                                    {getTypeBadge(item.type)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(item.startTime), 'h:mm a')}
                                      {item.endTime && ` - ${format(new Date(item.endTime), 'h:mm a')}`}
                                    </span>
                                    {(item.location || item.room) && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {item.room?.name || item.location}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Year View */}
          {viewMode === 'year' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {format(currentYear, 'yyyy')}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentYear(subYears(currentYear, 1))}
                      data-testid="button-prev-year"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentYear(new Date())}
                    >
                      This Year
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentYear(addYears(currentYear, 1))}
                      data-testid="button-next-year"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {unifiedLoading ? (
                  <Skeleton className="h-96 w-full" />
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    {monthsInYear.map((month) => {
                      const monthStart = startOfMonth(month);
                      const monthEnd = endOfMonth(month);
                      const daysInThisMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                      const monthItems = filteredItems.filter(item => {
                        const itemDate = new Date(item.startTime);
                        return itemDate >= monthStart && itemDate <= monthEnd;
                      });
                      const hasEvents = monthItems.length > 0;
                      const isCurrentMonth = isSameMonth(month, new Date());

                      return (
                        <div 
                          key={month.toISOString()}
                          className={`p-3 rounded-lg border cursor-pointer hover-elevate ${isCurrentMonth ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => {
                            setCurrentMonth(month);
                            setViewMode('month');
                          }}
                          data-testid={`year-month-${format(month, 'yyyy-MM')}`}
                        >
                          <h4 className="font-semibold text-sm mb-2 flex items-center justify-between">
                            {format(month, 'MMMM')}
                            {hasEvents && (
                              <Badge variant="secondary" className="text-xs">{monthItems.length}</Badge>
                            )}
                          </h4>
                          <div className="grid grid-cols-7 gap-px text-[10px]">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                              <div key={i} className="text-center text-muted-foreground">{d}</div>
                            ))}
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {daysInThisMonth.map((day) => {
                              const hasItem = filteredItems.some(item => isSameDay(new Date(item.startTime), day));
                              return (
                                <div 
                                  key={day.toISOString()}
                                  className={`text-center py-0.5 rounded-sm
                                    ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : ''}
                                    ${hasItem && !isToday(day) ? 'bg-primary/20 text-primary' : ''}
                                  `}
                                >
                                  {format(day, 'd')}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Day Detail (Month View) */}
          {viewMode === 'month' && selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>{format(selectedDate, 'EEEE, MMMM d')}</CardTitle>
                <CardDescription>
                  {selectedDayEvents.length + selectedDayAssignments.length + selectedDayItems.length} items scheduled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDayEvents.length === 0 && selectedDayAssignments.length === 0 && selectedDayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No events scheduled for this day</p>
                ) : (
                  <>
                    {selectedDayAssignments.map(assignment => (
                      <div 
                        key={assignment.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border bg-green-500/5 border-green-500/20"
                        data-testid={`assignment-${assignment.id}`}
                      >
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Music className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{assignment.serviceName}</span>
                            {getStatusBadge(assignment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {assignment.teamName} - {assignment.positionName}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {selectedDayItems.map(item => (
                      <div 
                        key={`${item.type}-${item.id}`}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        data-testid={`unified-item-${item.id}`}
                      >
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium">{item.title}</span>
                            {getTypeBadge(item.type)}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(item.startTime), 'h:mm a')}
                            </span>
                            {(item.location || item.room) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.room?.name || item.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedDayEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        data-testid={`event-${event.id}`}
                      >
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{event.title}</span>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.startDate), 'h:mm a')}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {pendingAssignments.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Pending Responses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingAssignments.map(assignment => (
                  <div key={assignment.id} className="text-sm p-2 bg-background rounded border">
                    <p className="font-medium">{assignment.serviceName}</p>
                    <p className="text-muted-foreground text-xs">
                      {assignment.scheduledDate && format(new Date(assignment.scheduledDate), 'MMM d')} - {assignment.positionName}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Please respond in Planning Center
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Upcoming Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No upcoming service assignments</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        assignment.status === 'confirmed' ? 'bg-green-500' :
                        assignment.status === 'declined' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{assignment.serviceName}</p>
                        <p className="text-muted-foreground text-xs">
                          {assignment.scheduledDate && format(new Date(assignment.scheduledDate), 'EEE, MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Church Events</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span>Your Service Schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Meetings</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
