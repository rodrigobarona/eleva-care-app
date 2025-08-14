# External Integrations

This directory contains documentation for third-party integrations, external libraries, and API connections used in the Eleva Care platform.

## Contents

- `01-react-cookie-manager.md` - Cookie consent management integration
- `02-stripe-recommendations.md` - Stripe payment processing recommendations
- `03-svix-cli.md` - Svix webhook management CLI tools

## Integration Categories

### Payment Processing

- **Stripe**: Payment processing, subscriptions, Connect marketplace
- **Stripe Identity**: Identity verification for experts

### Communication & Notifications

- **Novu**: Multi-channel notification platform
- **Resend**: Email delivery service
- **WebSocket**: Real-time communication

### Analytics & Monitoring

- **PostHog**: Product analytics and feature flags
- **Upstash**: Redis caching and rate limiting

### Development Tools

- **Svix**: Webhook infrastructure
- **Clerk**: Authentication and user management
- **Vercel**: Hosting and deployment platform

## Integration Guidelines

1. **Security**: All integrations must follow security best practices
2. **Environment Variables**: Use secure configuration management
3. **Error Handling**: Implement robust error handling and fallbacks
4. **Documentation**: Maintain up-to-date integration documentation
5. **Testing**: Include integration testing in CI/CD pipeline

## Related Documentation

- See `02-core-systems/` for core system integrations
- See `04-development/` for development-specific integrations
