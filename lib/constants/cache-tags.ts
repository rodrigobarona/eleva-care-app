/**
 * Next.js data-cache tags shared between cached readers and the server actions
 * that invalidate them. Invalidate with `revalidateTag(TAG, 'max')`.
 */

/** Experts carousel on the public home page (`components/sections/home/ExpertsSection.tsx`). */
export const HOME_EXPERTS_CACHE_TAG = 'home-experts';
