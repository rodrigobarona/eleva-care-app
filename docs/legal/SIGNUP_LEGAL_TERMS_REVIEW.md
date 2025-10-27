# Signup & Onboarding Legal Terms Review

## Current State

### Sign-Up Flow (`app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`)

Currently using Clerk's default `SignUp` component with custom styling only. **No legal terms or disclaimers are presented during signup.**

```tsx
<SignUp
  appearance={{
    elements: {
      logoBox: 'hidden',
      rootBox: 'mx-auto',
      card: 'shadow-none rounded-none',
      // ... styling only
    },
  }}
/>
```

### Onboarding Flow (`app/[locale]/(auth)/onboarding/page.tsx`)

Simple profile completion page (first name, last name). **No legal terms or agreements are presented.**

## ✅ Completed Improvements

1. **Billing Page** - Added Payment Policies reference with legal disclaimer
2. **Identity Verification Page** - Added Privacy Policy and DPA references
3. **Expert Profile Publishing** - Added Practitioner Agreement acceptance with tracking
4. **Legal Documentation** - Complete set of legal pages (Terms, Privacy, DPA, Payment Policies, Practitioner Agreement, Security)

## 🚨 Missing: Legal Terms During Signup

### Current Gap

- No Terms of Service acceptance during signup
- No Privacy Policy acknowledgment
- No platform nature disclaimer (marketplace vs. provider)
- No role-specific disclosures (patient vs. practitioner)

### Recommended Implementation

#### Option 1: Clerk Component Customization (Recommended)

Clerk allows adding custom fields and messaging. Update the signup flow:

```tsx
// app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx
<SignUp
  appearance={
    {
      /* ... */
    }
  }
  additionalOAuthScopes={
    {
      /* ... */
    }
  }
  // Add custom legal text at bottom of signup form
  localization={{
    signUp: {
      start: {
        subtitle: 'By signing up, you agree to our Terms of Service and Privacy Policy',
      },
    },
  }}
/>
```

**Pros:**

- Quick to implement
- Works with Clerk's existing flow
- Minimal changes needed

**Cons:**

- Limited customization
- Can't enforce checkbox acceptance
- Less prominent

#### Option 2: Custom Signup Wrapper (Better Control)

Create a wrapper around Clerk's component with explicit terms acceptance:

```tsx
// app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx
'use client';

export default function Page() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <div className="space-y-4">
      {/* Platform Nature Disclaimer */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Welcome to Eleva Care Platform</AlertTitle>
        <AlertDescription className="text-blue-800">
          You're creating an account on a healthcare technology marketplace. You'll be connected
          with independent, licensed healthcare practitioners.
        </AlertDescription>
      </Alert>

      {/* Clerk Signup Component */}
      <SignUp
        appearance={
          {
            /* ... */
          }
        }
      />

      {/* Legal Agreement */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I have read and agree to the{' '}
              <Link href="/legal/terms" className="underline">
                Terms of Service
              </Link>
              ,{' '}
              <Link href="/legal/privacy" className="underline">
                Privacy Policy
              </Link>
              , and{' '}
              <Link href="/trust/dpa" className="underline">
                Data Processing Agreement
              </Link>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Pros:**

- Full control over messaging
- Can enforce checkbox
- More legally robust
- Platform disclaimers visible

**Cons:**

- More complex implementation
- May conflict with Clerk's flow
- Needs coordination with Clerk's state

#### Option 3: Post-Signup Terms Acceptance (Most Robust)

Add a mandatory terms acceptance step after Clerk signup, before onboarding:

**Flow:** Sign Up → Terms Acceptance → Onboarding → Dashboard

Create new page: `app/[locale]/(auth)/terms-acceptance/page.tsx`

```tsx
'use client';

export default function TermsAcceptancePage() {
  const { user } = useUser();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Check if terms already accepted
    if (user?.unsafeMetadata?.termsAcceptedAt) {
      redirect('/onboarding');
    }
  }, [user]);

  const handleAccept = async () => {
    await user?.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: '1.0',
        privacyVersion: '1.0',
        dpaVersion: '1.0',
      },
    });
    redirect('/onboarding');
  };

  return (
    <div className="container max-w-2xl py-8">
      {/* Platform Disclaimer */}
      {/* Legal Documents Summary */}
      {/* Checkbox Acceptances */}
      {/* Continue Button (disabled until all checked) */}
    </div>
  );
}
```

**Pros:**

- Most legally robust
- Explicit, auditable acceptance
- Timestamp and version tracking
- Can show full summaries
- Works independently of Clerk

**Cons:**

- Extra step in signup flow
- More development work
- User experience consideration

### Role-Specific Disclosures

Depending on user role selection (client vs. expert), show appropriate disclaimers:

**For Clients:**

- Platform is a marketplace, not a healthcare provider
- Practitioners are independent professionals
- Verify practitioner credentials
- Platform disclaims medical liability

**For Experts/Practitioners:**

- Confirmation of licensed professional status
- Professional liability insurance requirement
- Independent contractor relationship
- Sole responsibility for medical care
- Agreement to Practitioner Agreement

## Recommended Approach

**Hybrid Approach:**

1. **Immediate (Quick Win):**
   - Add Clerk localization for basic legal reference
   - Update onboarding page to show terms links

2. **Short Term (Proper Implementation):**
   - Implement Option 3: Post-signup terms acceptance page
   - Add to middleware to enforce terms acceptance
   - Track acceptance in user metadata
   - Add audit logging

3. **Role Detection:**
   - During terms acceptance, ask user role (Client or Expert)
   - Show role-specific disclaimers
   - Store role in user metadata

## Implementation Checklist

- [ ] Create terms acceptance page
- [ ] Add translations for terms acceptance (EN, PT, ES, BR)
- [ ] Update middleware to check for terms acceptance
- [ ] Add audit logging for terms acceptance
- [ ] Update onboarding redirect logic
- [ ] Test complete signup flow
- [ ] Add role selection and role-specific messaging
- [ ] Document acceptance tracking in technical docs

## Legal Compliance Notes

**Current Status:**

- ✅ All legal documents exist and are comprehensive
- ✅ Documents available in 4 languages
- ✅ Expert profile publishing requires Practitioner Agreement
- ✅ Billing and Identity pages reference appropriate legal docs
- ❌ No Terms/Privacy acceptance during initial signup
- ❌ No tracking of when users accepted T&C
- ❌ No version tracking for legal agreements

**Risk:**
Users can currently create accounts and use basic features without explicitly accepting Terms of Service or Privacy Policy. This is a potential compliance gap for GDPR, LGPD, and general terms enforcement.

**Priority:** HIGH - Should be implemented before public launch

## Next Steps

1. **User Decision Required:**
   - Choose implementation approach (recommend Option 3)
   - Approve UX flow for terms acceptance
   - Confirm legal text for role-specific disclaimers

2. **Development:**
   - Create terms acceptance page
   - Update middleware
   - Add translations
   - Implement tracking

3. **Testing:**
   - Test complete signup flow
   - Verify terms enforcement
   - Check translations
   - Audit log verification

4. **Documentation:**
   - Update user documentation
   - Document acceptance tracking
   - Create admin guide for compliance checks
