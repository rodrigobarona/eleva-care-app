import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY = process.env.ENCRYPTION_KEY;

// Helper function to validate and process the encryption key
function getEncryptionKey(): Buffer {
  if (!KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. Please set it in your .env file.',
    );
  }

  // If the key is provided as a hex string
  if (KEY.length === 64) {
    return Buffer.from(KEY, 'hex');
  }

  // If the key is provided as a 32-byte string
  if (KEY.length === 32) {
    return Buffer.from(KEY, 'utf-8');
  }

  // If the key is provided as a base64 string
  if (KEY.length === 44 && KEY.endsWith('==')) {
    return Buffer.from(KEY, 'base64');
  }

  throw new Error(
    'ENCRYPTION_KEY must be either a 32-byte string, 64-character hex string, or base64 encoded 32-byte string',
  );
}

interface EncryptedData {
  encryptedContent: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decrypt(encryptedContent: string, iv: string, tag: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function encryptRecord(content: string): string {
  const encrypted = encrypt(content);
  return JSON.stringify(encrypted);
}

export function decryptRecord(encryptedData: string): string {
  const { encryptedContent, iv, tag } = JSON.parse(encryptedData);
  return decrypt(encryptedContent, iv, tag);
}
