import { withAuth } from '@workos-inc/authkit-nextjs';
import { Suspense } from 'react';

import { HeaderContent } from './HeaderContent';

export default async function Header() {
  const { user } = await withAuth({ ensureSignedIn: false });

  const authUser = user
    ? {
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profilePictureUrl: user.profilePictureUrl ?? undefined,
      }
    : null;

  return (
    <Suspense fallback={<div className="h-16 lg:h-20" />}>
      <HeaderContent user={authUser} />
    </Suspense>
  );
}
