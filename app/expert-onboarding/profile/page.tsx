'use client';

import * as z from 'zod';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/atoms/form';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { OnboardingStepNav, StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

// Define the form schema
const profileFormSchema = z.object({
  expertBio: z
    .string()
    .min(50, { message: 'Bio must be at least 50 characters long' })
    .max(1000, { message: 'Bio must be less than 1000 characters' }),
  expertSpecialties: z
    .array(z.string())
    .min(1, { message: 'Add at least one specialty' })
    .max(10, { message: 'You can have up to 10 specialties' }),
  expertQualifications: z.array(
    z.object({
      title: z.string().min(1, { message: 'Title is required' }),
      description: z.string().optional(),
      year: z.string().optional(),
    }),
  ),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileStepPage() {
  const { markStepComplete, refreshStatus } = useExpertOnboarding();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      expertBio: '',
      expertSpecialties: [],
      expertQualifications: [{ title: '', description: '', year: '' }],
    },
  });

  // Fetch profile data on load
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch('/api/expert/profile');
        if (response.ok) {
          const data = await response.json();

          form.reset({
            expertBio: data.expertBio || '',
            expertSpecialties: data.specialties || [],
            expertQualifications: data.qualifications?.length
              ? data.qualifications
              : [{ title: '', description: '', year: '' }],
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
        toast.error('Failed to load your profile data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [form]);

  const handleAddSpecialty = () => {
    if (!newSpecialty.trim()) return;

    const currentSpecialties = form.getValues('expertSpecialties') || [];
    if (currentSpecialties.includes(newSpecialty.trim())) {
      toast.error('This specialty has already been added.');
      return;
    }

    form.setValue('expertSpecialties', [...currentSpecialties, newSpecialty.trim()], {
      shouldValidate: true,
      shouldDirty: true,
    });
    setNewSpecialty('');
  };

  const handleRemoveSpecialty = (specialty: string) => {
    const currentSpecialties = form.getValues('expertSpecialties');
    form.setValue(
      'expertSpecialties',
      currentSpecialties.filter((s) => s !== specialty),
      { shouldValidate: true },
    );
  };

  const handleAddQualification = () => {
    const currentQualifications = form.getValues('expertQualifications') || [];
    form.setValue('expertQualifications', [
      ...currentQualifications,
      { title: '', description: '', year: '' },
    ]);
  };

  const handleRemoveQualification = (index: number) => {
    const currentQualifications = form.getValues('expertQualifications');
    form.setValue(
      'expertQualifications',
      currentQualifications.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/expert/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertBio: data.expertBio,
          specialties: data.expertSpecialties,
          qualifications: data.expertQualifications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      await markStepComplete('profile');
      await refreshStatus();

      toast.success('Your expert profile has been updated successfully.');

      router.push('/expert-onboarding/billing');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSubmitting(true);
      await markStepComplete('profile');
      await refreshStatus();
      router.push('/expert-onboarding/billing');
    } catch (error) {
      console.error('Failed to skip step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <OnboardingStepNav currentStep="profile" />

      <Card>
        <CardHeader>
          <CardTitle>Complete Your Expert Profile</CardTitle>
          <CardDescription>
            Tell potential clients about your expertise, specialties, and qualifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="expertBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your background, approach, and what makes you unique..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Write a concise but compelling bio that highlights your expertise and
                      approach.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="expertSpecialties"
                  render={() => (
                    <FormItem>
                      <FormLabel>Specialties</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Add a specialty (e.g., Anxiety, Depression, PTSD)"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSpecialty();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleAddSpecialty}
                          disabled={!newSpecialty.trim()}
                        >
                          Add
                        </Button>
                      </div>
                      <FormDescription>
                        Add the areas you specialize in. Press Enter or click Add after each one.
                      </FormDescription>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.getValues('expertSpecialties')?.map((specialty, i) => (
                          <div
                            key={`${specialty}-${i}`}
                            className="flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm"
                          >
                            {specialty}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-6 w-6 p-0"
                              onClick={() => handleRemoveSpecialty(specialty)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel>Qualifications & Certifications</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQualification}
                  >
                    Add Qualification
                  </Button>
                </div>

                {form.getValues('expertQualifications')?.map((_, index) => (
                  <div key={`qualification-${index}`} className="space-y-4 rounded-md border p-4">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium">Qualification {index + 1}</h4>
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRemoveQualification(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`expertQualifications.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title/Degree</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Licensed Clinical Psychologist, Ph.D. in Psychology"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`expertQualifications.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., University of Madrid" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`expertQualifications.${index}.year`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 2018" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <StepNavigationButtons
                onContinue={form.handleSubmit(onSubmit)}
                onSkip={handleSkip}
                continueBtnText={isSubmitting ? 'Saving...' : 'Continue'}
                continueBtnDisabled={isSubmitting || !form.formState.isValid}
                showSkip={true}
                skipBtnText="Skip for now"
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
