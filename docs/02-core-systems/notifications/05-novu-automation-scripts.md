# Novu Automation Scripts

> **Automated workflow and template management for Eleva Care notification system**

## 🎯 Overview

The Novu automation scripts provide comprehensive setup and management for notification workflows, templates, and subscriber management via the Novu API. This system mirrors our PostHog automation approach but specifically handles notification infrastructure.

## 📋 Available Scripts

### Quick Commands

```bash
# Test Novu API connection
npm run test:novu

# Create/update all workflows
npm run setup:novu-workflows

# Validate API permissions
npm run test:novu-permissions
```

### Individual Scripts

```bash
# Test connection and basic API access
node scripts/test-novu-connection.js

# Test specific API permissions
node scripts/test-novu-connection.js --permissions

# Setup all notification workflows
node scripts/setup-novu-workflows.js
```

## 🔧 Setup Requirements

### Environment Variables

Required variables in your `.env.local`:

```env
# Required: Novu API Authentication
NOVU_SECRET_KEY=novu_secret_key_here

# Required: Application Identifier
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=app_identifier_here

# Optional: Admin Subscriber Configuration
NOVU_ADMIN_SUBSCRIBER_ID=admin
```

### Getting Novu Credentials

1. **Sign up/Login to Novu**: [https://web.novu.co/](https://web.novu.co/)
2. **Get Application Identifier**:
   - Go to Settings → Environment
   - Copy "Application Identifier"
3. **Get API Key**:
   - Go to Settings → API Keys
   - Create new API key or copy existing
   - Use the "Secret Key" (preferred) or "API Key"

## 📊 What Gets Created

### 🔄 **6 Core Notification Workflows**

1. **Welcome Workflow** (`user-welcome`) 🔴

   - In-app welcome message
   - Email with onboarding steps
   - Profile completion CTA

2. **Payment Success** (`payment-success`) 🔴

   - Payment confirmation notification
   - Receipt email with transaction details

3. **Payment Failed** (`payment-failed`) 🔴

   - Payment failure alert
   - Recovery email with billing update CTA

4. **Appointment Reminder** (`appointment-reminder-24hr`) 🔴

   - 24-hour reminder notification
   - Email with meeting details and join link

5. **Expert Onboarding Complete** (`expert-onboarding-complete`) 🔴

   - Expert profile activation notification
   - Welcome email with dashboard access

6. **Health Check Failure** (`health-check-failure`) 🔴
   - System alert notification
   - Admin email with technical details

### 👤 **Admin Subscriber Setup**

- Creates admin subscriber for system notifications
- Configures preferences for critical alerts
- Sets up health check and system monitoring notifications

### 📁 **Generated Files**

- `docs/novu-workflow-configs.json` - Complete workflow reference
- Contains workflow IDs, identifiers, and dashboard URLs

## 🔍 Script Details

### `test-novu-connection.js`

**Purpose**: Validates Novu API connectivity and basic permissions

**Features**:

- ✅ Environment variable validation
- 🌐 API connectivity test
- 🔄 Workflow access verification
- 👥 Subscriber management test
- 📧 Template access validation
- 📊 Activity feed connectivity

**Usage**:

```bash
# Basic connection test
npm run test:novu

# Detailed permission check
npm run test:novu-permissions
```

**Output Example**:

```bash
🔍 Testing Novu API connection...

📋 Environment Variables:
  NOVU_BASE_URL: https://eu.api.novu.co
  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER: ✅ Set
  NOVU_SECRET_KEY: ✅ Set (hidden)

🌐 Testing API connectivity...
✅ Connected to organization: Eleva Care
   Organization ID: 123456789
   Environment: eleva-care.dev

🔄 Testing workflows access...
✅ Found 6 existing workflows

👥 Testing subscribers access...
✅ Found 150 subscribers

📧 Testing notification templates access...
✅ Found 6 notification templates

📊 Testing activity feed...
✅ Activity data is available

🎉 All tests passed! You can now run:
   npm run setup:novu-workflows
```

### `setup-novu-workflows.js`

**Purpose**: Creates and manages all Eleva Care notification workflows

**Features**:

- 📧 Creates 6 core notification workflows
- 🔄 Updates existing workflows instead of duplicating
- 👤 Sets up admin subscriber for system notifications
- 🏷️ Applies proper tags and critical flags
- 📊 Generates workflow configuration reference
- 🎨 Includes HTML email templates with Eleva Care branding

**Usage**:

```bash
# Setup all workflows
npm run setup:novu-workflows
```

**Output Example**:

```bash
🚀 Setting up Novu workflows for Eleva Care...

👤 Setting up admin subscriber...
  ✅ Admin subscriber exists: admin

📧 Creating notification template: Welcome Workflow
  ✅ Created workflow: user-welcome (ID: 67890)

📧 Creating notification template: Payment Success Workflow
  ✅ Created workflow: payment-success (ID: 67891)

📧 Creating notification template: Payment Failed Workflow
  ✅ Created workflow: payment-failed (ID: 67892)

📧 Creating notification template: Appointment Reminder Workflow
  ✅ Created workflow: appointment-reminder-24hr (ID: 67893)

📧 Creating notification template: Expert Onboarding Complete Workflow
  ✅ Created workflow: expert-onboarding-complete (ID: 67894)

📧 Creating notification template: Health Check Failure Workflow
  ✅ Created workflow: health-check-failure (ID: 67895)

🎉 All Novu workflows created successfully!

Created workflows:
  - Welcome Workflow: user-welcome 🔴
  - Payment Success Workflow: payment-success 🔴
  - Payment Failed Workflow: payment-failed 🔴
  - Appointment Reminder Workflow: appointment-reminder-24hr 🔴
  - Expert Onboarding Complete Workflow: expert-onboarding-complete 🔴
  - Health Check Failure Workflow: health-check-failure 🔴

📝 Workflow configurations saved to docs/novu-workflow-configs.json

🔗 Next steps:
1. Visit https://web.novu.co/workflows to customize templates
2. Configure notification groups and preferences
3. Test workflows with sample data
4. Set up integrations (email providers, etc.)

📧 Configure your email provider:
https://web.novu.co/integrations
```

## 🔄 Workflow Configuration Details

### Template Structure

Each workflow includes:

- **In-App Notifications**: Immediate user feedback
- **Email Templates**: Rich HTML with Eleva Care branding
- **Call-to-Action Buttons**: Branded links for user actions
- **Variable Substitution**: Dynamic content from payload data
- **Responsive Design**: Mobile-friendly templates

### Critical Workflow Features

All workflows are marked as **critical** for:

- ⚡ Higher delivery priority
- 📊 Enhanced monitoring and tracking
- 🔔 Fallback notification methods
- 📈 Detailed analytics and reporting

### Email Template Styling

Templates include:

- 🎨 Eleva Care brand colors (`#006D77`)
- 📱 Responsive design for mobile/desktop
- ♿ Accessibility-compliant markup
- 🔗 Branded CTAs and action buttons

## 🔧 Integration with Application

### Framework Integration

The workflows integrate with our existing Novu setup:

```typescript
// config/novu.ts - Exports workflows for serving
export const workflows = [...workflowDefinitions];

// app/api/novu/route.ts - Serves workflows
export const { GET, POST, OPTIONS } = serve({ workflows });
```

### Triggering Workflows

```typescript
// Example: Welcome workflow trigger
await novu.trigger('user-welcome', {
  to: { subscriberId: user.id, email: user.email },
  payload: {
    userName: user.name,
    firstName: user.firstName,
    profileUrl: `${baseUrl}/profile`,
  },
});
```

## 🛠️ Troubleshooting

### Common Issues

#### ❌ **Connection Failed**

```bash
❌ Connection test failed: HTTP 401: Unauthorized
```

**Solutions**:

1. Check API key has correct permissions
2. Verify application identifier is correct
3. Ensure using the right environment (EU vs US)
4. Check if API key has expired

#### ❌ **Workflow Creation Failed**

```bash
❌ Error creating workflow "user-welcome": Validation failed
```

**Solutions**:

1. Check template payload structure
2. Verify trigger identifier is unique
3. Ensure all required fields are provided
4. Review Novu API documentation for changes

#### ❌ **Missing Environment Variables**

```bash
❌ Missing required environment variables
```

**Solutions**:

1. Copy `.env.example` to `.env.local`
2. Get credentials from Novu dashboard
3. Verify variable names match exactly
4. Restart development server after adding variables

### Debug Commands

```bash
# Detailed API permission check
npm run test:novu-permissions

# Test with verbose output
DEBUG=1 npm run test:novu

# Check specific workflow
node scripts/test-novu-connection.js --workflow=user-welcome
```

## 🔐 Security Best Practices

1. **API Key Management**:

   - Use `NOVU_SECRET_KEY` for server-side operations
   - Keep API keys in `.env.local` (gitignored)
   - Rotate keys regularly in production

2. **Subscriber Privacy**:

   - Admin subscriber uses generic email
   - No sensitive data in workflow payloads
   - Proper data sanitization in templates

3. **Template Security**:
   - All user data is HTML-escaped
   - No script injection vectors
   - Validate all dynamic content

## 📚 Related Documentation

- [Novu Integration](./01-novu-integration.md) - Basic Novu setup
- [Notification Workflows](./02-notification-workflows.md) - Workflow definitions
- [Stripe-Novu Integration](./03-stripe-novu-integration.md) - Payment notifications
- [Localization & Security Fixes](./04-novu-localization-security-fixes.md) - i18n and XSS fixes

## 🔗 External Resources

- [Novu Dashboard](https://web.novu.co/) - Workflow management
- [Novu API Documentation](https://docs.novu.co/) - API reference
- [Novu Integrations](https://web.novu.co/integrations) - Email provider setup
- [Template Editor](https://web.novu.co/workflows) - Visual template editor
