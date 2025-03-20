import { Shell } from '@/components/molecules/shell';

export const metadata = {
  title: 'Notifications | Eleva Care',
  description: 'Manage your notifications and stay updated on important changes.',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
