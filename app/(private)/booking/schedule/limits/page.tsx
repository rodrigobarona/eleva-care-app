import { SchedulingSettingsForm } from '@/components/organisms/forms/SchedulingSettingsForm';
import { auth } from '@clerk/nextjs/server';

export const revalidate = 0;

export default async function LimitsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  return <SchedulingSettingsForm />;
}
