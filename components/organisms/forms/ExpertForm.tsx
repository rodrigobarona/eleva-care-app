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
import { cn } from "@/lib/utils";

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
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      profilePicture: initialData?.profilePicture || user?.imageUrl || "",
      headline: initialData?.headline || "",
      shortBio: initialData?.shortBio || "",
      longBio: initialData?.longBio || "",
      socialLinks: [
        {
          name: "instagram",
          url:
            initialData?.socialLinks?.[0]?.url?.replace(
              "https://instagram.com/",
              ""
            ) || "",
        },
        {
          name: "twitter",
          url:
            initialData?.socialLinks?.[1]?.url?.replace("https://x.com/", "") ||
            "",
        },
        {
          name: "linkedin",
          url:
            initialData?.socialLinks?.[2]?.url?.replace(
              "https://linkedin.com/in/",
              ""
            ) || "",
        },
        {
          name: "youtube",
          url:
            initialData?.socialLinks?.[3]?.url?.replace(
              "https://youtube.com/@",
              ""
            ) || "",
        },
        {
          name: "tiktok",
          url:
            initialData?.socialLinks?.[4]?.url?.replace(
              "https://tiktok.com/@",
              ""
            ) || "",
        },
      ],
      promotion: initialData?.promotion || "",
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

      // Transform usernames to full URLs
      const transformedData = {
        ...data,
        socialLinks: data.socialLinks.map((link) => {
          const username = link.url?.trim();
          if (!username) return { name: link.name, url: "" };

          switch (link.name) {
            case "instagram":
              return {
                name: link.name,
                url: `https://instagram.com/${username}`,
              };
            case "twitter":
              return { name: link.name, url: `https://x.com/${username}` };
            case "linkedin":
              return {
                name: link.name,
                url: `https://linkedin.com/in/${username}`,
              };
            case "youtube":
              return {
                name: link.name,
                url: `https://youtube.com/@${username}`,
              };
            case "tiktok":
              return {
                name: link.name,
                url: `https://tiktok.com/@${username}`,
              };
            default:
              return link;
          }
        }),
      };

      let profilePictureUrl = transformedData.profilePicture;
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
          ...transformedData,
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
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-lg font-medium">
            Basic Information
          </legend>

          <FormField
            control={form.control}
            name="profilePicture"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Profile Picture</FormLabel>
                <div className="space-y-4">
                  <div className="flex items-center gap-8">
                    {field.value && (
                      <div className="relative h-96 w-64 overflow-hidden rounded-lg border-2 border-border">
                        <Image
                          src={field.value}
                          alt="Profile picture"
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    )}
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="picture-upload"
                          className={cn(
                            "flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isUploading && "pointer-events-none opacity-50"
                          )}
                        >
                          {field.value ? "Change picture" : "Upload picture"}
                        </label>
                        <Input
                          id="picture-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {field.value &&
                          isUserLoaded &&
                          field.value !== user?.imageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue(
                                  "profilePicture",
                                  user?.imageUrl || ""
                                );
                                setSelectedFile(null);
                              }}
                              className={cn(
                                "flex h-9 items-center justify-center rounded-md border border-destructive bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isUploading && "pointer-events-none opacity-50"
                              )}
                              disabled={isUploading}
                            >
                              Reset to Account Picture
                            </button>
                          )}
                        {isUploading && (
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Uploading...
                          </span>
                        )}
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Upload a profile picture (max 4.5MB). A portrait (2:3) image
                    is recommended.
                  </FormDescription>
                  <FormMessage />
                </div>
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
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-lg font-medium">
            Professional Profile
          </legend>

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
                  In one line, describe who you are, what you are best know for,
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
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-lg font-medium">
            Social Media Links
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`socialLinks.${0}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="bg-muted px-3 py-2 text-sm text-muted-foreground h-full flex items-center">
                      instagram.com/
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        placeholder="username"
                        {...field}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormDescription>
                    Enter your Instagram username without the @ symbol
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${1}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>X/Twitter</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="bg-muted px-3 py-2 text-sm text-muted-foreground h-full flex items-center">
                      x.com/
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        placeholder="username"
                        {...field}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${2}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="bg-muted px-3 py-2 text-sm text-muted-foreground h-full flex items-center">
                      linkedin.com/in/
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        placeholder="username"
                        {...field}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${3}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="bg-muted px-3 py-2 text-sm text-muted-foreground h-full flex items-center">
                      youtube.com/@
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        placeholder="username"
                        {...field}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`socialLinks.${4}.url` as const}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok</FormLabel>
                  <div className="flex w-full items-center overflow-hidden rounded-md border">
                    <div className="bg-muted px-3 py-2 text-sm text-muted-foreground h-full flex items-center">
                      tiktok.com/@
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <FormControl>
                      <Input
                        placeholder="username"
                        {...field}
                        className="flex-1 border-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

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
