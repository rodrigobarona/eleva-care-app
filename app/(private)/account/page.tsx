"use client";
import React from "react";
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
import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/atoms/alert";

const profileFormSchema = z.object({
  username: z.string().min(2).max(30),
  firstName: z.string().min(2).max(30),
  lastName: z.string().min(2).max(30),
  email: z.string().email(),
});

export default function ProfilePage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: user?.username || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.primaryEmailAddress?.emailAddress || "",
    },
  });

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
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

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || "");
    toast.success("User ID copied to clipboard");
  };

  async function handleDeleteAccount() {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      setIsLoading(true);
      try {
        await user?.delete();
        toast.success("Account deleted successfully");
      } catch (error: unknown) {
        toast.error(
          `Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Update your personal information.
        </p>
      </div>

      <div className="flex items-center gap-x-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.imageUrl} alt={user?.username || ""} />
          <AvatarFallback>
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline">Change Avatar</Button>
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

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Your User ID</h3>
        <div className="flex items-center gap-x-2 bg-muted p-3 rounded-md">
          <code className="text-sm">{user?.id}</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyUserId}
            className="ml-auto"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Delete Account</h3>
        <Alert variant="destructive">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Permanently delete your Eleva Care account, all of your workspaces, links and their respective stats. 
            This action cannot be undone - please proceed with caution.
          </AlertDescription>
        </Alert>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          className="mt-4"
          disabled={isLoading}
        >
          {isLoading ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </div>
  );
}
