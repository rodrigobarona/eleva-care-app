import { calculateApplicationFee } from '@/config/stripe';

type ResolveMarketplaceAmountsInput = {
  actualGrossAmount?: number | null;
  configuredGrossAmount?: number | null;
  actualPlatformFeeAmount?: number | null;
  configuredPlatformFeeAmount?: number | null;
  configuredExpertAmount?: number | null;
};

function normalizeAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return null;
  }

  return Math.trunc(value);
}

export function resolveMarketplaceAmounts({
  actualGrossAmount,
  configuredGrossAmount,
  actualPlatformFeeAmount,
  configuredPlatformFeeAmount,
  configuredExpertAmount,
}: ResolveMarketplaceAmountsInput) {
  const normalizedActualGross = normalizeAmount(actualGrossAmount);
  const normalizedConfiguredGross = normalizeAmount(configuredGrossAmount);
  const normalizedActualFee = normalizeAmount(actualPlatformFeeAmount);
  const normalizedConfiguredFee = normalizeAmount(configuredPlatformFeeAmount);
  const normalizedConfiguredExpert = normalizeAmount(configuredExpertAmount);

  const grossAmount =
    normalizedActualGross ??
    normalizedConfiguredGross ??
    (normalizedConfiguredFee ?? 0) + (normalizedConfiguredExpert ?? 0);

  const isDiscountedCharge =
    normalizedActualGross !== null &&
    normalizedConfiguredGross !== null &&
    normalizedActualGross < normalizedConfiguredGross;

  if (isDiscountedCharge) {
    const platformFeeAmount = calculateApplicationFee(grossAmount);

    return {
      grossAmount,
      platformFeeAmount,
      expertAmount: Math.max(grossAmount - platformFeeAmount, 0),
      usedDiscountAdjustedSplit: true,
    };
  }

  const platformFeeAmount = Math.min(
    normalizedActualFee ?? normalizedConfiguredFee ?? calculateApplicationFee(grossAmount),
    grossAmount,
  );

  return {
    grossAmount,
    platformFeeAmount,
    expertAmount: normalizedConfiguredExpert ?? Math.max(grossAmount - platformFeeAmount, 0),
    usedDiscountAdjustedSplit: false,
  };
}
