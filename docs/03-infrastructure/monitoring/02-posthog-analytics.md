# PostHog Analytics Setup & Dashboard Configuration

## Overview

This document outlines the comprehensive PostHog analytics implementation for the Eleva Care application, including dashboard configurations, custom events, and monitoring best practices.

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_APP_VERSION=1.0.0  # Optional: App version tracking
NEXT_PUBLIC_BUILD_TIMESTAMP=2024-01-01T00:00:00Z  # Optional: Build tracking
```

### Environment Variables

Add these to your `.env.local` file:

```env
# ========================================
# 🌐 PUBLIC Variables (Client-side tracking)
# ========================================
# Required for browser-based PostHog tracking
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Optional: Version tracking
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_BUILD_TIMESTAMP=2024-01-01T00:00:00Z

# ========================================
# 🔒 PRIVATE Variables (Server-side only)
# ========================================
# Required only for automated dashboard setup
POSTHOG_API_KEY=phx_your_personal_api_key_here
POSTHOG_PROJECT_ID=your_project_id_here
```

**Variable Types:**

- **Public (`NEXT_PUBLIC_*`)**: Accessible in browser, used for client-side tracking
- **Private**: Server-side only, used for API operations like dashboard creation

### Features Enabled

- **User Identification**: Comprehensive user profiling with Clerk integration
- **Feature Flags**: A/B testing and feature rollout management
- **Session Recording**: Masked recordings for production (disabled in development)
- **Performance Monitoring**: Core Web Vitals and custom metrics
- **Error Tracking**: JavaScript errors and unhandled promise rejections
- **Conversion Tracking**: Business events and funnel analysis
- **Cross-Subdomain Tracking**: Unified user experience across domains

## Custom Events

### Core Analytics Events

#### Page Tracking

- `$pageview` - Enhanced with route categorization and performance data
- `page_leave` - Time spent on page tracking
- `page_performance` - Core Web Vitals and load times

#### User Authentication

- `user_signed_in` - User authentication events
- `app_loaded` - Application initialization

#### Business Events

- `business_appointment_booked` - Appointment creation
- `business_payment_completed` - Payment success
- `business_expert_contacted` - Expert interactions
- `business_profile_completed` - Profile completion

#### Engagement Events

- `engagement` - User interactions (click, scroll, hover, focus)
- `user_action` - Generic user actions with context
- `conversion_step` - Funnel step progression

#### System Events

- `javascript_error` - Frontend error tracking
- `unhandled_promise_rejection` - Promise rejection tracking
- `page_visibility_changed` - Tab focus/blur events
- `network_status_changed` - Online/offline status

#### Health Monitoring

- `health_check_success` - Successful health checks
- `health_check_failed` - Failed health checks
- `performance_metric` - Custom performance metrics

### Event Properties

All events include standard properties:

```typescript
{
  timestamp: string;
  user_id?: string;
  session_id?: string;
  route_type: 'public' | 'private';
  locale: string;
  user_authenticated: boolean;
  page_type: 'app' | 'marketing' | 'admin';
  app_version: string;
  environment: 'development' | 'production' | 'test';
}
```

## PostHog Dashboards

### Automated Dashboard Setup (Recommended)

We provide an automated script to create comprehensive PostHog dashboards via the PostHog API. This is the fastest and most reliable way to get your analytics dashboards up and running.

**Quick Setup:**

```bash
# 1. Set up environment variables (see Environment Variables section above)
# 2. Test your connection
npm run test:posthog

# 3. Create all dashboards
npm run setup:posthog-dashboards
```

**What gets created:**

- **Application Overview Dashboard** - DAU, page views, authentication rates, error trends
- **Health Check Monitoring Dashboard** - System health, memory usage, environment status
- **User Experience Dashboard** - Page performance, user journeys, feature flag exposure
- **Business Intelligence Dashboard** - Conversion funnels, revenue metrics, business events
- **Technical Performance Dashboard** - Error rates, API performance, Core Web Vitals

For detailed setup instructions, see: [`docs/posthog-dashboard-setup-guide.md`](./posthog-dashboard-setup-guide.md)

### Manual Dashboard Configuration

If you prefer to create dashboards manually or need custom configurations, detailed SQL queries and setup instructions are provided below:

### 1. Application Overview Dashboard

**Purpose**: High-level application health and usage metrics

**Insights**:

- Daily/Weekly/Monthly Active Users
- Page views and unique visitors
- User authentication rate
- Application performance overview
- Error rate trends

**Key Metrics**:

```sql
-- Daily Active Users
SELECT DISTINCT user_id
FROM events
WHERE timestamp >= now() - interval '1 day'
AND user_id IS NOT NULL

-- Page View Trends
SELECT
  toDate(timestamp) as date,
  count() as page_views,
  uniq(user_id) as unique_users
FROM events
WHERE event = '$pageview'
GROUP BY date
ORDER BY date DESC

-- Conversion Rate by Route Type
SELECT
  route_type,
  countIf(event = 'business_appointment_booked') / countIf(event = '$pageview') * 100 as conversion_rate
FROM events
GROUP BY route_type
```

### 2. Health Check Monitoring Dashboard

**Purpose**: System health and infrastructure monitoring

**Insights**:

- Health check success/failure rates
- System performance metrics
- Error patterns and frequency
- Service dependency status

**Key Metrics**:

```sql
-- Health Check Success Rate (24h)
SELECT
  countIf(event = 'health_check_success') /
  (countIf(event = 'health_check_success') + countIf(event = 'health_check_failed')) * 100
  as success_rate
FROM events
WHERE timestamp >= now() - interval '1 day'

-- Memory Usage Trends
SELECT
  toHour(timestamp) as hour,
  avg(toFloat64(JSONExtractString(properties, 'memory.percentage'))) as avg_memory_usage
FROM events
WHERE event IN ('health_check_success', 'health_check_failed')
GROUP BY hour
ORDER BY hour DESC

-- Error Distribution by Environment
SELECT
  JSONExtractString(properties, 'environment') as environment,
  count() as error_count
FROM events
WHERE event = 'health_check_failed'
GROUP BY environment
```

### 3. User Experience Dashboard

**Purpose**: User behavior and experience optimization

**Insights**:

- User journey analysis
- Page performance metrics
- Feature adoption rates
- Engagement patterns

**Key Metrics**:

```sql
-- Page Load Performance
SELECT
  JSONExtractString(properties, 'pathname') as page,
  avg(toFloat64(JSONExtractString(properties, 'load_time'))) as avg_load_time,
  percentile(toFloat64(JSONExtractString(properties, 'load_time')), 0.95) as p95_load_time
FROM events
WHERE event = 'page_performance'
GROUP BY page
ORDER BY avg_load_time DESC

-- User Flow Analysis
SELECT
  JSONExtractString(properties, 'previous_path') as from_page,
  JSONExtractString(properties, 'pathname') as to_page,
  count() as transitions
FROM events
WHERE event = '$pageview' AND previous_path != ''
GROUP BY from_page, to_page
ORDER BY transitions DESC

-- Feature Flag Adoption
SELECT
  JSONExtractString(properties, 'experiment_key') as experiment,
  JSONExtractString(properties, 'variant') as variant,
  count() as exposures
FROM events
WHERE event = 'experiment_exposure'
GROUP BY experiment, variant
```

### 4. Business Intelligence Dashboard

**Purpose**: Business metrics and revenue optimization

**Insights**:

- Conversion funnel analysis
- Expert-client matching effectiveness
- Payment success rates
- User lifecycle stages

**Key Metrics**:

```sql
-- Conversion Funnel
SELECT
  JSONExtractString(properties, 'funnel') as funnel,
  JSONExtractString(properties, 'step') as step,
  count() as step_completions
FROM events
WHERE event = 'conversion_step'
GROUP BY funnel, step
ORDER BY funnel, step

-- Business Event Trends
SELECT
  toDate(timestamp) as date,
  countIf(event = 'business_appointment_booked') as appointments,
  countIf(event = 'business_payment_completed') as payments,
  countIf(event = 'business_expert_contacted') as expert_contacts
FROM events
WHERE timestamp >= now() - interval '30 days'
GROUP BY date
ORDER BY date DESC

-- User Segmentation by Activity
SELECT
  multiIf(
    page_views >= 50, 'Power User',
    page_views >= 10, 'Active User',
    page_views >= 3, 'Regular User',
    'New User'
  ) as user_segment,
  count() as user_count
FROM (
  SELECT
    user_id,
    count() as page_views
  FROM events
  WHERE event = '$pageview' AND user_id IS NOT NULL
  GROUP BY user_id
)
GROUP BY user_segment
```

### 5. Technical Performance Dashboard

**Purpose**: Application performance and error monitoring

**Insights**:

- JavaScript error rates
- API performance metrics
- Browser compatibility issues
- Network performance impact

**Key Metrics**:

```sql
-- Error Rate by Page
SELECT
  JSONExtractString(properties, 'pathname') as page,
  countIf(event = 'javascript_error') as errors,
  countIf(event = '$pageview') as page_views,
  errors / page_views * 100 as error_rate
FROM events
GROUP BY page
ORDER BY error_rate DESC

-- API Performance Metrics
SELECT
  JSONExtractString(properties, 'endpoint') as endpoint,
  avg(toFloat64(JSONExtractString(properties, 'value'))) as avg_response_time,
  percentile(toFloat64(JSONExtractString(properties, 'value')), 0.95) as p95_response_time
FROM events
WHERE event = 'performance_metric' AND metric = 'api_call_time'
GROUP BY endpoint
ORDER BY avg_response_time DESC

-- Browser Performance Distribution
SELECT
  JSONExtractString(properties, 'user_agent') as browser,
  avg(toFloat64(JSONExtractString(properties, 'load_time'))) as avg_load_time
FROM events
WHERE event = 'page_performance'
GROUP BY browser
ORDER BY avg_load_time DESC
```

## Alert Configuration

### Critical Alerts (Immediate)

1. **Health Check Failures**
   - Trigger: Health check failure rate > 5% in 5 minutes
   - Action: Immediate notification to on-call engineer

2. **High Error Rate**
   - Trigger: JavaScript error rate > 2% in 10 minutes
   - Action: Notification to development team

3. **Performance Degradation**
   - Trigger: P95 page load time > 3 seconds for 15 minutes
   - Action: Performance team notification

### Warning Alerts (Non-Critical)

1. **Memory Usage**
   - Trigger: Average memory usage > 80% for 30 minutes
   - Action: Infrastructure team notification

2. **Conversion Drop**
   - Trigger: Daily conversion rate drops by 20% compared to 7-day average
   - Action: Product team notification

3. **Feature Flag Issues**
   - Trigger: Feature flag error rate > 1%
   - Action: Development team notification

## Usage Examples

### Basic Event Tracking

```typescript
import { usePostHogEvents } from '@/lib/hooks/usePostHog';

function BookingButton() {
  const { trackBusinessEvent, trackUserAction } = usePostHogEvents();

  const handleBooking = () => {
    trackUserAction('booking_button_clicked', {
      expert_id: expertId,
      page: 'expert_profile',
    });

    // After successful booking
    trackBusinessEvent('appointment_booked', {
      expert_id: expertId,
      appointment_type: 'consultation',
      amount: 100,
    });
  };

  return <Button onClick={handleBooking}>Book Appointment</Button>;
}
```

### Feature Flag Implementation

```typescript
import { usePostHogFeatureFlag } from '@/lib/hooks/usePostHog';

function ExperimentalFeature() {
  const { flagValue, isLoading } = usePostHogFeatureFlag('new_booking_flow', false);

  if (isLoading) return <Skeleton />;

  return flagValue ? <NewBookingFlow /> : <OldBookingFlow />;
}
```

### A/B Testing

```typescript
import { usePostHogABTest } from '@/lib/hooks/usePostHog';

function PricingPage() {
  const { variant, trackExperimentExposure } = usePostHogABTest('pricing_experiment', ['control', 'variant_a', 'variant_b']);

  useEffect(() => {
    trackExperimentExposure();
  }, []);

  switch (variant) {
    case 'variant_a': return <PricingVariantA />;
    case 'variant_b': return <PricingVariantB />;
    default: return <PricingControl />;
  }
}
```

### Performance Monitoring

```typescript
import { usePostHogPerformance } from '@/lib/hooks/usePostHog';

function APIWrapper() {
  const { trackAPICallTime } = usePostHogPerformance();

  const fetchData = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/data');
      const duration = Date.now() - startTime;
      trackAPICallTime('/api/data', duration, response.status);
    } catch (error) {
      const duration = Date.now() - startTime;
      trackAPICallTime('/api/data', duration, 0);
    }
  };
}
```

## Best Practices

### Privacy & Compliance

1. **Data Minimization**: Only track necessary user data
2. **Consent Management**: Respect user privacy preferences
3. **Data Retention**: Configure appropriate retention policies
4. **Anonymization**: Mask sensitive data in session recordings

### Performance Optimization

1. **Sampling**: Use sampling for high-volume events
2. **Batching**: Batch events to reduce network overhead
3. **Error Handling**: Graceful degradation when tracking fails
4. **Local Development**: Skip tracking on localhost

### Data Quality

1. **Event Validation**: Validate event properties before sending
2. **Naming Conventions**: Use consistent event and property names
3. **Documentation**: Document all custom events and properties
4. **Testing**: Include analytics in your testing strategy

## Troubleshooting

### Common Issues

1. **Events Not Appearing**
   - Check API key configuration
   - Verify PostHog initialization
   - Check browser console for errors

2. **User Identification Issues**
   - Ensure user ID consistency
   - Check Clerk integration
   - Verify identify() calls

3. **Feature Flags Not Working**
   - Check flag configuration in PostHog
   - Verify user identification
   - Check network connectivity

### Debug Mode

Enable debug mode in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  posthog.debug();
}
```

## Migration & Maintenance

### Regular Tasks

1. **Weekly**: Review dashboard metrics and alerts
2. **Monthly**: Clean up unused feature flags
3. **Quarterly**: Review and update event schemas
4. **Annually**: Audit data retention and privacy settings

### Version Updates

When updating PostHog:

1. Review changelog for breaking changes
2. Test in development environment
3. Update custom hooks if needed
4. Verify dashboard queries still work

## Integration with Other Tools

### Sentry Integration

```typescript
posthog.capture('sentry_error', {
  sentry_id: sentryEvent.id,
  error_type: error.name,
  user_id: user?.id,
});
```

### Stripe Integration

```typescript
// Track payment events
posthog.capture('payment_intent_created', {
  amount: paymentIntent.amount,
  currency: paymentIntent.currency,
  payment_method: paymentIntent.payment_method,
});
```

This comprehensive PostHog setup provides robust analytics, monitoring, and insights for the Eleva Care application while maintaining user privacy and optimal performance.
