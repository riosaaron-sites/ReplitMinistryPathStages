import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, setHours, setMinutes } from "date-fns";
import { Loader2, CalendarIcon, Clock, Users, MapPin, CheckCircle, XCircle, AlertCircle, Building2, Send } from "lucide-react";
import type { RoomReservation } from "@shared/schema";
import { z } from "zod";

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

const formSchema = z.object({
  roomId: z.string().min(1, "Please select a room"),
  title: z.string().min(2, "Title must be at least 2 characters"),
  date: z.date({ required_error: "Please select a date" }),
  startTimeStr: z.string().min(1, "Start time required"),
  endTimeStr: z.string().min(1, "End time required"),
  attendeeCount: z.number().optional(),
  notes: z.string().optional(),
  setupTime: z.number().default(0),
  teardownTime: z.number().default(0),
});

type FormData = z.infer<typeof formSchema>;

export default function RoomRequest() {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: "",
      title: "",
      date: undefined,
      startTimeStr: "09:00",
      endTimeStr: "10:00",
      attendeeCount: undefined,
      notes: "",
      setupTime: 0,
      teardownTime: 0,
    },
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  const { data: myReservations = [], isLoading: reservationsLoading } = useQuery<RoomReservation[]>({
    queryKey: ['/api/room-reservations/mine'],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest('POST', '/api/room-reservations', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/room-reservations/mine'] });
      toast({ title: 'Room request submitted', description: 'A leader will review your request.' });
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    }
  });

  const onSubmit = (data: FormData) => {
    if (!data.date) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }

    const [startHour, startMin] = data.startTimeStr.split(':').map(Number);
    const [endHour, endMin] = data.endTimeStr.split(':').map(Number);

    const startDateTime = setMinutes(setHours(data.date, startHour), startMin);
    const endDateTime = setMinutes(setHours(data.date, endHour), endMin);

    if (endDateTime <= startDateTime) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      roomId: data.roomId,
      title: data.title.trim(),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      attendeeCount: data.attendeeCount || undefined,
      notes: data.notes?.trim() || undefined,
      setupTime: data.setupTime || 0,
      teardownTime: data.teardownTime || 0,
      status: 'pending'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="gap-1"><XCircle className="w-3 h-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" /> Pending</Badge>;
    }
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  const selectedRoomId = form.watch("roomId");
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-room">
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Youth Ministry Meeting"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="button-date-picker"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTimeStr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-start-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTimeStr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-end-time"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="attendeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attendees</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Expected"
                            min="1"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                            data-testid="input-attendees"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="setupTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup (min)</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(parseInt(v))} 
                          value={String(field.value || 0)}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-setup">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teardownTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teardown (min)</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(parseInt(v))} 
                          value={String(field.value || 0)}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-teardown">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="60">60</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Any special requirements or notes for the approval team..."
                          className="min-h-[80px]"
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
            </Form>
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
