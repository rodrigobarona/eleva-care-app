import { resolveMarketplaceAmounts } from '@/lib/payments/marketplace-amounts';
import { describe, expect, it } from '@jest/globals';

describe('resolveMarketplaceAmounts', () => {
  it('preserves the configured split when the gross amount is unchanged', () => {
    expect(
      resolveMarketplaceAmounts({
        actualGrossAmount: 7000,
        configuredGrossAmount: 7000,
        actualPlatformFeeAmount: 1050,
        configuredPlatformFeeAmount: 1050,
        configuredExpertAmount: 5950,
      }),
    ).toMatchObject({
      grossAmount: 7000,
      platformFeeAmount: 1050,
      expertAmount: 5950,
      usedDiscountAdjustedSplit: false,
    });
  });

  it('recalculates the split from the discounted gross amount', () => {
    expect(
      resolveMarketplaceAmounts({
        actualGrossAmount: 700,
        configuredGrossAmount: 7000,
        actualPlatformFeeAmount: 1050,
        configuredPlatformFeeAmount: 1050,
        configuredExpertAmount: 5950,
      }),
    ).toMatchObject({
      grossAmount: 700,
      platformFeeAmount: 105,
      expertAmount: 595,
      usedDiscountAdjustedSplit: true,
    });
  });
});
