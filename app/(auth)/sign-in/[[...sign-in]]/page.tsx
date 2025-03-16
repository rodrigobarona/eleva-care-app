import { SignIn } from '@clerk/nextjs';
import { headers } from 'next/headers';

export default function SignInPage() {
  // Attempt to get search params if any
  let searchParamsString = '';
  try {
    const headersList = headers();
    // Get search params from the request URL
    const url = headersList.get('referer') || '';
    const urlObj = new URL(url);
    searchParamsString = urlObj.search;
  } catch (e) {
    console.error('Error getting search params:', e);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto w-full max-w-[350px]',
            card: 'bg-white shadow-md rounded-xl',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
