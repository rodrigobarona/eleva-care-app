import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto w-full max-w-[350px]',
            card: 'bg-white shadow-md rounded-xl',
          },
        }}
        routing="path"
        path={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
        signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
        fallbackRedirectUrl={`/${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}`}
      />
    </div>
  );
}
