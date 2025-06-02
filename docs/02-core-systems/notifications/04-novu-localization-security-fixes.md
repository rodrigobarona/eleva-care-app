# Novu Configuration: Localization and Security Fixes

> **Fixed**: Localization issues and XSS vulnerabilities in Novu notification workflows
> **Date**: January 2, 2025

## 🎯 Issues Resolved

### 1. **Localization Issues Fixed**

#### **Problem**:

- `userCreatedWorkflow` (lines 348-380) and `expertOnboardingCompleteWorkflow` (lines 402-433) were using hardcoded English strings instead of the existing localization system
- These workflows were inconsistent with other properly localized workflows in the same file

#### **Solution**:

- Replaced hardcoded strings with calls to `getLocalizedContent()` function
- Added proper locale detection using `getLocale(payload)` helper
- Added `locale` and `country` fields to payload schemas for user preference detection

### 2. **XSS Security Vulnerability Fixed**

#### **Problem**:

- `marketplaceConnectAccountStatusWorkflow` (lines 328-333) was inserting user-provided data directly into HTML email templates without proper escaping
- Fields like `payload.title`, `payload.message`, and `payload.actionRequired` could contain malicious HTML/JavaScript

#### **Solution**:

- Applied `escapeHtml()` function to all user-controlled values in email templates
- Protected against script injection while preserving safe URLs for action links

---

## 🔧 Changes Made

### **config/novu.ts**

```typescript
// Before: Hardcoded English strings
export const userCreatedWorkflow = workflow(
  'user-created',
  async ({ payload, step }) => {
    await step.inApp('welcome-new-user', async () => ({
      subject: `Welcome to Eleva Care, ${payload.firstName || 'there'}!`,
      body: `Thank you for joining Eleva Care. Complete your profile...`,
    }));
    // ... hardcoded email template
  }
);

// After: Properly localized
export const userCreatedWorkflow = workflow(
  'user-created',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('welcome', locale, payload);

    await step.inApp('welcome-new-user', async () => content);

    const emailContent = await getLocalizedContent('welcome', locale, payload, 'email');
    await step.email('welcome-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      // ... existing fields
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);
```

### **XSS Protection Added**

```typescript
// Before: Vulnerable to XSS
body: `
  <h2>${payload.title}</h2>
  <p>${payload.message}</p>
  ${payload.actionRequired ? `<p><strong>Action Required:</strong> ${payload.actionRequired}</p>` : ''}
`;

// After: XSS Protected
body: `
  <h2>${escapeHtml(payload.title)}</h2>
  <p>${escapeHtml(payload.message)}</p>
  ${payload.actionRequired ? `<p><strong>Action Required:</strong> ${escapeHtml(payload.actionRequired)}</p>` : ''}
`;
```

---

## 📝 Translation Files Updated

Added missing `expertOnboardingComplete` translations to all language files:

### **messages/en.json**

```json
{
  "notifications": {
    "expertOnboardingComplete": {
      "subject": "Expert setup complete!",
      "body": "Congratulations {expertName}! Your expert profile is now live...",
      "email": {
        "subject": "Welcome to the Eleva Care Expert Network!",
        "title": "Congratulations, {expertName}!"
        // ... complete structure
      }
    }
  }
}
```

### **Translations Added For**:

- **Portuguese (PT)**: `messages/pt.json`
- **Brazilian Portuguese (BR)**: `messages/br.json`
- **Spanish (ES)**: `messages/es.json`

Each translation includes:

- In-app notification content
- Email subject, title, greeting, body
- Specialized fields like specialization display
- Call-to-action buttons
- Next steps lists

---

## ✅ **Quality Assurance**

### **Build Verification**

```bash
✓ npm run build - Successfully completed
✓ All 67 static pages generated
✓ No TypeScript or linting errors
✓ QStash schedules updated successfully
```

### **Test Suite Results**

```bash
✓ Test Suites: 17 passed, 17 total
✓ Tests: 160 passed, 160 total
✓ All webhook tests passing
✓ All notification workflows tested
✓ No regressions introduced
```

### **Security Validation**

- ✅ XSS vulnerability eliminated in email templates
- ✅ HTML escaping properly applied to user-controlled content
- ✅ URL safety preserved for action links
- ✅ Existing escapeHtml utility function used consistently

---

## 🌍 **Localization System Integration**

### **Pattern Consistency**

Both workflows now follow the same pattern as other localized workflows:

1. **Locale Detection**: `const locale = getLocale(payload)`
2. **Content Retrieval**: `await getLocalizedContent('key', locale, payload)`
3. **Email Handling**: Separate email content with HTML escaping
4. **Payload Schema**: Include `locale` and `country` optional fields

### **Supported Languages**

- **English (en)**: Default/fallback language
- **Portuguese Portugal (pt)**: European Portuguese
- **Portuguese Brazil (pt-BR)**: Brazilian Portuguese
- **Spanish (es)**: Spanish

### **Fallback Strategy**

- Falls back to English if translation missing
- Uses country-based locale detection when explicit locale unavailable
- Graceful degradation with error logging

---

## 🔄 **Workflow Examples**

### **User Creation Workflow**

```typescript
// Supports localized welcome messages
await createUserNotification({
  userId: user.id,
  type: 'user-created',
  payload: {
    firstName: 'Maria',
    lastName: 'Silva',
    email: 'maria@example.com',
    clerkUserId: 'user_123',
    locale: 'pt-BR', // Brazilian Portuguese
    country: 'BR',
  },
});
```

### **Expert Onboarding Workflow**

```typescript
// Supports localized expert welcome messages
await createUserNotification({
  userId: expert.id,
  type: 'expert-onboarding-complete',
  payload: {
    expertName: 'Dr. Patricia Mota',
    specialization: 'Fisioterapia Pélvica',
    locale: 'pt', // European Portuguese
    country: 'PT',
  },
});
```

---

## 📈 **Benefits Achieved**

### **User Experience**

- ✅ Consistent localized notifications across all workflows
- ✅ Proper Portuguese and Spanish support for user and expert onboarding
- ✅ Country-specific locale detection (PT vs BR Portuguese)

### **Security**

- ✅ XSS vulnerability eliminated in marketplace notifications
- ✅ All user-controlled content properly escaped in email templates
- ✅ Safe handling of action URLs and links

### **Maintainability**

- ✅ Consistent pattern across all notification workflows
- ✅ Centralized translation management via message files
- ✅ Easy addition of new languages through JSON files

### **Development**

- ✅ No breaking changes to existing functionality
- ✅ All tests passing
- ✅ Build process unaffected
- ✅ Follows established coding patterns

---

## 🎯 **Next Steps**

1. **Monitor Production**: Verify localized notifications work correctly in production
2. **Add Missing Translations**: Complete any remaining notification translation keys
3. **User Testing**: Validate translations with native speakers
4. **Documentation Update**: Update Novu integration docs with localization examples

This implementation ensures Eleva Care's notification system properly supports the global user base with secure, localized communications across all user touchpoints.
