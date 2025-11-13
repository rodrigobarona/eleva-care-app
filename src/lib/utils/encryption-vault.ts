/**
 * Unified Encryption Abstraction Layer
 *
 * Provides a single interface for encryption that works with both:
 * - Legacy AES-256-GCM encryption (lib/utils/encryption.ts)
 * - WorkOS Vault encryption (lib/integrations/workos/vault.ts)
 *
 * This abstraction enables:
 * - Gradual migration via feature flags
 * - Dual-write during transition (encrypt with both methods)
 * - Transparent fallback for legacy data
 * - Zero-downtime migration
 *
 * Migration Strategy:
 * 1. Phase 1: New data written to Vault (+ legacy backup)
 * 2. Phase 2: Reads try Vault first, fallback to legacy
 * 3. Phase 3: Migrate old data from legacy to Vault
 * 4. Phase 4: Remove legacy encryption code
 *
 * @see src/lib/utils/encryption.ts - Legacy encryption
 * @see src/lib/integrations/workos/vault.ts - Vault encryption
 *
 * @module EncryptionAbstraction
 */

'use server';

import { encrypt as legacyEncrypt, encryptRecord as legacyEncryptRecord } from './encryption';
import { decryptRecord as legacyDecryptRecord } from './encryption';
import {
  encryptForOrg,
  decryptForOrg,
  isVaultEnabled,
  type EncryptionContext,
} from '@/lib/integrations/workos/vault';

/**
 * Encryption method identifier
 */
export type EncryptionMethod = 'vault' | 'aes-256-gcm';

/**
 * Encrypted data with method metadata
 *
 * Stores which encryption method was used so we can
 * decrypt correctly later
 */
export interface UnifiedEncryptedData {
  /** Encrypted ciphertext */
  ciphertext: string;
  /** Method used for encryption */
  method: EncryptionMethod;
  /** When encryption occurred */
  encryptedAt: Date;
}

/**
 * Dual-write encrypted data
 *
 * During migration, we write to both Vault and legacy
 * for safety and rollback capability
 */
export interface DualWriteEncryptedData {
  /** Vault-encrypted ciphertext (primary) */
  vault: string;
  /** Legacy-encrypted ciphertext (backup) */
  legacy: string;
}

/**
 * Encrypt data using the appropriate method based on feature flag
 *
 * During dual-write period, this will:
 * 1. Encrypt with Vault (if enabled)
 * 2. Also encrypt with legacy for backup
 *
 * @param orgId - Organization ID for Vault encryption
 * @param plaintext - Data to encrypt
 * @param context - Encryption context (only used for Vault)
 * @returns Encrypted data with method metadata
 *
 * @example
 * ```typescript
 * const encrypted = await unifiedEncrypt(
 *   userOrgId,
 *   medicalNotes,
 *   {
 *     userId: currentUserId,
 *     dataType: 'medical_record',
 *     recordId: recordId
 *   }
 * );
 *
 * // Store in database
 * await db.insert(RecordsTable).values({
 *   encryptedContent: encrypted.ciphertext,
 *   encryptionMethod: encrypted.method
 * });
 * ```
 */
export async function unifiedEncrypt(
  orgId: string,
  plaintext: string,
  context: EncryptionContext,
): Promise<UnifiedEncryptedData> {
  const useVault = isVaultEnabled();

  if (useVault) {
    const ciphertext = await encryptForOrg(orgId, plaintext, context);
    return {
      ciphertext,
      method: 'vault',
      encryptedAt: new Date(),
    };
  } else {
    const ciphertext = legacyEncryptRecord(plaintext);
    return {
      ciphertext,
      method: 'aes-256-gcm',
      encryptedAt: new Date(),
    };
  }
}

/**
 * Decrypt data automatically detecting the encryption method
 *
 * Falls back to legacy if Vault decryption fails (transition period safety)
 *
 * @param orgId - Organization ID (required for Vault)
 * @param ciphertext - Encrypted data
 * @param method - Encryption method used
 * @param context - Decryption context (only used for Vault)
 * @param legacyFallback - Optional legacy ciphertext for fallback
 * @returns Decrypted plaintext
 *
 * @example
 * ```typescript
 * const record = await db.query.RecordsTable.findFirst({
 *   where: eq(RecordsTable.id, recordId)
 * });
 *
 * const plaintext = await unifiedDecrypt(
 *   record.orgId,
 *   record.encryptedContent,
 *   record.encryptionMethod,
 *   {
 *     userId: currentUserId,
 *     dataType: 'medical_record'
 *   },
 *   record.legacyEncryptedContent // Fallback if Vault fails
 * );
 * ```
 */
export async function unifiedDecrypt(
  orgId: string,
  ciphertext: string,
  method: EncryptionMethod,
  context: EncryptionContext,
  legacyFallback?: string,
): Promise<string> {
  if (method === 'vault') {
    try {
      return await decryptForOrg(orgId, ciphertext, context);
    } catch (error) {
      console.error(
        '[Unified Encryption] Vault decryption failed, trying legacy fallback:',
        error,
      );

      // Fall back to legacy if available
      if (legacyFallback) {
        console.log('[Unified Encryption] Using legacy fallback');
        return legacyDecryptRecord(legacyFallback);
      }

      throw error;
    }
  } else {
    // Legacy decryption
    return legacyDecryptRecord(ciphertext);
  }
}

/**
 * Dual-write: Encrypt with both methods during transition
 *
 * This ensures data safety during migration:
 * - Primary: Vault encryption (new method)
 * - Backup: Legacy encryption (fallback if Vault fails)
 *
 * @param orgId - Organization ID
 * @param plaintext - Data to encrypt
 * @param context - Encryption context
 * @returns Both Vault and legacy encrypted data
 *
 * @example
 * ```typescript
 * const encrypted = await dualWriteEncrypt(
 *   userOrgId,
 *   sensitiveData,
 *   {
 *     userId: currentUserId,
 *     dataType: 'google_access_token'
 *   }
 * );
 *
 * // Store both in database during migration
 * await db.update(UsersTable).set({
 *   vaultGoogleAccessToken: encrypted.vault,      // Primary
 *   googleAccessToken: encrypted.legacy,           // Backup
 *   googleTokenEncryptionMethod: 'vault'
 * });
 * ```
 */
export async function dualWriteEncrypt(
  orgId: string,
  plaintext: string,
  context: EncryptionContext,
): Promise<DualWriteEncryptedData> {
  // Encrypt with both methods in parallel for performance
  const [vaultCiphertext, legacyCiphertext] = await Promise.all([
    encryptForOrg(orgId, plaintext, context),
    Promise.resolve(legacyEncryptRecord(plaintext)),
  ]);

  console.log('[Dual-Write] ✅ Encrypted with both Vault and legacy', {
    orgId,
    dataType: context.dataType,
  });

  return {
    vault: vaultCiphertext,
    legacy: legacyCiphertext,
  };
}

/**
 * Check if data should use dual-write encryption
 *
 * @returns true during migration period
 */
export function shouldDualWrite(): boolean {
  // Always dual-write when Vault is enabled (for safety during migration)
  return isVaultEnabled();
}

/**
 * Get recommended encryption method for new data
 *
 * @returns Current encryption method based on feature flag
 */
export function getRecommendedEncryptionMethod(): EncryptionMethod {
  return isVaultEnabled() ? 'vault' : 'aes-256-gcm';
}

/**
 * Validate that an encrypted data string can be decrypted
 *
 * Useful for data integrity checks
 *
 * @param encryptedData - Encrypted ciphertext
 * @param method - Encryption method
 * @returns true if data appears valid (basic structure check)
 */
export function validateEncryptedData(
  encryptedData: string,
  method: EncryptionMethod,
): boolean {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return false;
  }

  if (method === 'vault') {
    // Vault data should be valid JSON
    try {
      const parsed = JSON.parse(encryptedData);
      return !!(
        parsed.ciphertext &&
        parsed.iv &&
        parsed.authTag &&
        parsed.encryptedKey &&
        parsed.metadata
      );
    } catch {
      return false;
    }
  } else {
    // Legacy data should also be valid JSON
    try {
      const parsed = JSON.parse(encryptedData);
      return !!(parsed.encryptedContent && parsed.iv && parsed.tag);
    } catch {
      return false;
    }
  }
}

