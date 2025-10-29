# Core Systems Documentation

> **Critical systems that power the Eleva Care platform - authentication, payments, scheduling, notifications, and caching**

## Overview

This section contains documentation for all core application systems that are essential for Eleva Care's operation. These are production-critical systems that require careful maintenance and monitoring.

---

## Systems Overview

### 1. Authentication (`authentication/`)

Clerk-based authentication and authorization system.

- **Configuration**: Clerk setup and environment
- **Role Management**: Expert vs client roles
- **Permissions**: Route protection and access control
- **Security**: Best practices and security patterns

📄 **Key Files:**

- [Clerk Configuration](./authentication/01-clerk-configuration.md)
- [Role Management](./authentication/02-role-management.md)
- [Permission System](./authentication/03-permission-system.md)
- [Route Protection](./authentication/04-route-protection.md)

---

### 2. Caching (`caching/`)

Unified Redis-based caching system for all application data.

- **Redis Implementation**: Core caching infrastructure
- **Clerk User Cache**: User data caching with batching
- **Stripe Customer Cache**: Customer and subscription data
- **Rate Limiting**: API endpoint protection

📄 **Key Files:**

- [Redis Caching](./caching/01-redis-caching.md)
- [Clerk User Cache](./caching/02-clerk-user-cache.md)
- [Stripe Customer Cache](./caching/03-stripe-customer-cache.md)
- [Rate Limiting](./caching/04-rate-limiting.md)

---

### 3. Notifications (`notifications/`)

Novu-based notification system for multi-channel communications.

- **Novu Integration**: Framework and configuration
- **Workflows**: Email, in-app, SMS notification workflows
- **Stripe Integration**: Payment and payout notifications
- **Production Setup**: Deployment and monitoring

📄 **Key Files:**

- [Novu Integration](./notifications/01-novu-integration.md)
- [Notification Workflows](./notifications/02-notification-workflows.md)
- [Stripe Notifications](./notifications/03-stripe-notifications.md)
- [Framework Setup](./notifications/04-novu-framework-setup.md)
- [Production Ready](./notifications/07-novu-workflows-production-ready.md)

---

### 4. Payments (`payments/`)

Stripe-based payment processing system with Multibanco support.

- **Payment Flow**: Card and Multibanco payment processing
- **Stripe Integration**: Payment intents, webhooks, Connect
- **Payout Processing**: Expert payouts and transfers
- **Refund Policies**: Customer-first refund implementation
- **Multibanco**: Portuguese payment method integration

📄 **Key Files:**

- [Payment Flow Analysis](./payments/01-payment-flow-analysis.md)
- [Stripe Integration](./payments/02-stripe-integration.md)
- [Payout Processing](./payments/03-enhanced-payout-processing.md)
- [Payment Restrictions](./payments/04-payment-restrictions.md)
- [Multibanco Integration](./payments/06-multibanco-integration.md)
- [Refund Policy v3.0](./payments/08-policy-v3-customer-first-100-refund.md)
- [Payment README](./payments/README.md) ⭐ **Comprehensive payment system guide**

---

### 5. Scheduling (`scheduling/`)

Appointment scheduling and booking system.

- **Scheduling Engine**: Availability and booking logic
- **Booking Layout**: UI components and user experience
- **Time Management**: Timezone handling and validation

📄 **Key Files:**

- [Scheduling Engine](./scheduling/01-scheduling-engine.md)
- [Booking Layout](./scheduling/02-booking-layout.md)

---

## Quick Start

### For New Developers

1. **Authentication First**: Start with [Clerk Configuration](./authentication/01-clerk-configuration.md)
2. **Understand Payments**: Read [Payment README](./payments/README.md)
3. **Learn Caching**: Review [Redis Caching](./caching/01-redis-caching.md)
4. **Notification Setup**: Check [Novu Integration](./notifications/01-novu-integration.md)

### For Operations

1. **Monitor Payments**: [Payment Flow Analysis](./payments/01-payment-flow-analysis.md)
2. **Check Cache Health**: [Rate Limiting](./caching/04-rate-limiting.md)
3. **Notification Status**: [Production Ready](./notifications/07-novu-workflows-production-ready.md)

---

## System Dependencies

### External Services

| Service           | Purpose                 | Criticality |
| ----------------- | ----------------------- | ----------- |
| **Clerk**         | Authentication          | 🔴 Critical |
| **Stripe**        | Payments & Payouts      | 🔴 Critical |
| **Novu**          | Notifications           | 🟡 High     |
| **Upstash Redis** | Caching & Rate Limiting | 🟡 High     |
| **Neon Database** | Data Storage            | 🔴 Critical |

### Internal Dependencies

- All systems use centralized Redis caching
- Notifications triggered by payment events
- Authentication required for all user actions
- Scheduling depends on payment completion

---

## Monitoring & Health

### Health Check Endpoints

```bash
# Overall system health
curl https://eleva.care/api/healthcheck?services=true

# Individual services
curl https://eleva.care/api/health/clerk
curl https://eleva.care/api/health/stripe
curl https://eleva.care/api/health/novu
curl https://eleva.care/api/health/upstash-redis
```

### Key Metrics

- **Authentication**: Login success rate, session duration
- **Payments**: Payment success rate, payout timing
- **Notifications**: Delivery rate, open rate
- **Caching**: Cache hit rate, Redis latency

See [Monitoring Guide](../03-infrastructure/monitoring/01-betterstack-monitoring.md) for details.

---

## Troubleshooting

### Common Issues

**Authentication Issues**

- Check Clerk dashboard for user status
- Verify environment variables
- Review [Permission System](./authentication/03-permission-system.md)

**Payment Failures**

- Check Stripe dashboard for errors
- Verify webhook delivery
- Review [Payment Flow](./payments/01-payment-flow-analysis.md)

**Cache Misses**

- Check Redis health endpoint
- Review cache TTL settings
- See [Redis Caching](./caching/01-redis-caching.md)

**Notification Failures**

- Check Novu dashboard
- Verify workflow configuration
- Review [Novu Integration](./notifications/01-novu-integration.md)

---

## Development Guidelines

### Adding New Features

1. **Document First**: Create implementation guide
2. **Consider Caching**: Add caching for expensive operations
3. **Add Monitoring**: Include health checks and metrics
4. **Test Thoroughly**: Unit, integration, and E2E tests
5. **Update Docs**: Keep this README current

### Best Practices

- Use centralized Redis for all caching
- Always validate payments with Stripe webhooks
- Implement proper error handling and logging
- Add PostHog analytics for key user actions
- Follow existing patterns for consistency

---

## Related Documentation

- **Infrastructure**: [Infrastructure Docs](../03-infrastructure/README.md)
- **Development**: [Development Guides](../04-development/README.md)
- **Legal**: [Legal & Compliance](../06-legal/README.md)
- **Deployment**: [Deployment Guides](../08-deployment/README.md)

---

**Last Updated**: January 2025  
**Maintained By**: Engineering Team  
**Questions?** Post in #engineering Slack channel
