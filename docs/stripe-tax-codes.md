# Stripe Tax Codes for Healthcare Services

This document outlines the tax codes used in Eleva.care for healthcare-related services and their implementation in our payment system.

## Available Healthcare Tax Codes

### Primary Tax Code

- **txcd_20103200** - Healthcare Provider Services
  - Currently used as our default tax code
  - Specifically designed for licensed healthcare providers
  - Appropriate for physical therapy sessions and medical consultations
  - Ensures proper tax calculation for healthcare services

### Alternative Tax Codes

1. **txcd_20103000** - Medical Services (General)

   - General medical services category
   - Suitable for broader healthcare services
   - Used when services don't specifically fit under provider services

2. **txcd_30070000** - Healthcare Services (Zero-rated)

   - For healthcare services exempt from VAT in certain jurisdictions
   - Important for cross-border healthcare services
   - Used in regions where healthcare is zero-rated

3. **txcd_20103100** - Personal Care Services
   - Suitable for wellness-related services
   - Used for non-medical health services
   - Appropriate for wellness coaching or similar services

## Implementation

The tax codes are implemented in the checkout session creation process (`app/api/create-payment-intent/route.ts`):

```typescript
product_data: {
  name: `${event.name} with ${meetingMetadata.expertName}`,
  description: `${meetingData.duration} minute session on ${meetingData.startTimeFormatted}`,
  tax_code: 'txcd_20103200', // Healthcare Provider Services
},
```

## Tax Code Selection

Our system currently uses `txcd_20103200` (Healthcare Provider Services) as the default because:

1. It's specifically designed for licensed healthcare providers
2. It properly categorizes physical therapy and medical consultation services
3. It helps with accurate tax reporting and compliance
4. It's recognized across different jurisdictions for healthcare services

## Future Enhancements

Future versions may include:

- Dynamic tax code selection based on service type
- Country-specific tax code mapping
- Automated tax code validation
- Support for mixed service types

## Related Documentation

- [Stripe Tax Codes Documentation](https://stripe.com/docs/tax/tax-codes)
- [Healthcare Services Tax Guide](https://stripe.com/docs/tax/healthcare-services)
