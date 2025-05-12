import { SignIn } from '@clerk/nextjs';

export default function Page() {
  // The appearance is just to ensure consistent styling with our app
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'shadow-none rounded-none',
          cardBox: 'shadow-none rounded-none',
          footer: 'flex [&>div:nth-child(2)]:hidden',
          footerAction: 'flex-col items-center bg-white w-full',
          background: 'bg-transparent',
        },
      }}
    />
  );
}
