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
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ExpertFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      profilePicture: initialData?.profilePicture || user?.imageUrl || "",
      ...initialData,
    },
  });

  React.useEffect(() => {
    if (isUserLoaded && user) {
      form.setValue("firstName", user.firstName || "");
      form.setValue("lastName", user.lastName || "");
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

    setIsUploading(true);
    try {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      form.setValue("profilePicture", previewUrl);
    } catch {
      toast({
        variant: "destructive",
        description: "Failed to process image. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  async function onSubmit(data: ExpertFormValues) {
    try {
      setIsLoading(true);

      let profilePictureUrl = data.profilePicture;
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        const filename = `${user?.id}-${selectedFile.name}`;
        const response = await fetch(
          `/api/profile/upload?filename=${encodeURIComponent(filename)}`,
          {
            method: "POST",
            body: selectedFile,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const blob = await response.json();
        profilePictureUrl = blob.url;
        setIsUploading(false);

        if (
          initialData?.profilePicture?.includes(
            "public.blob.vercel-storage.com"
          )
        ) {
          try {
            await fetch(
              `/api/profile/upload?url=${encodeURIComponent(initialData.profilePicture)}`,
              {
                method: "DELETE",
              }
            );
          } catch (error) {
            console.error("Failed to delete old profile picture:", error);
          }
        }
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          profilePicture: profilePictureUrl,
        }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to update profile");
      }

      toast({
        description: "Profile updated successfully",
      });

      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    return () => {
      // Cleanup blob URLs when component unmounts
      const profilePicture = form.getValues("profilePicture");
      if (profilePicture?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicture);
      }
    };
  }, [form]);

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
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <span className="text-sm text-muted-foreground">
                        Uploading...
                      </span>
                    )}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
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
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="headline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headline</FormLabel>
              <FormControl>
                <Input
                  placeholder="Women's Health Expert & Researcher"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                In one line, describe who you are, what you are best know for ,
                or expertise.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shortBio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Me (Preview)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief introduction (100 characters)"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormDescription className="flex justify-between">
                <span>This will be displayed in cards and previews</span>
                <span>{field.value?.length || 0}/100</span>
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
              <FormLabel>About Me</FormLabel>
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

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Social Media Links</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`socialLinks.${0}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram Username</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${1}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter/X Username</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${2}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${3}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Username</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${4}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok Username</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

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

        <Button type="submit" disabled={isLoading || isUploading}>
          {isLoading || isUploading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
