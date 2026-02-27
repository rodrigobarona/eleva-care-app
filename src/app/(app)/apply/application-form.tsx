'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExpertApplication } from '@/server/actions/expert-applications';
import { submitExpertApplication } from '@/server/actions/expert-applications';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const applicationSchema = z.object({
  expertise: z
    .string()
    .min(3, 'Please describe your area of expertise')
    .max(200, 'Please keep this under 200 characters'),
  credentials: z
    .string()
    .min(10, 'Please provide your professional credentials')
    .max(500, 'Please keep this under 500 characters'),
  experience: z
    .string()
    .min(20, 'Please describe your experience in more detail')
    .max(2000, 'Please keep this under 2000 characters'),
  motivation: z
    .string()
    .min(20, 'Please tell us more about why you want to join')
    .max(2000, 'Please keep this under 2000 characters'),
  hourlyRate: z.string().refine(
    (val) => val === '' || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100000),
    'Please enter a valid rate (0–100,000)',
  ),
  website: z.string().refine(
    (val) => val === '' || z.string().url().safeParse(val).success,
    'Please enter a valid URL',
  ),
  linkedIn: z.string().refine(
    (val) => val === '' || z.string().url().safeParse(val).success,
    'Please enter a valid LinkedIn URL',
  ),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  defaultValues?: Pick<
    ExpertApplication,
    'expertise' | 'credentials' | 'experience' | 'motivation' | 'hourlyRate' | 'website' | 'linkedIn'
  >;
}

export function ApplicationForm({ defaultValues }: ApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      expertise: defaultValues?.expertise ?? '',
      credentials: defaultValues?.credentials ?? '',
      experience: defaultValues?.experience ?? '',
      motivation: defaultValues?.motivation ?? '',
      hourlyRate: defaultValues?.hourlyRate ? String(defaultValues.hourlyRate) : '',
      website: defaultValues?.website ?? '',
      linkedIn: defaultValues?.linkedIn ?? '',
    },
  });

  async function onSubmit(data: ApplicationFormValues) {
    setIsSubmitting(true);
    try {
      const result = await submitExpertApplication({
        expertise: data.expertise,
        credentials: data.credentials,
        experience: data.experience,
        motivation: data.motivation,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
        website: data.website || undefined,
        linkedIn: data.linkedIn || undefined,
      });

      if (result.success) {
        toast.success('Application submitted successfully!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to submit application');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expert Application</CardTitle>
        <CardDescription>
          Tell us about your professional background and why you'd like to join our expert network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="expertise"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area of Expertise</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Clinical Psychologist, Physical Therapist" {...field} />
                  </FormControl>
                  <FormDescription>Your primary area of healthcare expertise.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Credentials</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., PhD in Psychology, Licensed Therapist (LPC), Board Certified..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List your degrees, certifications, and professional licenses.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Experience</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your years of experience and key areas of practice..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tell us about your professional background and experience.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why Eleva Care?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us why you want to become an expert on our platform..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Explain your motivation for joining the Eleva Care expert network.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Hourly Rate (€)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://linkedin.com/in/..." {...field} />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {defaultValues ? 'Resubmit Application' : 'Submit Application'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
