import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChevronRight, User, Phone, AtSign, MessageSquare, Camera } from "lucide-react";
import { SiFacebook, SiInstagram, SiX } from "react-icons/si";
import type { User as UserType } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ImageCropper } from "@/components/ImageCropper";
import { useUpload } from "@/hooks/use-upload";

const ONBOARDING_ROLES = [
  { value: "dream-team", label: "Team Member", description: "Volunteer serving in ministries" },
  { value: "leader", label: "Team Leader", description: "Leading a ministry team" },
  { value: "pastor", label: "Pastor", description: "Pastoral staff member" },
] as const;

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
  role: z.enum(["dream-team", "leader", "pastor"]),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ONBOARDING_ORDER = ['AUTH', 'WELCOME', 'PROFILE', 'LEADERSHIP', 'MINISTRIES', 'FAITH_COMMITMENT', 'PHOTO', 'CLASS_STATUS', 'DONE'];

export default function ProfileStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setUploadedPhotoUrl(response.objectPath);
      uploadProfilePhotoMutation.mutate(response.objectPath);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload photo. You can add one later.",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Photo uploaded!",
        description: "Your profile photo has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Photo save failed",
        description: "Could not save photo. You can add one later from your profile.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setAvatarPreview(previewUrl);
    setShowCropper(false);
    setSelectedImageSrc(null);
    const file = new File([croppedBlob], "profile-photo.jpg", { type: "image/jpeg" });
    await uploadFile(file);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageSrc(null);
  };

  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (!user || userLoading) return;
    const currentIndex = ONBOARDING_ORDER.indexOf(user.onboardingState || 'PROFILE');
    const profileIndex = ONBOARDING_ORDER.indexOf('PROFILE');
    
    if (currentIndex > profileIndex) {
      setLocation("/onboarding");
    }
  }, [user, userLoading, setLocation]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      phone: "",
      bio: "",
      role: "dream-team",
      socialLinks: {
        facebook: "",
        instagram: "",
        twitter: "",
      },
    },
  });

  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true;
      let currentRole: ProfileFormData["role"] = "dream-team";
      if (user.role === "leader" || user.role === "pastor") {
        currentRole = user.role;
      }
      const existingSocialLinks = user.socialLinks as { facebook?: string; instagram?: string; twitter?: string } | null;
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        phone: user.phone || "",
        bio: user.bio || "",
        role: currentRole,
        socialLinks: {
          facebook: existingSocialLinks?.facebook || "",
          instagram: existingSocialLinks?.instagram || "",
          twitter: existingSocialLinks?.twitter || "",
        },
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("POST", "/api/profile", {
        ...data,
        onboardingState: "LEADERSHIP",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile saved!",
        description: "Next: Let us know about your leadership role...",
      });
      setLocation("/onboarding/leadership");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const helpContent = (
    <>
      <p>
        <strong>What info do I need?</strong> Just your name is required. Phone, 
        username, bio, and social links are all optional.
      </p>
      <p>
        <strong>Which role should I pick?</strong> Most volunteers should select 
        "Team Member". Choose "Leader" if you lead a ministry team.
      </p>
      <p>
        <strong>Can I change this later?</strong> Yes! You can update your profile 
        anytime from your account settings.
      </p>
    </>
  );

  return (
    <OnboardingLayout
      currentStep="profile"
      title="Your Profile"
      subtitle="Tell us about yourself so the church community can connect with you"
      showBackButton
      backUrl="/onboarding/welcome"
      helpContent={helpContent}
    >
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Avatar with Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-primary/20">
                    <AvatarImage src={avatarPreview || uploadedPhotoUrl || user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {form.watch("firstName")?.[0] || user?.firstName?.[0]}
                      {form.watch("lastName")?.[0] || user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || uploadProfilePhotoMutation.isPending}
                    data-testid="button-upload-photo"
                  >
                    {isUploading || uploadProfilePhotoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-photo-file"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add a photo (optional)
                </p>
              </div>

              {/* Image Cropper Modal */}
              <ImageCropper
                open={showCropper && !!selectedImageSrc}
                onClose={handleCropCancel}
                imageSrc={selectedImageSrc || ''}
                onCropComplete={handleCropComplete}
                aspectRatio={1}
                cropShape="round"
              />

              {/* Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Contact Information
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" data-testid="input-firstname" {...field} />
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
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" data-testid="input-lastname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Phone <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="(555) 123-4567" 
                          data-testid="input-phone"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <AtSign className="h-3 w-3" />
                        Username <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="johndoe" 
                          data-testid="input-username"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A unique identifier for your profile
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Role Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What role best describes you? *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ONBOARDING_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex flex-col">
                                <span>{role.label}</span>
                                <span className="text-xs text-muted-foreground">{role.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Bio Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        Bio <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us a bit about yourself, your family, or your interests..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-bio"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {(field.value?.length || 0)}/500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social Links Section */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Social Links (optional)
                </div>
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="socialLinks.facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <SiFacebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="facebook.com/yourprofile" 
                              className="pl-10"
                              data-testid="input-facebook"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <SiInstagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="instagram.com/yourprofile" 
                              className="pl-10"
                              data-testid="input-instagram"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <SiX className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="x.com/yourprofile" 
                              className="pl-10"
                              data-testid="input-twitter"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={updateProfileMutation.isPending}
                data-testid="button-continue"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                Continue to Ministries
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  );
}
