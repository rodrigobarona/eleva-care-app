import { SchedulingSettingsForm } from '@/components/organisms/forms/SchedulingSettingsForm';
import { auth } from '@clerk/nextjs/server';

// Note: Route is dynamic by default with cacheComponents enabled in Next.js 16

export default async function LimitsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  return <SchedulingSettingsForm />;
}
