import { SignUp } from '@clerk/nextjs';

export default function Page() {
  // The appearance is just to ensure consistent styling with our app
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'shadow-none rounded-none',
          cardBox: 'shadow-none rounded-none',
          footer: 'bg-transparent',
        },
      }}
    />
  );
}
