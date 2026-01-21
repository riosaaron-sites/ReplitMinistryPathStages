import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, setHours, setMinutes, parseISO, addMinutes } from "date-fns";
import { Loader2, CalendarIcon, Clock, Users, MapPin, CheckCircle, XCircle, AlertCircle, Building2, Send } from "lucide-react";
import type { RoomReservation } from "@shared/schema";

interface Room {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  location: string | null;
  amenities: string[];
  layoutPresets: string[];
  isActive: boolean;
}

export default function RoomRequest() {
  const { toast } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [notes, setNotes] = useState("");
  const [setupTime, setSetupTime] = useState("0");
  const [teardownTime, setTeardownTime] = useState("0");

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  const { data: myReservations = [], isLoading: reservationsLoading } = useQuery<RoomReservation[]>({
    queryKey: ['/api/room-reservations', 'mine'],
    queryFn: async () => {
      const res = await fetch('/api/room-reservations?mine=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reservations');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest('POST', '/api/room-reservations', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-reservations'] });
      toast({ title: 'Room request submitted', description: 'A leader will review your request.' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setSelectedRoomId("");
    setTitle("");
    setDate(undefined);
    setStartTime("09:00");
    setEndTime("10:00");
    setAttendeeCount("");
    setNotes("");
    setSetupTime("0");
    setTeardownTime("0");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId || !title.trim() || !date) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startDateTime = setMinutes(setHours(date, startHour), startMin);
    const endDateTime = setMinutes(setHours(date, endHour), endMin);

    if (endDateTime <= startDateTime) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      roomId: selectedRoomId,
      title: title.trim(),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      attendeeCount: attendeeCount ? parseInt(attendeeCount) : undefined,
      notes: notes.trim() || undefined,
      setupTime: parseInt(setupTime) || 0,
      teardownTime: parseInt(teardownTime) || 0,
      status: 'pending'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const activeRooms = rooms.filter(r => r.isActive);

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Request a Room</h1>
          <p className="text-muted-foreground">Reserve a room for your ministry event or meeting</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-request-form">
          <CardHeader>
            <CardTitle>New Room Request</CardTitle>
            <CardDescription>Fill out the details for your room reservation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-select">Room *</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger data-testid="select-room">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRooms.map(room => (
                      <SelectItem key={room.id} value={room.id} data-testid={`select-room-${room.id}`}>
                        {room.name} {room.capacity && `(capacity: ${room.capacity})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRoom && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedRoom.location || 'No location specified'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Youth Ministry Meeting"
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-date-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendees">Attendees</Label>
                  <Input
                    id="attendees"
                    type="number"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    placeholder="Expected"
                    min="1"
                    data-testid="input-attendees"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup">Setup (min)</Label>
                  <Select value={setupTime} onValueChange={setSetupTime}>
                    <SelectTrigger data-testid="select-setup">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teardown">Teardown (min)</Label>
                  <Select value={teardownTime} onValueChange={setTeardownTime}>
                    <SelectTrigger data-testid="select-teardown">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements or notes for the approval team..."
                  className="min-h-[80px]"
                  data-testid="input-notes"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createMutation.isPending}
                data-testid="button-submit-request"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card data-testid="card-my-reservations">
            <CardHeader>
              <CardTitle>My Reservations</CardTitle>
              <CardDescription>Track the status of your room requests</CardDescription>
            </CardHeader>
            <CardContent>
              {reservationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : myReservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No room requests yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myReservations.map(reservation => (
                    <div 
                      key={reservation.id} 
                      className="p-3 border rounded-lg"
                      data-testid={`card-reservation-${reservation.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{reservation.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getRoomName(reservation.roomId)}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>
                              {format(new Date(reservation.startTime), "MMM d, yyyy")}
                            </span>
                            <Clock className="w-3 h-3 ml-2" />
                            <span>
                              {format(new Date(reservation.startTime), "h:mm a")} - {format(new Date(reservation.endTime), "h:mm a")}
                            </span>
                          </div>
                          {reservation.attendeeCount && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{reservation.attendeeCount} attendees</span>
                            </div>
                          )}
                        </div>
                        {getStatusBadge(reservation.status || 'pending')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activeRooms.length > 0 && (
            <Card data-testid="card-available-rooms">
              <CardHeader>
                <CardTitle>Available Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeRooms.map(room => (
                    <div 
                      key={room.id} 
                      className="flex items-center justify-between p-2 border rounded"
                      data-testid={`room-info-${room.id}`}
                    >
                      <div>
                        <p className="font-medium">{room.name}</p>
                        {room.location && (
                          <p className="text-sm text-muted-foreground">{room.location}</p>
                        )}
                      </div>
                      {room.capacity && (
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {room.capacity}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
