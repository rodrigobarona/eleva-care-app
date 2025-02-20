import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
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
      />
    </div>
  );
}
