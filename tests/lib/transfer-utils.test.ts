import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { PAYMENT_TRANSFER_STATUS_COMPLETED } from '@/lib/constants/payment-transfers';
import { checkExistingTransfer } from '@/lib/stripe/transfer-utils';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Stripe from 'stripe';

// Mock the dependencies
jest.mock('@/drizzle/db');
jest.mock('@/drizzle/schema', () => ({
  PaymentTransferTable: {
    id: 'id',
  },
}));

describe('Transfer Utils', () => {
  describe('checkExistingTransfer', () => {
    let mockStripe: jest.Mocked<Stripe>;
    let mockUpdate: jest.MockedFunction<() => unknown>;
    let mockSet: jest.MockedFunction<() => unknown>;
    let mockWhere: jest.MockedFunction<() => unknown>;
    let mockChargesRetrieve: jest.MockedFunction<typeof Stripe.prototype.charges.retrieve>;
    let mockTransfersList: jest.MockedFunction<typeof Stripe.prototype.transfers.list>;

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Mock the db update chain
      mockWhere = jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
      mockSet = jest.fn<() => { where: typeof mockWhere }>().mockReturnValue({ where: mockWhere });
      mockUpdate = jest.fn<() => { set: typeof mockSet }>().mockReturnValue({ set: mockSet });

      (db.update as jest.MockedFunction<typeof db.update>) = mockUpdate as never;

      // Create properly typed mock functions
      mockChargesRetrieve = jest.fn() as jest.MockedFunction<
        typeof Stripe.prototype.charges.retrieve
      >;
      mockTransfersList = jest.fn() as jest.MockedFunction<typeof Stripe.prototype.transfers.list>;

      // Mock Stripe instance
      mockStripe = {
        charges: {
          retrieve: mockChargesRetrieve,
        },
        transfers: {
          list: mockTransfersList,
        },
      } as unknown as jest.Mocked<Stripe>;
    });

    it('should return shouldCreateTransfer: true when no transfer exists', async () => {
      // Mock charge without transfer
      const mockCharge = {
        id: 'ch_123',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock empty transfers list
      mockTransfersList.mockResolvedValue({
        data: [],
      } as never);

      const result = await checkExistingTransfer(mockStripe, 'ch_123', {
        id: 1,
        paymentIntentId: 'pi_123',
      });

      expect(result).toEqual({
        existingTransferId: null,
        shouldCreateTransfer: true,
      });

      // Verify Stripe was called correctly
      expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_123', {
        expand: ['transfer'],
      });

      // Verify transfers.list was called for fallback check
      expect(mockStripe.transfers.list).toHaveBeenCalledWith({
        source_transaction: 'ch_123',
        limit: 10,
      });

      // Verify database was not updated
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should return shouldCreateTransfer: false when transfer exists as string', async () => {
      // Mock charge with transfer as string
      const mockCharge = {
        id: 'ch_123',
        transfer: 'tr_existing123',
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      const transferRecord = {
        id: 1,
        paymentIntentId: 'pi_123',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_123', transferRecord);

      expect(result).toEqual({
        existingTransferId: 'tr_existing123',
        shouldCreateTransfer: false,
      });

      // Verify Stripe was called correctly
      expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_123', {
        expand: ['transfer'],
      });

      // Verify database was updated correctly
      expect(db.update).toHaveBeenCalledWith(PaymentTransferTable);
      expect(mockSet).toHaveBeenCalledWith({
        status: PAYMENT_TRANSFER_STATUS_COMPLETED,
        transferId: 'tr_existing123',
        updated: expect.any(Date),
      });
    });

    it('should return shouldCreateTransfer: false when transfer exists as object', async () => {
      // Mock charge with transfer as object
      const mockCharge = {
        id: 'ch_123',
        transfer: {
          id: 'tr_existing456',
          amount: 10000,
          destination: 'acct_123',
        },
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      const transferRecord = {
        id: 2,
        paymentIntentId: 'pi_456',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_123', transferRecord);

      expect(result).toEqual({
        existingTransferId: 'tr_existing456',
        shouldCreateTransfer: false,
      });

      // Verify Stripe was called correctly
      expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_123', {
        expand: ['transfer'],
      });

      // Verify database was updated correctly
      expect(db.update).toHaveBeenCalledWith(PaymentTransferTable);
      expect(mockSet).toHaveBeenCalledWith({
        status: PAYMENT_TRANSFER_STATUS_COMPLETED,
        transferId: 'tr_existing456',
        updated: expect.any(Date),
      });
    });

    it('should handle Stripe API errors gracefully', async () => {
      // Mock Stripe API error
      const stripeError = new Error('Stripe API error');
      mockChargesRetrieve.mockRejectedValue(stripeError);

      await expect(
        checkExistingTransfer(mockStripe, 'ch_invalid', {
          id: 3,
          paymentIntentId: 'pi_invalid',
        }),
      ).rejects.toThrow('Stripe API error');

      // Verify database was not updated
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should update database with correct record ID', async () => {
      const mockCharge = {
        id: 'ch_123',
        transfer: 'tr_existing789',
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      const transferRecord = {
        id: 999,
        paymentIntentId: 'pi_789',
      };

      await checkExistingTransfer(mockStripe, 'ch_123', transferRecord);

      // Verify the correct record ID was used in the where clause
      expect(db.update).toHaveBeenCalledWith(PaymentTransferTable);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should handle charge with null transfer explicitly', async () => {
      const mockCharge = {
        id: 'ch_123',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock empty transfers list
      mockTransfersList.mockResolvedValue({
        data: [],
      } as never);

      const result = await checkExistingTransfer(mockStripe, 'ch_123', {
        id: 4,
        paymentIntentId: 'pi_null',
      });

      expect(result.shouldCreateTransfer).toBe(true);
      expect(result.existingTransferId).toBeNull();
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should handle charge with undefined transfer', async () => {
      const mockCharge = {
        id: 'ch_123',
        // transfer is undefined
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock empty transfers list
      mockTransfersList.mockResolvedValue({
        data: [],
      } as never);

      const result = await checkExistingTransfer(mockStripe, 'ch_123', {
        id: 5,
        paymentIntentId: 'pi_undefined',
      });

      expect(result.shouldCreateTransfer).toBe(true);
      expect(result.existingTransferId).toBeNull();
      expect(db.update).not.toHaveBeenCalled();
    });

    // New tests for separate charges & transfers fallback logic

    it('should find existing transfer via transfers.list by paymentTransferId', async () => {
      const mockCharge = {
        id: 'ch_separate123',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock transfers list with matching transfer
      mockTransfersList.mockResolvedValue({
        data: [
          {
            id: 'tr_separate123',
            metadata: {
              paymentTransferId: '100',
              paymentIntentId: 'pi_other',
            },
          },
        ],
      } as never);

      const transferRecord = {
        id: 100,
        paymentIntentId: 'pi_separate123',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_separate123', transferRecord);

      expect(result).toEqual({
        existingTransferId: 'tr_separate123',
        shouldCreateTransfer: false,
      });

      // Verify transfers.list was called
      expect(mockStripe.transfers.list).toHaveBeenCalledWith({
        source_transaction: 'ch_separate123',
        limit: 10,
      });

      // Verify database was updated
      expect(db.update).toHaveBeenCalledWith(PaymentTransferTable);
      expect(mockSet).toHaveBeenCalledWith({
        status: PAYMENT_TRANSFER_STATUS_COMPLETED,
        transferId: 'tr_separate123',
        updated: expect.any(Date),
      });
    });

    it('should find existing transfer via transfers.list by paymentIntentId', async () => {
      const mockCharge = {
        id: 'ch_separate456',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock transfers list with matching transfer (by paymentIntentId)
      mockTransfersList.mockResolvedValue({
        data: [
          {
            id: 'tr_separate456',
            metadata: {
              paymentTransferId: '999', // Different ID
              paymentIntentId: 'pi_separate456', // Matches!
            },
          },
        ],
      } as never);

      const transferRecord = {
        id: 200,
        paymentIntentId: 'pi_separate456',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_separate456', transferRecord);

      expect(result).toEqual({
        existingTransferId: 'tr_separate456',
        shouldCreateTransfer: false,
      });

      // Verify database was updated
      expect(db.update).toHaveBeenCalledWith(PaymentTransferTable);
      expect(mockSet).toHaveBeenCalledWith({
        status: PAYMENT_TRANSFER_STATUS_COMPLETED,
        transferId: 'tr_separate456',
        updated: expect.any(Date),
      });
    });

    it('should return shouldCreateTransfer: true when transfers exist but none match', async () => {
      const mockCharge = {
        id: 'ch_nomatch',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock transfers list with non-matching transfers
      mockTransfersList.mockResolvedValue({
        data: [
          {
            id: 'tr_other1',
            metadata: {
              paymentTransferId: '888',
              paymentIntentId: 'pi_other1',
            },
          },
          {
            id: 'tr_other2',
            metadata: {
              paymentTransferId: '777',
              paymentIntentId: 'pi_other2',
            },
          },
        ],
      } as never);

      const transferRecord = {
        id: 300,
        paymentIntentId: 'pi_nomatch',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_nomatch', transferRecord);

      expect(result).toEqual({
        existingTransferId: null,
        shouldCreateTransfer: true,
      });

      // Verify database was not updated
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should handle transfers without metadata gracefully', async () => {
      const mockCharge = {
        id: 'ch_nometadata',
        transfer: null,
      };

      mockChargesRetrieve.mockResolvedValue(mockCharge as never);

      // Mock transfers list with transfers missing metadata
      mockTransfersList.mockResolvedValue({
        data: [
          {
            id: 'tr_nometadata',
            metadata: undefined,
          },
        ],
      } as never);

      const transferRecord = {
        id: 400,
        paymentIntentId: 'pi_nometadata',
      };

      const result = await checkExistingTransfer(mockStripe, 'ch_nometadata', transferRecord);

      expect(result).toEqual({
        existingTransferId: null,
        shouldCreateTransfer: true,
      });

      // Verify database was not updated
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
