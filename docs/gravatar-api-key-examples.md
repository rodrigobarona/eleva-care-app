# Gravatar API Key Examples

This document provides practical examples of using the enhanced Gravatar functionality with your API key.

## Setup

Add your API key to `.env`:

```bash
GRAVATAR_API_KEY=your_api_key_here
```

## Basic Usage Examples

### 1. Enhanced Appointment Cards

Update existing appointment cards to show professional context:

```tsx
// In AppointmentCard.tsx
<GravatarAvatar
  email={appointment.guestEmail}
  name={appointment.guestName}
  size={48}
  enhanced={true} // Enable API features
  showTooltip={true} // Show job title/company on hover
  className="mt-1 flex-shrink-0"
/>
```

### 2. Rich Patient Details

For the patient details page, get comprehensive profile data:

```tsx
// In patients/[id]/page.tsx
<GravatarAvatar
  email={customer.email}
  name={customer.name}
  size={64}
  enhanced={true}
  showTooltip={true}
  className="flex-shrink-0"
/>
```

### 3. Professional Patient List

In the patients table, display professional names:

```tsx
// In patients/page.tsx
<GravatarAvatar
  email={customer.email}
  name={customer.name}
  size={32}
  enhanced={true} // Uses display_name from profile
  className="flex-shrink-0"
/>
```

## API Usage Examples

### Direct Profile Data Access

```typescript
import { getGravatarProfile } from '@/lib/utils/gravatar';

// Get full profile for a patient
const profile = await getGravatarProfile('patient@example.com');

if (profile) {
  console.log('Professional name:', profile.display_name);
  console.log('Job title:', profile.job_title);
  console.log('Company:', profile.company);
  console.log('Location:', profile.location);
  console.log('Bio:', profile.description);
}
```

### Enhanced Avatar Data

```typescript
import { getEnhancedAvatarData } from '@/lib/utils/gravatar';

// Get avatar + profile context
const avatarData = await getEnhancedAvatarData('patient@example.com', {
  size: 64,
  rating: 'pg',
});

if (avatarData) {
  console.log('Avatar URL:', avatarData.avatarUrl);
  console.log('Display name:', avatarData.displayName);
  console.log('Professional context:', `${avatarData.jobTitle} at ${avatarData.company}`);
}
```

## Component Props Reference

### GravatarAvatar Enhanced Props

```tsx
interface GravatarAvatarProps {
  email: string;
  name?: string;
  size?: number;
  className?: string;
  gravatarOptions?: GravatarOptions;
  showFallback?: boolean;

  // New API key features
  enhanced?: boolean; // Enable API functionality
  showTooltip?: boolean; // Show profile info on hover
}
```

## Expected Benefits

With API key enabled, you'll see:

1. **Professional Names**: Display names from Gravatar profiles instead of just email-based names
2. **Rich Tooltips**: Hover to see "John Smith • Senior Developer at Tech Corp • San Francisco"
3. **Better Context**: Understand who your patients are professionally
4. **Consistent Identity**: Same professional identity across all Gravatar-enabled apps

## Fallback Behavior

The implementation gracefully handles all scenarios:

- **With API key + profile exists**: Shows enhanced data
- **With API key + no profile**: Shows regular avatar with fallback name
- **Without API key**: Works exactly as before (backward compatible)
- **Network issues**: Always falls back to initials/icons

## Performance Notes

- API calls are cached and optimized
- Components work immediately even if API is slow
- No performance degradation for existing functionality
- Higher rate limits (1000 vs 100 requests/hour) with API key

## Testing

Test the enhanced functionality:

1. Add a real email address that has a Gravatar profile
2. Set `enhanced={true}` on the component
3. Hover to see professional information in tooltip
4. Check browser network tab to see API calls to `api.gravatar.com`

The API key enhances the patient experience by showing professional context while maintaining all existing functionality!
