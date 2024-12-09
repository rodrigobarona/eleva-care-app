"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { Button } from "@/components/atoms/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/molecules/form";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { profileFormSchema } from "@/schema/profile";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

type ExpertFormValues = z.infer<typeof profileFormSchema>;

interface ExpertFormProps {
  initialData: ExpertFormValues | null;
}

export function ExpertForm({ initialData }: ExpertFormProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ExpertFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      profilePicture: initialData?.profilePicture || user?.imageUrl || "",
      ...initialData,
    },
  });

  React.useEffect(() => {
    if (isUserLoaded && user) {
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ");
      form.setValue("fullName", fullName);
      if (!initialData?.profilePicture) {
        form.setValue("profilePicture", user.imageUrl || "");
      }
    }
  }, [isUserLoaded, user, form, initialData]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4.5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        description: "Image must be less than 4.5MB",
      });
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    form.setValue("profilePicture", previewUrl);
  };

  async function onSubmit(data: ExpertFormValues) {
    try {
      setIsLoading(true);

      // Upload image to Vercel Blob if a new file was selected
      let profilePictureUrl = data.profilePicture;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await fetch(`/api/profile/upload?filename=${selectedFile.name}`, {
          method: "POST",
          body: selectedFile,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const blob = await response.json();
        profilePictureUrl = blob.url;
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          profilePicture: profilePictureUrl,
          oldProfilePicture: initialData?.profilePicture, // Pass the old URL for deletion
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast({
        description: "Profile updated successfully",
      });

      // Clear the selected file after successful upload
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="profilePicture"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <div className="space-y-4">
                {field.value && (
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <Image
                      src={field.value}
                      alt="Profile picture"
                      sizes="(max-width: 768px) 100vw, 800px"
                      className="object-cover"
                      priority
                      width={1200}
                      height={1200}
                    />
                  </div>
                )}
                <FormControl>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                  </div>
                </FormControl>
              </div>
              <FormDescription>
                Upload a profile picture (max 4.5MB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input placeholder="Senior Developer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shortBio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief introduction (160 characters)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This will be displayed in cards and previews
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="longBio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Long Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed information about you"
                  className="h-32"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="promotion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promotion/Claim</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Special offer or promotional message"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
