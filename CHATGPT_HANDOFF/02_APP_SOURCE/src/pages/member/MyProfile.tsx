import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ImageCropper } from "@/components/ImageCropper";
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Edit, 
  Save, 
  GraduationCap, 
  Users, 
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  Award,
  BookOpen,
  Heart,
  Compass,
  Loader2,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Upload
} from "lucide-react";
import type { User as UserType, RoleAssignment, Ministry, UserTrainingProgress, TrainingModule, SurveyResults, MinistrySelection, MinistryLeadershipAssignment } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Crown, Shield } from "lucide-react";

interface LeadershipAssignmentWithMinistry extends MinistryLeadershipAssignment {
  ministry: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
  } | null;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  bio: z.string().min(10, "Bio must be at least 10 characters").optional(),
  profileImageUrl: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProgressWithModule extends UserTrainingProgress {
  module?: TrainingModule;
}

export default function MyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(user?.profileImageUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      uploadProfilePhotoMutation.mutate(response.objectPath);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadProfilePhotoMutation = useMutation({
    mutationFn: async (objectPath: string) => {
      return apiRequest("PUT", "/api/profile", {
        profileImageUrl: objectPath,
      });
    },
    onSuccess: (_data, objectPath) => {
      form.setValue('profileImageUrl', objectPath);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Photo updated!",
        description: "Your profile photo has been saved.",
      });
      setPhotoDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Could not save photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImageSrc(event.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPhotoPreviewUrl(previewUrl);
    setShowCropper(false);
    setSelectedImageSrc(null);

    const file = new File([croppedBlob], "profile-photo.jpg", { type: "image/jpeg" });
    await uploadFile(file);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageSrc(null);
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      profileImageUrl: user?.profileImageUrl || "",
      socialLinks: (user?.socialLinks as any) || {},
    },
  });

  const { data: myAssignments } = useQuery<RoleAssignment[]>({
    queryKey: ["/api/role-assignments/my"],
  });

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["/api/ministries"],
  });

  const { data: trainingProgress } = useQuery<ProgressWithModule[]>({
    queryKey: ["/api/training/progress"],
  });

  const { data: surveyResults } = useQuery<SurveyResults>({
    queryKey: ["/api/survey/results"],
  });

  const { data: ministrySelections } = useQuery<MinistrySelection[]>({
    queryKey: ["/api/ministry-selections"],
  });

  // Get user's pending join requests
  const { data: myJoinRequests } = useQuery<any[]>({
    queryKey: ["/api/team-join-requests/my"],
  });

  // Get user's leadership assignments (H1)
  const { data: leadershipAssignments } = useQuery<LeadershipAssignmentWithMinistry[]>({
    queryKey: ["/api/leadership-assignments/my"],
  });

  // Get ministry IDs the user leads (for self-exclusion rule)
  const ledMinistryIds = leadershipAssignments?.filter(a => a.isActive).map(a => a.ministryId) || [];

  // Request to join a ministry
  const requestJoinMinistry = useMutation({
    mutationFn: async ({ ministryId, message }: { ministryId: string; message?: string }) => {
      return apiRequest("POST", "/api/team-join-requests", { ministryId, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-join-requests/my"] });
      toast({
        title: "Request Submitted",
        description: "Your request to join this ministry has been sent for approval.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit join request. You may already have a pending request.",
        variant: "destructive",
      });
    },
  });

  // Withdraw join request
  const withdrawJoinRequest = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("DELETE", `/api/team-join-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-join-requests/my"] });
      toast({
        title: "Request Withdrawn",
        description: "Your join request has been withdrawn.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to withdraw request.",
        variant: "destructive",
      });
    },
  });

  const updateMinistrySelections = useMutation({
    mutationFn: async (ministryIds: string[]) => {
      return apiRequest("POST", "/api/ministry-selections", { ministryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ministry-selections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/required"] });
      toast({
        title: "Ministries Updated",
        description: "Your ministry selections have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ministry selections.",
        variant: "destructive",
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.message || errorData.message || "Failed to update profile";
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  const getMinistry = (ministryId: string) => {
    return ministries?.find(m => m.id === ministryId);
  };

  const activeRoles = myAssignments?.filter(a => a.isActive) || [];
  const completedTrainings = trainingProgress?.filter(e => e.status === 'completed') || [];
  const inProgressTrainings = trainingProgress?.filter(e => e.status === 'in-progress') || [];

  // Get currently selected ministry IDs
  const selectedMinistryIds = ministrySelections?.filter(s => s.isActive).map(s => s.ministryId) || [];
  
  // Get pending join request for a ministry
  const getPendingRequest = (ministryId: string) => {
    return myJoinRequests?.find(r => r.ministryId === ministryId && r.status === 'pending');
  };
  
  const handleMinistryToggle = (ministryId: string) => {
    const newSelections = selectedMinistryIds.includes(ministryId)
      ? selectedMinistryIds.filter(id => id !== ministryId)
      : [...selectedMinistryIds, ministryId];
    updateMinistrySelections.mutate(newSelections);
  };

  const getDiscipleshipProgress = () => {
    if (!user) return { completed: 0, total: 5 };
    let completed = 0;
    if (user.hasAttendedSunday) completed++;
    if (user.hasAttendedNextNight) completed++;
    if (user.learnStatus === 'complete') completed++;
    if (user.loveStatus === 'complete') completed++;
    if (user.leadStatus === 'complete') completed++;
    return { completed, total: 5 };
  };

  const discipleship = getDiscipleshipProgress();

  if (!user) {
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
            <User className="w-6 h-6" />
            My Profile
          </h1>
          <p className="text-muted-foreground">
            View and manage your personal information
          </p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          onClick={() => isEditing ? form.handleSubmit(onSubmit)() : setIsEditing(true)}
          disabled={updateProfile.isPending}
          data-testid="button-edit-profile"
        >
          {updateProfile.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isEditing ? (
            <Save className="w-4 h-4 mr-2" />
          ) : (
            <Edit className="w-4 h-4 mr-2" />
          )}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList data-testid="tabs-profile">
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">Ministry Roles</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Training History</TabsTrigger>
          <TabsTrigger value="journey" data-testid="tab-journey">My Journey</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-3xl">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute bottom-0 right-0 rounded-full"
                          data-testid="button-change-photo"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Profile Photo</DialogTitle>
                          <DialogDescription>
                            Upload a photo from your device. You can crop and adjust it before saving.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={photoPreviewUrl || user.profileImageUrl || undefined} />
                              <AvatarFallback className="text-2xl">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <Button
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || uploadProfilePhotoMutation.isPending}
                            data-testid="button-upload-photo"
                          >
                            {isUploading || uploadProfilePhotoMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {isUploading ? "Uploading..." : "Saving..."}
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Choose Photo
                              </>
                            )}
                          </Button>

                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handlePhotoFileSelect}
                            data-testid="input-photo-file"
                          />

                          <p className="text-xs text-muted-foreground text-center">
                            Supported formats: JPG, PNG, GIF, WebP (max 10MB)
                          </p>

                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline"
                              onClick={() => setPhotoDialogOpen(false)}
                              disabled={isUploading || uploadProfilePhotoMutation.isPending}
                              data-testid="button-cancel-photo"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {selectedImageSrc && (
                    <ImageCropper
                      open={showCropper}
                      onClose={handleCropCancel}
                      imageSrc={selectedImageSrc}
                      onCropComplete={handleCropComplete}
                      aspectRatio={1}
                      cropShape="round"
                    />
                  )}
                </div>
                <h2 className="text-xl font-bold mt-4" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                {user.role && (
                  <Badge variant="secondary" className="mt-2" data-testid="badge-user-role">
                    {user.role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
                <div className="flex gap-2 mt-4">
                  {user.profileCompletedAt && (
                    <Badge variant="default">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Profile Complete
                    </Badge>
                  )}
                  {user.onboardingStatus === 'completed' && (
                    <Badge variant="default">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Onboarded
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  {isEditing ? "Update your contact details" : "Your contact information"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditing}
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled={!isEditing}
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  {...field} 
                                  disabled={!isEditing}
                                  className="pl-10"
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  {...field} 
                                  disabled={!isEditing}
                                  className="pl-10"
                                  data-testid="input-phone"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              disabled={!isEditing}
                              placeholder="Tell us about yourself..."
                              className="min-h-[100px]"
                              data-testid="input-bio"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Social Links</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="socialLinks.facebook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Facebook</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Facebook className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    disabled={!isEditing}
                                    className="pl-10"
                                    placeholder="facebook.com/username"
                                    data-testid="input-facebook"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socialLinks.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Instagram className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    disabled={!isEditing}
                                    className="pl-10"
                                    placeholder="@username"
                                    data-testid="input-instagram"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {/* Ministries I Lead Section (H1) */}
          {leadershipAssignments && leadershipAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Ministries I Lead
                </CardTitle>
                <CardDescription>
                  Your leadership roles at Garden City Church
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {leadershipAssignments.filter(a => a.isActive).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800"
                      data-testid={`leadership-card-${assignment.ministryId}`}
                    >
                      <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-800">
                        <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{assignment.ministry?.name || 'Unknown Ministry'}</p>
                        {assignment.ministry?.category && (
                          <p className="text-xs text-muted-foreground truncate">{assignment.ministry.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {assignment.isPrimary ? (
                          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            Primary
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Secondary
                          </Badge>
                        )}
                        {assignment.isLocked && (
                          <Badge variant="outline" className="text-xs border-yellow-400">
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ministries I Serve In Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Ministries I Serve In
              </CardTitle>
              <CardDescription>
                Choose the ministries you're serving in to unlock ministry-specific trainings
                {ledMinistryIds.length > 0 && (
                  <span className="block text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                    Note: Ministries you lead are shown above and not selectable here
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ministries && ministries.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Filter out ministries the user leads (self-exclusion rule H1) */}
                  {ministries.filter(m => !ledMinistryIds.includes(m.id)).map((ministry) => {
                    const isSelected = selectedMinistryIds.includes(ministry.id);
                    return (
                      <div
                        key={ministry.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleMinistryToggle(ministry.id)}
                        data-testid={`ministry-toggle-${ministry.id}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleMinistryToggle(ministry.id)}
                          disabled={updateMinistrySelections.isPending}
                          data-testid={`checkbox-ministry-${ministry.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ministry.name}</p>
                          {ministry.category && (
                            <p className="text-xs text-muted-foreground truncate">{ministry.category}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  {ministries.filter(m => !ledMinistryIds.includes(m.id)).length === 0 && (
                    <p className="text-muted-foreground text-center py-4 col-span-full">
                      You lead all available ministries!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No ministries available</p>
              )}
              {updateMinistrySelections.isPending && (
                <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Ministry Assignments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Ministry Roles
              </CardTitle>
              <CardDescription>
                Your official ministry assignments showing what you do and who you report to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeRoles.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No official ministry assignments yet.</p>
                  <p className="text-xs mt-1">Select ministries above to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRoles.map((role: any) => {
                    const ministry = role.ministry || getMinistry(role.ministryId);
                    const leader = role.reportsTo;
                    const isLeader = role.roleType === 'leader';
                    
                    return (
                      <Card key={role.id} className="hover-elevate border-l-4 border-l-primary" data-testid={`card-role-${role.id}`}>
                        <CardContent className="p-4">
                          {/* Ministry & Role Header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isLeader ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-primary/10'}`}>
                                <Users className={`h-5 w-5 ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-primary'}`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg" data-testid={`text-ministry-name-${role.id}`}>
                                  {ministry?.name || 'Unknown Ministry'}
                                </h4>
                                <p className="text-sm text-muted-foreground">{ministry?.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLeader && (
                                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                  <Star className="w-3 h-3 mr-1" />
                                  Leader
                                </Badge>
                              )}
                              {role.roleName && (
                                <Badge variant="outline">{role.roleName}</Badge>
                              )}
                            </div>
                          </div>
                          
                          <Separator className="my-3" />
                          
                          {/* Role Details Grid */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* What I Do */}
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">What I Do</p>
                              <p className="text-sm" data-testid={`text-role-title-${role.id}`}>
                                {role.roleTitle || role.roleName || 'Team Member'}
                              </p>
                              {role.responsibilities && (
                                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-responsibilities-${role.id}`}>
                                  {role.responsibilities}
                                </p>
                              )}
                            </div>
                            
                            {/* Key Skills / Requirements */}
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Key Skills</p>
                              {role.keySkills && role.keySkills.length > 0 ? (
                                <div className="flex flex-wrap gap-1" data-testid={`skills-list-${role.id}`}>
                                  {role.keySkills.map((skill: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )}
                              {role.requirements && (
                                <p className="text-xs text-muted-foreground mt-1" data-testid={`text-requirements-${role.id}`}>
                                  {role.requirements}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <Separator className="my-3" />
                          
                          {/* Reports To Section */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Reports To</p>
                              {leader ? (
                                <div className="flex items-center gap-2" data-testid={`leader-info-${role.id}`}>
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={leader.profileImageUrl} alt={`${leader.firstName} ${leader.lastName}`} />
                                    <AvatarFallback className="text-xs">
                                      {leader.firstName?.[0]}{leader.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">
                                    {leader.firstName} {leader.lastName}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic" data-testid={`no-leader-${role.id}`}>
                                  Not yet assigned
                                </p>
                              )}
                            </div>
                            
                            {role.assignedAt && (
                              <p className="text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Serving since {format(new Date(role.assignedAt), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Join Requests Section */}
          {myJoinRequests && myJoinRequests.filter(r => r.status === 'pending').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Ministry Requests
                </CardTitle>
                <CardDescription>
                  Your requests to join ministries that are awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myJoinRequests.filter(r => r.status === 'pending').map((request: any) => {
                    const ministry = getMinistry(request.ministryId);
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
                        data-testid={`pending-request-${request.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{ministry?.name || 'Unknown Ministry'}</p>
                            <p className="text-xs text-muted-foreground">
                              Requested {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdrawJoinRequest.mutate(request.id)}
                          disabled={withdrawJoinRequest.isPending}
                          data-testid={`button-withdraw-${request.id}`}
                        >
                          {withdrawJoinRequest.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                          <span className="ml-1">Withdraw</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request to Join Other Ministries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Request to Join a Ministry
              </CardTitle>
              <CardDescription>
                Interested in serving in a new ministry? Send a request to the ministry leader.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ministries?.filter(m => 
                  !selectedMinistryIds.includes(m.id) && 
                  !getPendingRequest(m.id)
                ).map((ministry) => (
                  <div
                    key={ministry.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`request-ministry-${ministry.id}`}
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm truncate">{ministry.name}</p>
                      {ministry.category && (
                        <p className="text-xs text-muted-foreground truncate">{ministry.category}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestJoinMinistry.mutate({ ministryId: ministry.id })}
                      disabled={requestJoinMinistry.isPending}
                      data-testid={`button-request-join-${ministry.id}`}
                    >
                      {requestJoinMinistry.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
                {ministries?.filter(m => 
                  !selectedMinistryIds.includes(m.id) && 
                  !getPendingRequest(m.id)
                ).length === 0 && (
                  <p className="text-muted-foreground text-center py-4 col-span-full">
                    You're already serving in all available ministries!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  In Progress
                </CardTitle>
                <CardDescription>
                  Trainings you're currently working on
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inProgressTrainings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No trainings in progress</p>
                ) : (
                  <div className="space-y-3">
                    {inProgressTrainings.map((enrollment) => (
                      <div 
                        key={enrollment.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`card-training-progress-${enrollment.id}`}
                      >
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{enrollment.module?.title || 'Training Module'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${enrollment.progressPercent || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{enrollment.progressPercent || 0}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Completed
                </CardTitle>
                <CardDescription>
                  Your training achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedTrainings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No completed trainings yet</p>
                ) : (
                  <div className="space-y-3">
                    {completedTrainings.map((enrollment) => (
                      <div 
                        key={enrollment.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20"
                        data-testid={`card-training-complete-${enrollment.id}`}
                      >
                        <Award className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium">{enrollment.module?.title || 'Training Module'}</p>
                          {enrollment.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              Completed {format(new Date(enrollment.completedAt), 'MMM d, yyyy')}
                            </p>
                          )}
                          {enrollment.assessmentScore !== null && (
                            <Badge variant="outline" className="mt-1">
                              Assessment Score: {enrollment.assessmentScore}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Discipleship Journey
              </CardTitle>
              <CardDescription>
                Your progress through the Garden City discipleship pathway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {discipleship.completed} of {discipleship.total} steps
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${(discipleship.completed / discipleship.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className={`p-4 rounded-lg border ${user.hasAttendedSunday ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className={`h-5 w-5 ${user.hasAttendedSunday ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Worship</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Attend Sunday Service</p>
                  {user.hasAttendedSunday && <Badge variant="default" className="mt-2">Complete</Badge>}
                </div>

                <div className={`p-4 rounded-lg border ${user.hasAttendedNextNight ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className={`h-5 w-5 ${user.hasAttendedNextNight ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Next Night</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Community Commitment</p>
                  {user.hasAttendedNextNight && <Badge variant="default" className="mt-2">Complete</Badge>}
                </div>

                <div className={`p-4 rounded-lg border ${user.learnStatus === 'complete' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className={`h-5 w-5 ${user.learnStatus === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Learn</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Discipleship Classes</p>
                  {user.learnStatus === 'complete' && <Badge variant="default" className="mt-2">Complete</Badge>}
                  {user.learnStatus === 'in-progress' && <Badge variant="secondary" className="mt-2">In Progress</Badge>}
                </div>

                <div className={`p-4 rounded-lg border ${user.loveStatus === 'complete' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className={`h-5 w-5 ${user.loveStatus === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Love</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Service & CORE Groups</p>
                  {user.loveStatus === 'complete' && <Badge variant="default" className="mt-2">Complete</Badge>}
                  {user.loveStatus === 'in-progress' && <Badge variant="secondary" className="mt-2">In Progress</Badge>}
                </div>

                <div className={`p-4 rounded-lg border ${user.leadStatus === 'complete' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-muted/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className={`h-5 w-5 ${user.leadStatus === 'complete' ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Lead</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Guide Others</p>
                  {user.leadStatus === 'complete' && <Badge variant="default" className="mt-2">Complete</Badge>}
                  {user.leadStatus === 'in-progress' && <Badge variant="secondary" className="mt-2">In Progress</Badge>}
                </div>
              </div>

              {surveyResults && (
                <div className="mt-6 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Ministry Survey Results</h4>
                  <p className="text-sm text-muted-foreground">
                    You completed the ministry survey on {format(new Date(surveyResults.completedAt!), 'MMMM d, yyyy')}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <a href="/results">View Full Results</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
