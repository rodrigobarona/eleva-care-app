import { Link } from '@/i18n/navigation';
import { defaultLocale } from '@/locales';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-xl">
        The page you are looking for might have been removed or is temporarily unavailable.
      </p>
      <Link href="/" locale={defaultLocale} className="mt-8 text-blue-600 hover:underline">
        Return to Home Page
      </Link>
    </div>
  );
}
