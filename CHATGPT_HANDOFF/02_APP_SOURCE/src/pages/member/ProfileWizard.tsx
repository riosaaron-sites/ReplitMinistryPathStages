import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Cropper from "react-easy-crop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, CheckCircle, User, ArrowRight, ArrowLeft, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { SiFacebook, SiInstagram, SiLinkedin, SiX } from "react-icons/si";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper function to create cropped image with rotation support
const createCroppedImage = async (
  imageSrc: string, 
  cropArea: CropArea,
  rotation: number = 0
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      try {
        // First, create a canvas to handle rotation
        const rotatedCanvas = document.createElement('canvas');
        const rotatedCtx = rotatedCanvas.getContext('2d');
        
        if (!rotatedCtx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Calculate rotated dimensions
        const radians = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        const rotatedWidth = image.width * cos + image.height * sin;
        const rotatedHeight = image.width * sin + image.height * cos;
        
        rotatedCanvas.width = rotatedWidth;
        rotatedCanvas.height = rotatedHeight;
        
        // Rotate the image
        rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
        rotatedCtx.rotate(radians);
        rotatedCtx.drawImage(image, -image.width / 2, -image.height / 2);
        
        // Now crop from the rotated image
        const outputCanvas = document.createElement('canvas');
        const outputCtx = outputCanvas.getContext('2d');
        
        if (!outputCtx) {
          reject(new Error('Could not get output canvas context'));
          return;
        }
        
        // Output size (square profile picture)
        const outputSize = 400;
        outputCanvas.width = outputSize;
        outputCanvas.height = outputSize;
        
        // Draw the cropped portion
        outputCtx.drawImage(
          rotatedCanvas,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          outputSize,
          outputSize
        );
        
        resolve(outputCanvas.toDataURL('image/jpeg', 0.9));
      } catch (error) {
        reject(error);
      }
    };
    
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageSrc;
  });
};

const profileSchema = z.object({
  bio: z.string().min(10, "Tell us a bit more about yourself (at least 10 characters)").max(500, "Bio should be 500 characters or less"),
  phone: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
    instagram: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
    twitter: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
    linkedin: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
    website: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  profileImageUrl?: string;
  profileCompletedAt?: string;
}

export default function ProfileWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'photo' | 'info'>('photo');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cropping state
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  const onCropComplete = useCallback((_croppedArea: unknown, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['/api/profile'],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      phone: "",
      socialLinks: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        website: "",
      },
    },
  });

  const hasExistingPhoto = !!profile?.profileImageUrl || !!uploadedImage;
  const currentImageUrl = uploadedImage || profile?.profileImageUrl;

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData & { profileImageUrl?: string }) => {
      const res = await apiRequest('PUT', '/api/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requirements/status'] });
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/profile/complete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requirements/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile Complete!",
        description: "Now let's select which ministries you'd like to serve in.",
      });
      navigate('/join');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete profile",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please choose an image file (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageToCrop(base64);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    setIsUploading(true);
    setShowCropDialog(false);
    
    try {
      const croppedImage = await createCroppedImage(imageToCrop, croppedAreaPixels, rotation);
      setUploadedImage(croppedImage);
      
      await updateProfileMutation.mutateAsync({
        bio: form.getValues('bio') || profile?.bio || "",
        phone: form.getValues('phone') || profile?.phone || "",
        socialLinks: form.getValues('socialLinks') || profile?.socialLinks || {},
        profileImageUrl: croppedImage,
      });
      
      toast({
        title: "Photo uploaded!",
        description: "Looking great!",
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!hasExistingPhoto) {
      toast({
        title: "Photo required",
        description: "Please upload a profile photo first",
        variant: "destructive",
      });
      setStep('photo');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        ...data,
        profileImageUrl: currentImageUrl,
      });
      
      await completeProfileMutation.mutateAsync();
    } catch (error) {
      console.error('Profile submission error:', error);
    }
  };

  const progress = step === 'photo' ? 50 : 100;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="font-serif-display text-3xl font-bold mb-2" data-testid="text-profile-title">
          Complete Your Profile
        </h1>
        <p className="text-muted-foreground">
          Help us get to know you better! This helps leadership connect you with the right ministry opportunities.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Profile Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {step === 'photo' && (
        <Card data-testid="card-photo-step">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Add Your Photo</CardTitle>
                <CardDescription>A friendly face helps the team connect with you</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={currentImageUrl || undefined} alt="Profile photo" />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                    <User className="w-12 h-12" />
                  </AvatarFallback>
                </Avatar>
                {hasExistingPhoto && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="input-photo-upload"
              />

              <Button
                variant={hasExistingPhoto ? "outline" : "default"}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-photo"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : hasExistingPhoto ? (
                  "Change Photo"
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF. Max 5MB.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep('info')}
                disabled={!hasExistingPhoto}
                data-testid="button-continue-to-info"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'info' && (
        <Card data-testid="card-info-step">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Tell Us About Yourself</CardTitle>
                <CardDescription>A short bio and optional social links</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About You *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about yourself... How long have you attended Garden City? What are you passionate about? Any hobbies or interests?"
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field} 
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h3 className="font-medium">Social Links (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your social profiles so we can stay connected
                  </p>

                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.facebook"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <SiFacebook className="h-5 w-5 text-[#1877F2]" />
                            <FormControl>
                              <Input 
                                placeholder="https://facebook.com/yourprofile" 
                                {...field} 
                                data-testid="input-facebook"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialLinks.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <SiInstagram className="h-5 w-5 text-[#E4405F]" />
                            <FormControl>
                              <Input 
                                placeholder="https://instagram.com/yourprofile" 
                                {...field} 
                                data-testid="input-instagram"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialLinks.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <SiX className="h-5 w-5" />
                            <FormControl>
                              <Input 
                                placeholder="https://x.com/yourprofile" 
                                {...field} 
                                data-testid="input-twitter"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialLinks.linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-3">
                            <SiLinkedin className="h-5 w-5 text-[#0A66C2]" />
                            <FormControl>
                              <Input 
                                placeholder="https://linkedin.com/in/yourprofile" 
                                {...field} 
                                data-testid="input-linkedin"
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialLinks.website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">Personal Website</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://yourwebsite.com" 
                              {...field} 
                              data-testid="input-website"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('photo')}
                    data-testid="button-back-to-photo"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button
                    type="submit"
                    disabled={completeProfileMutation.isPending || updateProfileMutation.isPending}
                    data-testid="button-complete-profile"
                  >
                    {completeProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Profile
                        <CheckCircle className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Image Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
            <DialogDescription>
              Drag to reposition, use slider to zoom. The photo will be cropped to a square.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
                data-testid="slider-zoom"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                data-testid="button-rotate"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </Button>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCropCancel}
              data-testid="button-cancel-crop"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCropConfirm}
              disabled={isUploading}
              data-testid="button-confirm-crop"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Use This Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
