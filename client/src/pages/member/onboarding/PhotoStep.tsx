import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ChevronRight, Upload, User, Camera } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ImageCropper } from "@/components/ImageCropper";
import { useUpload } from "@/hooks/use-upload";

const ONBOARDING_ORDER = ['AUTH', 'WELCOME', 'PROFILE', 'MINISTRIES', 'FAITH_COMMITMENT', 'PHOTO', 'CLASS_STATUS', 'DONE'];

export default function PhotoStep() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [hasHandledAutoSkip, setHasHandledAutoSkip] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      updateProfilePhoto.mutate(response.objectPath);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload photo. You can add one later from your profile.",
        variant: "destructive",
      });
    },
  });

  const { data: user, isLoading: userLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  useEffect(() => {
    if (!user || userLoading) return;
    const currentIndex = ONBOARDING_ORDER.indexOf(user.onboardingState || 'PROFILE');
    const photoIndex = ONBOARDING_ORDER.indexOf('PHOTO');
    
    if (currentIndex > photoIndex) {
      setLocation("/onboarding");
    }
  }, [user, userLoading, setLocation]);

  const skipMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/profile", {
        onboardingState: "CLASS_STATUS",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/onboarding/classes");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to proceed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfilePhoto = useMutation({
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
      skipMutation.mutate();
    },
    onError: () => {
      toast({
        title: "Upload failed",
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

  const handleSkip = () => {
    skipMutation.mutate();
  };

  useEffect(() => {
    if (!user || userLoading || hasHandledAutoSkip) return;
    
    if (user.profileImageUrl) {
      setHasHandledAutoSkip(true);
      skipMutation.mutate();
    }
  }, [user, userLoading, hasHandledAutoSkip, skipMutation]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.profileImageUrl && !hasHandledAutoSkip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const helpContent = (
    <>
      <p>
        <strong>Why add a photo?</strong> A profile photo helps your ministry team 
        and church leaders recognize you, especially in larger groups.
      </p>
      <p>
        <strong>What kind of photo?</strong> A clear headshot works best. It doesn't 
        need to be professional - a nice selfie is fine!
      </p>
      <p>
        <strong>Is this required?</strong> No! You can skip this step and add a 
        photo later from your profile settings.
      </p>
    </>
  );

  const isPending = isUploading || updateProfilePhoto.isPending || skipMutation.isPending;

  return (
    <OnboardingLayout
      currentStep="photo"
      title="Add Your Photo"
      subtitle="Help your team recognize you (optional)"
      showBackButton
      backUrl="/onboarding/faith"
      helpContent={helpContent}
    >
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-3xl bg-muted">
                  <User className="h-12 w-12 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
                <Camera className="h-5 w-5" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground max-w-xs">
              A profile photo helps team members and leaders recognize you
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              data-testid="button-choose-photo"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploading ? "Uploading..." : "Choose Photo"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleSkip}
              disabled={isPending}
              data-testid="button-skip-photo"
            >
              {skipMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              Skip for Now
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
            data-testid="input-photo-file"
          />

          <p className="text-xs text-muted-foreground text-center">
            You can always add or change your photo later from your profile settings.
          </p>
        </CardContent>
      </Card>

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
    </OnboardingLayout>
  );
}
