import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  Users, 
  Megaphone,
  Mail,
  MailOpen,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  Loader2,
  ArrowLeft
} from "lucide-react";
import type { Message, User as UserType, Ministry, RoleAssignment } from "@shared/schema";

interface MessageWithSender extends Message {
  sender?: UserType;
  ministry?: Ministry;
}

const messageFormSchema = z.object({
  recipientId: z.string().optional(),
  ministryId: z.string().optional(),
  messageType: z.enum(['direct', 'channel', 'announcement']),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Message content is required"),
});

type MessageFormData = z.infer<typeof messageFormSchema>;

function MessageItem({ 
  message, 
  onClick,
  isSelected
}: { 
  message: MessageWithSender; 
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div 
      className={`p-4 border-b cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/5' : 'hover-elevate'
      } ${!message.isRead ? 'bg-muted/50' : ''}`}
      onClick={onClick}
      data-testid={`message-item-${message.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={message.sender?.profileImageUrl || undefined} />
          <AvatarFallback>
            {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${!message.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
              {message.sender?.firstName} {message.sender?.lastName}
            </span>
            {message.isAnnouncement && (
              <Badge variant="secondary" className="text-xs">
                <Megaphone className="h-3 w-3 mr-1" />
                Announcement
              </Badge>
            )}
            {message.ministry && (
              <Badge variant="outline" className="text-xs">
                {message.ministry.name}
              </Badge>
            )}
          </div>
          <p className={`text-sm truncate ${!message.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
            {message.subject}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {message.createdAt && format(new Date(message.createdAt), 'MMM d, h:mm a')}
          </div>
        </div>
        {!message.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [selectedMessage, setSelectedMessage] = useState<MessageWithSender | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      messageType: 'direct',
      subject: '',
      content: '',
    },
  });

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages"],
  });

  const { data: myAssignments = [] } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: ministries = [] } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const sendMessage = useMutation({
    mutationFn: async (data: MessageFormData) => {
      return apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setComposeOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const onSubmit = (data: MessageFormData) => {
    sendMessage.mutate(data);
  };

  const handleSelectMessage = (message: MessageWithSender) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsRead.mutate(message.id);
    }
  };

  const myMinistryIds = myAssignments.filter(a => a.isActive).map(a => a.ministryId);
  
  const inboxMessages = messages.filter(m => 
    m.recipientId === user?.id || 
    (m.messageType === 'channel' && myMinistryIds.includes(m.ministryId || '')) ||
    m.isAnnouncement
  );

  const sentMessages = messages.filter(m => m.senderId === user?.id);

  const announcements = messages.filter(m => m.isAnnouncement);

  const channelMessages = messages.filter(m => 
    m.messageType === 'channel' && myMinistryIds.includes(m.ministryId || '')
  );

  const filteredMessages = (activeTab === 'inbox' ? inboxMessages : 
    activeTab === 'sent' ? sentMessages :
    activeTab === 'announcements' ? announcements :
    channelMessages
  ).filter(m => 
    searchQuery === '' || 
    m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = inboxMessages.filter(m => !m.isRead).length;

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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <MessageSquare className="w-6 h-6" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="default">{unreadCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Stay connected with your ministry teams
          </p>
        </div>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-compose">
              <Plus className="w-4 h-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a message to a team member or ministry channel
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="messageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-message-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct">Direct Message</SelectItem>
                          <SelectItem value="channel">Ministry Channel</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                {form.watch('messageType') === 'direct' && (
                  <FormField
                    control={form.control}
                    name="recipientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-recipient">
                              <SelectValue placeholder="Select recipient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.filter(u => u.id !== user?.id && !u.isArchived).map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('messageType') === 'channel' && (
                  <FormField
                    control={form.control}
                    name="ministryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ministry Channel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ministry">
                              <SelectValue placeholder="Select ministry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ministries.filter(m => myMinistryIds.includes(m.id)).map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Message subject" data-testid="input-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Write your message..." 
                          className="min-h-[120px]"
                          data-testid="input-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={sendMessage.isPending} data-testid="button-send">
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
                <TabsTrigger value="inbox" className="relative" data-testid="tab-inbox">
                  <Inbox className="h-4 w-4 mr-2" />
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-2 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="channels" data-testid="tab-channels">
                  <Users className="h-4 w-4 mr-2" />
                  Channels
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">
                  <Send className="h-4 w-4 mr-2" />
                  Sent
                </TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[400px]">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  filteredMessages.map(message => (
                    <MessageItem 
                      key={message.id}
                      message={message}
                      onClick={() => handleSelectMessage(message)}
                      isSelected={selectedMessage?.id === message.id}
                    />
                  ))
                )}
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedMessage ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    <AvatarImage src={selectedMessage.sender?.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {selectedMessage.sender?.firstName?.[0]}{selectedMessage.sender?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                      {selectedMessage.isAnnouncement && (
                        <Badge variant="secondary">Announcement</Badge>
                      )}
                    </div>
                    <CardDescription>
                      From {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}
                      {selectedMessage.createdAt && (
                        <> · {format(new Date(selectedMessage.createdAt), 'MMMM d, yyyy at h:mm a')}</>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <MailOpen className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a message to read</p>
              <p className="text-sm">Choose from your inbox on the left</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
