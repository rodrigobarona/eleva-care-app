'use client';

import * as z from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/avatar';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Separator } from '@/components/atoms/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/molecules/form';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
      username: '',
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  React.useEffect(() => {
    if (isLoaded && user) {
      form.reset({
        username: user.username || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
      });
    }
  }, [isLoaded, user, form]);

  // Add protection against unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  async function onSubmit(values: AccountFormValues) {
    setIsLoading(true);
    try {
      await user?.update({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
      });
      toast.success('Profile updated successfully');
      // Mark form as pristine with current values
      form.reset(values);
    } catch (error: unknown) {
      toast.error(
        `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (file.size > 4.5 * 1024 * 1024) {
      toast.error('Image must be less than 4.5MB', {
        description: 'Please choose a smaller image file.',
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await user?.setProfileImage({ file });
      toast.success('Avatar updated successfully');
    } catch (error) {
      toast.error(
        `Failed to update avatar: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Profile Picture Section */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
          <div className="space-y-1">
            <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
              Profile Picture
            </h3>
            <p className="text-sm leading-6 text-eleva-neutral-900/70">
              Upload a profile picture to personalize your account.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-eleva-neutral-200 bg-eleva-neutral-100/50 p-6">
              <div className="flex items-center gap-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.imageUrl} alt={user?.username || ''} />
                  <AvatarFallback className="bg-eleva-primary/10 text-eleva-primary">
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
                    type="button"
                    variant="outline"
                    disabled={isUploadingAvatar}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="border-eleva-neutral-200"
                  >
                    {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                  </Button>
                  <p className="mt-2 text-xs text-eleva-neutral-900/60">
                    JPG, PNG or GIF. Max size 4.5MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-eleva-neutral-200" />

        {/* Personal Information Section */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
          <div className="space-y-1">
            <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
              Personal Information
            </h3>
            <p className="text-sm leading-6 text-eleva-neutral-900/70">
              Update your personal details and how others can identify you.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-eleva-neutral-900">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="border-eleva-neutral-200" />
                    </FormControl>
                    <p className="text-xs text-eleva-neutral-900/60">
                      This is your unique identifier on the platform.
                    </p>
                    <FormMessage className="text-xs text-eleva-highlight-red" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-eleva-neutral-900">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="border-eleva-neutral-200" />
                      </FormControl>
                      <FormMessage className="text-xs text-eleva-highlight-red" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-eleva-neutral-900">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="border-eleva-neutral-200" />
                      </FormControl>
                      <FormMessage className="text-xs text-eleva-highlight-red" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-eleva-neutral-200" />

        {/* Account Settings Section */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
          <div className="space-y-1">
            <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
              Account Settings
            </h3>
            <p className="text-sm leading-6 text-eleva-neutral-900/70">
              Manage your account access and authentication settings.
            </p>
          </div>

          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-eleva-neutral-900">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="border-eleva-neutral-200 bg-eleva-neutral-100/50 font-mono"
                    />
                  </FormControl>
                  <p className="text-xs text-eleva-neutral-900/60">
                    This is your primary email address and cannot be changed here. Contact support
                    if you need to update it.
                  </p>
                  <FormMessage className="text-xs text-eleva-highlight-red" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Save Button - Clean primary style */}
        {form.formState.isDirty && (
          <div className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 right-6 z-10">
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                'px-6 py-2.5 font-medium shadow-lg transition-all',
                'bg-eleva-primary text-white hover:bg-eleva-primary/90',
                'focus:ring-2 focus:ring-eleva-primary/50 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'rounded-full',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
