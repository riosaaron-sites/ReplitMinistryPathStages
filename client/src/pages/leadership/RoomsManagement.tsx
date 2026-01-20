import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DoorOpen,
  Plus,
  Users,
  MapPin,
  Package,
  Calendar,
  Loader2,
  Wifi,
  Monitor,
  Volume2,
  Coffee,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Room {
  id: string;
  name: string;
  capacity?: number;
  description?: string;
  location?: string;
  amenities?: string[];
  isActive: boolean;
}

interface Resource {
  id: string;
  name: string;
  category?: string;
  description?: string;
  quantity?: number;
  location?: string;
  isConsumable?: boolean;
}

interface RoomReservation {
  id: string;
  roomId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  attendeeCount?: number;
}

const roomFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.coerce.number().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  amenities: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

const resourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  isConsumable: z.boolean().optional(),
});

type ResourceFormData = z.infer<typeof resourceFormSchema>;

const AMENITY_ICONS: Record<string, any> = {
  'wifi': Wifi,
  'projector': Monitor,
  'sound': Volume2,
  'kitchen': Coffee,
};

export default function RoomsManagement() {
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");
  const { toast } = useToast();

  const roomForm = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: '',
      capacity: undefined,
      description: '',
      location: '',
      amenities: '',
    },
  });

  const resourceForm = useForm<ResourceFormData>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      quantity: 1,
      location: '',
      isConsumable: false,
    },
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const startDate = new Date();
  const { data: reservations = [] } = useQuery<RoomReservation[]>({
    queryKey: ["/api/room-reservations", { start: startDate.toISOString() }],
  });

  const createRoom = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const amenitiesArray = data.amenities ? data.amenities.split(',').map(a => a.trim()).filter(Boolean) : [];
      return apiRequest("POST", "/api/rooms", { ...data, amenities: amenitiesArray });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setRoomDialogOpen(false);
      roomForm.reset();
      toast({ title: "Room Created", description: "The room has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create room. Please try again.", variant: "destructive" });
    },
  });

  const createResource = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      return apiRequest("POST", "/api/resources", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setResourceDialogOpen(false);
      resourceForm.reset();
      toast({ title: "Resource Created", description: "The resource has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create resource. Please try again.", variant: "destructive" });
    },
  });

  const getRoomReservations = (roomId: string) => {
    return reservations.filter(r => r.roomId === roomId);
  };

  const checkConflict = (reservation: RoomReservation): RoomReservation[] => {
    const resStart = new Date(reservation.startTime).getTime();
    const resEnd = new Date(reservation.endTime).getTime();
    
    return reservations.filter(r => {
      if (r.id === reservation.id || r.roomId !== reservation.roomId) return false;
      const rStart = new Date(r.startTime).getTime();
      const rEnd = new Date(r.endTime).getTime();
      return (resStart < rEnd && resEnd > rStart);
    });
  };

  const getConflictingReservations = () => {
    const conflicts: Map<string, RoomReservation[]> = new Map();
    reservations.forEach(res => {
      const resConflicts = checkConflict(res);
      if (resConflicts.length > 0) {
        conflicts.set(res.id, resConflicts);
      }
    });
    return conflicts;
  };

  const conflictMap = getConflictingReservations();

  const isLoading = roomsLoading || resourcesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DoorOpen className="w-6 h-6" />
            Rooms & Resources
          </h1>
          <p className="text-muted-foreground">
            Manage facility rooms and ministry resources
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4" />
            Rooms ({rooms.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Resources ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Reservations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-room">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Room</DialogTitle>
                </DialogHeader>
                <Form {...roomForm}>
                  <form onSubmit={roomForm.handleSubmit((d) => createRoom.mutate(d))} className="space-y-4">
                    <FormField
                      control={roomForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Main Sanctuary" data-testid="input-room-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={roomForm.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="1" placeholder="100" data-testid="input-room-capacity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={roomForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Building A" data-testid="input-room-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={roomForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Room details..." className="resize-none" data-testid="textarea-room-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roomForm.control}
                      name="amenities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amenities (comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="wifi, projector, sound" data-testid="input-room-amenities" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createRoom.isPending} data-testid="button-submit-room">
                        {createRoom.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Room
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {rooms.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <DoorOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No Rooms Added</p>
                <p className="text-muted-foreground mb-4">Add rooms to start managing facility space.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => {
                const roomReservations = getRoomReservations(room.id);
                return (
                  <Card key={room.id} className="hover-elevate" data-testid={`card-room-${room.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <DoorOpen className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant="secondary">{room.capacity || '?'} capacity</Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{room.name}</CardTitle>
                      {room.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {room.location}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2">
                      {room.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {room.description}
                        </p>
                      )}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.map((amenity, i) => {
                            const Icon = AMENITY_ICONS[amenity.toLowerCase()] || Package;
                            return (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Icon className="w-3 h-3 mr-1" />
                                {amenity}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-2 text-xs text-muted-foreground">
                      {roomReservations.length} upcoming reservation{roomReservations.length !== 1 ? 's' : ''}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-resource">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                </DialogHeader>
                <Form {...resourceForm}>
                  <form onSubmit={resourceForm.handleSubmit((d) => createResource.mutate(d))} className="space-y-4">
                    <FormField
                      control={resourceForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resource Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Folding Tables" data-testid="input-resource-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={resourceForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Furniture" data-testid="input-resource-category" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={resourceForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" data-testid="input-resource-quantity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={resourceForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Storage Room A" data-testid="input-resource-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resourceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Resource details..." className="resize-none" data-testid="textarea-resource-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createResource.isPending} data-testid="button-submit-resource">
                        {createResource.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Resource
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {resources.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No Resources Added</p>
                <p className="text-muted-foreground mb-4">Track equipment and supplies for ministry use.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map(resource => (
                <Card key={resource.id} className="hover-elevate" data-testid={`card-resource-${resource.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary">{resource.quantity || 0} available</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{resource.name}</CardTitle>
                    {resource.category && (
                      <Badge variant="outline" className="w-fit">{resource.category}</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    {resource.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    {resource.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {resource.location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Room Reservations</p>
                <p className="text-muted-foreground">
                  View and manage upcoming room reservations. Conflicts are highlighted in red.
                </p>
              </div>
              
              {conflictMap.size > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">{conflictMap.size} Scheduling Conflict{conflictMap.size > 1 ? 's' : ''} Detected</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Review overlapping reservations and resolve conflicts below.
                  </p>
                </div>
              )}
              
              {reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No upcoming reservations.</p>
              ) : (
                <div className="space-y-3">
                  {reservations.slice(0, 20).map(res => {
                    const room = rooms.find(r => r.id === res.roomId);
                    const conflicts = conflictMap.get(res.id);
                    const hasConflict = conflicts && conflicts.length > 0;
                    
                    return (
                      <div 
                        key={res.id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          hasConflict 
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                            : 'bg-muted/50'
                        }`}
                        data-testid={`reservation-${res.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {hasConflict ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Conflicts with: {conflicts?.map(c => c.title).join(', ')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{res.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {room?.name || 'Unknown Room'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(res.startTime).toLocaleString()} - {new Date(res.endTime).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={res.status === 'approved' ? 'default' : 'secondary'}>
                            {res.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
