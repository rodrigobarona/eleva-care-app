"use client";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/atoms/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/molecules/form";
import { Input } from "@/components/atoms/input";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/atoms/avatar";
import { toast } from "sonner";

const profileFormSchema = z.object({
  username: z.string().min(2).max(30),
  firstName: z.string().min(2).max(30),
  lastName: z.string().min(2).max(30),
  email: z.string().email(),
});

type AccountFormValues = z.infer<typeof profileFormSchema>;

export function AccountForm() {
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  React.useEffect(() => {
    if (isLoaded && user) {
      form.reset({
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
      });
    }
  }, [isLoaded, user, form]);

  async function onSubmit(values: AccountFormValues) {
    setIsLoading(true);
    try {
      await user?.update({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      });
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(
        `Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    if (file.size > 4.5 * 1024 * 1024) {
      toast.error("Image must be less than 4.5MB", {
        description: "Please choose a smaller image file.",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await user?.setProfileImage({ file });
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error(
        `Failed to update avatar: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-x-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.imageUrl} alt={user?.username || ""} />
          <AvatarFallback>
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            id="avatar-upload"
          />
          <Button
            variant="outline"
            disabled={isUploadingAvatar}
            onClick={() => document.getElementById("avatar-upload")?.click()}
          >
            {isUploadingAvatar ? "Uploading..." : "Change Avatar"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
