import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole } from "@/hooks/useRole";
import {
  Heart,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  ChevronRight,
  UserPlus,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface PastoralQuestion {
  id: string;
  userId: string;
  userName: string;
  question: string;
  context: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolverName: string | null;
  notes: string | null;
}

interface CareDashboardStats {
  pendingQuestions: number;
  resolvedQuestions: number;
  newMembersThisMonth: number;
  onboardingInProgress: number;
  totalMembers: number;
}

interface MinistryJoinRequest {
  id: string;
  userId: string;
  userName: string;
  ministryId: string;
  ministryName: string;
  status: string;
  createdAt: string;
}

export default function PastoralCare() {
  const { toast } = useToast();
  const { isPastoralRole, user } = useRole();
  const [selectedQuestion, setSelectedQuestion] = useState<PastoralQuestion | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  const { data: questions, isLoading: questionsLoading } = useQuery<PastoralQuestion[]>({
    queryKey: ['/api/pastoral-questions'],
    enabled: isPastoralRole,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<CareDashboardStats>({
    queryKey: ['/api/pastoral-care/dashboard'],
    enabled: isPastoralRole,
  });

  const { data: joinRequests } = useQuery<MinistryJoinRequest[]>({
    queryKey: ['/api/ministry-join-requests'],
    enabled: isPastoralRole,
  });

  const resolveQuestionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await apiRequest('PATCH', `/api/pastoral-questions/${id}`, { 
        status: 'resolved',
        notes 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pastoral-questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pastoral-care/dashboard'] });
      setSelectedQuestion(null);
      setResponseNotes("");
      toast({ title: "Question marked as resolved" });
    },
    onError: () => {
      toast({ title: "Failed to update question", variant: "destructive" });
    },
  });

  if (!isPastoralRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Pastoral Access Required</h1>
        <p className="text-muted-foreground">This page is for pastoral roles only.</p>
      </div>
    );
  }

  const pendingQuestions = questions?.filter(q => q.status === 'pending') || [];
  const resolvedQuestions = questions?.filter(q => q.status === 'resolved') || [];
  const pendingRequests = joinRequests?.filter(r => r.status === 'pending') || [];

  if (questionsLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Heart className="h-6 w-6 text-rose-500" />
          Pastoral Care & Oversight
        </h1>
        <p className="text-muted-foreground">
          Follow up with members who have questions and monitor congregation health
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="card-pending-questions">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Questions</p>
                <p className="text-3xl font-bold text-amber-600">{stats?.pendingQuestions || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <MessageSquare className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-resolved-questions">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Questions Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats?.resolvedQuestions || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-new-members">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.newMembersThisMonth || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <UserPlus className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-onboarding">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Onboarding</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.onboardingInProgress || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions" data-testid="tab-questions">
            Questions {pendingQuestions.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingQuestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            Ministry Requests {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved">
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          {pendingQuestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">All Caught Up</h3>
                <p className="text-muted-foreground">No pending questions from members at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingQuestions.map((question) => (
                <Card key={question.id} data-testid={`card-question-${question.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {question.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium" data-testid={`text-question-user-${question.id}`}>
                              {question.userName}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {format(new Date(question.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-amber-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        
                        {question.context && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Context: {question.context}
                          </p>
                        )}
                        
                        <div className="p-3 rounded-lg bg-muted/50 mb-4">
                          <p className="text-sm" data-testid={`text-question-content-${question.id}`}>
                            "{question.question}"
                          </p>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              onClick={() => setSelectedQuestion(question)}
                              data-testid={`button-respond-${question.id}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Mark as Resolved
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Resolve Question</DialogTitle>
                              <DialogDescription>
                                Add notes about how this was resolved for future reference.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-sm font-medium mb-1">{question.userName}'s Question:</p>
                                <p className="text-sm text-muted-foreground">"{question.question}"</p>
                              </div>
                              <Textarea
                                placeholder="Add resolution notes (e.g., 'Met for coffee, discussed faith questions, will follow up next week')"
                                value={responseNotes}
                                onChange={(e) => setResponseNotes(e.target.value)}
                                className="min-h-[100px]"
                                data-testid="input-resolution-notes"
                              />
                              <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    onClick={() => resolveQuestionMutation.mutate({ 
                                      id: question.id, 
                                      notes: responseNotes 
                                    })}
                                    disabled={resolveQuestionMutation.isPending}
                                    data-testid="button-confirm-resolve"
                                  >
                                    Mark Resolved
                                  </Button>
                                </DialogClose>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">Ministry join requests will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} data-testid={`card-request-${request.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {request.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{request.userName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Wants to join <span className="font-medium">{request.ministryName}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" data-testid={`button-review-${request.id}`}>
                        Review
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {resolvedQuestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No Resolved Questions Yet</h3>
                <p className="text-muted-foreground">Questions you resolve will appear here for reference.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedQuestions.map((question) => (
                <Card key={question.id} className="opacity-75" data-testid={`card-resolved-${question.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {question.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{question.userName}</h4>
                            <p className="text-xs text-muted-foreground">
                              Resolved {question.resolvedAt && format(new Date(question.resolvedAt), 'MMM d, yyyy')}
                              {question.resolverName && ` by ${question.resolverName}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          "{question.question}"
                        </p>
                        
                        {question.notes && (
                          <div className="p-2 rounded bg-muted/50 mt-2">
                            <p className="text-xs text-muted-foreground">
                              <strong>Notes:</strong> {question.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
