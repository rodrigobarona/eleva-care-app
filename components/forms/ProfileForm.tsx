"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { profileFormSchema } from "@/schema/profile";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  initialData: ProfileFormValues | null;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialData || {
      fullName: "",
      role: "",
      shortBio: "",
      longBio: "",
      socialLinks: [],
      isVerified: false,
      isTopExpert: false,
      promotion: "",
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    try {
      setIsLoading(true);
      const response = await fetch("/api/profile", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      
      toast({
        description: "Profile updated successfully",
      });
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
              <FormLabel>Profile Picture URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
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
